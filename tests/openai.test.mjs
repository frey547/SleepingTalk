import assert from 'node:assert/strict'
import test from 'node:test'

globalThis.__API_ORIGIN__ = 'https://api.deepseek.test'

const { ApiError } = await import('../.test-dist/src/services/api/client.js')
const { classifyApiError } = await import('../.test-dist/src/services/api/errors.js')
const {
  isHttpOpenAIBaseUrl,
  openAIEndpoint,
  streamOpenAIMessage,
  toOpenAIMessages,
  verifyOpenAIConfig,
} =
  await import('../.test-dist/src/services/api/openai.js')

const body = {
  model: 'test-model',
  system: 'Be helpful.',
  messages: [
    { role: 'latest_reminder', content: 'DeepSeek-only metadata' },
    { role: 'user', content: 'first' },
    { role: 'assistant', content: [{ type: 'text', text: 'answer' }] },
    { role: 'user', content: [{ type: 'text', text: 'second' }] },
  ],
  thinking: { type: 'disabled' },
  tools: [],
  safety_check: { level: 'high' },
}

const sseResponse = (chunks) => {
  const encoder = new TextEncoder()
  return new Response(
    new ReadableStream({
      start(controller) {
        chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)))
        controller.close()
      },
    }),
    { headers: { 'Content-Type': 'text/event-stream' } }
  )
}

test('converts multi-turn history without mixing DeepSeek metadata', () => {
  assert.deepEqual(toOpenAIMessages(body), [
    { role: 'system', content: 'Be helpful.' },
    { role: 'user', content: 'first' },
    { role: 'assistant', content: 'answer' },
    { role: 'user', content: 'second' },
  ])
})

test('builds SiliconFlow URLs without appending a second v1', () => {
  assert.equal(
    openAIEndpoint('https://api.siliconflow.com/v1/', 'chat/completions'),
    'https://api.siliconflow.com/v1/chat/completions'
  )
  assert.equal(
    openAIEndpoint('https://api.siliconflow.com/v1', 'models'),
    'https://api.siliconflow.com/v1/models'
  )
})

test('supports HTTP local and LAN endpoints with a detectable warning state', () => {
  assert.equal(isHttpOpenAIBaseUrl('http://localhost:8000/v1'), true)
  assert.equal(isHttpOpenAIBaseUrl('http://192.168.1.20:8000/v1'), true)
  assert.equal(isHttpOpenAIBaseUrl('https://api.example.test/v1'), false)
  assert.equal(
    openAIEndpoint('http://127.0.0.1:8000/v1', 'models'),
    'http://127.0.0.1:8000/v1/models'
  )
})

test('rejects malformed, non-HTTP, and credential-bearing API URLs', () => {
  assert.throws(() => openAIEndpoint('not a URL', 'models'), /valid HTTP or HTTPS/)
  assert.throws(() => openAIEndpoint('file:///tmp/api', 'models'), /must use HTTP or HTTPS/)
  assert.throws(
    () => openAIEndpoint('https://user:password@example.test/v1', 'models'),
    /cannot contain credentials/
  )
})

test('trims copied API keys before creating the Bearer header', async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://api.siliconflow.com/v1/models')
    assert.equal(init.headers.Authorization, 'Bearer sk-test-key')
    return new Response('{}')
  }
  await verifyOpenAIConfig(
    ' https://api.siliconflow.com/v1/ ',
    ' \r\nsk-test-key\t ',
    new AbortController().signal
  )
})

test('parses split OpenAI deltas and DONE into unified events', async () => {
  globalThis.fetch = async (_url, init) => {
    const request = JSON.parse(init.body)
    assert.equal(request.stream, true)
    assert.equal(request.model, 'test-model')
    assert.equal(init.headers.Authorization, 'Bearer secret')
    return sseResponse([
      'data: {"id":"chat-1","model":"test-model","choices":[{"delta":{"content":"Hel"},"finish_reason":null}]}\n\n',
      'data: {"choices":[{"delta":{"content":"lo"},"finish_reason":"stop"}]}\n\n',
      'data: [DONE]\n\n',
    ])
  }
  const events = []
  for await (const event of streamOpenAIMessage(
    'https://example.test/v1/',
    'secret',
    'test-model',
    body,
    new AbortController().signal
  )) {
    events.push(event)
  }
  assert.equal(
    events
      .filter((event) => event.type === 'content_block_delta')
      .map((event) => event.delta.text)
      .join(''),
    'Hello'
  )
  assert.equal(events.at(-1).type, 'message_stop')
  assert.equal(events.filter((event) => event.type === 'message_delta').length, 1)
})

test('surfaces an invalid API key response without exposing the key', async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: { message: 'Invalid API key' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  await assert.rejects(
    async () => {
      for await (const _event of streamOpenAIMessage(
        'https://example.test/v1',
        'never-log-this',
        'test-model',
        body,
        new AbortController().signal
      )) {
        // consume
      }
    },
    (error) =>
      error instanceof ApiError &&
      error.kind === 'http' &&
      error.status === 401 &&
      error.message === 'Invalid API key' &&
      error.requestUrl === 'https://example.test/v1/chat/completions' &&
      error.responseBody === '{"error":{"message":"Invalid API key"}}' &&
      !error.message.includes('never-log-this')
  )
})

test('keeps 401, 403, and 404 error classifications distinct', () => {
  assert.equal(classifyApiError(new ApiError('http', 'unauthorized', 401)), 'unauthorized')
  assert.equal(classifyApiError(new ApiError('http', 'forbidden', 403)), 'other')
  assert.equal(classifyApiError(new ApiError('http', 'not found', 404)), 'other')
})

test('redacts a key echoed by an error response', async () => {
  globalThis.fetch = async () =>
    new Response('{"error":{"message":"Rejected sk-sensitive-key-123"}}', { status: 401 })
  await assert.rejects(
    () => verifyOpenAIConfig('https://example.test/v1', 'sk-sensitive-key-123'),
    (error) =>
      error instanceof ApiError &&
      error.responseBody === '{"error":{"message":"Rejected [REDACTED]"}}' &&
      !error.message.includes('sk-sensitive-key-123')
  )
})

test('reports a network stream that closes before DONE as interrupted', async () => {
  globalThis.fetch = async () =>
    sseResponse(['data: {"choices":[{"delta":{"content":"partial"}}]}\n\n'])
  await assert.rejects(
    async () => {
      for await (const _event of streamOpenAIMessage(
        'https://example.test/v1',
        'secret',
        'test-model',
        body,
        new AbortController().signal
      )) {
        // consume
      }
    },
    (error) => error instanceof ApiError && error.kind === 'interrupted'
  )
})

test('redacts an API key echoed by an OpenAI stream error', async () => {
  globalThis.fetch = async () =>
    sseResponse(['data: {"error":{"message":"Rejected very-secret-key"}}\n\n'])
  await assert.rejects(
    async () => {
      for await (const _event of streamOpenAIMessage(
        'https://example.test/v1',
        'very-secret-key',
        'test-model',
        body,
        new AbortController().signal
      )) {
        // consume
      }
    },
    (error) => error instanceof ApiError && !error.message.includes('very-secret-key')
  )
})
