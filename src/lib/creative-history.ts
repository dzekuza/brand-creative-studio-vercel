import type { Creative } from '@/types'

const KEY = 'brand-creative-studio:history'
const MAX = 12

export type HistoryEntry = {
  id: string
  pngBase64: string
  platform: Creative['platform']
  timestamp: number
}

export function saveCreatives(creatives: Creative[]): void {
  const done = creatives.filter(c => c.status === 'done' && c.pngBase64)
  if (!done.length) return
  try {
    const existing = loadHistory()
    const incoming: HistoryEntry[] = done.map(c => ({
      id: c.id,
      pngBase64: c.pngBase64,
      platform: c.platform,
      timestamp: Date.now(),
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
