import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import AhaBox from '../../components/AhaBox'
import ModuleLayout from '../../components/ModuleLayout'

type Provider = 'openai' | 'ollama'
type CodeTab = 'curl' | 'python' | 'js'

// ─── Explanations ──────────────────────────────────────────────────────────────

const EXPLANATIONS: Record<string, { title: string; body: string }> = {
  'method-url': {
    title: 'Method & URL',
    body: 'POST ke endpoint chat completions. Ini satu-satunya endpoint yang dibutuhkan untuk mengirim pesan dan mendapat respons dari model.',
  },
  'auth': {
    title: 'Authorization Header',
    body: '⚠️ API key rahasia — JANGAN pernah taruh di frontend/browser. Selalu simpan di server atau environment variable (.env). Jika bocor, siapa saja bisa memakai kuota dan uangmu.',
  },
  'content-type': {
    title: 'Content-Type',
    body: 'Memberitahu server bahwa body request adalah JSON. Wajib ada atau server akan menolak request.',
  },
  'model': {
    title: '"model"',
    body: 'Nama model yang akan memproses request. Ini satu-satunya perbedaan utama antara OpenAI dan Ollama — formatnya identik, hanya nilainya berbeda.',
  },
  'messages': {
    title: '"messages" array',
    body: 'Array riwayat percakapan — inilah "memori" chatbot. Setiap request mengirim ulang SELURUH riwayat dari awal. Semakin panjang percakapan, semakin banyak token yang ditagih.',
  },
  'temperature': {
    title: '"temperature"',
    body: 'Mengontrol kreativitas respons. 0 = sangat deterministik (jawaban selalu sama), 2 = sangat acak dan kreatif. Untuk ekstraksi data, pakai 0. Untuk konten kreatif, pakai 0.7–1.0.',
  },
  'stream': {
    title: '"stream": true',
    body: 'true = respons dikirim per token satu per satu (terasa lebih cepat untuk user). false = tunggu semua token selesai baru dikirim sekaligus. Aplikasi chat umumnya pakai true.',
  },
  'res-id': {
    title: '"id"',
    body: 'ID unik untuk request ini. Berguna untuk debugging, logging, dan deduplication. Format: "chatcmpl-" diikuti string acak.',
  },
  'res-model': {
    title: '"model" (response)',
    body: 'Model yang sebenarnya digunakan. Bisa berbeda dengan yang diminta — misalnya jika kamu minta "gpt-4o" tapi API meneruskan ke versi snapshot spesifik.',
  },
  'res-content': {
    title: 'choices[0].message.content',
    body: 'Isi jawaban dari model — inilah yang ditampilkan ke user. Semua logika aplikasi chat pada akhirnya mengekstrak nilai ini.',
  },
  'res-finish': {
    title: '"finish_reason"',
    body: '`stop` = selesai normal. `length` = dipotong karena batas max_tokens. `tool_calls` = model ingin memanggil fungsi (tool calling). `content_filter` = diblokir oleh moderasi konten.',
  },
  'res-usage': {
    title: '"usage"',
    body: 'Jumlah token yang dipakai dan ditagih. prompt_tokens = semua input (system + riwayat + pesan user). completion_tokens = panjang jawaban. Total = yang ditagih ke API key kamu.',
  },
}

// ─── Clickable token ───────────────────────────────────────────────────────────

function Clickable({ id, onSelect, selected, children }: {
  id: string; onSelect: (id: string) => void; selected: boolean; children: React.ReactNode
}) {
  return (
    <span
      onClick={() => onSelect(selected ? '' : id)}
      className={`cursor-pointer rounded px-0.5 transition-colors ${
        selected
          ? 'bg-yellow-300 dark:bg-yellow-600 text-gray-900 dark:text-gray-100'
          : 'underline decoration-dotted decoration-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
      }`}
    >
      {children}
    </span>
  )
}

// ─── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Tersalin!' : 'Salin'}
    </button>
  )
}

// ─── Code snippets ─────────────────────────────────────────────────────────────

const CODE_CURL = `curl https://api.openai.com/v1/chat/completions \\
  -H "Authorization: Bearer $OPENAI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Stok nasi goreng?"}],
    "temperature": 0.7
  }'`

const CODE_PYTHON = `from openai import OpenAI
client = OpenAI()

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Stok nasi goreng?"}],
    temperature=0.7
)
print(response.choices[0].message.content)`

const CODE_JS = `const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${process.env.OPENAI_API_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Stok nasi goreng?' }],
    temperature: 0.7,
  }),
})
const data = await response.json()
console.log(data.choices[0].message.content)`

