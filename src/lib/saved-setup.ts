import type { UploadedAssets } from '@/types'

const KEY = 'brand-creative-studio:setup'

export type SavedSetup = {
  productName: string
  description: string
  assets: Partial<UploadedAssets>
}

export function saveSetup(setup: SavedSetup): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(setup))
  } catch {
    // localStorage quota exceeded — silently ignore
  }
}

export function loadSetup(): SavedSetup | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as SavedSetup
  } catch {
    return null
  }
}

export function clearSetup(): void {
  localStorage.removeItem(KEY)
}
