import { useState } from 'react'

interface Props {
  content: string
  defaultOpen?: boolean
}

export default function ThinkingBlock({ content, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  if (!content) return null

  return (
    <div className="rounded-lg border border-purple-200 dark:border-purple-800 overflow-hidden mb-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs font-medium hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
      >
        <span>🧠 Proses berpikir model</span>
        <span className="ml-auto">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-3 py-2 text-xs text-purple-700 dark:text-purple-200 bg-purple-50/50 dark:bg-purple-900/10 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
          {content}
        </div>
      )}
    </div>
  )
}
