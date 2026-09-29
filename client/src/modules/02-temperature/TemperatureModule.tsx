import { useCallback, useEffect, useRef, useState } from 'react'
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import AhaBox from '../../components/AhaBox'
import ModuleLayout from '../../components/ModuleLayout'
import simData from '../../data/sim-logprobs.json'
import { useAppStore } from '../../store/appStore'

interface Candidate { token: string; logit: number }

function softmax(logits: number[], temp: number): number[] {
  if (temp === 0) {
    const max = Math.max(...logits)
    return logits.map(l => (l === max ? 1 : 0))
  }
  const scaled = logits.map(l => Math.exp(l / temp))
  const sum = scaled.reduce((a, b) => a + b, 0)
  return scaled.map(p => p / sum)
}

function weightedSample(tokens: string[], probs: number[]): string {
  const rand = Math.random()
  let cum = 0
  for (let i = 0; i < probs.length; i++) {
    cum += probs[i]
    if (rand <= cum) return tokens[i]
  }
  return tokens[tokens.length - 1]
}

const SIM_CANDIDATES: Candidate[] = simData.candidates

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#e0e7ff', '#eef2ff']

async function fetchLiveLogprobs(): Promise<Candidate[]> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'cloud',
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Menu paling laris di kantin adalah nasi' }],
      logprobs: true,
      topLogprobs: 5,
      temperature: 0,
    }),
  })
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let allText = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    allText += decoder.decode(value)
  }
  const lines = allText.split('\n').filter(l => l.startsWith('data: ') && !l.includes('[DONE]'))
  for (const line of lines) {
    try {
      const chunk = JSON.parse(line.slice(6))
      if (chunk.error) throw new Error(chunk.error)
      const topLogprobs = chunk?.choices?.[0]?.logprobs?.content?.[0]?.top_logprobs
      if (topLogprobs?.length) {
        return topLogprobs.map((lp: { token: string; logprob: number }) => ({
          token: lp.token,
          logit: lp.logprob,
        }))
      }
    } catch (e) {
      if ((e as Error).message && !(e as Error).message.startsWith('Unexpected')) throw e
    }
  }
  throw new Error('Logprobs tidak ditemukan dalam response')
}

