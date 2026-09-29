import { create } from 'zustand'

export type AppMode = 'simulasi' | 'live'
export type Provider = 'cloud' | 'local' | 'both'

interface HealthStatus {
  ok: boolean
  error?: string
  models?: string[]
}

interface AppState {
  mode: AppMode
  provider: Provider
  presentationMode: boolean
  darkMode: boolean
  thinking: boolean
  cloudModel: string
  localModel: string
  health: { cloud: HealthStatus; local: HealthStatus & { models?: string[] } }
  setMode: (m: AppMode) => void
  setProvider: (p: Provider) => void
  setPresentationMode: (v: boolean) => void
  toggleDarkMode: () => void
  toggleThinking: () => void
  setCloudModel: (m: string) => void
  setLocalModel: (m: string) => void
  setHealth: (h: { cloud: HealthStatus; local: HealthStatus }) => void
}

export const useAppStore = create<AppState>((set) => ({
  mode: 'simulasi',
  provider: 'cloud',
  presentationMode: false,
  darkMode: false,
  thinking: false,
  cloudModel: '',
  localModel: '',
  health: { cloud: { ok: false }, local: { ok: false } },
  setMode: (mode) => set({ mode }),
  setProvider: (provider) => set({ provider }),
  setPresentationMode: (presentationMode) => set({ presentationMode }),
  toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
  toggleThinking: () => set((s) => ({ thinking: !s.thinking })),
  setCloudModel: (cloudModel) => set({ cloudModel }),
  setLocalModel: (localModel) => set({ localModel }),
  setHealth: (health) => set({ health }),
}))
