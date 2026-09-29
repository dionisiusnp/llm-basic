import { Router } from 'express'
import { callCloud } from '../adapters/cloud.js'
import { callLocal } from '../adapters/local.js'

const router = Router()

// Friendly messages for unsupported parameter errors
function friendlyError(err, provider) {
  const msg = err?.apiError?.message || err.message || ''
  if (/temperature/i.test(msg)) {
    return 'Model ini tidak mendukung pengaturan temperature. Ganti ke model non-reasoning seperti gpt-4o-mini untuk modul ini.'
  }
  if (/logprob/i.test(msg)) {
    return 'Model ini tidak mendukung logprobs. Gunakan model CLOUD_MODEL_LOGPROBS (misalnya gpt-4o-mini) untuk modul temperature.'
  }
  if (/tool|function/i.test(msg) && provider === 'local') {
    return 'Model lokal ini tidak mendukung tool calling. Coba model yang mendukung tools seperti qwen3:8b atau llama3.2:3b. Cek dengan: ollama show <model>'
  }
  return msg || 'Terjadi kesalahan. Coba lagi atau kembali ke mode simulasi.'
}

router.post('/', async (req, res) => {
  const { provider = 'cloud', messages, systemPrompt, model, temperature, logprobs, topLogprobs, responseFormat, tools, thinking } = req.body

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const callFn = provider === 'local' ? callLocal : callCloud

  try {
    const upstream = await callFn({ messages, systemPrompt, model, temperature, logprobs, topLogprobs, responseFormat, tools, thinking, stream: true })

    // Pipe SSE chunks directly to client
    const reader = upstream.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(decoder.decode(value))
    }
    res.end()
  } catch (err) {
    const msg = friendlyError(err, provider)
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`)
    res.end()
  }
})

export default router
