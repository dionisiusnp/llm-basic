export async function callLocal({ messages, systemPrompt, model, temperature, logprobs, topLogprobs, responseFormat, tools, stream = true, thinking = false }) {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  const defaultModel = model || process.env.OLLAMA_MODEL || 'qwen3:8b'

  const builtMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages

  // For Qwen3: use /no_think suffix on the last user message when thinking is disabled.
  // Only apply when there's no responseFormat or tools (structured modes).
  const shouldDisableThinking = !thinking && !responseFormat && !tools?.length
  const finalMessages = shouldDisableThinking
    ? builtMessages.map((m, i) => {
        if (m.role === 'user' && i === builtMessages.length - 1) {
          return { ...m, content: (m.content || '') + ' /no_think' }
        }
        return m
      })
    : builtMessages

  const body = {
    model: defaultModel,
    messages: finalMessages,
    stream,
  }
  if (temperature !== undefined) body.temperature = temperature
  if (logprobs) { body.logprobs = true; if (topLogprobs) body.top_logprobs = topLogprobs }
  if (responseFormat) body.response_format = responseFormat
  if (tools?.length) body.tools = tools
  if (stream) body.stream_options = { include_usage: true }

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }))
    throw Object.assign(new Error(err?.error?.message || 'Local API error'), { status: res.status, apiError: err?.error })
  }

  return res
}
