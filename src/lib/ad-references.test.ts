import { adReferenceGuidance } from './ad-references'
import type { BrandCategory } from '@/types'

const CATEGORIES: BrandCategory[] = [
  'physical-product', 'mobile-app', 'saas', 'ecommerce', 'service', 'beauty-wellness', 'food-beverage',
]

test('every category produces non-empty guidance', () => {
  for (const c of CATEGORIES) {
    expect(adReferenceGuidance(c, false).length).toBeGreaterThan(0)
    expect(adReferenceGuidance(c, true).length).toBeGreaterThan(0)
  }
  expect(adReferenceGuidance(undefined, true).length).toBeGreaterThan(0)
})

test('app and physical categories give different guidance', () => {
  expect(adReferenceGuidance('mobile-app', true)).not.toBe(adReferenceGuidance('physical-product', true))
})

test('app guidance forbids physical-product props; physical leads with packshot', () => {
  expect(adReferenceGuidance('mobile-app', false).toLowerCase()).toContain('app screen is the hero')
  expect(adReferenceGuidance('physical-product', false).toLowerCase()).toContain('packshot')
})

test('withCopy adds copy guidance beyond composition-only', () => {
  const compositionOnly = adReferenceGuidance('mobile-app', false)
  const withCopy = adReferenceGuidance('mobile-app', true)
  expect(withCopy.length).toBeGreaterThan(compositionOnly.length)
  expect(withCopy).toContain(compositionOnly)
})
