import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { BrandBible } from '@/types'

const client = new Anthropic()

const SYSTEM_PROMPT = `You are a brand strategist. Given brand information extracted from a real website, generate a brand bible as valid JSON. Return ONLY the JSON object, no markdown, no explanation.

The JSON must match this exact shape:
{
  "colors": {
    "primary": "<hex>",
    "secondary": "<hex>",
    "accent": "<hex>",
    "background": "<hex>",
    "text": "<hex>"
  },
  "typography": {
    "headingSize": "<px value like 64px>",
    "bodySize": "<px value like 28px>",
    "weight": "<number like 700>",
    "letterSpacing": "<em value like -0.02em>"
  },
  "layout": {
    "padding": "<px value like 60px>",
    "logoPosition": "top-left"
  },
  "tone": "<one sentence describing brand voice>",
  "tagline": "<short tagline — use the provided one if given, or invent from brand headings>",
  "rules": ["<short actionable layout/style rule>"]
}

logoPosition must be one of: "top-left", "top-right", "bottom-left", "bottom-right".
Use the real extracted colors from the website when provided — match them closely. Rules should be 3-5 short instructions.`

type BrandBibleRequest = {
  brandName: string
  about?: string
  url?: string
  fontName: string
  webFonts?: string[]
  iconNames: string[]
  colorPalette: string[]
  headings?: string[]
  tagline?: string
}

export async function POST(req: NextRequest) {
  const body: BrandBibleRequest = await req.json()

  const parts = [
    `Brand: ${body.brandName}`,
    body.url ? `Website: ${body.url}` : '',
    body.about ? `About: ${body.about}` : '',
    `Primary font in use: ${body.fontName}`,
    body.webFonts?.length ? `Other fonts found on site: ${body.webFonts.join(', ')}` : '',
    `Icons/SVGs: ${body.iconNames.join(', ') || 'none'}`,
    body.colorPalette.length
      ? `Colors extracted from website and style references: ${body.colorPalette.join(', ')}`
      : '',
    body.headings?.length
      ? `Real headings found on the website:\n${body.headings.map(h => `- "${h}"`).join('\n')}`
      : '',
    body.tagline ? `Meta description / tagline from site: "${body.tagline}"` : '',
  ].filter(Boolean).join('\n')

  for (let attempt = 0; attempt < 2; attempt++) {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: parts }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
    try {
      const bible = JSON.parse(text) as BrandBible
      return NextResponse.json(bible)
    } catch {
      if (attempt >= 1) {
        return NextResponse.json({ error: 'Failed to parse brand bible', raw: text }, { status: 500 })
      }
    }
  }
}
