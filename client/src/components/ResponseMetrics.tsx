import type { StreamMetrics } from '../hooks/useStream'

interface Props {
  metrics: StreamMetrics
  isStreaming?: boolean
}

function fmt(n: number | null, decimals = 0): string {
  if (n === null) return '—'
  return decimals > 0 ? n.toFixed(decimals) : Math.round(n).toString()
}

function fmtMs(ms: number | null): string {
  if (ms === null) return '—'
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`
}

function fmtRupiah(usd: number | null): string {
  if (usd === null) return '—'
  const idr = usd * 16000
  if (idr < 1) return '< Rp 1'
  return `Rp ${Math.round(idr).toLocaleString('id-ID')}`
}

export default function ResponseMetrics({ metrics, isStreaming }: Props) {
  const { model, provider, ttft, totalTime, tokensPerSecond, promptTokens, completionTokens, totalTokens } = metrics

  const cloudInputPrice = parseFloat(import.meta.env.VITE_CLOUD_PRICE_INPUT_PER_1M ?? '0') || 0
  const cloudOutputPrice = parseFloat(import.meta.env.VITE_CLOUD_PRICE_OUTPUT_PER_1M ?? '0') || 0
  const isCloud = provider === 'cloud'

  let costUsd: number | null = null
  if (isCloud && cloudInputPrice > 0 && promptTokens !== null && completionTokens !== null) {
    costUsd = (promptTokens / 1_000_000) * cloudInputPrice + (completionTokens / 1_000_000) * cloudOutputPrice
  }

  return (
    <div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
        {model && (
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {provider === 'cloud' ? '☁️' : '💻'} {model}
          </span>
        )}
        <span title="Waktu ke token pertama">
          ⚡ TTFT: <span className="text-gray-700 dark:text-gray-200">{isStreaming ? '…' : fmtMs(ttft)}</span>
        </span>
        <span title="Total waktu">
          ⏱ Total: <span className="text-gray-700 dark:text-gray-200">{isStreaming ? '…' : fmtMs(totalTime)}</span>
        </span>
        {tokensPerSecond !== null && !isStreaming && (
          <span title="Token per detik">
            🚀 {fmt(tokensPerSecond, 0)} tok/s
          </span>
        )}
        {totalTokens !== null && (
          <span title={`Input: ${promptTokens} · Output: ${completionTokens}`}>
            📊 {promptTokens ?? '?'} + {completionTokens ?? '?'} = {totalTokens} token
          </span>
        )}
        {isCloud ? (
          <span title="Estimasi biaya">
            💰 {costUsd !== null ? `$${costUsd.toFixed(6)} · ${fmtRupiah(costUsd)}` : 'Isi harga di .env'}
          </span>
        ) : (
          <span className="text-green-600 dark:text-green-400" title="Model lokal tidak ada biaya API">
            💚 Rp 0 <span className="text-gray-400">(biaya listrik & hardware)</span>
          </span>
        )}
      </div>
    </div>
  )
}
