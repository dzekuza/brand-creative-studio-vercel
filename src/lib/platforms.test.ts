import { getPlatform, PLATFORMS } from './platforms'

test('PLATFORMS has required entries', () => {
  const ids = PLATFORMS.map(p => p.id)
  expect(ids).toContain('instagram-square')
  expect(ids).toContain('instagram-story')
  expect(ids).toContain('facebook-feed')
})

test('getPlatform returns correct dimensions for instagram-square', () => {
  const p = getPlatform('instagram-square')
  expect(p.width).toBe(1080)
  expect(p.height).toBe(1080)
})

test('getPlatform throws for unknown id', () => {
  expect(() => getPlatform('unknown')).toThrow()
})
