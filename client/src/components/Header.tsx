import { Brain, Cloud, Laptop, Monitor, Moon, Sun } from 'lucide-react'
import { useEffect } from 'react'
import { useAppStore, type AppMode, type Provider } from '../store/appStore'

export default function Header() {
  const {
    mode, provider, darkMode, health, thinking,
    cloudModel, localModel,
    setMode, setProvider, toggleDarkMode, setPresentationMode, presentationMode,
    setHealth, toggleThinking, setCloudModel, setLocalModel,
  } = useAppStore()

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [darkMode])

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health')
        if (res.ok) {
          const data = await res.json()
          setHealth(data)
        }
      } catch {
        // server not running in sim mode
      }
    }
    if (mode === 'live') {
      checkHealth()
      const id = setInterval(checkHealth, 30000)
      return () => clearInterval(id)
    }
  }, [mode, setHealth])

  const ollamaModels: string[] = (health.local as { models?: string[] }).models ?? []
  const showLocal = mode === 'live' && (provider === 'local' || provider === 'both')
  const showCloud = mode === 'live' && (provider === 'cloud' || provider === 'both')

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400 whitespace-nowrap">🧪 LLM Lab</span>
        <span className="text-xs text-gray-400 hidden sm:block">ALIFT 2026</span>
      </div>

      {/* Mode toggle */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
        {(['simulasi', 'live'] as AppMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
              mode === m
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {m === 'simulasi' ? '🎭 Simulasi' : '⚡ Live'}
          </button>
        ))}
      </div>

      {/* Provider picker */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
        {([
          { id: 'cloud', label: '☁️ Cloud' },
          { id: 'local', label: '💻 Lokal' },
          { id: 'both', label: '⚖️ Keduanya' },
        ] as { id: Provider; label: string }[]).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setProvider(id)}
            className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${
              provider === id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Cloud model input */}
      {showCloud && (
        <input
          type="text"
          placeholder="gpt-4o"
          value={cloudModel}
          onChange={e => setCloudModel(e.target.value)}
          title="Override model cloud (kosong = pakai .env)"
          className="w-28 px-2 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400"
        />
      )}

      {/* Ollama model selector */}
      {showLocal && (
        ollamaModels.length > 0 ? (
          <select
            value={localModel}
            onChange={e => setLocalModel(e.target.value)}
            title="Pilih model Ollama"
            className="w-32 px-2 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            <option value="">default (.env)</option>
            {ollamaModels.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        ) : (
          <input
            type="text"
            placeholder="qwen3:8b"
            value={localModel}
            onChange={e => setLocalModel(e.target.value)}
            title="Override model Ollama"
            className="w-28 px-2 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400"
          />
        )
      )}

      {/* Thinking toggle — only for local */}
      {showLocal && (
        <button
          onClick={toggleThinking}
          title={thinking ? 'Sembunyikan proses berpikir' : 'Tampilkan proses berpikir'}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md border transition-colors ${
            thinking
              ? 'border-purple-400 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
              : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300'
          }`}
        >
          <Brain size={12} />
          <span>Thinking</span>
        </button>
      )}

      {/* Status lamps */}
      {mode === 'live' && (
        <div className="flex items-center gap-2">
          {(provider === 'cloud' || provider === 'both') && (
            <StatusLamp icon={<Cloud size={12} />} label="Cloud" status={health.cloud} />
          )}
          {(provider === 'local' || provider === 'both') && (
            <StatusLamp icon={<Laptop size={12} />} label="Lokal" status={health.local} />
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setPresentationMode(!presentationMode)}
          title="Mode Presentasi"
          className={`p-1.5 rounded-md transition-colors ${
            presentationMode
              ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Monitor size={16} />
        </button>
        <button
          onClick={toggleDarkMode}
          title="Toggle tema"
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  )
}

function StatusLamp({ icon, label, status }: { icon: React.ReactNode; label: string; status: { ok: boolean; error?: string } }) {
  return (
    <div className="relative group flex items-center gap-1">
      <span className="text-gray-500 dark:text-gray-400">{icon}</span>
      <span className={`w-2 h-2 rounded-full ${status.ok ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      {!status.ok && status.error && (
        <div className="absolute top-full left-0 mt-1 z-50 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap max-w-xs">
          {status.error}
        </div>
      )}
    </div>
  )
}
