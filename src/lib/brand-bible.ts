import type { BrandBible } from '@/types'

const KEY = 'brand-creative-studio:brand-bible'

export function saveBrandBible(bible: BrandBible): void {
  localStorage.setItem(KEY, JSON.stringify(bible))
}

export function loadBrandBible(): BrandBible | null {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as BrandBible
  } catch {
    return null
  }
}

export function clearBrandBible(): void {
  localStorage.removeItem(KEY)
}
