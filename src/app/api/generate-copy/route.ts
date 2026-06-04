import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { bulkFramework } from '@/lib/ad-frameworks'
import type { BrandBible, BulkAdConfig, BulkAdCopy, AdType } from '@/types'

type GenerateCopyRequest = {
  config: BulkAdConfig
  brandBible: BrandBible
}

const PLATFORM_RULES: Record<string, string> = {
  facebook: 'Facebook/Meta: primary_text max 125 chars visible, headline max 40 chars, description max 30 chars',
  instagram: 'Instagram: primary_text max 125 chars visible, headline max 40 chars, description max 30 chars',
  google: 'Google Ads: headlines max 30 chars each (provide 3), descriptions max 90 chars each (provide 2)',
  linkedin: 'LinkedIn: headline max 70 chars, introductory text max 150 chars recommended, description max 100 chars',
  tiktok: 'TikTok: ad text max 100 chars, headline max 40 chars, energetic and trend-aware tone',
}

function buildSystemPrompt(config: BulkAdConfig, brandBible: BrandBible): string {
  const platformRules = config.platforms
    .map(p => PLATFORM_RULES[p] ?? `${p}: follow standard ad copy best practices`)
    .join('\n')

  const adTypes: AdType[] = ['brand-awareness', 'sales', 'product-launch', 'engagement']

  return `You are an expert ad copywriter. Generate exactly ${config.count} ad copies as a JSON array.

BRAND CONTEXT:
- Tone: ${brandBible.tone}
${brandBible.tagline ? `- Tagline: ${brandBible.tagline}` : ''}
- Brand rules: ${brandBible.rules.join(', ')}

PRODUCT/SERVICE:
- Type: ${config.productType}
- Category: ${config.subcategory}
- Description: ${config.description}
- Target audience: ${config.targetAudience}

PLATFORM RULES (enforce strictly):
${platformRules}

AD COPYWRITING FRAMEWORKS:
${adTypes.map(t => `- ${t}: ${bulkFramework(t).rule}`).join('\n')}

Pick the framework that matches the audience's awareness level: AIDA for unaware/aspirational audiences, PAS for problem-aware audiences, BAB (before–after–bridge) for solution-aware audiences.

OUTPUT REQUIREMENTS:
- Return ONLY a valid JSON array, no markdown fences, no explanation
- Before returning, verify every field is within its platform's character limit (see PLATFORM RULES); rewrite any field that is over the limit until it fits
- Spread copies across these platforms evenly: ${config.platforms.join(', ')}
- Vary the adType across copies (use: brand-awareness, sales, product-launch, engagement)
- Each object must have: id (string), platform (one of: ${config.platforms.join(', ')}), adType, headline, body, cta, descriptions (string array)
- headline: short punchy headline within platform char limit
- body: main copy text within platform char limit
- cta: call-to-action button text (2–4 words)
- descriptions: 1–2 supporting description strings within platform char limit
- Never exceed platform character limits

Example structure (do NOT copy content, only structure):
[{"id":"1","platform":"facebook","adType":"sales","headline":"Save 40% Today","body":"Tired of overpaying? Our solution cuts costs instantly.","cta":"Shop Now","descriptions":["Limited offer","Join 10,000+ happy customers"]}]`
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as GenerateCopyRequest
    const { config, brandBible } = body

    if (!config || !brandBible) {
      return NextResponse.json({ error: 'Missing config or brandBible' }, { status: 400 })
    }
    if (!config.platforms || config.platforms.length === 0) {
      return NextResponse.json({ error: 'At least one platform required' }, { status: 400 })
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      temperature: 0.9,
      system: buildSystemPrompt(config, brandBible),
      messages: [
        {
          role: 'user',
          content: `Generate ${config.count} ad copies for a ${config.productType} in the ${config.subcategory} space targeting ${config.targetAudience}. Return only the JSON array.`,
        },
      ],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''

    // Strip markdown fences if present
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim()

    let copies: BulkAdCopy[]
    try {
      const parsed = JSON.parse(cleaned) as unknown[]
      copies = (parsed as BulkAdCopy[]).map((item, idx) => ({
        ...item,
        id: item.id ?? String(idx + 1),
        status: 'pending' as const,
      }))
    } catch {
      return NextResponse.json({ error: 'Failed to parse Claude response as JSON', raw }, { status: 500 })
    }

    return NextResponse.json({ copies })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
