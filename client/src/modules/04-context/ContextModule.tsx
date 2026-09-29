import { useCallback, useState } from 'react'
import AhaBox from '../../components/AhaBox'
import ModuleLayout from '../../components/ModuleLayout'
import ResponseMetrics from '../../components/ResponseMetrics'
import { useStream, type ChatMessage } from '../../hooks/useStream'
import { useAppStore } from '../../store/appStore'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SCENARIO_TURNS = [
  'Nama saya Rina, saya mau pesan makanan',
  'Siapa nama saya?',
  'Apa yang tadi saya mau pesan?',
]

const SIM_NO_HISTORY: string[] = [
  'Halo! Selamat datang di Kantin Kampus. Silakan beritahu saya menu apa yang ingin Anda pesan.',
  'Maaf, saya tidak mengetahui nama Anda. Anda belum memperkenalkan diri kepada saya.',
  'Saya tidak memiliki informasi tentang hal tersebut. Apakah Anda ingin memesan sesuatu?',
]

const SIM_WITH_HISTORY: string[] = [
  'Halo, Rina! Senang bertemu denganmu. Silakan sebutkan menu yang ingin kamu pesan ya!',
  'Nama kamu Rina! Kamu menyebutkannya di pesan pertama tadi. Ada yang bisa saya bantu dengan pemesanan, Rina?',
  'Tadi kamu bilang mau pesan makanan, tapi belum menyebutkan menu spesifiknya. Mau pesan apa, Rina?',
]

const SYSTEM_PROMPT = 'Kamu adalah asisten bot Kantin Kampus A yang membantu pelanggan memesan makanan. Jawab dengan singkat dan ramah dalam Bahasa Indonesia.'

function estimateTokens(msgs: Message[]): number {
  return msgs.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0)
}

interface ChatPanel {
  messages: Message[]
  loading: boolean
}

