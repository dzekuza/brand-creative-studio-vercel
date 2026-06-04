import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { BrandBible } from '@/types'

const client = new Anthropic()

const SYSTEM_PROMPT = `You are a senior brand strategist at a world-class creative agency. Given brand information extracted from a real website, generate a comprehensive, detailed brand bible as valid JSON. Return ONLY the JSON object — no markdown, no code fences, no explanation.

The JSON must match this exact shape:
{
  "colors": {
    "primary": "<hex — main brand color>",
    "secondary": "<hex — supporting color>",
    "accent": "<hex — highlight/CTA color>",
    "background": "<hex — page/canvas background>",
    "text": "<hex — primary text color>"
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
  "tone": "<one punchy sentence summarizing the brand voice>",
  "tagline": "<short memorable tagline — use the provided one if given, or craft one from the brand headings>",
  "rules": ["<short actionable layout/style rule — write 5 specific rules>"],

  "brandStory": "<2–3 rich paragraphs: the brand's origin story, the problem it solves, what makes it special, and the emotional journey it creates for customers. Be specific and evocative, not generic. Minimum 150 words.>",

  "mission": "<One clear, inspiring mission statement that captures WHY this brand exists — the change it wants to make in the world or in customers' lives. 2–3 sentences.>",

  "targetAudience": "<Detailed description of the ideal customer: demographics, psychographics, lifestyle, pain points, aspirations, and what motivates them to buy. Be specific — write as if describing a real person. Minimum 80 words.>",

  "personality": ["<personality trait 1>", "<personality trait 2>", "<personality trait 3>", "<personality trait 4>", "<personality trait 5>"],

  "voiceAndTone": {
    "description": "<2–3 sentences describing the overall voice: how the brand speaks, the emotional register, the style of language — formal vs casual, poetic vs direct, warm vs professional.>",
    "dos": ["<specific writing do — e.g., 'Use active voice and short punchy sentences'>", "<do 2>", "<do 3>", "<do 4>", "<do 5>"],
    "donts": ["<specific writing don't — e.g., 'Never use jargon or corporate-speak'>", "<don't 2>", "<don't 3>", "<don't 4>", "<don't 5>"]
  },

  "imageryStyle": "<2–3 sentences describing the visual/photography direction: lighting style, color grading, subject matter, composition preferences, mood and atmosphere. Enough detail for a photographer to brief a shoot.>",

  "messagingPillars": [
    "<core message pillar 1 — one sentence each, the 3–5 fundamental truths the brand communicates>",
    "<core message pillar 2>",
    "<core message pillar 3>",
    "<core message pillar 4>"
  ],

  "competitorDifferentiators": [
    "<specific differentiator 1 — what sets this brand apart from competitors>",
    "<differentiator 2>",
    "<differentiator 3>"
  ],

  "colorUsageNotes": "<2–3 sentences on how to apply the color palette: which color leads in which context, how to combine them, what to avoid, how background/text pairings should work.>",

  "typographyNotes": "<2–3 sentences on typography application: when to use heavy weight vs light, how to handle hierarchy, any specific typographic personality traits like tight tracking or oversized numerals.>"
}

logoPosition must be one of: "top-left", "top-right", "bottom-left", "bottom-right".
Use real extracted colors from the website when provided. The long-form fields (brandStory, mission, targetAudience, etc.) must be substantive and specific to THIS brand — never generic filler. Write with the confidence and craft of an agency with 20 years of brand strategy experience.`

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
  category?: string
}

export async function POST(req: NextRequest) {
  const body: BrandBibleRequest = await req.json()

  const parts = [
    `Brand: ${body.brandName}`,
    body.url ? `Website: ${body.url}` : '',
    body.category ? `Brand category: ${body.category}` : '',
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
      max_tokens: 4096,
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
