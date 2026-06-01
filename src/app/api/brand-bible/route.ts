import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { BrandBible } from '@/types'

const client = new Anthropic()

const SYSTEM_PROMPT = `You are a brand strategist. Given product information, font, icons, and extracted colors from style references, generate a brand bible as valid JSON. Return ONLY the JSON object, no markdown, no explanation.

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
  "tagline": "<optional short tagline>",
  "rules": ["<short rule>", "<short rule>"]
}

logoPosition must be one of: "top-left", "top-right", "bottom-left", "bottom-right".
Choose colors that harmonise with the extracted palette. Rules should be 3-5 short actionable layout/style instructions.`

type BrandBibleRequest = {
  productName: string
  description: string
  fontName: string
  iconNames: string[]
  colorPalette: string[]
  styleRefDescriptions?: string[]
}

export async function POST(req: NextRequest) {
  const body: BrandBibleRequest = await req.json()

  const userMessage = `Product: ${body.productName}
Description: ${body.description}
Font: ${body.fontName}
Icons/SVGs: ${body.iconNames.join(', ') || 'none'}
Extracted colors from style references: ${body.colorPalette.join(', ') || 'none'}${body.styleRefDescriptions?.length ? '\nStyle reference descriptions: ' + body.styleRefDescriptions.join('; ') : ''}`

  for (let attempt = 0; attempt < 2; attempt++) {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
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
