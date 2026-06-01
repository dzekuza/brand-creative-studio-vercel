import { NextRequest, NextResponse } from 'next/server'
import { readFile, realpath } from 'fs/promises'
import { join, sep } from 'path'
import Anthropic from '@anthropic-ai/sdk'
import type { CompositorInput } from '@/types'

const FONT_MIME: Record<string, string> = {
  woff2: 'font/woff2',
  woff:  'font/woff',
  ttf:   'font/ttf',
  otf:   'font/otf',
}

const ALLOWED_FONT_EXTS = new Set(['woff2', 'woff', 'ttf', 'otf'])

async function fontToDataUri(relativeUrl: string): Promise<string> {
  // Reject anything that looks suspicious before touching the filesystem
  if (
    relativeUrl.includes('\0') ||          // null bytes
    relativeUrl.includes('\\') ||          // backslash traversal
    /^\//.test(relativeUrl) === false       // must start with /
      ? false
      : /^\//.test(relativeUrl) &&
        !/^\/uploads\/[^/]+$/.test(relativeUrl) // must match /uploads/<filename> exactly
  ) {
    throw new Error('Invalid font path')
  }

  // Strict allowlist: only /uploads/<single-segment-filename>
  if (!/^\/uploads\/[^/\\]+$/.test(relativeUrl) || relativeUrl.includes('..')) {
    throw new Error('Invalid font path')
  }

  const ext = relativeUrl.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_FONT_EXTS.has(ext)) throw new Error('Invalid font extension')

  // Resolve and verify the path stays inside public/ — defeats symlink & encoded traversal attacks
  const publicRoot = await realpath(join(process.cwd(), 'public'))
  const candidate = join(publicRoot, relativeUrl)
  const resolved = await realpath(candidate)

  if (resolved !== publicRoot && !resolved.startsWith(publicRoot + sep)) {
    throw new Error('Invalid font path')
  }

  const mime = FONT_MIME[ext]!
  const buf = await readFile(resolved)
  return `data:${mime};base64,${buf.toString('base64')}`
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM_PROMPT = `You are a senior art director at a top creative agency specializing in bold editorial advertising. Your task is to produce a single complete HTML document that will be used for Puppeteer screenshotting. The HTML must overlay typography and icons onto a background product photo at exact pixel dimensions.

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

## TYPOGRAPHY STYLE — EDITORIAL POSTER

Think: large-format poster, fashion editorial, modern product campaign.

**Headline rules:**
- MASSIVE scale. The headline should feel oversized and intentional — roughly 25–45% of canvas height for story formats (9:16), 18–28% for square (1:1)
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
- Small overline (uppercase, letter-spacing 0.14em) in accent color, placed above or below headline — typically the brand name or a short statement
- Body copy: small size, low opacity (0.72), maximum 2 lines, positioned away from the headline so the layout breathes
- Optional when space allows: one piece of text rotated 90° flush to a side edge (vertical label showing season, edition, or statement word)

**Font rules:**
- Always load the provided custom font via @font-face using the font URL from brand_context
- Use the custom font for the headline
- Body/labels may fall back to system sans-serif (system-ui, -apple-system, sans-serif) if the custom font feels wrong at small sizes
- Never use Inter, Roboto, or Arial as the primary typeface

## PLATFORM-SPECIFIC LAYOUTS

Adapt your layout based on the platform dimensions provided:

- **Story (9:16 tall)**: Use bottom-left anchor or top-left bleed pattern. Giant 3-line headline. Brand mark small at top corner. Optional vertical rotated text on right edge.
- **Square (1:1)**: Bottom-left headline with top-right brand area. Or top-left headline bleeding into image.
- **Landscape (16:9 or banner)**: Left third is text zone, right two-thirds showcases image. Single large headline with subline below.
- **Leaderboard banner**: One horizontal row — icon | headline | subline | CTA pill. Keep minimal.

## ICON PLACEMENT

- Place icons at the logoPosition corner specified in brand_context (e.g., top-left, top-right)
- Display them in a flex row with small gap (12–16px)
- Size them appropriately (~5–6% of canvas width)
- Icons are a small detail, not the focus — do not over-engineer

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
- How will you break the headline into 2–3 dramatic lines?
- Which word/line gets the accent color?
- Where exactly will you position each text element?
- What text-shadow values will ensure legibility without covering the image?
- Do you need a small localized gradient for text legibility, and if so, where and how large?
</scratchpad>

Now write the complete HTML document inside <html_output> tags. Remember: raw HTML only, starting with <!DOCTYPE html>.`

