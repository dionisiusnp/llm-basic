import { Router } from 'express'

const router = Router()

router.get('/', async (req, res) => {
  const [cloud, local] = await Promise.all([checkCloud(), checkLocal()])
  res.json({ cloud, local })
})

async function checkCloud() {
  const apiKey = process.env.CLOUD_API_KEY
  if (!apiKey) return { ok: false, error: 'API key OpenAI belum diisi di file .env' }

  try {
    const r = await fetch(`${process.env.CLOUD_BASE_URL || 'https://api.openai.com/v1'}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    })
    if (r.status === 401) return { ok: false, error: 'API key OpenAI tidak valid. Cek kembali di dashboard OpenAI.' }
    if (!r.ok) return { ok: false, error: `OpenAI error: ${r.status}` }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: 'Tidak bisa terhubung ke OpenAI. Periksa koneksi internet.' }
  }
}

async function checkLocal() {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  const model = process.env.OLLAMA_MODEL || 'qwen3:8b'

  try {
    const r = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) })
    if (!r.ok) return { ok: false, error: 'Ollama belum berjalan. Jalankan: ollama serve' }

    const data = await r.json()
    const models = data.models || []
    const found = models.some(m => m.name === model || m.name.startsWith(model.split(':')[0]))
    if (!found) {
      return { ok: false, error: `Model belum di-pull. Jalankan: ollama pull ${model}` }
    }
    return { ok: true, models: models.map(m => m.name) }
  } catch {
    return { ok: false, error: 'Ollama belum berjalan. Jalankan: ollama serve' }
  }
}

export default router
