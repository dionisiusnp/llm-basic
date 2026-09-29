import { useEffect, useState } from 'react'
import AhaBox from '../../components/AhaBox'
import ModuleLayout from '../../components/ModuleLayout'
import ResponseMetrics from '../../components/ResponseMetrics'
import { useStream } from '../../hooks/useStream'
import { useAppStore } from '../../store/appStore'

interface OrderItem {
  menu: string
  jumlah: number
  catatan: string
}

interface Order {
  nama: string
  items: OrderItem[]
  lokasi_antar: string
}

const MENU_PRICES: Record<string, number> = {
  'Nasi Goreng': 15000,
  'Nasi Goreng Pedas': 16000,
  'Mie Goreng': 13000,
  'Ayam Geprek': 18000,
  'Es Teh': 4000,
  'Es Jeruk': 5000,
  'Air Putih': 2000,
  'Teh Hangat': 3000,
}

const EXAMPLES = [
  {
    label: 'Contoh 1',
    message: 'kak pesen nasgor 2 pedes ya, es teh 1, kirim ke gedung B lt 3, atas nama Rina',
    freeText: 'Oke kak! Pesanan: 2 nasi goreng pedas + 1 es teh. Diantar ke Gedung B lantai 3. Total: Rp 36.000. Nama: Rina. Mau konfirmasi?',
    json: { nama: 'Rina', items: [{ menu: 'Nasi Goreng Pedas', jumlah: 2, catatan: '' }, { menu: 'Es Teh', jumlah: 1, catatan: '' }], lokasi_antar: 'Gedung B lantai 3' },
  },
  {
    label: 'Contoh 2',
    message: 'mau mie goreng sama minum es jeruk, antar ke depan lab kimia lantai 2 ya',
    freeText: 'Siap! 1 mie goreng dan 1 es jeruk ya. Lokasi: depan lab kimia lt 2. Totalnya 18rb.',
    json: { nama: '', items: [{ menu: 'Mie Goreng', jumlah: 1, catatan: '' }, { menu: 'Es Jeruk', jumlah: 1, catatan: '' }], lokasi_antar: 'Depan lab kimia lantai 2' },
  },
  {
    label: 'Contoh 3 (ambigu)',
    message: 'ada nasgor? klo ada pesen 1 aja, pedes dikit. sama es teh. oh iya nama aku budi',
    freeText: 'Nasi goreng ada kok! Budi mau 1 nasgor sedikit pedas sama es teh. Mau dikirim kemana?',
    json: { nama: 'Budi', items: [{ menu: 'Nasi Goreng', jumlah: 1, catatan: 'pedas sedikit' }, { menu: 'Es Teh', jumlah: 1, catatan: '' }], lokasi_antar: '' },
  },
]

const JSON_SCHEMA = `{
  "type": "object",
  "properties": {
    "nama": { "type": "string" },
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "menu": { "type": "string" },
          "jumlah": { "type": "integer" },
          "catatan": { "type": "string" }
        }
      }
    },
    "lokasi_antar": { "type": "string" }
  }
}`

const RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'pesanan_kantin',
    schema: {
      type: 'object',
      properties: {
        nama: { type: 'string' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              menu: { type: 'string' },
              jumlah: { type: 'integer' },
              catatan: { type: 'string' },
            },
            required: ['menu', 'jumlah', 'catatan'],
          },
        },
        lokasi_antar: { type: 'string' },
      },
      required: ['nama', 'items', 'lokasi_antar'],
    },
    strict: true,
  },
}

function formatRupiah(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID')
}

function OrderCard({ order, isLive }: { order: Order; isLive?: boolean }) {
  const total = order.items.reduce((sum, item) => {
    const price = MENU_PRICES[item.menu] ?? 0
    return sum + price * item.jumlah
  }, 0)

  return (
    <div className="rounded-xl border-2 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10 overflow-hidden">
      <div className="bg-green-600 dark:bg-green-800 px-4 py-2 flex items-center justify-between">
        <span className="font-bold text-white text-sm">🧾 Kartu Pesanan</span>
        <span className="text-xs text-green-100">{isLive ? '⚡ live' : 'data simulasi'}</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 w-20">Pemesan</span>
          <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">
            {order.nama || <span className="text-gray-400 italic">tidak disebutkan</span>}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 w-20 mt-0.5">Lokasi</span>
          <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">
            {order.lokasi_antar || <span className="text-gray-400 italic">belum diisi</span>}
          </span>
        </div>
        <div className="border-t border-green-200 dark:border-green-800 pt-3 space-y-1.5">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-start justify-between">
              <div>
                <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                  {item.jumlah}× {item.menu}
                </span>
                {item.catatan && (
                  <span className="ml-2 text-xs text-amber-600 dark:text-amber-400 italic">({item.catatan})</span>
                )}
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400 ml-4 whitespace-nowrap">
                {formatRupiah((MENU_PRICES[item.menu] ?? 0) * item.jumlah)}
              </span>
            </div>
          ))}
        </div>
        <div className="border-t border-green-200 dark:border-green-800 pt-2 flex justify-between">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total</span>
          <span className="text-sm font-bold text-green-700 dark:text-green-400">{formatRupiah(total)}</span>
        </div>
      </div>
    </div>
  )
}