// Truncate an SVG to keep only the outer tag + first 600 chars of content — enough for shape info, avoids token bloat
function truncateSvg(svg: string, maxChars = 600): string {
  if (svg.length <= maxChars) return svg
  const closeIdx = svg.indexOf('>')
  const openTag = closeIdx >= 0 ? svg.slice(0, closeIdx + 1) : '<svg>'
  return `${openTag}${svg.slice(closeIdx + 1, maxChars)}<!-- truncated --></svg>`
}

export async function POST(req: NextRequest) {
  const input: CompositorInput = await req.json()
  const { backgroundImageBase64, brandBible, fontUrl, fontName, iconSvgs, headline, body, platform } = input
  const { colors, typography, layout } = brandBible

  const aspectRatio = platform.width / platform.height
  const formatLabel = aspectRatio < 0.7 ? 'tall vertical (story)' :
    aspectRatio > 2.5 ? 'wide leaderboard banner' :
    Math.abs(aspectRatio - 1) < 0.2 ? 'square' : 'landscape'

  // Limit icons to 2 max and truncate SVG bodies to reduce input tokens
  const trimmedIcons = iconSvgs.filter(Boolean).slice(0, 2).map(truncateSvg)

  // Embed font as base64 data URI so Puppeteer doesn't need to resolve relative paths
  let fontDataUri = fontUrl
  try {
    fontDataUri = await fontToDataUri(fontUrl)
  } catch {
    // fall back to original URL if file read fails (e.g. external URL)
  }

  const brandContext = `Canvas: ${platform.label} (${formatLabel}), ${platform.width}px × ${platform.height}px
Tone: ${brandBible.tone}
Tagline: ${brandBible.tagline ?? 'none'}
Colors: primary=${colors.primary}, secondary=${colors.secondary}, accent=${colors.accent}, background=${colors.background}, text=${colors.text}
Typography: headingSize=${typography.headingSize}, bodySize=${typography.bodySize}, weight=${typography.weight}, letterSpacing=${typography.letterSpacing}
Layout: padding=${layout.padding}, logoPosition=${layout.logoPosition}
Brand rules: ${brandBible.rules.slice(0, 2).join('; ')}
Headline: ${headline}
Body: ${body || '(none)'}
Font family: ${fontName}
Font URL: url('__FONT_DATA_URI__') — literal placeholder, do NOT expand (injected server-side like __BG_IMAGE__)
Background image: url('data:image/png;base64,__BG_IMAGE__') — literal placeholder, do NOT expand
Icons (${trimmedIcons.length}):
${trimmedIcons.map((svg, i) => `Icon ${i + 1}:\n${svg}`).join('\n\n')}`

  const userMessage = SYSTEM_PROMPT.replace('{{BRAND_CONTEXT}}', brandContext)

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{ role: 'user', content: userMessage }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''

  // Extract from <html_output> tags if present, otherwise fall back to stripping markdown fences
  const htmlOutputMatch = raw.match(/<html_output>([\s\S]*?)<\/html_output>/i)
  const stripped = htmlOutputMatch
    ? htmlOutputMatch[1].trim()
    : raw.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

  if (!stripped.startsWith('<!DOCTYPE') && !stripped.startsWith('<html')) {
    return NextResponse.json({ error: 'Claude did not return valid HTML', raw }, { status: 500 })
  }

  // Inject real data in place of placeholders — Claude never sees the actual base64 blobs
  const html = stripped
    .replace(/__BG_IMAGE__/g, backgroundImageBase64)
    .replace(/__FONT_DATA_URI__/g, fontDataUri)

  return NextResponse.json({ html })
}
