import { getEncoding } from 'js-tiktoken'
import { useEffect, useMemo, useRef, useState } from 'react'
import AhaBox from '../../components/AhaBox'
import ModuleLayout from '../../components/ModuleLayout'

const CHIP_COLORS = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
  'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200',
  'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
]

const EXAMPLES = [
  { label: 'Inggris', desc: 'The quick brown fox...', text: 'The quick brown fox jumps over the lazy dog' },
  { label: 'Indonesia', desc: 'Rubah coklat yang gesit...', text: 'Rubah coklat yang gesit melompati anjing yang malas' },
  { label: 'Kata panjang', desc: 'mempertanggungjawabkan', text: 'mempertanggungjawabkan' },
  { label: 'Pesan kantin', desc: 'kak pesen nasgor 2 pedes...', text: 'kak pesen nasgor 2 pedes ya, es teh 1, kirim ke gedung B lt 3, atas nama Rina' },
]

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

// Module-level singleton — avoids React StrictMode double-init issues
// enc.decode() returns string directly in this version of js-tiktoken
let _enc: ReturnType<typeof getEncoding> | null = null
function getEnc() {
  if (!_enc) _enc = getEncoding('cl100k_base')
  return _enc
}

function tokenizeWith(text: string): { tokens: string[]; ids: number[] } {
  if (!text.trim()) return { tokens: [], ids: [] }
  try {
    const enc = getEnc()
    const ids = enc.encode(text)
    const tokens = Array.from(ids).map(id => enc.decode(new Uint32Array([id])) as string)
    return { tokens, ids: Array.from(ids) }
  } catch {
    return { tokens: [], ids: [] }
  }
}

function formatUsd(v: number): string {
  if (v === 0) return '$0.000000'
  if (v < 0.000001) return `$${v.toExponential(2)}`
  return `$${v.toFixed(6)}`
}

function formatIdr(v: number): string {
  if (v === 0) return 'Rp 0'
  if (v < 1) return `Rp ${v.toFixed(4)}`
  return `Rp ${Math.round(v).toLocaleString('id-ID')}`
}

