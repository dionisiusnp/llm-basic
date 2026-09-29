import { useCallback, useRef, useState } from 'react'
import AhaBox from '../../components/AhaBox'
import ModuleLayout from '../../components/ModuleLayout'
import { useBothStream } from '../../hooks/useBothStream'
import { useStream } from '../../hooks/useStream'
import { useAppStore } from '../../store/appStore'
import simArena from '../../data/sim-arena.json'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SimTestResult {
  response: string
  ttft_ms: number
  total_ms: number
  tokens_per_second: number
  prompt_tokens: number
  completion_tokens: number
  is_valid_json?: boolean
  tool_calls_correct?: boolean
}

interface SimTest {
  id: string
  label: string
  category: string
  prompt: string
  cloud: SimTestResult
  local: SimTestResult
}

interface DisplayResult {
  response: string
  ttft_ms: number | null
  total_ms: number | null
  tokens_per_second: number | null
  prompt_tokens: number | null
  completion_tokens: number | null
  loading: boolean
  done: boolean
  error?: string
}

interface ScoreRow {
  testLabel: string
  cloudTtft: number | null
  localTtft: number | null
  cloudTps: number | null
  localTps: number | null
  cloudOk: boolean | null
  localOk: boolean | null
  vote: 'cloud' | 'local' | null
}

const EMPTY_RESULT: DisplayResult = {
  response: '', ttft_ms: null, total_ms: null, tokens_per_second: null,
  prompt_tokens: null, completion_tokens: null, loading: false, done: false,
}

const TEST_EMOJIS: Record<string, string> = {
  greeting: '👋', logic: '🧮', summary: '📄', slang: '🗣️',
  json_extraction: '📋', tool_calling: '🔧',
}

const TESTS = simArena.tests as SimTest[]
const TRADEOFFS = simArena.tradeoffs

// ─── Mini metrics strip ────────────────────────────────────────────────────────

function MetricsStrip({ r }: { r: DisplayResult }) {
  if (!r.done && !r.loading) return null
  if (r.loading) return <p className="text-xs text-gray-400 animate-pulse mt-1">⏳ Memproses...</p>
  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
      {r.ttft_ms != null && <span>⚡ TTFT {r.ttft_ms}ms</span>}
      {r.total_ms != null && <span>⏱ {r.total_ms}ms</span>}
      {r.tokens_per_second != null && <span>🚀 {Math.round(r.tokens_per_second)} tok/s</span>}
      {r.prompt_tokens != null && <span>📊 {r.prompt_tokens}+{r.completion_tokens} tok</span>}
    </div>
  )
}

// ─── Result Card ──────────────────────────────────────────────────────────────

function ResultCard({
  label, labelClass, result, hideIdentity, blindLabel,
}: {
  label: string; labelClass: string; result: DisplayResult
  hideIdentity?: boolean; blindLabel?: string
}) {
  const display = hideIdentity ? blindLabel ?? label : label
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className={`px-3 py-2 flex items-center justify-between ${labelClass}`}>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{display}</span>
        {result.loading && <span className="text-xs text-indigo-400 animate-pulse">● streaming</span>}
      </div>
      <div className="p-3 bg-white dark:bg-gray-800/50 min-h-[80px]">
        {result.error ? (
          <p className="text-sm text-red-600 dark:text-red-400">⚠️ {result.error}</p>
        ) : result.response ? (
          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{result.response}</p>
        ) : !result.loading ? (
          <p className="text-xs text-gray-400 italic">Menunggu hasil...</p>
        ) : null}
        <MetricsStrip r={result} />
      </div>
    </div>
  )
}

// ─── Consistency Test ─────────────────────────────────────────────────────────