export default function StructuredOutputModule() {
  const { mode, provider } = useAppStore()
  const isLive = mode === 'live'

  const [selected, setSelected] = useState(0)
  const [showSchema, setShowSchema] = useState(false)
  const [liveRun, setLiveRun] = useState(false)

  const streamFree = useStream()
  const streamJson = useStream()

  const example = EXAMPLES[selected]
  const jsonStr = JSON.stringify(example.json, null, 2)

  // Parse live JSON result
  let liveOrder: Order | null = null
  let liveJsonValid = false
  if (isLive && streamJson.state.isDone && streamJson.state.content) {
    try {
      liveOrder = JSON.parse(streamJson.state.content)
      liveJsonValid = true
    } catch {
      liveJsonValid = false
    }
  }

  const simJsonValid = (() => {
    try { JSON.parse(jsonStr); return true } catch { return false }
  })()

  // Reset streams when example changes
  useEffect(() => {
    streamFree.reset()
    streamJson.reset()
    setLiveRun(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  const handleLiveRun = async () => {
    setLiveRun(true)
    const p = provider === 'both' ? 'cloud' : provider

    await Promise.all([
      streamFree.stream({
        provider: p,
        systemPrompt: 'Kamu adalah asisten kantin. Ekstrak informasi pesanan dari pesan pelanggan.',
        messages: [{ role: 'user', content: `Ekstrak pesanan dari pesan ini: "${example.message}"` }],
      }),
      streamJson.stream({
        provider: p,
        systemPrompt: 'Kamu adalah asisten kantin. Ekstrak informasi pesanan ke format JSON.',
        messages: [{ role: 'user', content: `Ekstrak pesanan: "${example.message}"` }],
        responseFormat: RESPONSE_FORMAT,
      }),
    ])
  }

  return (
    <ModuleLayout
      moduleId={7}
      title="📋 Structured Output – Dari Obrolan ke Data"
      description="LLM bisa dipaksa menghasilkan JSON dengan struktur yang persis kita tentukan. Ini adalah jembatan antara teks bebas manusia dan data terstruktur yang bisa diproses aplikasi."
      presenterNotes={`• Bandingkan panel kiri (tidak konsisten) vs panel kanan (selalu valid JSON)
• Tunjukkan Contoh 3 yang ambigu: "pedes dikit" → jadi catatan, bukan item berbeda
• Klik "Lihat JSON Schema" untuk tunjukkan instruksi yang dikirim ke LLM
• Mode live: klik "Jalankan Live" untuk lihat hasil real dari model
• Pertanyaan: "Bagian mana dari pesanan kantin yang paling sulit diekstrak?"`}
    >
      <div className="space-y-4">
        {/* Example selector */}
        <div className="flex flex-wrap gap-2 items-center">
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                selected === i
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {ex.label}
            </button>
          ))}
          {isLive && (
            <button
              onClick={handleLiveRun}
              disabled={streamFree.state.isStreaming || streamJson.state.isStreaming}
              className="ml-auto px-4 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white transition-colors"
            >
              {streamFree.state.isStreaming || streamJson.state.isStreaming ? '⏳ Memproses...' : '⚡ Jalankan Live'}
            </button>
          )}
        </div>

        {/* Message display */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">💬 Pesan user</div>
          <p className="text-sm text-gray-800 dark:text-gray-200 italic">"{example.message}"</p>
        </div>

        {/* Two panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: free text */}
          <div className="rounded-xl border border-red-200 dark:border-red-800 overflow-hidden">
            <div className="bg-red-50 dark:bg-red-900/20 px-3 py-2 flex items-center gap-2">
              <span className="text-sm font-medium text-red-700 dark:text-red-400">❌ Tanpa Schema</span>
              <span className="text-xs text-red-500 ml-auto">format tidak konsisten</span>
            </div>
            <div className="p-4 space-y-3">
              {isLive && liveRun ? (
                <>
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-3 min-h-[60px]">
                    {streamFree.state.isStreaming ? (
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {streamFree.state.content}<span className="animate-pulse">▍</span>
                      </p>
                    ) : streamFree.state.error ? (
                      <p className="text-sm text-red-600 dark:text-red-400">❌ {streamFree.state.error}</p>
                    ) : (
                      <p className="text-sm text-gray-700 dark:text-gray-300">{streamFree.state.content}</p>
                    )}
                  </div>
                  {streamFree.state.isDone && !streamFree.state.error && (
                    <ResponseMetrics metrics={streamFree.state.metrics} />
                  )}
                  <div className="text-xs text-red-500 dark:text-red-400 space-y-1">
                    <div>⚠️ Format berubah-ubah tiap respons</div>
                    <div>⚠️ Sulit di-parse secara programatik</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-3">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{example.freeText}</p>
                  </div>
                  <div className="text-xs text-red-500 dark:text-red-400 space-y-1">
                    <div>⚠️ Format berubah-ubah tiap respons</div>
                    <div>⚠️ Sulit di-parse secara programatik</div>
                    <div>⚠️ Bisa gagal saat diintegrasikan ke sistem</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: with schema */}
          <div className="rounded-xl border border-green-200 dark:border-green-800 overflow-hidden">
            <div className="bg-green-50 dark:bg-green-900/20 px-3 py-2 flex items-center gap-2">
              <span className="text-sm font-medium text-green-700 dark:text-green-400">✅ Dengan JSON Schema</span>
              {isLive && liveRun ? (
                <span className={`text-xs ml-auto font-medium ${
                  streamJson.state.isStreaming ? 'text-gray-400' :
                  liveJsonValid ? 'text-green-600' : 'text-red-500'
                }`}>
                  {streamJson.state.isStreaming ? '⏳ streaming...' : liveJsonValid ? '✅ Valid JSON' : '❌ Invalid JSON'}
                </span>
              ) : (
                <span className={`text-xs ml-auto font-medium ${simJsonValid ? 'text-green-600' : 'text-red-500'}`}>
                  {simJsonValid ? '✅ Valid JSON' : '❌ Invalid JSON'}
                </span>
              )}
            </div>
            <div className="p-4 space-y-3">
              <button
                onClick={() => setShowSchema(s => !s)}
                className="text-xs text-indigo-600 dark:text-indigo-400 underline hover:no-underline"
              >
                {showSchema ? '▲ Sembunyikan' : '▼ Lihat'} JSON Schema yang dikirim
              </button>
              {showSchema && (
                <pre className="bg-gray-900 text-green-300 text-xs font-mono rounded-lg p-3 overflow-x-auto">
                  {JSON_SCHEMA}
                </pre>
              )}

              {isLive && liveRun ? (
                <>
                  {streamJson.state.isStreaming ? (
                    <pre className="bg-gray-900 text-green-300 text-xs font-mono rounded-lg p-3 overflow-x-auto min-h-[60px] whitespace-pre-wrap">
                      {streamJson.state.content}<span className="animate-pulse">▍</span>
                    </pre>
                  ) : streamJson.state.error ? (
                    <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 text-sm text-red-400">
                      ❌ {streamJson.state.error}
                    </div>
                  ) : (
                    <>
                      <pre className="bg-gray-900 text-green-300 text-xs font-mono rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                        {streamJson.state.content}
                      </pre>
                      {liveOrder && <OrderCard order={liveOrder} isLive />}
                      {!liveJsonValid && (
                        <div className="text-xs text-red-500">❌ Gagal parse JSON dari respons model</div>
                      )}
                      <ResponseMetrics metrics={streamJson.state.metrics} />
                    </>
                  )}
                </>
              ) : (
                <>
                  <pre className="bg-gray-900 text-green-300 text-xs font-mono rounded-lg p-3 overflow-x-auto">
                    {jsonStr}
                  </pre>
                  <OrderCard order={example.json} />
                </>
              )}
            </div>
          </div>
        </div>

        <AhaBox text="LLM bisa mengubah teks bebas yang berantakan menjadi data JSON yang siap dipakai aplikasi. Ini membuka jalan untuk mengintegrasikan AI ke sistem yang sudah ada." />
      </div>
    </ModuleLayout>
  )
}
