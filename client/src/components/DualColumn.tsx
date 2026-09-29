import ResponseMetrics from './ResponseMetrics'
import ThinkingBlock from './ThinkingBlock'
import type { StreamState } from '../hooks/useStream'

interface ColumnProps {
  label: string
  labelClass?: string
  state: StreamState
  hideIdentity?: boolean
  blindLabel?: string
  extra?: React.ReactNode
}

export function StreamColumn({ label, labelClass, state, hideIdentity, blindLabel, extra }: ColumnProps) {
  const displayLabel = hideIdentity ? blindLabel ?? label : label

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className={`px-3 py-2 flex items-center justify-between ${labelClass ?? 'bg-gray-50 dark:bg-gray-800'}`}>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{displayLabel}</span>
        {state.isStreaming && (
          <span className="text-xs text-indigo-500 animate-pulse">● streaming</span>
        )}
      </div>

      <div className="flex-1 p-3 bg-white dark:bg-gray-800/50 min-h-[120px]">
        {state.error ? (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            ⚠️ {state.error}
          </div>
        ) : state.thinkingContent ? (
          <ThinkingBlock content={state.thinkingContent} />
        ) : null}

        {state.content && (
          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
            {state.content}
            {state.isStreaming && <span className="animate-pulse text-indigo-400">▌</span>}
          </p>
        )}

        {!state.content && !state.error && !state.isStreaming && !state.isDone && (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">Menunggu...</p>
        )}

        {extra}
      </div>

      {(state.isDone || state.isStreaming) && state.metrics.ttft !== null && (
        <ResponseMetrics metrics={state.metrics} isStreaming={state.isStreaming} />
      )}
    </div>
  )
}

interface DualProps {
  cloudState: StreamState
  localState: StreamState
  hideIdentity?: boolean
  swapped?: boolean
  cloudExtra?: React.ReactNode
  localExtra?: React.ReactNode
  threeColumns?: boolean
  localSmallState?: StreamState
}

export function DualColumn({ cloudState, localState, hideIdentity, swapped, cloudExtra, localExtra }: DualProps) {
  const col1 = swapped
    ? { label: 'Model B', state: localState, labelClass: 'bg-green-50 dark:bg-green-900/20', extra: localExtra }
    : { label: '☁️ Cloud', state: cloudState, labelClass: 'bg-blue-50 dark:bg-blue-900/20', extra: cloudExtra }
  const col2 = swapped
    ? { label: 'Model A', state: cloudState, labelClass: 'bg-blue-50 dark:bg-blue-900/20', extra: cloudExtra }
    : { label: '💻 Lokal', state: localState, labelClass: 'bg-green-50 dark:bg-green-900/20', extra: localExtra }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <StreamColumn
        label={col1.label}
        blindLabel={swapped ? 'Model B' : 'Model A'}
        labelClass={col1.labelClass}
        state={col1.state}
        hideIdentity={hideIdentity}
        extra={col1.extra}
      />
      <StreamColumn
        label={col2.label}
        blindLabel={swapped ? 'Model A' : 'Model B'}
        labelClass={col2.labelClass}
        state={col2.state}
        hideIdentity={hideIdentity}
        extra={col2.extra}
      />
    </div>
  )
}