function ChatBubble({ msg, dimmed }: { msg: Message; dimmed: boolean }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm transition-all ${
          dimmed
            ? 'line-through text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800/50'
            : isUser
            ? 'bg-indigo-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100'
        }`}
      >
        {dimmed && <span className="text-xs font-medium not-italic block mb-1 text-gray-400 dark:text-gray-500">✂️ dipotong</span>}
        {msg.content}
      </div>
    </div>
  )
}

function MessagesJSON({ messages, contextLimit }: { messages: Message[]; contextLimit: number }) {
  const [open, setOpen] = useState(true)
  const active = messages.slice(-contextLimit)
  const tokenCount = estimateTokens(active)

  const json = JSON.stringify(
    active.map((m) => ({ role: m.role, content: m.content })),
    null,
    2
  )

  return (
    <div className="mt-3 rounded-xl border border-gray-700 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-800 text-green-400 text-xs font-mono hover:bg-gray-700 transition-colors"
      >
        <span>messages[] yang dikirim ke API ({active.length} pesan, ~{tokenCount} token)</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <pre className="bg-gray-900 text-green-300 text-xs font-mono px-4 py-3 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap">
          {json}
        </pre>
      )}
    </div>
  )
}

export default function ContextModule() {
  const { mode, provider } = useAppStore()
  const isLive = mode === 'live'

  const [noHistory, setNoHistory] = useState<ChatPanel>({ messages: [], loading: false })
  const [withHistory, setWithHistory] = useState<ChatPanel>({ messages: [], loading: false })
  const [scenarioStep, setScenarioStep] = useState(0)
  const [contextLimit, setContextLimit] = useState(10)

  const streamLeft = useStream()
  const streamRight = useStream()

  const totalMessages = withHistory.messages.length

  const handleNextStep = useCallback(async () => {
    if (scenarioStep >= SCENARIO_TURNS.length) return

    const userMsg = SCENARIO_TURNS[scenarioStep]
    const step = scenarioStep
    setScenarioStep((s) => s + 1)

    const userMsgObj: Message = { role: 'user', content: userMsg }

    setNoHistory((prev) => ({ messages: [...prev.messages, userMsgObj], loading: true }))
    setWithHistory((prev) => ({ messages: [...prev.messages, userMsgObj], loading: true }))

    if (!isLive) {
      // Sim mode
      const delay = 800 + Math.random() * 400

      setTimeout(() => {
        setNoHistory((prev) => ({
          messages: [...prev.messages, { role: 'assistant', content: SIM_NO_HISTORY[step] }],
          loading: false,
        }))
      }, delay)

      setTimeout(() => {
        const historyMsgs = withHistory.messages.concat([userMsgObj])
        const active = historyMsgs.slice(-Math.max(contextLimit, 1))
        const nameIntroduced = active.some((m) => m.content.includes('Rina'))

        let response = SIM_WITH_HISTORY[step]
        if (step === 1 && !nameIntroduced) {
          response = 'Maaf, saya tidak mengetahui nama Anda. Sepertinya percakapan sebelumnya sudah terpotong.'
        }

        setWithHistory((prev) => ({
          messages: [...prev.messages, { role: 'assistant', content: response }],
          loading: false,
        }))
      }, delay)
    } else {
      // Live mode
      const leftProvider = provider === 'both' ? 'cloud' : provider
      const rightProvider = provider === 'both' ? 'local' : provider

      // Left panel: no history — always send only the current user message
      const leftPromise = streamLeft.stream({
        provider: leftProvider,
        systemPrompt: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMsg }],
      })

      // Right panel: with history — send full history
      const rightHistory: ChatMessage[] = withHistory.messages.map((m) => ({ role: m.role, content: m.content }))
      rightHistory.push({ role: 'user', content: userMsg })
      const rightPromise = streamRight.stream({
        provider: rightProvider,
        systemPrompt: SYSTEM_PROMPT,
        messages: rightHistory,
      })

      const [leftResult, rightResult] = await Promise.all([leftPromise, rightPromise])

      setNoHistory((prev) => ({
        messages: [
          ...prev.messages,
          { role: 'assistant', content: leftResult.error ? `❌ ${leftResult.error}` : leftResult.content },
        ],
        loading: false,
      }))

      setWithHistory((prev) => ({
        messages: [
          ...prev.messages,
          { role: 'assistant', content: rightResult.error ? `❌ ${rightResult.error}` : rightResult.content },
        ],
        loading: false,
      }))
    }
  }, [scenarioStep, isLive, provider, withHistory.messages, contextLimit, streamLeft, streamRight])

  const handleReset = () => {
    setNoHistory({ messages: [], loading: false })
    setWithHistory({ messages: [], loading: false })
    setScenarioStep(0)
    streamLeft.reset()
    streamRight.reset()
  }

  const noHistoryDimCutoff = noHistory.messages.length - contextLimit
  const withHistoryDimCutoff = withHistory.messages.length - contextLimit
  const isLoading = noHistory.loading || withHistory.loading || streamLeft.state.isStreaming || streamRight.state.isStreaming

  return (
    <ModuleLayout
      moduleId={4}
      title="💬 Context – AI Sebenarnya Pelupa"
      description="LLM tidak punya memori permanen. Setiap request adalah sesi baru. 'Memori' chatbot sebenarnya adalah aplikasi yang mengirim ulang seluruh riwayat percakapan di setiap request."
      presenterNotes={`• Demo skenario: klik "Langkah Berikutnya" 3x, perhatikan perbedaan panel kiri dan kanan
• Tunjukkan array messages yang tumbuh setiap giliran di bawah panel kanan
• Geser slider context window ke kecil, lihat bot "lupa" nama Rina
• Mode live + "Keduanya": kiri pakai Cloud, kanan pakai Lokal — bandingkan juga kecepatan
• Implikasi biaya: semakin panjang riwayat = semakin banyak token = semakin mahal`}
    >
      <div className="space-y-4">
        {/* Live mode indicator */}
        {isLive && (
          <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 px-3 py-2 text-xs text-indigo-700 dark:text-indigo-300">
            ⚡ Mode Live aktif
            {provider === 'both' ? ' — panel kiri: Cloud, panel kanan: Lokal' : ` — provider: ${provider}`}
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleNextStep}
            disabled={scenarioStep >= SCENARIO_TURNS.length || isLoading}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium transition-colors"
          >
            {scenarioStep === 0
              ? '▶ Mulai Skenario'
              : scenarioStep >= SCENARIO_TURNS.length
              ? '✓ Skenario Selesai'
              : `Langkah Berikutnya (${scenarioStep}/${SCENARIO_TURNS.length})`}
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            🔄 Reset
          </button>
          {scenarioStep === 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Skenario: Rina memperkenalkan diri → tanya namanya sendiri → tanya pesanannya
            </span>
          )}
        </div>

        {/* Scenario preview */}
        {scenarioStep < SCENARIO_TURNS.length && scenarioStep > 0 && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
            Pesan berikutnya: <span className="font-medium">"{SCENARIO_TURNS[scenarioStep]}"</span>
          </div>
        )}

        {/* Context window slider */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 flex flex-wrap items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
            Batas Context Window:
          </label>
          <input
            type="range"
            min={1}
            max={Math.max(totalMessages, 6)}
            value={contextLimit}
            onChange={(e) => setContextLimit(parseInt(e.target.value))}
            className="flex-1 min-w-[100px]"
          />
          <span className="text-sm font-mono text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
            {contextLimit} pesan
          </span>
          {contextLimit < totalMessages && (
            <span className="text-xs text-red-500 dark:text-red-400">
              ⚠️ {totalMessages - contextLimit} pesan terpotong
            </span>
          )}
        </div>

        {/* Two chat panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: no history */}
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 flex flex-col">
            <div className="px-4 py-2.5 border-b border-red-100 dark:border-red-800/50 flex items-center gap-2">
              <span className="text-sm font-semibold text-red-600 dark:text-red-400">❌ Tanpa Riwayat</span>
              <span className="text-xs text-gray-400 ml-auto">setiap pesan berdiri sendiri</span>
            </div>
            <div className="flex-1 p-4 min-h-[200px] overflow-y-auto">
              {noHistory.messages.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-8">Belum ada percakapan</p>
              ) : (
                noHistory.messages.map((msg, i) => (
                  <ChatBubble key={i} msg={msg} dimmed={i < noHistoryDimCutoff} />
                ))
              )}
              {streamLeft.state.isStreaming && streamLeft.state.content && (
                <div className="flex justify-start mb-2">
                  <div className="max-w-[85%] rounded-xl px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 animate-pulse">
                    {streamLeft.state.content}<span className="opacity-50">▍</span>
                  </div>
                </div>
              )}
              {(noHistory.loading || streamLeft.state.isStreaming) && !streamLeft.state.content && (
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
                  <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  Memproses...
                </div>
              )}
            </div>
            {isLive && streamLeft.state.isDone && !streamLeft.state.isStreaming && (
              <div className="px-3 pb-2">
                <ResponseMetrics metrics={streamLeft.state.metrics} />
              </div>
            )}
            <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {isLive ? `⚡ live · ${provider === 'both' ? 'cloud' : provider}` : 'data simulasi'}
              </span>
            </div>
          </div>

          {/* Right: with history */}
          <div className="rounded-xl border border-green-200 dark:border-green-800 bg-white dark:bg-gray-800 flex flex-col">
            <div className="px-4 py-2.5 border-b border-green-100 dark:border-green-800/50 flex items-center gap-2">
              <span className="text-sm font-semibold text-green-600 dark:text-green-400">✅ Dengan Riwayat</span>
              <span className="text-xs text-gray-400 ml-auto">riwayat dikirim ulang</span>
            </div>
            <div className="flex-1 p-4 min-h-[200px] overflow-y-auto">
              {withHistory.messages.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-8">Belum ada percakapan</p>
              ) : (
                withHistory.messages.map((msg, i) => (
                  <ChatBubble key={i} msg={msg} dimmed={i < withHistoryDimCutoff} />
                ))
              )}
              {streamRight.state.isStreaming && streamRight.state.content && (
                <div className="flex justify-start mb-2">
                  <div className="max-w-[85%] rounded-xl px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100">
                    {streamRight.state.content}<span className="animate-pulse">▍</span>
                  </div>
                </div>
              )}
              {(withHistory.loading || streamRight.state.isStreaming) && !streamRight.state.content && (
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
                  <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  Memproses...
                </div>
              )}
            </div>
            {isLive && streamRight.state.isDone && !streamRight.state.isStreaming && (
              <div className="px-3 pb-2">
                <ResponseMetrics metrics={streamRight.state.metrics} />
              </div>
            )}
            <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {isLive ? `⚡ live · ${provider === 'both' ? 'local' : provider}` : 'data simulasi'}
              </span>
            </div>
          </div>
        </div>

        {/* Messages JSON viewer */}
        {withHistory.messages.length > 0 && (
          <MessagesJSON messages={withHistory.messages} contextLimit={contextLimit} />
        )}
      </div>

      <AhaBox text="Model itu stateless — tidak ingat apa-apa antar request. Memori chatbot adalah aplikasi yang mengirim ulang riwayat percakapan setiap giliran, dan ini makan token." />
    </ModuleLayout>
  )
}
