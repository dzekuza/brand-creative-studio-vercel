import { saveBrandBible, loadBrandBible, clearBrandBible } from './brand-bible'
import type { BrandBible } from '@/types'

const mockBible: BrandBible = {
  colors: { primary: '#111', secondary: '#222', accent: '#f97316', background: '#fff', text: '#000' },
  typography: { headingSize: '48px', bodySize: '24px', weight: '700', letterSpacing: '-0.02em' },
  layout: { padding: '60px', logoPosition: 'top-left' },
  tone: 'bold',
  rules: ['Use accent for CTA'],
}

const store: Record<string, string> = {}
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { Object.keys(store).forEach(k => delete store[k]) },
    length: 0,
    key: () => null,
  },
  writable: true,
})

beforeEach(() => { Object.keys(store).forEach(k => delete store[k]) })

test('loadBrandBible returns null when nothing saved', () => {
  expect(loadBrandBible()).toBeNull()
})

test('saveBrandBible persists and loadBrandBible retrieves it', () => {
  saveBrandBible(mockBible)
  const loaded = loadBrandBible()
  expect(loaded?.colors.accent).toBe('#f97316')
  expect(loaded?.rules).toContain('Use accent for CTA')
})

test('clearBrandBible removes it', () => {
  saveBrandBible(mockBible)
  clearBrandBible()
  expect(loadBrandBible()).toBeNull()
})
