import { useCallback, useEffect, useRef, useState } from 'react'
import AhaBox from '../../components/AhaBox'
import ModuleLayout from '../../components/ModuleLayout'
import ResponseMetrics from '../../components/ResponseMetrics'
import { useStream, type ChatMessage, type StreamMetrics, type ToolCall } from '../../hooks/useStream'
import { useAppStore } from '../../store/appStore'

type Scenario = 'without' | 'with'

const TOOLS_DEF = [
  {
    type: 'function',
    function: {
      name: 'kalkulator',
      description: 'Menghitung ekspresi matematika',
      parameters: {
        type: 'object',
        properties: { ekspresi: { type: 'string', description: 'Ekspresi matematika, contoh: 48271 * 9384' } },
        required: ['ekspresi'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cek_stok',
      description: 'Mengecek stok menu di kantin',
      parameters: {
        type: 'object',
        properties: { menu: { type: 'string', description: 'Nama menu yang dicek' } },
        required: ['menu'],
      },
    },
  },
]

const TOOLS_JSON = JSON.stringify(TOOLS_DEF, null, 2)

function runTool(name: string, args: Record<string, unknown>): string {
  if (name === 'kalkulator') {
    try {
      const expr = String(args.ekspresi).replace(/[^0-9+\-*/().\s]/g, '')
      // eslint-disable-next-line no-new-func
      const result = new Function(`return ${expr}`)()
      return String(result)
    } catch {
      return 'Error: ekspresi tidak valid'
    }
  }
  if (name === 'cek_stok') {
    const menu = String(args.menu).toLowerCase()
    const stokData: Record<string, { stok: number; harga: number }> = {
      'nasi goreng': { stok: 12, harga: 15000 },
      'nasi goreng pedas': { stok: 8, harga: 16000 },
      'mie goreng': { stok: 5, harga: 13000 },
      'ayam geprek': { stok: 0, harga: 18000 },
      'es teh': { stok: 25, harga: 4000 },
      'es jeruk': { stok: 15, harga: 5000 },
    }
    const found = Object.entries(stokData).find(([k]) => menu.includes(k) || k.includes(menu))
    if (found) return JSON.stringify(found[1])
    return JSON.stringify({ stok: 0, error: 'Menu tidak ditemukan' })
  }
  return 'Tool tidak dikenal'
}

interface LiveStep {
  emoji: string
  label: string
  content: string
  highlight?: string
  metrics?: StreamMetrics
}

interface SimStep {
  label: string
  emoji: string
  highlight?: string
  content: React.ReactNode
}

function JsonBlock({ children }: { children: string }) {
  return (
    <pre className="bg-gray-900 text-green-300 text-xs font-mono rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
      {children}
    </pre>
  )
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-gray-900 text-amber-300 text-xs font-mono rounded-lg p-3 overflow-x-auto">
      {children}
    </pre>
  )
}

const SIM_STEPS: SimStep[] = [
  {
    emoji: '👤',
    label: 'User mengirim pesan',
    content: <JsonBlock>{JSON.stringify({ role: 'user', content: 'Berapa 48271 × 9384? Dan stok nasi goreng berapa?' }, null, 2)}</JsonBlock>,
  },
  {
    emoji: '🤖',
    label: 'LLM merespons dengan tool call',
    highlight: 'Model TIDAK menjalankan fungsi — ia hanya meminta!',
    content: <JsonBlock>{JSON.stringify({
      role: 'assistant',
      content: null,
      tool_calls: [
        { id: 'call_abc1', type: 'function', function: { name: 'kalkulator', arguments: '{"ekspresi": "48271 * 9384"}' } },
        { id: 'call_abc2', type: 'function', function: { name: 'cek_stok', arguments: '{"menu": "nasi goreng"}' } },
      ],
    }, null, 2)}</JsonBlock>,
  },
  {
    emoji: '⚙️',
    label: 'Kode kita menjalankan tools',
    content: <CodeBlock>{`// Kode kita menjalankan fungsi secara lokal:\n\nkalkulator("48271 * 9384")\n  → 453133464\n\ncek_stok("nasi goreng")\n  → { stok: 12, harga: 15000 }`}</CodeBlock>,
  },
  {
    emoji: '📤',
    label: 'Kita kirim hasil tools ke LLM',
    content: <JsonBlock>{JSON.stringify([
      { role: 'tool', tool_call_id: 'call_abc1', content: '453133464' },
      { role: 'tool', tool_call_id: 'call_abc2', content: '{"stok": 12, "harga": 15000}' },
    ], null, 2)}</JsonBlock>,
  },
  {
    emoji: '🤖',
    label: 'LLM membuat jawaban final',
    content: (
      <div className="bg-gray-800 rounded-lg p-3 text-sm text-gray-200">
        "48271 × 9384 = 453.133.464. Stok nasi goreng saat ini tersedia 12 porsi dengan harga Rp15.000 per porsi."
      </div>
    ),
  },
  {
    emoji: '✅',
    label: 'Jawaban diterima user',
    content: (
      <div className="space-y-3">
        <div className="flex justify-end">
          <div className="bg-indigo-600 text-white text-sm rounded-xl px-4 py-2 max-w-sm">
            Berapa 48271 × 9384? Dan stok nasi goreng berapa?
          </div>
        </div>
        <div className="flex justify-start">
          <div className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm rounded-xl px-4 py-2 max-w-sm">
            48271 × 9384 = 453.133.464. Stok nasi goreng saat ini tersedia 12 porsi dengan harga Rp15.000 per porsi.
          </div>
        </div>
        <span className="inline-block text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full px-3 py-1">
          ✅ Akurat — menggunakan data real
        </span>
      </div>
    ),
  },
]

function SimStepFlow() {
  const [visibleSteps, setVisibleSteps] = useState(0)
  const [autoRunning, setAutoRunning] = useState(false)
  const abortRef = useRef(false)

  const handleNext = () => {
    if (visibleSteps < SIM_STEPS.length) setVisibleSteps(s => s + 1)
  }
  const handleReset = () => {
    abortRef.current = true
    setAutoRunning(false)
    setVisibleSteps(0)
    setTimeout(() => { abortRef.current = false }, 50)
  }
  const handleAutoRun = useCallback(async () => {
    if (autoRunning) return
    abortRef.current = false
    setAutoRunning(true)
    setVisibleSteps(0)
    for (let i = 1; i <= SIM_STEPS.length; i++) {
      if (abortRef.current) break
      setVisibleSteps(i)
      await new Promise(r => setTimeout(r, 1000))
    }
    setAutoRunning(false)
  }, [autoRunning])
  useEffect(() => () => { abortRef.current = true }, [])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button onClick={handleNext} disabled={visibleSteps >= SIM_STEPS.length || autoRunning}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium transition-colors">
          {visibleSteps === 0 ? '▶ Mulai' : visibleSteps >= SIM_STEPS.length ? '✓ Selesai' : `Langkah Berikutnya (${visibleSteps}/${SIM_STEPS.length})`}
        </button>
        <button onClick={handleAutoRun} disabled={autoRunning}
          className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors">
          {autoRunning ? '⏳ Berjalan...' : '⚡ Jalankan Otomatis'}
        </button>
        <button onClick={handleReset}
          className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          🔄 Reset
        </button>
      </div>
      <div className="space-y-3">
        {SIM_STEPS.map((step, i) => (
          <div key={i} className={`rounded-xl border overflow-hidden transition-all duration-500 ${
            i < visibleSteps ? 'border-gray-200 dark:border-gray-700 opacity-100' : 'border-transparent opacity-0 h-0'
          }`}>
            <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 flex items-center gap-2">
              <span className="text-base">{step.emoji}</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Langkah {i + 1}: {step.label}</span>
            </div>
            <div className="p-3">
              {step.highlight && (
                <div className="mb-2 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700 rounded-lg px-3 py-2">
                  ⚡ <strong>{step.highlight}</strong>
                </div>
              )}
              {step.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LiveStepFlow({ provider }: { provider: string }) {
  const [liveSteps, setLiveSteps] = useState<LiveStep[]>([])
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { stream } = useStream()

  const handleReset = () => {
    setLiveSteps([])
    setError(null)
    setRunning(false)
  }

  const addStep = (step: LiveStep) => {
    setLiveSteps(prev => [...prev, step])
  }

  const handleRun = useCallback(async () => {
    if (running) return
    setRunning(true)
    setLiveSteps([])
    setError(null)

    const userMsg = 'Berapa 48271 × 9384? Dan stok nasi goreng berapa?'
    const p = provider === 'both' ? 'cloud' : provider

    addStep({
      emoji: '👤',
      label: 'User mengirim pesan',
      content: JSON.stringify({ role: 'user', content: userMsg }, null, 2),
    })

    let messages: ChatMessage[] = [{ role: 'user', content: userMsg }]
    let turnCount = 0
    const MAX_TURNS = 5

    while (turnCount < MAX_TURNS) {
      turnCount++

      addStep({
        emoji: '⏳',
        label: `Memanggil LLM (turn ${turnCount})...`,
        content: '',
      })

      const result = await stream({
        provider: p,
        messages,
        tools: TOOLS_DEF,
        systemPrompt: 'Kamu adalah asisten kantin yang membantu menjawab pertanyaan. Gunakan tools yang tersedia untuk kalkulasi dan cek stok.',
      })

      if (result.error) {
        setError(result.error)
        setRunning(false)
        return
      }

      // Remove pending step, replace with actual
      setLiveSteps(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          emoji: '🤖',
          label: `LLM merespons (turn ${turnCount})`,
          highlight: result.toolCalls.length > 0 ? 'Model TIDAK menjalankan fungsi — ia hanya meminta!' : undefined,
          content: JSON.stringify({
            role: 'assistant',
            content: result.content || null,
            ...(result.toolCalls.length > 0 ? { tool_calls: result.toolCalls } : {}),
          }, null, 2),
          metrics: result.metrics,
        }
        return updated
      })

      if (result.toolCalls.length === 0) {
        // Final answer
        addStep({
          emoji: '✅',
          label: 'Jawaban final diterima',
          content: result.content,
        })
        break
      }

      // Execute tools
      const toolResults: ChatMessage[] = []
      const execLines: string[] = []

      for (const tc of result.toolCalls) {
        let args: Record<string, unknown> = {}
        try { args = JSON.parse(tc.function.arguments) } catch { /* empty */ }
        const toolResult = runTool(tc.function.name, args)
        toolResults.push({ role: 'tool', tool_call_id: tc.id, content: toolResult })
        execLines.push(`${tc.function.name}(${tc.function.arguments})\n  → ${toolResult}`)
      }

      addStep({
        emoji: '⚙️',
        label: 'Kode kita menjalankan tools',
        content: `// Tools dijalankan secara lokal:\n\n${execLines.join('\n\n')}`,
      })

      addStep({
        emoji: '📤',
        label: 'Kirim hasil tools ke LLM',
        content: JSON.stringify(toolResults, null, 2),
      })

      // Append to messages for next turn
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: result.content || null,
        tool_calls: result.toolCalls as ToolCall[],
      }
      messages = [...messages, assistantMsg, ...toolResults]
    }

    setRunning(false)
  }, [running, provider, stream])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button onClick={handleRun} disabled={running}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium transition-colors">
          {running ? '⏳ Berjalan...' : liveSteps.length > 0 ? '🔄 Jalankan Ulang' : '⚡ Jalankan Live'}
        </button>
        {liveSteps.length > 0 && (
          <button onClick={handleReset}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            🗑️ Reset
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          ❌ {error}
        </div>
      )}

      <div className="space-y-3">
        {liveSteps.map((step, i) => (
          <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in duration-300">
            <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 flex items-center gap-2">
              <span className="text-base">{step.emoji}</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Langkah {i + 1}: {step.label}</span>
            </div>
            <div className="p-3 space-y-2">
              {step.highlight && (
                <div className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700 rounded-lg px-3 py-2">
                  ⚡ <strong>{step.highlight}</strong>
                </div>
              )}
              {step.content && (
                step.emoji === '⚙️' ? (
                  <pre className="bg-gray-900 text-amber-300 text-xs font-mono rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{step.content}</pre>
                ) : step.emoji === '✅' ? (
                  <div className="space-y-2">
                    <div className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm rounded-xl px-4 py-2">
                      {step.content}
                    </div>
                    <span className="inline-block text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full px-3 py-1">
                      ✅ Akurat — menggunakan data real
                    </span>
                  </div>
                ) : (
                  <pre className="bg-gray-900 text-green-300 text-xs font-mono rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{step.content}</pre>
                )
              )}
              {step.metrics && step.metrics.model && (
                <ResponseMetrics metrics={step.metrics} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ToolCallingModule() {
  const { mode, provider } = useAppStore()
  const isLive = mode === 'live'
  const [scenario, setScenario] = useState<Scenario>('without')
  const [showToolsDef, setShowToolsDef] = useState(false)

  return (
    <ModuleLayout
      moduleId={8}
      title="🔧 Dasar Tool Calling – AI yang Tahu Batasnya"
      description="LLM bisa 'memanggil' fungsi eksternal saat membutuhkan informasi yang tidak dimilikinya. Tapi model tidak menjalankan tool sendiri — ia hanya meminta, kode kita yang menjalankan."
      presenterNotes={`• Skenario A: tunjukkan kalkulasi salah dan stok yang dikarang
• Skenario B simulasi: klik "Langkah Berikutnya" satu per satu — beri penjelasan setiap langkah
• Skenario B live: klik "Jalankan Live" untuk lihat tool calling real dengan model sesungguhnya
• Tekankan di Langkah LLM tool call: "Model hanya MEMINTA, bukan menjalankan!"
• Tekankan di Langkah Kode: "Fungsi berjalan di kode kita, bukan di server OpenAI"`}
    >
      <div className="space-y-4">
        {/* Scenario tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 w-fit">
          {([
            { id: 'without', label: '❌ Skenario A: Tanpa Tools' },
            { id: 'with', label: '✅ Skenario B: Dengan Tools' },
          ] as { id: Scenario; label: string }[]).map(s => (
            <button key={s.id} onClick={() => setScenario(s.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                scenario === s.id
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {scenario === 'without' ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tanpa tools, model harus menjawab berdasarkan "pengetahuan" training-nya — yang bisa salah atau sudah usang.
            </p>
            {[
              {
                question: 'Berapa 48271 × 9384?',
                response: 'Hasil dari 48271 × 9384 = 453.174.864',
                type: 'error' as const,
                note: '❌ SALAH! Jawaban benar: 453.133.464 — model melakukan kalkulasi mental yang tidak akurat',
              },
              {
                question: 'Stok nasi goreng berapa?',
                response: 'Berdasarkan informasi yang saya miliki, stok nasi goreng biasanya sekitar 15-20 porsi.',
                type: 'warning' as const,
                note: '⚠️ Model mengarang — tidak punya akses ke data real. Stok sesungguhnya: 12 porsi',
              },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Pertanyaan</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-end">
                    <div className="bg-indigo-600 text-white text-sm rounded-xl px-4 py-2 max-w-sm">{item.question}</div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm rounded-xl px-4 py-2 max-w-sm">{item.response}</div>
                  </div>
                  <div className={`text-xs rounded-lg px-3 py-2 ${
                    item.type === 'error'
                      ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                      : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800'
                  }`}>
                    {item.note}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Dengan tools tersedia, model tahu kapan harus meminta bantuan fungsi eksternal.
            </p>

            {/* Tools definition */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button onClick={() => setShowToolsDef(s => !s)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <span>🛠️ Definisi Tools yang tersedia (dikirim ke LLM)</span>
                <span className="text-gray-400">{showToolsDef ? '▲' : '▼'}</span>
              </button>
              {showToolsDef && (
                <pre className="bg-gray-900 text-green-300 text-xs font-mono p-4 overflow-x-auto">{TOOLS_JSON}</pre>
              )}
            </div>

            {/* Live/Sim toggle */}
            {isLive ? (
              <div className="space-y-2">
                <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 px-3 py-2 text-xs text-indigo-700 dark:text-indigo-300">
                  ⚡ Mode Live — tool calling nyata dengan model sesungguhnya
                </div>
                <LiveStepFlow provider={provider} />
              </div>
            ) : (
              <SimStepFlow />
            )}
          </div>
        )}

        <AhaBox text="Model tidak menjalankan tool sendiri — ia hanya meminta. Kode kita yang menjalankan tool dan mengirim hasilnya balik ke model. Inilah fondasi AI Agent." />
      </div>
    </ModuleLayout>
  )
}
