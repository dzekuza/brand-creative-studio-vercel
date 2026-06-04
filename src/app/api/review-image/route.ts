import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { Platform } from '@/types'

type ReviewRequest = {
  imageBase64: string
  originalPrompt: string
  platform: Platform
}

export type ReviewResult = {
  decision: 'approve' | 'reject'
  reason: string
  improvedPrompt: string
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const { imageBase64, originalPrompt, platform }: ReviewRequest = await req.json()

  const aspectNote = platform.width > platform.height ? 'landscape' :
    platform.width === platform.height ? 'square' : 'tall vertical (story/portrait)'

  // Detect actual image format from base64 magic bytes
  function detectMediaType(b64: string): 'image/png' | 'image/jpeg' | 'image/webp' {
    if (b64.startsWith('/9j/')) return 'image/jpeg'
    if (b64.startsWith('iVBOR')) return 'image/png'
    if (b64.startsWith('UklGR')) return 'image/webp'
    return 'image/png'
  }

  const mediaType = detectMediaType(imageBase64)

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    temperature: 0,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          {
            type: 'text',
            text: `You are a creative director reviewing a background image for an ad creative.

Platform: ${platform.label} (${aspectNote}, ${platform.width}×${platform.height}px)
Original image prompt: "${originalPrompt}"

Evaluate this generated background image against these criteria:

1. **Product visibility** — Is the main product clearly visible and large enough? The product should occupy at least 30–40% of the frame and be the clear hero. If the product is too small, pushed to a corner, or visually lost, that's a reject.
2. **No text/watermarks** — The image must be clean of any text, captions, or watermarks (text will be composited separately). Any baked-in text = reject.
3. **Composition quality** — Is the layout well-composed for an ad? The bottom 35% should have a darker/gradient area suitable for headline text overlay. The product should be positioned in the upper-mid or center area.
4. **Overall quality** — Is it photorealistic, atmospheric, and editorial quality?

Respond with a JSON object ONLY (no markdown, no explanation outside JSON):
{
  "decision": "approve" or "reject",
  "reason": "one short sentence explaining why",
  "improvedPrompt": "if rejecting, write an improved version of the original prompt that fixes the issues — be specific about product size, positioning, and lighting; if approving, repeat the original prompt"
}`,
          },
        ],
      },
    ],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return NextResponse.json({ error: 'Reviewer returned invalid response', raw }, { status: 500 })
  }

  const result: ReviewResult = JSON.parse(jsonMatch[0])
  return NextResponse.json(result)
}