// ─── Main component ────────────────────────────────────────────────────────────

export default function ApiAnatomyModule() {
  const [provider, setProvider] = useState<Provider>('openai')
  const [codeTab, setCodeTab] = useState<CodeTab>('curl')
  const [selected, setSelected] = useState('')

  const isOpenAI = provider === 'openai'
  const baseUrl = isOpenAI ? 'https://api.openai.com/v1' : 'http://localhost:11434/v1'
  const modelName = isOpenAI ? 'gpt-4o' : 'qwen3:8b'
  const codeMap: Record<CodeTab, string> = { curl: CODE_CURL, python: CODE_PYTHON, js: CODE_JS }

  const sel = (id: string) => selected === id

  const messagesJson = `  "messages": [
    { "role": "system", "content": "Kamu asisten kantin..." },
    { "role": "user",   "content": "Stok nasi goreng masih ada?" }
  ],`

  return (
    <ModuleLayout
      moduleId={5}
      title="🔍 Anatomi API – Di Balik Layar Chat"
      description="ChatGPT, Claude, dan asisten AI lainnya semuanya berjalan di atas panggilan API sederhana. Klik bagian yang bergaris bawah untuk melihat penjelasannya."
      presenterNotes={`• Toggle antara OpenAI dan Ollama — tunjukkan formatnya hampir identik
• Klik setiap bagian bergaris bawah, baca penjelasan yang muncul di bawah
• Fokus pada "messages": ini adalah seluruh konteks percakapan yang dikirim ulang setiap request
• Tab curl: tunjukkan bisa langsung dijalankan di terminal tanpa library
• Diskusikan: "Berarti aplikasi chat hanyalah tampilan yang memanggil API ini?"`}
    >
      <div className="space-y-4">
        {/* Provider toggle */}
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            {(['openai', 'ollama'] as Provider[]).map(p => (
              <button
                key={p}
                onClick={() => { setProvider(p); setSelected('') }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  provider === p
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {p === 'openai' ? '☁️ OpenAI' : '💻 Ollama'}
              </button>
            ))}
          </div>
          {!isOpenAI && (
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg">
              ✨ Hanya base URL dan nama model yang berbeda!
            </span>
          )}
        </div>

        {/* Two code panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Request */}
          <div className="rounded-xl border border-gray-700 overflow-hidden flex flex-col">
            <div className="bg-gray-800 px-3 py-2 flex items-center justify-between shrink-0">
              <span className="text-xs font-medium text-gray-300">📤 Request</span>
              <span className="text-xs text-gray-500">klik bagian bergaris bawah</span>
            </div>
            <pre className="bg-gray-900 text-gray-100 text-xs font-mono p-4 leading-6 flex-1 whitespace-pre overflow-x-auto">
{/* Line 1: method + url */}
<Clickable id="method-url" onSelect={setSelected} selected={sel('method-url')}>{`POST ${baseUrl}/chat/completions`}</Clickable>{'\n'}
{/* Line 2: auth (openai only) */}
{isOpenAI
  ? <><Clickable id="auth" onSelect={setSelected} selected={sel('auth')}>{`Authorization: Bearer sk-••••••••••••••`}</Clickable>{'\n'}</>
  : <><span className="text-gray-600">{`# Tidak perlu Authorization`}</span>{'\n'}</>
}
{/* Line 3: content-type */}
<Clickable id="content-type" onSelect={setSelected} selected={sel('content-type')}>{`Content-Type: application/json`}</Clickable>{'\n'}
{'\n'}
{'{\n'}
{'  '}<Clickable id="model" onSelect={setSelected} selected={sel('model')}>{`"model": "${modelName}"`}</Clickable>{',\n'}
<Clickable id="messages" onSelect={setSelected} selected={sel('messages')}>{messagesJson}</Clickable>{'\n'}
{'  '}<Clickable id="temperature" onSelect={setSelected} selected={sel('temperature')}>{`"temperature": 0.7`}</Clickable>{',\n'}
{'  '}<Clickable id="stream" onSelect={setSelected} selected={sel('stream')}>{`"stream": true`}</Clickable>{'\n'}
{'}'}
            </pre>
          </div>

          {/* Response */}
          <div className="rounded-xl border border-gray-700 overflow-hidden flex flex-col">
            <div className="bg-gray-800 px-3 py-2 flex items-center justify-between shrink-0">
              <span className="text-xs font-medium text-gray-300">📥 Response</span>
              <span className="text-xs text-gray-500">klik bagian bergaris bawah</span>
            </div>
            <pre className="bg-gray-900 text-gray-100 text-xs font-mono p-4 leading-6 flex-1 whitespace-pre overflow-x-auto">
{'{\n'}
{'  '}<Clickable id="res-id" onSelect={setSelected} selected={sel('res-id')}>{`"id": "chatcmpl-abc123"`}</Clickable>{',\n'}
{'  "object": "chat.completion",\n'}
{'  '}<Clickable id="res-model" onSelect={setSelected} selected={sel('res-model')}>{`"model": "gpt-4o-2024-11-20"`}</Clickable>{',\n'}
{'  "choices": [{\n'}
{'    "index": 0,\n'}
{'    "message": {\n'}
{'      "role": "assistant",\n'}
{'      '}<Clickable id="res-content" onSelect={setSelected} selected={sel('res-content')}>{`"content": "Stok nasi goreng tersedia, ada 12 porsi."`}</Clickable>{'\n'}
{'    },\n'}
{'    '}<Clickable id="res-finish" onSelect={setSelected} selected={sel('res-finish')}>{`"finish_reason": "stop"`}</Clickable>{'\n'}
{'  }],\n'}
{'  '}<Clickable id="res-usage" onSelect={setSelected} selected={sel('res-usage')}>{'  "usage": {\n    "prompt_tokens": 48,\n    "completion_tokens": 19,\n    "total_tokens": 67\n  }'}</Clickable>{'\n'}
{'}'}
            </pre>
          </div>
        </div>

        {/* Explanation panel */}
        <div className={`rounded-xl border transition-all duration-200 overflow-hidden ${
          selected
            ? 'border-yellow-300 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
        }`}>
          {selected && EXPLANATIONS[selected] ? (
            <div className="px-4 py-3">
              <div className="flex items-start gap-2">
                <span className="text-base mt-0.5">💡</span>
                <div>
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 font-mono">{EXPLANATIONS[selected].title}</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{EXPLANATIONS[selected].body}</p>
                </div>
                <button
                  onClick={() => setSelected('')}
                  className="ml-auto text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <p className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500 italic">
              👆 Klik bagian bergaris bawah di panel request atau response untuk melihat penjelasannya
            </p>
          )}
        </div>

        {/* OpenAI vs Ollama diff */}
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/10 p-4">
          <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-300 mb-3">🔍 Perbedaan OpenAI vs Ollama</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {[
              { label: 'Base URL', openai: 'api.openai.com/v1', ollama: 'localhost:11434/v1' },
              { label: 'Nama Model', openai: 'gpt-4o', ollama: 'qwen3:8b' },
              { label: 'Format Body', openai: '✅ Identik persis!', ollama: '✅ Identik persis!' },
            ].map(row => (
              <div key={row.label} className="rounded-lg bg-white dark:bg-gray-800 border border-indigo-100 dark:border-indigo-800 p-3">
                <div className="font-medium text-indigo-700 dark:text-indigo-300 mb-1">{row.label}</div>
                <div className="text-gray-500 dark:text-gray-400">OpenAI: <span className="text-orange-500 dark:text-orange-400 font-mono">{row.openai}</span></div>
                <div className="text-gray-500 dark:text-gray-400">Ollama: <span className="text-green-600 dark:text-green-400 font-mono">{row.ollama}</span></div>
              </div>
            ))}
          </div>
        </div>

        {/* Code tabs */}
        <div className="rounded-xl border border-gray-700 overflow-hidden">
          <div className="bg-gray-800 px-3 py-2 flex items-center gap-2">
            <span className="text-xs font-medium text-gray-300 mr-2">Kode setara:</span>
            {(['curl', 'python', 'js'] as CodeTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setCodeTab(tab)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  codeTab === tab
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab === 'js' ? 'JavaScript' : tab === 'curl' ? 'curl' : 'Python'}
              </button>
            ))}
            <div className="ml-auto">
              <CopyButton text={codeMap[codeTab]} />
            </div>
          </div>
          <pre className="bg-gray-900 text-green-300 text-xs font-mono p-4 overflow-x-auto leading-relaxed">
            {codeMap[codeTab]}
          </pre>
        </div>
      </div>

      <AhaBox text="Aplikasi chat hanyalah antarmuka di atas panggilan API. Siapa saja bisa membuat ChatGPT versi sendiri dengan beberapa baris kode dan API key." />
    </ModuleLayout>
  )
}
