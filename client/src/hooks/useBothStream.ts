import { useCallback, useRef, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { useStream, type StreamOptions, type StreamState } from './useStream'

const EMPTY: StreamState = {
  content: '', thinkingContent: '', toolCalls: [],
  metrics: { ttft: null, totalTime: null, tokensPerSecond: null, promptTokens: null, completionTokens: null, totalTokens: null, model: null, provider: null },
  error: null, isStreaming: false, isDone: false,
}

/**
 * Runs the same request against both cloud and local simultaneously.
 * Returns two independent StreamState objects.
 */
export function useBothStream() {
  const cloudStream = useStream()
  const localStream = useStream()
  const { cloudModel, localModel, thinking } = useAppStore()
  const [isRunning, setIsRunning] = useState(false)
  const abortRef = useRef(false)

  const run = useCallback(async (base: Omit<StreamOptions, 'provider' | 'model' | 'thinking'>) => {
    abortRef.current = false
    setIsRunning(true)

    await Promise.allSettled([
      cloudStream.stream({
        ...base,
        provider: 'cloud',
        model: cloudModel || undefined,
      }),
      localStream.stream({
        ...base,
        provider: 'local',
        model: localModel || undefined,
        thinking,
      }),
    ])

    setIsRunning(false)
  }, [cloudStream, localStream, cloudModel, localModel, thinking])

  const reset = useCallback(() => {
    abortRef.current = true
    cloudStream.reset()
    localStream.reset()
    setIsRunning(false)
  }, [cloudStream, localStream])

  return { cloudState: cloudStream.state, localState: localStream.state, run, reset, isRunning }
}
