import { NextRequest, NextResponse } from 'next/server'
import { readFile, realpath } from 'fs/promises'
import { join, sep } from 'path'
import Anthropic from '@anthropic-ai/sdk'
import { fetchBlobAsset } from '@/lib/fetch-blob'
import type { CompositorInput } from '@/types'

const FONT_MIME: Record<string, string> = {
  woff2: 'font/woff2',
  woff:  'font/woff',
  ttf:   'font/ttf',
  otf:   'font/otf',
}
const IMAGE_MIME: Record<string, string> = {
  png:  'image/png',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg:  'image/svg+xml',
}

const ALLOWED_FONT_EXTS  = new Set(['woff2', 'woff', 'ttf', 'otf'])
const ALLOWED_IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'svg'])

async function uploadsFileToDataUri(url: string, allowedExts: Set<string>, mimeMap: Record<string, string>): Promise<string> {
  const ext = url.split('.').pop()?.toLowerCase() ?? ''
  if (!allowedExts.has(ext)) throw new Error(`Extension .${ext} not allowed`)

  if (url.startsWith('https://') || url.startsWith('http://')) {
    const expectedMime = mimeMap[ext]
    const { buffer, mimeType } = await fetchBlobAsset(url, expectedMime)
    const mime = mimeMap[ext] ?? mimeType
    return `data:${mime};base64,${buffer.toString('base64')}`
  }

  // Local dev: read from public/ filesystem
  if (!/^\/uploads\/[^/\\]+$/.test(url) || url.includes('..')) {
    throw new Error('Invalid upload path')
  }
  const publicRoot = await realpath(join(process.cwd(), 'public'))
  const candidate  = join(publicRoot, url)
  const resolved   = await realpath(candidate)
  if (resolved !== publicRoot && !resolved.startsWith(publicRoot + sep)) {
    throw new Error('Invalid upload path')
  }
  const mime = mimeMap[ext]!
  const buf  = await readFile(resolved)
  return `data:${mime};base64,${buf.toString('base64')}`
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const AD_TYPE_COPY_GUIDANCE: Record<string, string> = {
  'brand-awareness': 'Write emotionally resonant, aspirational copy. Headline: short, poetic, evocative (3–6 words). Body: brand feeling, not features. No hard sell. Tone: warm, confident, human.',
  'sales':           'Write offer-first, conversion-focused copy. Headline: lead with the benefit or discount (e.g. "50% OFF", "Limited Drop"). Body: urgency + clear value proposition. Include a short CTA phrase (e.g. "Shop Now", "Get Yours").',
  'product-launch':  'Write excitement-building copy. Headline: announcement framing ("Introducing", "Meet", "Now Available"). Body: 1 key differentiator + novelty hook. Tone: energetic, confident.',
  'engagement':      'Write community-first, relatable copy. Headline: question, challenge, or bold opinion. Body: invite participation or reaction. Tone: conversational, fun, authentic.',
  'custom':          'Write copy exactly matching the campaign context provided. Use the tone, angle, and messaging described.',
}

function buildSystemPrompt(hasLogo: boolean): string {
  const logoSection = hasLogo ? `
## LOGO PLACEMENT

A brand logo is provided. Place it using this exact img tag — do NOT expand or replace the placeholder:
  <img src="__LOGO_DATA_URI__" alt="logo" style="...">

- Position at the logoPosition corner from brand_context (e.g. top-left → top: 60px; left: 60px)
- Keep it small: height 40–60px, width auto, preserving aspect ratio
- Never stretch, filter, or recolor the logo
- Use \`object-fit: contain\` if using CSS sizing
` : `
## LOGO

No logo provided. Do not add any logo placeholder or logo element to the HTML.
`

  return `You are a senior art director at a top creative agency specializing in bold editorial advertising. Your task is to produce a single complete HTML document that will be used for Puppeteer screenshotting. The HTML must overlay typography and icons onto a background product photo at exact pixel dimensions.

You will be provided with complete brand context including canvas dimensions, brand colors, typography specifications, copy, and assets:

<brand_context>
{{BRAND_CONTEXT}}
</brand_context>

## CRITICAL BACKGROUND IMAGE RULE

The background image MUST use EXACTLY this string as the CSS background-image value:
  url('data:image/png;base64,__BG_IMAGE__')

Do NOT replace or expand __BG_IMAGE__ — output it literally as shown above. It will be substituted server-side. This is non-negotiable.

## THE #1 DESIGN PRINCIPLE — IMAGE IS THE HERO

The product photograph is the entire point of this creative. Never bury it.

**Strict rules:**
- NO full-canvas overlay, gradient wash, or dark scrim covering the image
- NO semi-transparent boxes or cards behind text blocks
- At most, you may place a LOCALIZED text-legibility aid only directly behind/below text — a blurred radial gradient or tight linear gradient of at most 0.35 opacity covering no more than 25% of the canvas edge where text sits
- Text legibility comes primarily from strong CSS text-shadow (0 2px 32px rgba) and bold font weight — NOT from covering the image
- Let the product image breathe and dominate the composition

## AD COPY GENERATION

{{COPY_INSTRUCTIONS}}

## TYPOGRAPHY STYLE — EDITORIAL POSTER

Think: large-format poster, fashion editorial, modern product campaign.

**Font sizing — ALWAYS use vw units, never px for text:**
- Headline: 14vw–20vw (tall story), 10vw–14vw (square), 7vw–10vw (landscape)
- Overline / brand label: 2.8vw–3.5vw
- Body copy / tagline lines: 2.8vw–3.5vw — this must be clearly readable, never below 2.5vw
- Icon labels: 1.8vw–2.2vw
- Vertical edge text: 1.4vw–1.8vw
- Stat callouts (e.g. "30g PROTEIN"): headline number at 6vw–8vw, unit label at 2vw

**Headline rules:**
- MASSIVE scale using vw — the headline should feel oversized and intentional
- Break the headline into 2–3 stacked lines, flush-left, for visual drama
- Use font-weight 800–900, letter-spacing -0.02em to -0.04em (tight tracking), line-height 0.9–1.0
- Let the headline overlap the product image — that visual tension is intentional art direction
- Use the brand accent color for ONE word or line to create contrast; leave the rest in the brand text color
- Apply the custom font loaded via @font-face

**Placement patterns — choose based on platform:**
- A) Bottom-left anchor: headline flush to bottom-left corner, small overline/tagline at top-left, brand mark top-right or top-left
- B) Top-left bleed: giant headline starting at top-left and bleeding into the image, secondary text at bottom-left, brand mark top-right
- C) Split diagonal: top text block on one side, bottom text block on opposite side, product centered between them
- Never center-align everything. Never stack all text in one rectangular block in the middle.

**Secondary text:**
- Overline (uppercase, letter-spacing 0.14em, font-size 3vw, font-weight 600) in accent color or full white — placed above or below headline. Opacity 0.9 minimum.
- Body copy: 3vw minimum, opacity 0.9 minimum, maximum 2 lines, positioned away from the headline so the layout breathes. Must be clearly readable at a glance — if it feels small, go bigger.
- Optional: vertical edge text rotated 90° — 1.5vw, opacity 0.75 minimum, full white or accent color

**Font rules:**
- Always load the provided custom font via @font-face using the font URL from brand_context
- Use the custom font for the headline
- Body/labels may fall back to system sans-serif (system-ui, -apple-system, sans-serif) if the custom font feels wrong at small sizes
- Never use Inter, Roboto, or Arial as the primary typeface
${logoSection}
## PLATFORM-SPECIFIC LAYOUTS

Adapt your layout based on the platform dimensions provided:

- **Story (9:16 tall)**: Use bottom-left anchor or top-left bleed pattern. Giant 3-line headline. Brand mark small at top corner. Optional vertical rotated text on right edge.
- **Square (1:1)**: Bottom-left headline with top-right brand area. Or top-left headline bleeding into image.
- **Landscape (16:9 or banner)**: Left third is text zone, right two-thirds showcases image. Single large headline with subline below.
- **Leaderboard banner**: One horizontal row — icon | headline | subline | CTA pill. Keep minimal.

## ICON PLACEMENT — FEATURE STRIP

Build a prominent feature badge row at the **bottom of the canvas** (positioned 32–48px from the bottom edge), sitting inside the dark bottom strip of the background image.

**Layout:**
- Horizontal flex row, left-aligned with 32–40px gap between badges
- Each badge = icon circle + label stacked vertically (or icon left / label right inline — pick whichever fits the platform width)

**Icon circle:**
- Size: 72–88px diameter circle (use width/height: 80px; border-radius: 50%)
- Border: 2px solid white (opacity 0.6) — must be clearly visible
- Background: rgba(0,0,0,0.35) — subtle dark fill so it reads against any background
- SVG icon inside: 36–44px, white fill or stroke, centered

**Label text (MANDATORY — always show):**
- Font size: 2vw (never below 1.8vw)
- Font weight: 700
- Color: white, opacity 1.0 — full white, no dimming
- Letter-spacing: 0.10em
- Text-transform: uppercase
- Max 2 words per label
- Place directly below (or right of) the icon circle with 6–8px gap

**If icons are provided (count > 0):**
- Use the provided SVGs — scale them to 40px inside the circle
- Infer a 1–2 word label from each icon or from the brand tone

**If no icons are provided:**
- Generate 3–4 minimal inline SVGs (line-art, 24×24 viewBox, single white stroke, stroke-width 1.5, no fill) representing product benefits — e.g. a lightning bolt for energy, a leaf for natural, a shield for protection, a star for premium
- Apply same badge layout above

**VISIBILITY REQUIREMENT:** The feature strip must be clearly readable at a glance. If the background is dark, use full white (not tinted). Never use opacity below 0.85 on the labels.

## COLOR USAGE

- Use brand colors exactly as specified in brand_context (primary, secondary, accent, background, text)
- Maximum 1 accent color highlight in the typography (typically one word or the overline)
- For text-shadow color: use the brand background color with opacity (not pure black), heavily blurred
- No neon gradients, no glassmorphism, no drop-shadow boxes around text blocks, no emoji

## TECHNICAL OUTPUT REQUIREMENTS

**Required structure:**
1. Start with \`<!DOCTYPE html>\` and end with \`</html>\`
2. Set body width and height to the exact platform dimensions from brand_context
3. Load custom font via @font-face — use \`url('__FONT_DATA_URI__')\` literally as the src value. Do NOT expand this placeholder.
4. Use \`url('data:image/png;base64,__BG_IMAGE__')\` literally in the background-image CSS — never expand this placeholder
5. All text and icons: use absolute positioning
6. body: set \`overflow: hidden\` and \`margin: 0\`
7. Include all provided icon SVGs inline in the HTML

**Before writing the HTML, use the scratchpad below to plan your approach:**

<scratchpad>
Think through:
- Which platform layout pattern best suits these dimensions?
- What is the headline (generate it if ad type is set and none was provided)?
- How will you break the headline into 2–3 dramatic lines?
- Which word/line gets the accent color?
- Where exactly will you position each text element?
- What text-shadow values will ensure legibility without covering the image?
- Do you need a small localized gradient for text legibility, and if so, where and how large?
</scratchpad>

Now write the complete HTML document inside <html_output> tags. Remember: raw HTML only, starting with <!DOCTYPE html>.`
}

function truncateSvg(svg: string, maxChars = 600): string {
  if (svg.length <= maxChars) return svg
  const closeIdx = svg.indexOf('>')
  const openTag = closeIdx >= 0 ? svg.slice(0, closeIdx + 1) : '<svg>'
  return `${openTag}${svg.slice(closeIdx + 1, maxChars)}<!-- truncated --></svg>`
}

export async function POST(req: NextRequest) {
  const input: CompositorInput = await req.json()
  const { backgroundImageBase64, brandBible, fontUrl, fontName, iconSvgs, headline, body, platform, logoUrl, adType, adContext } = input
  const { colors, typography, layout } = brandBible

  const aspectRatio = platform.width / platform.height
  const formatLabel = aspectRatio < 0.7 ? 'tall vertical (story)' :
    aspectRatio > 2.5 ? 'wide leaderboard banner' :
    Math.abs(aspectRatio - 1) < 0.2 ? 'square' : 'landscape'

  const trimmedIcons = iconSvgs.filter(Boolean).slice(0, 6).map(truncateSvg)

  let fontDataUri = fontUrl
  try {
    fontDataUri = await uploadsFileToDataUri(fontUrl, ALLOWED_FONT_EXTS, FONT_MIME)
  } catch { /* fall back to original URL */ }

  let logoDataUri: string | null = null
  if (logoUrl) {
    try {
      logoDataUri = await uploadsFileToDataUri(logoUrl, ALLOWED_IMAGE_EXTS, IMAGE_MIME)
    } catch { /* skip logo if unreadable */ }
  }

  // Build copy instructions based on whether headline is provided or AI should generate it
  let copyInstructions: string
  if (headline) {
    copyInstructions = `The headline has been provided by the user — use it exactly as given: "${headline}"\nBody copy: ${body || '(none — use brand tone)'}`
  } else if (adType) {
    const guidance = AD_TYPE_COPY_GUIDANCE[adType] ?? AD_TYPE_COPY_GUIDANCE['custom']
    copyInstructions = `No headline was provided. You MUST generate all copy (headline, body, overline, CTA if applicable) based on the following:\n\nAd Type: ${adType}\nCopy Strategy: ${guidance}\nCampaign Context: ${adContext || '(none — infer from brand bible and tone)'}\n\nGenerate copy that fits this ad type and feels native to the brand.`
  } else {
    copyInstructions = `Use the tagline as headline: "${brandBible.tagline ?? 'leave blank'}". Body: ${body || brandBible.tone}`
  }

  const brandContext = `Canvas: ${platform.label} (${formatLabel}), ${platform.width}px × ${platform.height}px
Tone: ${brandBible.tone}
Tagline: ${brandBible.tagline ?? 'none'}
Colors: primary=${colors.primary}, secondary=${colors.secondary}, accent=${colors.accent}, background=${colors.background}, text=${colors.text}
Typography: headingSize=${typography.headingSize}, bodySize=${typography.bodySize}, weight=${typography.weight}, letterSpacing=${typography.letterSpacing}
Layout: padding=${layout.padding}, logoPosition=${layout.logoPosition}
Brand rules: ${brandBible.rules.slice(0, 2).join('; ')}
Font family: ${fontName}
Font URL: url('__FONT_DATA_URI__') — literal placeholder, do NOT expand
Background image: url('data:image/png;base64,__BG_IMAGE__') — literal placeholder, do NOT expand
Logo: ${logoDataUri ? 'provided — use <img src="__LOGO_DATA_URI__"> as shown in the Logo section' : 'none'}
Icons (${trimmedIcons.length}):
${trimmedIcons.map((svg, i) => `Icon ${i + 1}:\n${svg}`).join('\n\n')}`

  const systemPrompt = buildSystemPrompt(!!logoDataUri)
    .replace('{{BRAND_CONTEXT}}', brandContext)
    .replace('{{COPY_INSTRUCTIONS}}', copyInstructions)

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    messages: [{ role: 'user', content: systemPrompt }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''

  const htmlOutputMatch = raw.match(/<html_output>([\s\S]*?)(?:<\/html_output>|$)/i)
  const doctypeMatch    = raw.match(/(<!DOCTYPE[\s\S]*)/i)

  const candidate = htmlOutputMatch
    ? htmlOutputMatch[1].trim()
    : doctypeMatch
      ? doctypeMatch[1].trim()
      : raw.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

  const stripped = candidate.endsWith('</html>')
    ? candidate
    : candidate.includes('</body>')
      ? candidate + '\n</html>'
      : candidate

  if (!stripped.startsWith('<!DOCTYPE') && !stripped.startsWith('<html')) {
    return NextResponse.json({ error: 'Claude did not return valid HTML', raw }, { status: 500 })
  }

  const html = stripped
    .replace(/__BG_IMAGE__/g, backgroundImageBase64)
    .replace(/__FONT_DATA_URI__/g, fontDataUri)
    .replace(/__LOGO_DATA_URI__/g, logoDataUri ?? '')

  return NextResponse.json({ html })
}
