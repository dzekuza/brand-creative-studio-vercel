import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { v4 as uuidv4 } from 'uuid'
import type { BrandBible, LayoutSketch, Platform } from '@/types'

type RequestBody = {
  platform: Platform
  brandBible: BrandBible
  prompt: string
}

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { platform, brandBible, prompt }: RequestBody = await req.json()

  const ar = platform.width / platform.height
  const isStory  = ar < 0.7
  const isSquare = Math.abs(ar - 1) < 0.2
  const isBanner = ar > 5
  const formatLabel = isStory ? 'vertical 9:16 story' : isSquare ? 'square 1:1' : isBanner ? 'wide leaderboard banner' : 'landscape 16:9'

  const svgW = isStory ? 120 : isBanner ? 280 : 180
  const svgH = isStory ? 200 : isBanner ? 60 : isSquare ? 180 : 110

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    system: `You are a creative director generating layout wireframe concepts for ad creatives.
Return ONLY valid JSON — an array of exactly 3 objects. No markdown, no explanation, no code fences.
Each object: { "description": string, "svgData": string }

description: 1 short sentence describing the composition (product placement, mood, text position).
svgData: a complete inline SVG (width="${svgW}" height="${svgH}") showing zones in grayscale:
  - Dark rect for background (#1a1a1a or #2a2a2a)
  - Medium rect for product zone (#555, labeled "PRODUCT")
  - Light rect for headline zone (#888, labeled "HEAD")
  - Lighter rect for body copy zone (#aaa, labeled "BODY") — omit for banner
  - Small squares for icon strip (#666, labeled "ICONS") if applicable
  - All text labels in white, font-size 8px or 7px
  - Simple, clean, no gradients, no complex shapes
  - Vary the 3 concepts: product left vs right vs centered, copy top vs bottom, etc.`,
    messages: [
      {
        role: 'user',
        content: `Format: ${formatLabel} (${platform.width}×${platform.height}px)
Brand tone: ${brandBible.tone}
User prompt: ${prompt}
Generate 3 varied layout concepts as a JSON array.`,
      },
    ],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

  let parsed: { description: string; svgData: string }[]
  try {
    const jsonStr = raw.startsWith('[') ? raw : raw.replace(/^[^[]*/, '').replace(/[^\]]*$/, '')
    parsed = JSON.parse(jsonStr)
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('empty')
  } catch {
    return NextResponse.json({ error: 'Failed to parse sketches from Claude', raw }, { status: 500 })
  }

  const sketches: LayoutSketch[] = parsed.slice(0, 3).map(s => ({
    id: uuidv4(),
    svgData: s.svgData ?? '',
    description: s.description ?? '',
  }))

  return NextResponse.json({ sketches })
}
