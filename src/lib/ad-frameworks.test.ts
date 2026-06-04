import { AD_FRAMEWORKS, imageCopyHint, htmlCopyGuidance, bulkFramework } from './ad-frameworks'
import type { AdType } from '@/types'

const AD_TYPES: AdType[] = ['brand-awareness', 'sales', 'product-launch', 'engagement', 'custom']

test('every AdType resolves in all three views', () => {
  for (const t of AD_TYPES) {
    expect(AD_FRAMEWORKS[t]).toBeDefined()
    expect(imageCopyHint(t).length).toBeGreaterThan(0)
    expect(htmlCopyGuidance(t).length).toBeGreaterThan(0)
    expect(bulkFramework(t).rule.length).toBeGreaterThan(0)
    expect(bulkFramework(t).framework.length).toBeGreaterThan(0)
  }
})

test('unknown ad type falls back to custom', () => {
  expect(imageCopyHint('nope')).toBe(AD_FRAMEWORKS['custom'].imageHint)
  expect(htmlCopyGuidance(undefined)).toBe(AD_FRAMEWORKS['custom'].htmlGuidance)
})

test('frameworks map to expected models', () => {
  expect(bulkFramework('brand-awareness').framework).toBe('AIDA')
  expect(bulkFramework('sales').framework).toBe('PAS')
})
