import type { Creative, AdType, ImageModel } from '@/types'

const KEY = 'brand-creative-studio:history'
const RESTORE_KEY = 'brand-creative-studio:restore-session'
const MAX = 12

export type SessionConfig = {
  platformId: string
  imageModel: ImageModel
  adType: AdType | ''
  adContext: string
  imagePrompt: string
  headline: string
  body: string
  count: number
  selectedProductId: string
}

export type HistoryEntry = {
  id: string
  pngBase64: string
  platform: Creative['platform']
  timestamp: number
  sessionConfig?: SessionConfig
}

export function saveCreatives(creatives: Creative[], sessionConfig?: SessionConfig): void {
  const done = creatives.filter(c => c.status === 'done' && c.pngBase64)
  if (!done.length) return
  try {
    const existing = loadHistory()
    const incoming: HistoryEntry[] = done.map(c => ({
      id: c.id,
      pngBase64: c.pngBase64,
      platform: c.platform,
      timestamp: Date.now(),
      sessionConfig,
    }))
    // Deduplicate by id, newest first, cap at MAX
    const merged = [...incoming, ...existing.filter(e => !incoming.find(i => i.id === e.id))]
      .slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(merged))
  } catch {
    // localStorage quota — silently skip
  }
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw) as HistoryEntry[]
  } catch {
    return []
  }
}

export function clearHistory(): void {
  localStorage.removeItem(KEY)
}

export function saveRestoreSession(config: SessionConfig): void {
  try {
    localStorage.setItem(RESTORE_KEY, JSON.stringify(config))
  } catch {}
}

export function loadRestoreSession(): SessionConfig | null {
  try {
    const raw = localStorage.getItem(RESTORE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SessionConfig
  } catch {
    return null
  }
}

export function clearRestoreSession(): void {
  localStorage.removeItem(RESTORE_KEY)
}
