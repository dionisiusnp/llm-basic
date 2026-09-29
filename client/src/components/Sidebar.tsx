import { useEffect } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'

const MODULES = [
  { id: 1, emoji: '🔤', title: 'Token' },
  { id: 2, emoji: '🎲', title: 'Temperature' },
  { id: 3, emoji: '🎭', title: 'System Prompt' },
  { id: 4, emoji: '💬', title: 'Context' },
  { id: 5, emoji: '🔍', title: 'Anatomi API' },
  { id: 6, emoji: '⚔️', title: 'Arena' },
  { id: 7, emoji: '📋', title: 'Structured Output' },
  { id: 8, emoji: '🔧', title: 'Tool Calling' },
  { id: 9, emoji: '🗺️', title: 'Rangkuman' },
]

interface Props {
  collapsed?: boolean
}

export default function Sidebar({ collapsed }: Props) {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const currentId = id ? parseInt(id) : 1

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight' && currentId < 9) navigate(`/modul/${currentId + 1}`)
      if (e.key === 'ArrowLeft' && currentId > 1) navigate(`/modul/${currentId - 1}`)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [currentId, navigate])

  if (collapsed) return null

  return (
    <nav className="w-48 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col py-2 overflow-y-auto">
      {MODULES.map((m) => (
        <NavLink
          key={m.id}
          to={`/modul/${m.id}`}
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
              isActive
                ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium border-r-2 border-indigo-500'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
            }`
          }
        >
          <span className="text-base leading-none">{m.emoji}</span>
          <span className="flex-1 min-w-0">
            <span className="block text-xs text-gray-400 dark:text-gray-500">Modul {m.id}</span>
            <span className="block truncate">{m.title}</span>
          </span>
        </NavLink>
      ))}
    </nav>
  )
}