export default function TemperatureModule() {
  const { mode } = useAppStore()
  const [temperature, setTemperature] = useState(1.0)
  const [generatedTokens, setGeneratedTokens] = useState<string[]>([])
  const [highlightedToken, setHighlightedToken] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [repeatResults, setRepeatResults] = useState<string[][]>([])
  const [liveLogprobs, setLiveLogprobs] = useState<Candidate[] | null>(null)
  const [liveLoading, setLiveLoading] = useState(false)
  const [liveError, setLiveError] = useState<string | null>(null)
  const abortRef = useRef(false)

  const isLive = mode === 'live'
  const candidates = liveLogprobs ?? SIM_CANDIDATES
  const probs = softmax(candidates.map(c => c.logit), temperature)

  const chartData = candidates
    .map((c, i) => ({ token: c.token.trim(), prob: probs[i], logit: c.logit }))
    .sort((a, b) => b.prob - a.prob)

  const stopGeneration = useCallback(() => {
    abortRef.current = true
    setIsGenerating(false)
  }, [])

  useEffect(() => { return () => { abortRef.current = true } }, [])

  const sampleOne = useCallback(() => {
    const tokens = candidates.map(c => c.token)
    const sampled = weightedSample(tokens, probs)
    setHighlightedToken(sampled)
    setTimeout(() => {
      setGeneratedTokens(prev => [...prev, sampled])
      setHighlightedToken(null)
    }, 600)
  }, [candidates, probs])

  const generateN = useCallback(async (n: number): Promise<string[]> => {
    const result: string[] = []
    for (let i = 0; i < n; i++) {
      if (abortRef.current) break
      const tokens = candidates.map(c => c.token)
      const sampled = weightedSample(tokens, probs)
      setHighlightedToken(sampled)
      result.push(sampled)
      await new Promise(r => setTimeout(r, 300))
      setGeneratedTokens(prev => [...prev, sampled])
      setHighlightedToken(null)
    }
    return result
  }, [candidates, probs])

  const handleGenerate10 = useCallback(async () => {
    if (isGenerating) return
    setIsGenerating(true)
    abortRef.current = false
    await generateN(10)
    setIsGenerating(false)
  }, [isGenerating, generateN])

  const handleRepeat5 = useCallback(async () => {
    if (isGenerating) return
    setIsGenerating(true)
    abortRef.current = false
    setRepeatResults([])
    const allRuns: string[][] = []
    for (let run = 0; run < 5; run++) {
      if (abortRef.current) break
      const runResult: string[] = []
      for (let i = 0; i < 10; i++) {
        if (abortRef.current) break
        const tokens = candidates.map(c => c.token)
        const sampled = weightedSample(tokens, probs)
        runResult.push(sampled)
        await new Promise(r => setTimeout(r, 80))
      }
      allRuns.push(runResult)
      setRepeatResults([...allRuns])
      await new Promise(r => setTimeout(r, 200))
    }
    setIsGenerating(false)
  }, [isGenerating, candidates, probs])

  const reset = () => {
    abortRef.current = true
    setGeneratedTokens([])
    setHighlightedToken(null)
    setRepeatResults([])
    setIsGenerating(false)
    setTimeout(() => { abortRef.current = false }, 50)
  }

  const handleFetchLive = async () => {
    setLiveLoading(true)
    setLiveError(null)
    try {
      const result = await fetchLiveLogprobs()
      setLiveLogprobs(result)
      reset()
    } catch (err) {
      setLiveError((err as Error).message || 'Gagal mengambil logprobs. Menggunakan data simulasi.')
    } finally {
      setLiveLoading(false)
    }
  }

  const basePrompt = 'Menu paling laris di kantin adalah nasi'

  return (
    <ModuleLayout
      moduleId={2}
      title="🎲 Next-Token Prediction & Temperature – AI Itu Mesin Tebak Kata"
      description="Setiap token yang dihasilkan LLM adalah hasil sampling probabilitas. Temperature mengontrol seberapa 'berani' distribusi itu — rendah berarti konservatif dan konsisten, tinggi berarti kreatif dan acak."
      presenterNotes={`• Demo: jalankan "Generate 10 Token" dua kali — hasilnya berbeda
• Geser temperature ke 0: selalu pilih token paling probable (deterministik)
• Geser temperature ke 2: pilihan lebih acak, bisa tidak koheren
• Tanya: "Kapan kalian mau temperature rendah? Kapan tinggi?"
• Gunakan "Ulangi 5x" untuk menunjukkan variasi lebih dramatis`}
    >
      <div className="space-y-4">
        {/* Live mode controls */}
        {isLive && (
          <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10 px-4 py-3 flex flex-wrap items-center gap-3">
            <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">⚡ Mode Live</span>
            <button
              onClick={handleFetchLive}
              disabled={liveLoading}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors"
            >
              {liveLoading ? '⏳ Mengambil...' : '☁️ Ambil Logprobs Live'}
            </button>
            {liveLogprobs && (
              <button
                onClick={() => { setLiveLogprobs(null); reset() }}
                className="text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                ↺ Kembali ke simulasi
              </button>
            )}
            {liveError && (
              <span className="text-xs text-red-600 dark:text-red-400">{liveError} — menggunakan data simulasi.</span>
            )}
          </div>
        )}

        {/* Prompt display */}
        <div className="relative rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium ${
            liveLogprobs
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
          }`}>
            {liveLogprobs ? 'data live ☁️' : 'data simulasi'}
          </div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Prompt</div>
          <p className="text-sm text-gray-800 dark:text-gray-200 font-mono leading-relaxed">
            <span>{basePrompt}</span>
            {generatedTokens.map((t, i) => (
              <span key={i} className="text-indigo-600 dark:text-indigo-400">{t}</span>
            ))}
            {highlightedToken && (
              <span className="animate-pulse bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 rounded px-0.5">
                {highlightedToken}
              </span>
            )}
            {!isGenerating && generatedTokens.length === 0 && !highlightedToken && (
              <span className="animate-pulse text-gray-400">_</span>
            )}
          </p>
          {generatedTokens.length > 0 && (
            <button
              onClick={reset}
              className="mt-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              ↺ Reset
            </button>
          )}
        </div>

        {/* Temperature slider */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Temperature: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{temperature.toFixed(1)}</span>
            </label>
            <div className="flex gap-2 text-xs text-gray-400 dark:text-gray-500">
              <span>0 = deterministik</span>
              <span>·</span>
              <span>2 = sangat acak</span>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={temperature}
            onChange={e => setTemperature(parseFloat(e.target.value))}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
            <span>0</span>
            <span>0.5</span>
            <span>1.0</span>
            <span>1.5</span>
            <span>2.0</span>
          </div>
        </div>

        {/* Bar chart */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
            Distribusi Probabilitas Token Berikutnya
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 60, bottom: 0, left: 60 }}>
              <XAxis
                type="number"
                domain={[0, 1]}
                tickFormatter={v => `${(v * 100).toFixed(0)}%`}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="token"
                tick={{ fontSize: 12, fontFamily: 'monospace' }}
                width={55}
              />
              <Tooltip
                formatter={(v: number) => [`${(v * 100).toFixed(1)}%`, 'Probabilitas']}
                labelFormatter={(l: string) => `Token: "${l}"`}
              />
              <Bar dataKey="prob" radius={[0, 4, 4, 0]}>
                {chartData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={highlightedToken === chartData[i].token + ' ' || highlightedToken === ' ' + chartData[i].token
                      ? '#f59e0b'
                      : CHART_COLORS[i] || '#e0e7ff'}
                  />
                ))}
                <LabelList
                  dataKey="prob"
                  position="right"
                  formatter={(v: number) => `${(v * 100).toFixed(1)}%`}
                  style={{ fontSize: 11, fill: '#6b7280' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={sampleOne}
            disabled={isGenerating}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🎲 Sampling 1 Token
          </button>
          <button
            onClick={handleGenerate10}
            disabled={isGenerating}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ▶ Generate 10 Token
          </button>
          <button
            onClick={handleRepeat5}
            disabled={isGenerating}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🔁 Ulangi 5x
          </button>
          {isGenerating && (
            <button
              onClick={stopGeneration}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            >
              ⏹ Stop
            </button>
          )}
        </div>

        {/* Repeat results */}
        {repeatResults.length > 0 && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
              Hasil Ulangi 5x — Perhatikan Variasinya
            </div>
            <div className="space-y-2">
              {repeatResults.map((run, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs text-gray-400 dark:text-gray-500 w-12 shrink-0 pt-0.5">Run {i + 1}</span>
                  <div className="flex flex-wrap gap-1">
                    {run.map((tok, j) => (
                      <span key={j} className="px-1.5 py-0.5 text-xs font-mono rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {tok.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Probability table */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Tabel Probabilitas Detail</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left pb-2 font-medium">Token</th>
                  <th className="text-right pb-2 font-medium">Logit</th>
                  <th className="text-right pb-2 font-medium">Probabilitas</th>
                  <th className="text-left pb-2 font-medium pl-3">Bar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {chartData.map((row, i) => (
                  <tr key={i}>
                    <td className="py-1.5 font-mono text-gray-800 dark:text-gray-200">"{row.token}"</td>
                    <td className="py-1.5 text-right font-mono text-gray-500 dark:text-gray-400">{row.logit.toFixed(1)}</td>
                    <td className="py-1.5 text-right font-mono text-indigo-600 dark:text-indigo-400">
                      {(row.prob * 100).toFixed(1)}%
                    </td>
                    <td className="py-1.5 pl-3">
                      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 w-24">
                        <div
                          className="h-2 rounded-full bg-indigo-500"
                          style={{ width: `${row.prob * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AhaBox text="Jawaban AI adalah hasil sampling probabilitas, bukan pencarian jawaban benar. Itulah mengapa jawaban yang sama bisa berbeda setiap kali dijalankan." />
    </ModuleLayout>
  )
}
