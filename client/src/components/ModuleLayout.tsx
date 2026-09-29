import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppStore } from '../store/appStore'

interface Props {
  moduleId: number
  title: string
  description: string
  presenterNotes?: string
  children: React.ReactNode
}

export default function ModuleLayout({ moduleId, title, description, presenterNotes, children }: Props) {
  const { presentationMode } = useAppStore()
  const navigate = useNavigate()
  const [notesOpen, setNotesOpen] = useState(false)

  return (
    <div className={`flex-1 overflow-auto p-4 md:p-6 ${presentationMode ? 'text-lg' : ''}`}>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mb-1">
          <span>Modul {moduleId} / 9</span>
        </div>
        <h1 className={`font-bold text-gray-900 dark:text-gray-100 ${presentationMode ? 'text-3xl' : 'text-2xl'}`}>
          {title}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 max-w-2xl">{description}</p>
      </div>

      {/* Content */}
      <div>{children}</div>

      {/* Presenter notes */}
      {presenterNotes && (
        <div className="mt-6 border border-blue-200 dark:border-blue-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setNotesOpen(!notesOpen)}
            className="w-full flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <span>📝 Catatan Pemateri</span>
            <span className="ml-auto">{notesOpen ? '▲' : '▼'}</span>
          </button>
          {notesOpen && (
            <div className="px-4 py-3 text-sm text-blue-700 dark:text-blue-200 bg-blue-50/50 dark:bg-blue-900/10 whitespace-pre-wrap">
              {presenterNotes}
            </div>
          )}
        </div>
      )}

      {/* Nav arrows */}
      <div className="mt-8 flex justify-between">
        {moduleId > 1 ? (
          <button
            onClick={() => navigate(`/modul/${moduleId - 1}`)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
          >
            <ChevronLeft size={16} /> Modul {moduleId - 1}
          </button>
        ) : <div />}
        {moduleId < 9 ? (
          <button
            onClick={() => navigate(`/modul/${moduleId + 1}`)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
          >
            Modul {moduleId + 1} <ChevronRight size={16} />
          </button>
        ) : <div />}
      </div>
    </div>
  )
}
