export interface AiCallerOptions {
  provider: 'anthropic' | 'openai'
  apiKey: string
  model: string
  maxTokens: number
  systemPrompt: string
  messages: Array<{ role: 'user' | 'assistant'; content: string | Array<any> }>
  promptCaching?: boolean
}

export interface StreamChunk {
  type: 'text' | 'done' | 'error'
  text?: string
  error?: string
  usage?: { inputTokens: number; outputTokens: number; cacheCreationInputTokens: number; cacheReadInputTokens: number }
}

export async function* callAI(options: AiCallerOptions): AsyncGenerator<StreamChunk> {
  if (options.provider === 'anthropic') {
    yield* callAnthropic(options)
  } else {
    yield* callOpenAI(options)
  }
}

async function* callAnthropic(options: AiCallerOptions): AsyncGenerator<StreamChunk> {
  const useCache = options.promptCaching !== false

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': options.apiKey,
    'anthropic-version': '2023-06-01'
  }
  if (useCache) {
    headers['anthropic-beta'] = 'prompt-caching-2024-07-31'
  }

  // Build system content — with cache_control if caching enabled
  const systemContent = useCache
    ? [{ type: 'text', text: options.systemPrompt, cache_control: { type: 'ephemeral' } }]
    : options.systemPrompt

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: options.model,
      max_tokens: options.maxTokens,
      system: systemContent,
      messages: options.messages,
      stream: true
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    yield { type: 'error', error: `Anthropic API error (${response.status}): ${errorText}` }
    return
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let inputTokens = 0
  let outputTokens = 0
  let cacheCreationInputTokens = 0
  let cacheReadInputTokens = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue

        try {
          const event = JSON.parse(data)
          if (event.type === 'content_block_delta' && event.delta?.text) {
            yield { type: 'text', text: event.delta.text }
          } else if (event.type === 'message_start' && event.message?.usage) {
            inputTokens = event.message.usage.input_tokens || 0
            cacheCreationInputTokens = event.message.usage.cache_creation_input_tokens || 0
            cacheReadInputTokens = event.message.usage.cache_read_input_tokens || 0
          } else if (event.type === 'message_delta' && event.usage) {
            outputTokens = event.usage.output_tokens || 0
          }
        } catch {
          // Skip unparseable events
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  yield { type: 'done', usage: { inputTokens, outputTokens, cacheCreationInputTokens, cacheReadInputTokens } }
}

async function* callOpenAI(options: AiCallerOptions): AsyncGenerator<StreamChunk> {
  const messages = [
    { role: 'system' as const, content: options.systemPrompt },
    ...options.messages
  ]

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${options.apiKey}`
    },
    body: JSON.stringify({
      model: options.model,
      max_tokens: options.maxTokens,
      messages,
      stream: true,
      stream_options: { include_usage: true }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    yield { type: 'error', error: `OpenAI API error (${response.status}): ${errorText}` }
    return
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let inputTokens = 0
  let outputTokens = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue

        try {
          const event = JSON.parse(data)
          const content = event.choices?.[0]?.delta?.content
          if (content) {
            yield { type: 'text', text: content }
          }
          if (event.usage) {
            inputTokens = event.usage.prompt_tokens || 0
            outputTokens = event.usage.completion_tokens || 0
          }
        } catch {
          // Skip unparseable events
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  yield { type: 'done', usage: { inputTokens, outputTokens, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 } }
}