export default function TokenModule() {
  const [encReady, setEncReady] = useState(false)
  const [encError, setEncError] = useState(false)
  const [text, setText] = useState('Halo, saya ingin memesan nasi goreng pedas.')
  const [pricePerM, setPricePerM] = useState(2.5)
  const [usdToIdr, setUsdToIdr] = useState(16000)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedText, setDebouncedText] = useState(text)

  useEffect(() => {
    try {
      getEnc() // warm up singleton
      setEncReady(true)
    } catch (e) {
      console.error('tiktoken init failed:', e)
      setEncError(true)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedText(text), 150)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [text])

  const { tokens } = useMemo(
    () => encReady ? tokenizeWith(debouncedText) : { tokens: [], ids: [] },
    [encReady, debouncedText]
  )

  const tokenCount = tokens.length
  const wordCount = countWords(debouncedText)
  const charCount = debouncedText.length
  const costUsd = (tokenCount / 1_000_000) * pricePerM
  const costIdr = costUsd * usdToIdr

  const exampleStats = useMemo(
    () => encReady ? EXAMPLES.map(ex => ({ ...ex, ...tokenizeWith(ex.text), words: countWords(ex.text) })) : [],
    [encReady]
  )

  return (
    <ModuleLayout
      moduleId={1}
      title="🔤 Token – AI Tidak Membaca Kata"
      description="LLM tidak memproses teks per kata, melainkan per token. Token adalah potongan teks yang bisa berupa kata, bagian kata, atau karakter. Biaya dan batas konteks dihitung per token, bukan per kata."
      presenterNotes={`• Tanya peserta: "Menurut kalian, AI membaca teks per huruf, per kata, atau bagaimana?"
• Klik contoh Inggris lalu Indonesia — bandingkan jumlah token untuk arti yang sama
• Highlight: kata panjang Bahasa Indonesia = banyak token = lebih mahal
• Pertanyaan pancingan: "Kalau batas konteks 128.000 token, kira-kira berapa halaman buku?"`}
    >
      <div className="space-y-4">
        {/* Example buttons */}
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              onClick={() => setText(ex.text)}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              <span className="font-semibold">{ex.label}:</span>{' '}
              <span className="text-gray-500 dark:text-gray-400">{ex.desc}</span>
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Ketik atau tempel teks di sini</label>
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-transparent resize-none focus:outline-none"
            placeholder="Ketik teks di sini..."
          />
        </div>

        {encError && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-3 py-2 text-xs text-red-700 dark:text-red-300">
            ⚠️ Tokenizer gagal dimuat. Coba refresh halaman.
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Token', value: encReady ? tokenCount : '…', highlight: true },
            { label: 'Kata', value: wordCount },
            { label: 'Karakter', value: charCount },
          ].map(({ label, value, highlight }) => (
            <div
              key={label}
              className={`rounded-xl border p-3 text-center ${
                highlight
                  ? 'border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              <div className={`text-2xl font-bold ${highlight ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200'}`}>
                {typeof value === 'number' ? value.toLocaleString() : value}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Token chips */}
        {tokens.length > 0 && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Visualisasi Token</div>
            <div className="flex flex-wrap gap-1.5">
              {tokens.map((tok, i) => (
                <span
                  key={i}
                  className={`px-2 py-0.5 rounded text-xs font-mono whitespace-pre ${CHIP_COLORS[i % 5]}`}
                  title={`Token #${i + 1}: "${tok}"`}
                >
                  {tok.replace(/ /g, '·')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Cost estimator */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Estimasi Biaya Input</div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Harga per 1M token (USD)</label>
              <input
                type="number"
                value={pricePerM}
                onChange={e => setPricePerM(parseFloat(e.target.value) || 0)}
                step={0.1}
                min={0}
                className="w-20 px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">1 USD =</label>
              <input
                type="number"
                value={usdToIdr}
                onChange={e => setUsdToIdr(parseInt(e.target.value) || 0)}
                step={100}
                min={0}
                className="w-24 px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">IDR</span>
            </div>
            <div className="flex gap-4 ml-auto">
              <div className="text-right">
                <div className="text-xs text-gray-400 dark:text-gray-500">USD</div>
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatUsd(costUsd)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400 dark:text-gray-500">IDR</div>
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatIdr(costIdr)}</div>
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            {tokenCount} token × ${pricePerM}/1M = {formatUsd(costUsd)} = {formatIdr(costIdr)}
          </div>
        </div>

        {/* Comparison table */}
        {exampleStats.length > 0 && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Perbandingan Efisiensi Token</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 dark:text-gray-500">
                    <th className="text-left pb-2 font-medium">Contoh</th>
                    <th className="text-right pb-2 font-medium">Token</th>
                    <th className="text-right pb-2 font-medium">Kata</th>
                    <th className="text-right pb-2 font-medium">Token/Kata</th>
                    <th className="text-right pb-2 font-medium">Biaya (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {exampleStats.map(ex => {
                    const c = (ex.tokens.length / 1_000_000) * pricePerM
                    return (
                      <tr
                        key={ex.label}
                        onClick={() => setText(ex.text)}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="py-1.5 text-gray-700 dark:text-gray-300">{ex.label}</td>
                        <td className="py-1.5 text-right font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{ex.tokens.length}</td>
                        <td className="py-1.5 text-right font-mono text-gray-600 dark:text-gray-400">{ex.words}</td>
                        <td className="py-1.5 text-right font-mono text-gray-600 dark:text-gray-400">
                          {ex.words > 0 ? (ex.tokens.length / ex.words).toFixed(2) : '–'}
                        </td>
                        <td className="py-1.5 text-right font-mono text-gray-500 dark:text-gray-400">{formatUsd(c)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">Klik baris untuk load contoh tersebut</div>
          </div>
        )}
      </div>

      <AhaBox text="Biaya dan batas konteks dihitung per token, bukan per kata. Bahasa Indonesia umumnya membutuhkan lebih banyak token daripada Bahasa Inggris untuk konten yang sama." />
    </ModuleLayout>
  )
}
