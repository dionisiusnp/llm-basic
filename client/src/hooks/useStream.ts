import { useCallback, useRef, useState } from 'react'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_call_id?: string
  tool_calls?: ToolCall[]
}

export interface ToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export interface StreamOptions {
  provider?: 'cloud' | 'local'
  model?: string
  messages: ChatMessage[]
  systemPrompt?: string
  temperature?: number
  logprobs?: boolean
  topLogprobs?: number
  responseFormat?: object
  tools?: object[]
  thinking?: boolean
}

export interface StreamMetrics {
  ttft: number | null
  totalTime: number | null
  tokensPerSecond: number | null
  promptTokens: number | null
  completionTokens: number | null
  totalTokens: number | null
  model: string | null
  provider: string | null
}

export interface StreamState {
  content: string
  thinkingContent: string
  toolCalls: ToolCall[]
  metrics: StreamMetrics
  error: string | null
  isStreaming: boolean
  isDone: boolean
}

const EMPTY_METRICS: StreamMetrics = {
  ttft: null, totalTime: null, tokensPerSecond: null,
  promptTokens: null, completionTokens: null, totalTokens: null,
  model: null, provider: null,
}

const EMPTY_STATE: StreamState = {
  content: '', thinkingContent: '', toolCalls: [],
  metrics: EMPTY_METRICS, error: null, isStreaming: false, isDone: false,
}

export function useStream() {
  const [state, setState] = useState<StreamState>(EMPTY_STATE)
  const abortRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState(EMPTY_STATE)
  }, [])

  const stream = useCallback(async (options: StreamOptions): Promise<StreamState> => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setState({ ...EMPTY_STATE, isStreaming: true })

    const startTime = performance.now()
    let firstTokenTime: number | null = null
    let content = ''
    let thinkingContent = ''
    let inThinking = false
    const toolCalls: ToolCall[] = []
    let finalMetrics = { ...EMPTY_METRICS, provider: options.provider ?? 'cloud' }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
        signal: ctrl.signal,
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') continue

          let chunk: Record<string, unknown>
          try { chunk = JSON.parse(raw) } catch { continue }

          // Error from server
          if (chunk.error) {
            setState(prev => ({ ...prev, error: chunk.error as string, isStreaming: false, isDone: true }))
            return { ...EMPTY_STATE, error: chunk.error as string, isDone: true }
          }

          // Usage chunk (last chunk with stream_options include_usage)
          if (chunk.usage) {
            const u = chunk.usage as { prompt_tokens: number; completion_tokens: number; total_tokens: number }
            const totalTime = performance.now() - startTime
            const tokensPerSecond = u.completion_tokens / (totalTime / 1000)
            finalMetrics = {
              ...finalMetrics,
              promptTokens: u.prompt_tokens,
              completionTokens: u.completion_tokens,
              totalTokens: u.total_tokens,
              ttft: firstTokenTime,
              totalTime,
              tokensPerSecond,
              model: (chunk as { model?: string }).model ?? finalMetrics.model,
            }
          }

          const choices = (chunk as { choices?: Array<{ delta?: { content?: string; reasoning_content?: string; tool_calls?: ToolCall[] }; model?: string }> }).choices
          if (!choices?.length) continue

          const delta = choices[0].delta
          if (!delta) continue

          if (firstTokenTime === null && (delta.content || delta.reasoning_content || delta.tool_calls)) {
            firstTokenTime = performance.now() - startTime
          }

          // Thinking content (Qwen3 style)
          if (delta.reasoning_content) {
            thinkingContent += delta.reasoning_content
          }

          // Normal content — handle <think> tags if model uses them
          if (delta.content) {
            if (delta.content.includes('<think>')) inThinking = true
            if (inThinking) {
              thinkingContent += delta.content.replace(/<\/?think>/g, '')
              if (delta.content.includes('</think>')) inThinking = false
            } else {
              content += delta.content
            }
          }

          // Tool calls
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (!toolCalls[tc.index ?? 0]) {
                toolCalls[tc.index ?? 0] = { id: tc.id ?? '', type: 'function', function: { name: '', arguments: '' } }
              }
              const existing = toolCalls[tc.index ?? 0]
              if (tc.function?.name) existing.function.name += tc.function.name
              if (tc.function?.arguments) existing.function.arguments += tc.function.arguments
            }
          }

          setState({
            content, thinkingContent, toolCalls: [...toolCalls],
            metrics: finalMetrics, error: null, isStreaming: true, isDone: false,
          })
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return { ...EMPTY_STATE, isDone: true }
      const msg = (err as Error).message || 'Koneksi gagal'
      setState(prev => ({ ...prev, error: msg, isStreaming: false, isDone: true }))
      return { ...EMPTY_STATE, error: msg, isDone: true }
    }

    const finalState: StreamState = {
      content, thinkingContent, toolCalls,
      metrics: finalMetrics, error: null, isStreaming: false, isDone: true,
    }
    setState(finalState)
    return finalState
  }, [])

  return { state, stream, reset }
}
