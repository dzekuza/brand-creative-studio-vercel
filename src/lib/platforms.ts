import type { Platform } from '@/types'

export const PLATFORMS: Platform[] = [
  { id: 'instagram-square', label: 'Instagram 1:1', width: 1080, height: 1080 },
  { id: 'instagram-story', label: 'Instagram Story 9:16', width: 1080, height: 1920 },
  { id: 'facebook-feed', label: 'Facebook Feed', width: 1200, height: 628 },
  { id: 'banner', label: 'Leaderboard Banner', width: 728, height: 90 },
]

export function getPlatform(id: string): Platform {
  const p = PLATFORMS.find(p => p.id === id)
  if (!p) throw new Error(`Unknown platform: ${id}`)
  return p
}
