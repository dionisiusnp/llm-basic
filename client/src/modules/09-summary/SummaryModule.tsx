import ModuleLayout from '../../components/ModuleLayout'

export default function SummaryModule() {
  return (
    <ModuleLayout
      moduleId={9}
      title="🗺️ Rangkuman – Arsitektur Bot Kantin"
      description="Mari gabungkan semua yang sudah dipelajari menjadi gambaran utuh arsitektur Bot Pemesanan Kantin. Dari system prompt hingga tool calling, semuanya bekerja bersama."
      presenterNotes={`• Perlihatkan diagram dari kiri ke kanan: input user → processing → output
• Tunjukkan bagaimana setiap modul yang dipelajari berkontribusi ke satu sistem
• Teaser RAG: "Bagaimana kalau bot harus tahu tentang menu dan aturan kantin yang berubah-ubah?"
• Motivasi untuk Tahap 3: RAG dan memory system`}
    >
      <div className="space-y-6">
        {/* Architecture diagram */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Arsitektur Bot Kantin Lengkap</h3>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            {[
              { label: 'System Prompt', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700' },
              { label: '+', color: 'text-gray-400', plain: true },
              { label: 'Riwayat Chat', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700' },
              { label: '+', color: 'text-gray-400', plain: true },
              { label: 'Pesan User', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700' },
              { label: '→', color: 'text-gray-400', plain: true },
              { label: 'API LLM', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700' },
              { label: '→', color: 'text-gray-400', plain: true },
              { label: 'LLM', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700' },
              { label: '→', color: 'text-gray-400', plain: true },
              { label: 'JSON / Tool Call', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700' },
              { label: '→', color: 'text-gray-400', plain: true },
              { label: 'Aplikasi', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600' },
            ].map((item, i) =>
              item.plain ? (
                <span key={i} className={item.color}>{item.label}</span>
              ) : (
                <span key={i} className={`px-3 py-1.5 rounded-lg border font-medium ${item.color}`}>{item.label}</span>
              )
            )}
          </div>
        </div>

        {/* Module map */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { id: 1, emoji: '🔤', title: 'Token', link: '/modul/1' },
            { id: 2, emoji: '🎲', title: 'Temperature', link: '/modul/2' },
            { id: 3, emoji: '🎭', title: 'System Prompt', link: '/modul/3' },
            { id: 4, emoji: '💬', title: 'Context', link: '/modul/4' },
            { id: 5, emoji: '🔍', title: 'Anatomi API', link: '/modul/5' },
            { id: 6, emoji: '⚔️', title: 'Arena', link: '/modul/6' },
            { id: 7, emoji: '📋', title: 'Structured Output', link: '/modul/7' },
            { id: 8, emoji: '🔧', title: 'Tool Calling', link: '/modul/8' },
          ].map((m) => (
            <a
              key={m.id}
              href={m.link}
              className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="text-2xl mb-1">{m.emoji}</div>
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300">{m.id}. {m.title}</div>
            </a>
          ))}
        </div>

        {/* RAG teaser */}
        <div className="rounded-xl border border-dashed border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/10 p-5">
          <h3 className="font-semibold text-indigo-800 dark:text-indigo-300 mb-2">🚀 Teaser: Tahap 3 – RAG</h3>
          <p className="text-sm text-indigo-700 dark:text-indigo-300">
            Bagaimana kalau bot harus menjawab dari dokumen menu dan aturan kantin yang berubah-ubah?
            Model tidak tahu isi dokumen kita — kita perlu cara untuk "memberi tahu" model secara dinamis.
            Jawabannya: <strong>Retrieval-Augmented Generation (RAG)</strong>.
          </p>
        </div>
      </div>
    </ModuleLayout>
  )
}