function ConsistencyTest({ test, mode }: { test: SimTest; mode: 'simulasi' | 'live' }) {
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [cloudScore, setCloudScore] = useState<number | null>(null)
  const [localScore, setLocalScore] = useState<number | null>(null)
  const abortRef = useRef(false)
  const { provider, cloudModel, localModel, thinking } = useAppStore()

  const run = async () => {
    abortRef.current = false
    setRunning(true)
    setProgress(0)
    setCloudScore(null)
    setLocalScore(null)

    let cOk = 0, lOk = 0
    for (let i = 0; i < 10; i++) {
      if (abortRef.current) break
      setProgress(i + 1)
      if (mode === 'simulasi') {
        await new Promise(r => setTimeout(r, 150))
        cOk += 1
        lOk += Math.random() < 0.75 ? 1 : 0
      } else {
        const doCloud = provider === 'cloud' || provider === 'both'
        const doLocal = provider === 'local' || provider === 'both'
        const runs: Promise<boolean>[] = []
        if (doCloud) {
          runs.push(
            fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                provider: 'cloud', model: cloudModel || undefined,
                messages: [{ role: 'user', content: test.prompt }],
                responseFormat: test.id === 'json_extraction' ? {
                  type: 'json_schema',
                  json_schema: {
                    name: 'pesanan', strict: true,
                    schema: { type: 'object', properties: { nama: { type: 'string' }, items: { type: 'array', items: { type: 'object', properties: { menu: { type: 'string' }, jumlah: { type: 'integer' }, catatan: { type: 'string' } }, required: ['menu', 'jumlah', 'catatan'] } }, lokasi_antar: { type: 'string' } }, required: ['nama', 'items', 'lokasi_antar'] },
                  }
                } : undefined,
              }),
            })
              .then(async res => {
                const text = await res.text()
                const lines = text.split('\n').filter(l => l.startsWith('data: ') && l !== 'data: [DONE]')
                let content = ''
                for (const l of lines) {
                  try { const c = JSON.parse(l.slice(6)); content += c?.choices?.[0]?.delta?.content ?? '' } catch { /**/ }
                }
                try { JSON.parse(content); return true } catch { return false }
              })
              .catch(() => false)
          )
        }
        if (doLocal) {
          runs.push(
            fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                provider: 'local', model: localModel || undefined, thinking,
                messages: [{ role: 'user', content: test.prompt }],
              }),
            })
              .then(async res => {
                const text = await res.text()
                const lines = text.split('\n').filter(l => l.startsWith('data: ') && l !== 'data: [DONE]')
                let content = ''
                for (const l of lines) {
                  try { const c = JSON.parse(l.slice(6)); content += c?.choices?.[0]?.delta?.content ?? '' } catch { /**/ }
                }
                try { JSON.parse(content); return true } catch { return false }
              })
              .catch(() => false)
          )
        }
        const [r1, r2] = await Promise.all(runs)
        if (doCloud) cOk += r1 ? 1 : 0
        if (doLocal) lOk += (doCloud ? r2 : r1) ? 1 : 0
      }
      setCloudScore(cOk)
      setLocalScore(lOk)
    }
    setRunning(false)
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">🔄 Uji Konsistensi: {test.label}</h4>
        <button
          onClick={run}
          disabled={running}
          className="px-3 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium transition-colors"
        >
          {running ? `Menjalankan ${progress}/10...` : 'Ulangi 10x'}
        </button>
        {running && <button onClick={() => { abortRef.current = true }} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">Stop</button>}
      </div>
      {progress > 0 && (
        <div className="space-y-2">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${(progress / 10) * 100}%` }} />
          </div>
          <div className="flex gap-6 text-sm">
            {cloudScore !== null && (
              <span>☁️ Cloud: <strong className={cloudScore >= 9 ? 'text-green-600' : cloudScore >= 7 ? 'text-yellow-600' : 'text-red-600'}>{cloudScore}/10</strong> {cloudScore >= 9 ? '✅' : cloudScore >= 7 ? '⚠️' : '❌'}</span>
            )}
            {localScore !== null && (
              <span>💻 Lokal: <strong className={localScore >= 9 ? 'text-green-600' : localScore >= 7 ? 'text-yellow-600' : 'text-red-600'}>{localScore}/10</strong> {localScore >= 9 ? '✅' : localScore >= 7 ? '⚠️' : '❌'}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Privacy Diagram ──────────────────────────────────────────────────────────

function PrivacyDiagram() {
  const [animate, setAnimate] = useState(false)
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">🔒 Demo Privasi & Offline</h4>
        <button
          onClick={() => { setAnimate(false); setTimeout(() => setAnimate(true), 50) }}
          className="px-3 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          ▶ Animasi ulang
        </button>
      </div>

      {/* Cloud path */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-blue-600 dark:text-blue-400">☁️ Cloud — data keluar dari laptop</p>
        <div className="flex items-center gap-1 flex-wrap">
          {['💻 Laptop', '→', '🌐 Internet', '→', '☁️ Server AI', '→', '🔒 Data tersimpan?'].map((node, i) => (
            <span
              key={i}
              className={`text-xs px-2 py-1 rounded ${
                node === '→'
                  ? 'text-gray-400'
                  : i === 0
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : i === 6
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              } ${animate && node !== '→' ? 'animate-[fadeIn_0.4s_ease_forwards]' : ''}`}
              style={animate && node !== '→' ? { animationDelay: `${Math.floor(i / 2) * 0.3}s`, opacity: 0 } : {}}
            >
              {node}
            </span>
          ))}
        </div>
      </div>

      {/* Local path */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-green-600 dark:text-green-400">💻 Lokal — data tidak kemana-mana</p>
        <div className="flex items-center gap-1 flex-wrap">
          {['💻 Laptop', '→', '🤖 Model lokal', '→', '✅ Data tetap di sini'].map((node, i) => (
            <span
              key={i}
              className={`text-xs px-2 py-1 rounded ${
                node === '→'
                  ? 'text-gray-400'
                  : i === 0
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : i === 4
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              {node}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 px-3 py-2 text-xs text-blue-700 dark:text-blue-300 space-y-1">
        <p className="font-semibold">📋 Demo untuk pemateri:</p>
        <ol className="list-decimal list-inside space-y-0.5">
          <li>Matikan Wi-Fi di laptop</li>
          <li>Jalankan ulang test "Sapaan singkat" di mode Live</li>
          <li>Cloud gagal (lampu merah), Lokal tetap jalan</li>
          <li>Nyalakan kembali Wi-Fi</li>
        </ol>
      </div>
    </div>
  )
}

// ─── Scoreboard ───────────────────────────────────────────────────────────────

function Scoreboard({ rows }: { rows: ScoreRow[] }) {
  if (rows.length === 0) return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center text-xs text-gray-400">
      Papan skor kosong. Jalankan beberapa test untuk mengisi data.
    </div>
  )
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-left">
            <th className="px-3 py-2">Test</th>
            <th className="px-3 py-2">☁️ TTFT</th>
            <th className="px-3 py-2">💻 TTFT</th>
            <th className="px-3 py-2">☁️ tok/s</th>
            <th className="px-3 py-2">💻 tok/s</th>
            <th className="px-3 py-2">Vote</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {rows.map((row, i) => (
            <tr key={i} className="bg-white dark:bg-gray-800/50 text-gray-700 dark:text-gray-300">
              <td className="px-3 py-2 font-medium">{row.testLabel}</td>
              <td className="px-3 py-2">{row.cloudTtft != null ? `${row.cloudTtft}ms` : '—'}</td>
              <td className="px-3 py-2">{row.localTtft != null ? `${row.localTtft}ms` : '—'}</td>
              <td className="px-3 py-2">{row.cloudTps != null ? `${Math.round(row.cloudTps)}` : '—'}</td>
              <td className="px-3 py-2">{row.localTps != null ? `${Math.round(row.localTps)}` : '—'}</td>
              <td className="px-3 py-2">{row.vote === 'cloud' ? '☁️' : row.vote === 'local' ? '💻' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ArenaModule() {
  const { mode, provider } = useAppStore()

  // Results state
  const [activeTestId, setActiveTestId] = useState<string | null>(null)
  const [cloudResult, setCloudResult] = useState<DisplayResult>(EMPTY_RESULT)
  const [localResult, setLocalResult] = useState<DisplayResult>(EMPTY_RESULT)

  // Blind mode
  const [blindMode, setBlindMode] = useState(false)
  const [swapped, setSwapped] = useState(false)
  const [vote, setVote] = useState<'A' | 'B' | null>(null)
  const [revealed, setRevealed] = useState(false)

  // Scoreboard
  const [scoreRows, setScoreRows] = useState<ScoreRow[]>([])

  // Live hooks
  const bothStream = useBothStream()
  const singleStream = useStream()

  const isRunning = useRef(false)
  const runAllAbort = useRef(false)

  // ── run a single test ──────────────────────────────────────────────────────

  const runSimTest = useCallback(async (test: SimTest) => {
    setCloudResult({ ...EMPTY_RESULT, loading: true })
    setLocalResult({ ...EMPTY_RESULT, loading: true })

    // Parallel sim delays
    await Promise.all([
      (async () => {
        await new Promise(r => setTimeout(r, test.cloud.ttft_ms))
        setCloudResult(prev => ({ ...prev, response: test.cloud.response }))
        await new Promise(r => setTimeout(r, test.cloud.total_ms - test.cloud.ttft_ms))
        setCloudResult({
          response: test.cloud.response,
          ttft_ms: test.cloud.ttft_ms,
          total_ms: test.cloud.total_ms,
          tokens_per_second: test.cloud.tokens_per_second,
          prompt_tokens: test.cloud.prompt_tokens,
          completion_tokens: test.cloud.completion_tokens,
          loading: false, done: true,
        })
      })(),
      (async () => {
        await new Promise(r => setTimeout(r, test.local.ttft_ms))
        setLocalResult(prev => ({ ...prev, response: test.local.response }))
        await new Promise(r => setTimeout(r, test.local.total_ms - test.local.ttft_ms))
        setLocalResult({
          response: test.local.response,
          ttft_ms: test.local.ttft_ms,
          total_ms: test.local.total_ms,
          tokens_per_second: test.local.tokens_per_second,
          prompt_tokens: test.local.prompt_tokens,
          completion_tokens: test.local.completion_tokens,
          loading: false, done: true,
        })
      })(),
    ])

    setScoreRows(prev => {
      const existing = prev.findIndex(r => r.testLabel === test.label)
      const row: ScoreRow = {
        testLabel: test.label,
        cloudTtft: test.cloud.ttft_ms,
        localTtft: test.local.ttft_ms,
        cloudTps: test.cloud.tokens_per_second,
        localTps: test.local.tokens_per_second,
        cloudOk: null, localOk: null, vote: null,
      }
      if (existing >= 0) { const next = [...prev]; next[existing] = row; return next }
      return [...prev, row]
    })
  }, [])

  const runLiveTest = useCallback(async (test: SimTest) => {
    setCloudResult({ ...EMPTY_RESULT, loading: true })
    setLocalResult({ ...EMPTY_RESULT, loading: true })

    const messages = [{ role: 'user' as const, content: test.prompt }]

    if (provider === 'both') {
      await bothStream.run({ messages })
      // mirror stream states into display results
    } else {
      await singleStream.stream({ provider: provider as 'cloud' | 'local', messages })
    }
  }, [provider, bothStream, singleStream])

  // Keep display results synced with live streams
  const syncLiveResults = useCallback(() => {
    if (mode !== 'live') return
    if (provider === 'both') {
      const cs = bothStream.cloudState
      const ls = bothStream.localState
      setCloudResult({
        response: cs.content, ttft_ms: cs.metrics.ttft, total_ms: cs.metrics.totalTime,
        tokens_per_second: cs.metrics.tokensPerSecond, prompt_tokens: cs.metrics.promptTokens,
        completion_tokens: cs.metrics.completionTokens, loading: cs.isStreaming, done: cs.isDone,
        error: cs.error ?? undefined,
      })
      setLocalResult({
        response: ls.content, ttft_ms: ls.metrics.ttft, total_ms: ls.metrics.totalTime,
        tokens_per_second: ls.metrics.tokensPerSecond, prompt_tokens: ls.metrics.promptTokens,
        completion_tokens: ls.metrics.completionTokens, loading: ls.isStreaming, done: ls.isDone,
        error: ls.error ?? undefined,
      })
    } else {
      const s = singleStream.state
      const result: DisplayResult = {
        response: s.content, ttft_ms: s.metrics.ttft, total_ms: s.metrics.totalTime,
        tokens_per_second: s.metrics.tokensPerSecond, prompt_tokens: s.metrics.promptTokens,
        completion_tokens: s.metrics.completionTokens, loading: s.isStreaming, done: s.isDone,
        error: s.error ?? undefined,
      }
      if (provider === 'cloud') { setCloudResult(result); setLocalResult(EMPTY_RESULT) }
      else { setLocalResult(result); setCloudResult(EMPTY_RESULT) }
    }
  }, [mode, provider, bothStream, singleStream])

  // Run test entry point
  const runTest = useCallback(async (test: SimTest) => {
    if (isRunning.current) return
    isRunning.current = true
    setActiveTestId(test.id)
    setVote(null)
    setRevealed(false)
    setCloudResult(EMPTY_RESULT)
    setLocalResult(EMPTY_RESULT)

    if (mode === 'simulasi') {
      await runSimTest(test)
    } else {
      await runLiveTest(test)
      syncLiveResults()
    }
    isRunning.current = false
  }, [mode, runSimTest, runLiveTest, syncLiveResults])

  // Run all tests sequentially
  const runAll = useCallback(async () => {
    runAllAbort.current = false
    for (const test of TESTS) {
      if (runAllAbort.current) break
      await runTest(test)
      await new Promise(r => setTimeout(r, 500))
    }
  }, [runTest])

  // Toggle blind mode
  const toggleBlind = () => {
    setBlindMode(b => !b)
    setSwapped(Math.random() > 0.5)
    setVote(null)
    setRevealed(false)
  }

  // Determine display columns
  const leftCloud = !swapped
  const leftResult = leftCloud ? cloudResult : localResult
  const rightResult = leftCloud ? localResult : cloudResult
  const leftLabel = blindMode ? 'Model A' : leftCloud ? '☁️ Cloud' : '💻 Lokal'
  const rightLabel = blindMode ? 'Model B' : leftCloud ? '💻 Lokal' : '☁️ Cloud'
  const leftLabelClass = leftCloud
    ? 'bg-blue-50 dark:bg-blue-900/20'
    : 'bg-green-50 dark:bg-green-900/20'
  const rightLabelClass = leftCloud
    ? 'bg-green-50 dark:bg-green-900/20'
    : 'bg-blue-50 dark:bg-blue-900/20'

  const activeTest = TESTS.find(t => t.id === activeTestId)
  const canConsistency = activeTestId === 'json_extraction' || activeTestId === 'tool_calling'

  return (
    <ModuleLayout
      moduleId={6}
      title="⚔️ Arena Cloud vs Lokal – Mana yang Lebih Cocok?"
      description="Tidak ada model yang selalu lebih baik. Bandingkan keduanya langsung dengan set uji standar, mode tebak buta, dan uji konsistensi."
      presenterNotes={`• Mulai dengan Mode Tebak Buta — sembunyikan identitas model
• Minta peserta vote mana yang lebih baik SEBELUM buka identitas
• Demo privasi: matikan Wi-Fi → jalankan test → cloud gagal, lokal jalan
• "Jalankan Semua" untuk perbandingan cepat semua kategori
• Pertanyaan: "Untuk data pasien rumah sakit, pilih cloud atau lokal? Kenapa?"`}
    >
      <div className="space-y-6">

        {/* ── Section 1: Test buttons ── */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">📊 Set Uji Siap Pakai</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleBlind}
                className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                  blindMode
                    ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-400 text-purple-700 dark:text-purple-300'
                    : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {blindMode ? '🙈 Buta aktif' : '🙈 Mode Tebak Buta'}
              </button>
              <button
                onClick={runAll}
                className="px-3 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
              >
                ▶ Jalankan Semua
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {TESTS.map(test => (
              <button
                key={test.id}
                onClick={() => runTest(test)}
                className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                  activeTestId === test.id
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {TEST_EMOJIS[test.id]} {test.label}
              </button>
            ))}
          </div>

          {activeTest && (
            <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
              <span className="font-medium">Prompt: </span>
              <span className="italic">"{activeTest.prompt.length > 100 ? activeTest.prompt.slice(0, 100) + '…' : activeTest.prompt}"</span>
              <span className="ml-2 text-gray-400">({activeTest.category})</span>
            </div>
          )}
        </div>

        {/* ── Results columns ── */}
        {(cloudResult.loading || cloudResult.done || localResult.loading || localResult.done) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ResultCard label={leftLabel} labelClass={leftLabelClass} result={leftResult} hideIdentity={blindMode && !revealed} blindLabel={leftLabel} />
            <ResultCard label={rightLabel} labelClass={rightLabelClass} result={rightResult} hideIdentity={blindMode && !revealed} blindLabel={rightLabel} />
          </div>
        )}

        {/* ── Blind mode controls ── */}
        {blindMode && (cloudResult.done || localResult.done) && (
          <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10 p-4 space-y-3">
            <p className="text-sm font-medium text-purple-700 dark:text-purple-300">🗳️ Menurut kamu, mana yang lebih baik?</p>
            {!revealed ? (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setVote('A')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${vote === 'A' ? 'bg-purple-600 border-purple-600 text-white' : 'border-purple-300 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/20'}`}
                >
                  👍 Model A lebih baik
                </button>
                <button
                  onClick={() => setVote('B')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${vote === 'B' ? 'bg-purple-600 border-purple-600 text-white' : 'border-purple-300 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/20'}`}
                >
                  👍 Model B lebih baik
                </button>
                <button
                  onClick={() => setRevealed(true)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                >
                  🔓 Buka Identitas
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Model A = <strong>{leftCloud ? '☁️ Cloud' : '💻 Lokal'}</strong> &nbsp;|&nbsp;
                  Model B = <strong>{leftCloud ? '💻 Lokal' : '☁️ Cloud'}</strong>
                </p>
                {vote && (
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    Kamu pilih Model {vote} = <strong>{vote === 'A' ? (leftCloud ? '☁️ Cloud' : '💻 Lokal') : (leftCloud ? '💻 Lokal' : '☁️ Cloud')}</strong>
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Consistency test ── */}
        {canConsistency && activeTest && (
          <ConsistencyTest test={activeTest} mode={mode} />
        )}

        {/* ── Scoreboard ── */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">🏆 Papan Skor Sesi Ini</h3>
          <Scoreboard rows={scoreRows} />
        </div>

        {/* ── Privacy diagram ── */}
        <PrivacyDiagram />

        {/* ── Trade-off table ── */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">⚖️ Tabel Trade-off</h3>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-left">
                  <th className="px-4 py-2.5">Aspek</th>
                  <th className="px-4 py-2.5">☁️ Cloud</th>
                  <th className="px-4 py-2.5">💻 Lokal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {TRADEOFFS.map((row, i) => (
                  <tr key={i} className="bg-white dark:bg-gray-800/50">
                    <td className="px-4 py-2.5 font-medium text-gray-700 dark:text-gray-300">{row.aspek}</td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{row.cloud}</td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{row.lokal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <AhaBox text="Tidak ada yang selalu lebih baik. Pilih berdasarkan kebutuhan tugas, anggaran, dan sensitivitas data. Cloud untuk kualitas tertinggi; lokal untuk privasi dan zero running cost." />
      </div>
    </ModuleLayout>
  )
}
