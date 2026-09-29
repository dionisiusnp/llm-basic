import cors from 'cors'
import { config } from 'dotenv'
import express from 'express'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
// Load .env from project root (one level up from server/)
config({ path: resolve(__dirname, '../.env') })
import chatRouter from './routes/chat.js'
import healthRouter from './routes/health.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.use('/api/chat', chatRouter)
app.use('/api/health', healthRouter)

app.listen(PORT, () => {
  console.log(`LLM Lab server running on http://localhost:${PORT}`)
})
