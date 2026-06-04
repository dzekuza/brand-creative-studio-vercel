import { buildCreativeHtml } from './html-compositor'
import type { CompositorInput } from '@/types'
import { PLATFORMS } from './platforms'

const base: CompositorInput = {
  backgroundImageBase64: 'iVBORw0KGgo=',
  brandBible: {
    colors: { primary: '#111', secondary: '#222', accent: '#f97316', background: '#fff', text: '#0f172a' },
    typography: { headingSize: '48px', bodySize: '24px', weight: '700', letterSpacing: '-0.02em' },
    layout: { padding: '60px', logoPosition: 'top-left' },
    tone: 'bold',
    rules: [],
  },
  fontUrls: ['/uploads/font.ttf'],
  fontNames: ['BrandFont'],
  iconSvgs: ['<svg><circle/></svg>'],
  headline: 'Big Headline',
  body: 'Body copy here.',
  platform: PLATFORMS[0],
}

test('buildCreativeHtml returns valid HTML string', () => {
  const html = buildCreativeHtml(base)
  expect(html).toContain('<!DOCTYPE html>')
  expect(html).toContain('BrandFont')
  expect(html).toContain('Big Headline')
  expect(html).toContain('Body copy here.')
})

test('buildCreativeHtml sets correct viewport dimensions', () => {
  const html = buildCreativeHtml(base)
  expect(html).toContain('width:1080px')
  expect(html).toContain('height:1080px')
})

test('buildCreativeHtml injects SVG icons', () => {
  const html = buildCreativeHtml(base)
  expect(html).toContain('<svg><circle/></svg>')
})

test('buildCreativeHtml injects background image as data URL', () => {
  const html = buildCreativeHtml(base)
  expect(html).toContain('data:image/jpeg;base64,iVBORw0KGgo=')
})

test('buildCreativeHtml escapes HTML in headline and body', () => {
  const html = buildCreativeHtml({ ...base, headline: '<script>alert(1)</script>', body: 'a & b' })
  expect(html).not.toContain('<script>alert')
  expect(html).toContain('&amp;')
})
