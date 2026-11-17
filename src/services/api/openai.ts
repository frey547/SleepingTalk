import { readErrorResponse, redactSensitiveText, request, ApiError } from './client.js'
import { readServerSentEvents } from './sse.js'
import type {
  CreateMessageRequest,
  MessageParam,
  MessageStreamEvent,
  MessageUsage,
  StopReason,
} from './types.js'

type OpenAIMessage = { role: 'system' | 'user' | 'assistant'; content: string }

type OpenAIChunk = {
  id?: string
  model?: string
  choices?: { delta?: { content?: string | null }; finish_reason?: string | null }[]
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    prompt_tokens_details?: { cached_tokens?: number }
  }
  error?: { message?: string }
}

const textContent = (message: MessageParam): string => {
  if (typeof message.content === 'string') {
    return message.content
  }
  return message.content
    .map((block) => {
      if (block.type === 'text') {
        return block.text
      }
      if (block.type === 'thinking') {
        return ''
      }
      return ''
    })
    .join('')
}

/** OpenAI Chat Completions 只接收本阶段支持的纯文本上下文。 */
export const toOpenAIMessages = (body: CreateMessageRequest): OpenAIMessage[] => {
  const messages: OpenAIMessage[] = body.system ? [{ role: 'system', content: body.system }] : []
  for (const message of body.messages) {
    if (message.role === 'latest_reminder') {
      continue
    }
    const content = textContent(message)
    if (content) {
      messages.push({ role: message.role, content })
    }
  }
  return messages
}

const usageEvent = (usage: OpenAIChunk['usage']): MessageUsage | undefined =>
  usage
    ? {
        input_tokens: usage.prompt_tokens ?? 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: usage.prompt_tokens_details?.cached_tokens ?? 0,
        output_tokens: usage.completion_tokens ?? 0,
      }
    : undefined

const stopReason = (reason: string | null | undefined): StopReason => {
  switch (reason) {
    case 'length':
      return 'max_tokens'
    case 'content_filter':
      return 'refusal'
    default:
      return 'end_turn'
  }
}

/** Base URL 已包含 /v1 时只追加资源路径，不会再次拼接 /v1。 */
export const isHttpOpenAIBaseUrl = (baseUrl: string): boolean => {
  try {
    return new URL(baseUrl.trim()).protocol === 'http:'
  } catch {
    return false
  }
}

const normalizeOpenAIBaseUrl = (baseUrl: string): string => {
  let url: URL
  try {
    url = new URL(baseUrl.trim())
  } catch {
    throw new TypeError('Enter a valid HTTP or HTTPS API URL.')
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new TypeError('API URL must use HTTP or HTTPS and cannot contain credentials.')
  }
  return url.href.replace(/\/+$/, '')
}

export const openAIEndpoint = (baseUrl: string, path: string) =>
  `${normalizeOpenAIBaseUrl(baseUrl)}/${path}`

const bearerHeaders = (apiKey: string): Record<string, string> => ({
  Authorization: `Bearer ${apiKey.trim()}`,
})

export const verifyOpenAIConfig = async (
  baseUrl: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<void> => {
  await request(openAIEndpoint(baseUrl, 'models'), {
    headers: bearerHeaders(apiKey),
    signal,
  })
}

/** 将 OpenAI SSE 增量转换为应用现有的统一流式事件。 */
export async function* streamOpenAIMessage(
  baseUrl: string,
  apiKey: string,
  model: string,
  body: CreateMessageRequest,
  signal: AbortSignal
): AsyncGenerator<MessageStreamEvent> {
  const response = await request(openAIEndpoint(baseUrl, 'chat/completions'), {
    method: 'POST',
    headers: {
      ...bearerHeaders(apiKey),
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ model, messages: toOpenAIMessages(body), stream: true }),
    signal,
  })
  const contentType = response.headers.get('Content-Type') ?? ''
  if (!response.body || !contentType.includes('text/event-stream')) {
    throw await readErrorResponse(
      response,
      'protocol',
      '',
      openAIEndpoint(baseUrl, 'chat/completions'),
      [apiKey.trim()]
    )
  }

  let started = false
  let blockStarted = false
  let finished = false
  let lastUsage: MessageUsage | undefined
  for await (const { data } of readServerSentEvents(response.body, signal)) {
    if (data.trim() === '[DONE]') {
      if (!started) {
        yield { type: 'message_start', message: { id: '', model } }
      }
      if (blockStarted) {
        yield { type: 'content_block_stop', index: 0 }
      }
      if (!finished) {
        yield {
          type: 'message_delta',
          delta: { stop_reason: 'end_turn', stop_sequence: null },
          usage: lastUsage,
        }
      }
      yield { type: 'message_stop' }
      return
    }

    let chunk: OpenAIChunk
    try {
      chunk = JSON.parse(data) as OpenAIChunk
    } catch {
      continue
    }
    if (chunk.error?.message) {
      throw new ApiError('stream', redactSensitiveText(chunk.error.message, [apiKey.trim()]))
    }
    lastUsage = usageEvent(chunk.usage) ?? lastUsage
    if (!started) {
      started = true
      yield {
        type: 'message_start',
        message: { id: chunk.id ?? '', model: chunk.model ?? model, usage: lastUsage },
      }
    }
    const choice = chunk.choices?.[0]
    const content = choice?.delta?.content
    if (typeof content === 'string' && content) {
      if (!blockStarted) {
        blockStarted = true
        yield { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }
      }
      yield { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: content } }
    }
    if (choice?.finish_reason) {
      finished = true
      yield {
        type: 'message_delta',
        delta: { stop_reason: stopReason(choice.finish_reason), stop_sequence: null },
        usage: lastUsage,
      }
    }
  }
  throw new ApiError('interrupted', '')
}
