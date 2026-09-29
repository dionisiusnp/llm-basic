import { useAppStore } from '../store/appStore'
import type { StreamOptions } from './useStream'

/**
 * Returns common live-mode options (provider, model overrides, thinking)
 * merged with caller-supplied options.
 */
export function useLiveOptions(overrides?: Partial<StreamOptions>): Partial<StreamOptions> {
  const { provider, cloudModel, localModel, thinking } = useAppStore()

  const effectiveProvider = overrides?.provider ?? (provider === 'both' ? 'cloud' : provider)

  return {
    provider: effectiveProvider,
    model: effectiveProvider === 'local'
      ? (localModel || undefined)
      : (cloudModel || undefined),
    thinking: effectiveProvider === 'local' ? thinking : undefined,
    ...overrides,
  }
}
