export async function callCloud({ messages, systemPrompt, model, temperature, logprobs, topLogprobs, responseFormat, tools, stream = true }) {
  const baseUrl = process.env.CLOUD_BASE_URL || 'https://api.openai.com/v1'
  const apiKey = process.env.CLOUD_API_KEY
  const defaultModel = model || process.env.CLOUD_MODEL || 'gpt-4o'

  const body = {
    model: defaultModel,
    messages: systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages,
    stream,
  }
  if (temperature !== undefined) body.temperature = temperature
  if (logprobs) { body.logprobs = true; if (topLogprobs) body.top_logprobs = topLogprobs }
  if (responseFormat) body.response_format = responseFormat
  if (tools?.length) body.tools = tools
  if (stream) body.stream_options = { include_usage: true }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }))
    throw Object.assign(new Error(err?.error?.message || 'Cloud API error'), { status: res.status, apiError: err?.error })
  }

  return res
}
