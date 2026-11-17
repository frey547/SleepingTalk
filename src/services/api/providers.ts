import { streamMessage, verifyApiKey } from './client.js'
import { streamOpenAIMessage, verifyOpenAIConfig } from './openai.js'
import type { CreateMessageRequest, MessageStreamEvent } from './types.js'
import type { ApiProviderId, OpenAIConfig } from '../settings.js'

export type ProviderCapabilities = {
  attachments: boolean
  thinking: boolean
  search: boolean
  speech: boolean
}

export const providerCapabilities: Record<ApiProviderId, ProviderCapabilities> = {
  deepseek: { attachments: true, thinking: true, search: true, speech: true },
  openai: { attachments: false, thinking: false, search: false, speech: false },
}

export type ProviderConfig =
  | { id: 'deepseek'; apiKey: string }
  | ({ id: 'openai' } & OpenAIConfig & { apiKey: string })

export const verifyProvider = async (
  config: ProviderConfig,
  signal?: AbortSignal
): Promise<void> => {
  if (config.id === 'deepseek') {
    await verifyApiKey(config.apiKey, signal)
  } else {
    await verifyOpenAIConfig(config.baseUrl, config.apiKey, signal)
  }
}

export const streamProviderMessage = (
  config: ProviderConfig,
  body: CreateMessageRequest,
  signal: AbortSignal
): AsyncGenerator<MessageStreamEvent> =>
  config.id === 'deepseek'
    ? streamMessage(config.apiKey, body, signal)
    : streamOpenAIMessage(config.baseUrl, config.apiKey, config.model, body, signal)
