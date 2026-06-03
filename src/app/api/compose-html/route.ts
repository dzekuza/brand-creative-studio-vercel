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

function buildSystemPrompt(hasLogo: boolean, hasProduct: boolean): string {
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

  const productSection = hasProduct ? `
## PRODUCT IMAGE COMPOSITING

A product image is provided. Place it using this EXACT img tag — do NOT expand or replace the placeholder:
  <img src="__PRODUCT_DATA_URI__" alt="product" style="...">

Position rules by format:
- **Tall story (9:16)**: center-upper zone — width: 52%; top: 8%; left: 50%; transform: translateX(-50%); object-fit: contain; max-height: 58%
- **Square (1:1)**: right-center zone — width: 48%; top: 50%; right: 4%; transform: translateY(-50%); object-fit: contain; max-height: 60%
- **Landscape (16:9)**: right half — width: 44%; top: 50%; right: 3%; transform: translateY(-50%); object-fit: contain; max-height: 80%
- **Banner**: right zone — width: 22%; top: 50%; right: 2%; transform: translateY(-50%); object-fit: contain; max-height: 90%

Always use: position: absolute; filter: drop-shadow(0 12px 40px rgba(0,0,0,0.55)); pointer-events: none;
` : `
## PRODUCT IMAGE
No product image provided. Do not add any product placeholder.
`

  return `You are a senior art director at a top creative agency specializing in bold editorial advertising. Your task is to produce a single complete HTML document that will be used for Puppeteer screenshotting. The HTML must overlay typography and icons onto a background scene at exact pixel dimensions.

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

**Font sizing — ALWAYS use vw units, never px for text. Use these exact values per format:**

For **tall story / 9:16** (canvas height > width × 1.4):
- Headline: 17vw, line-height 0.92
- Overline: 3.2vw, letter-spacing 0.14em
- Body copy: 3.2vw, opacity 0.9
- Vertical edge text: 1.6vw
- Icon labels: 2.2vw
- Stat callout number: 8vw, unit: 2.2vw

For **square / 1:1** (canvas width ≈ height):
- Headline: 13vw, line-height 0.93
- Overline: 3vw, letter-spacing 0.14em
- Body copy: 3vw, opacity 0.9
- Vertical edge text: 1.5vw
- Icon labels: 2vw
- Stat callout number: 7vw, unit: 2vw

For **landscape / 16:9** (canvas width > height × 1.4):
- Headline: 9vw, line-height 0.95
- Overline: 2.5vw, letter-spacing 0.12em
- Body copy: 2.5vw, opacity 0.9
- Icon labels: 1.8vw
- Stat callout number: 6vw, unit: 1.8vw

For **banner** (canvas width > height × 5):
- Headline: 6vw, single line, no break
- Body copy: 2.2vw
- No icons strip

**Headline rules:**
- MASSIVE scale using vw — the headline should feel oversized and intentional
- The ENTIRE headline is ONE single element (one div or h1) with natural CSS line breaks — NEVER split the headline into separate positioned elements
- Use font-weight 800–900, letter-spacing -0.02em to -0.04em (tight tracking), line-height 0.9–1.0
- You MAY color ONE word with a span (color: accent color) inside the headline element, but the element stays as one block
- Apply the custom font loaded via @font-face

**Placement patterns — choose based on platform:**
- A) Bottom-left anchor: headline flush to bottom-left corner, small overline/tagline at top-left, brand mark top-right or top-left
- B) Top-left bleed: giant headline starting at top-left and bleeding into the image, secondary text at bottom-left, brand mark top-right
- Never center-align everything. Never stack all text in one rectangular block in the middle.

**Secondary text:**
- Overline (uppercase, letter-spacing 0.14em, font-size 3vw, font-weight 600) in accent color or full white — placed above or below headline. Opacity 0.9 minimum.
- Body copy: 3vw minimum, opacity 0.9 minimum, maximum 2 lines. **ONE single block** immediately after the headline — do NOT split body text into two separate positioned elements.
- NO vertical rotated edge text — omit it entirely.

**Font rules:**
- Always load the provided custom font via @font-face using the font URL from brand_context
- Use the custom font for the headline
- Body/labels may fall back to system sans-serif (system-ui, -apple-system, sans-serif) if the custom font feels wrong at small sizes
- Never use Inter, Roboto, or Arial as the primary typeface
${logoSection}
${productSection}
## PLATFORM-SPECIFIC LAYOUTS — FOLLOW EXACTLY FOR THE FORMAT IN brand_context

**TALL STORY (9:16, height > width × 1.4):**
- Logo: top-left, height 40–50px, margin 48px from edges
- Overline: top-left below logo, 3.2vw, uppercase, accent color
- Headline: positioned so its TOP starts at ~55% canvas height. 17vw, 3 lines, flush-left, margin-left 5%
- Body copy: 8px below headline, 3.2vw, white, 90% opacity, max 2 lines
- Feature icons strip: bottom 12–15% of canvas height, left-aligned, starting at margin-left 5%
- Vertical rotated text (optional): right edge, rotated 90deg, 1.6vw, very subtle
- DO NOT center everything — always flush-left for headline and body

**SQUARE (1:1, width ≈ height ±20%):**
- Logo: top-left or top-right corner, height 40px, margin 40px
- Overline: opposite top corner from logo, 3vw, uppercase, accent color
- Headline: ONE element, bottom-left anchor — position it so the headline block (all lines together) ends at ~75% canvas height. 13vw, flush-left, margin-left 5%
- Body copy: ONE element, 8px below the headline element, 3vw, white, 90% opacity, 1–2 lines, flush-left
- Feature icons strip: bottom 10–12% of canvas, left-aligned, margin-left 5%
- DO NOT use center alignment — flush-left always
- DO NOT split headline or body into separate positioned divs

**LANDSCAPE (16:9, width > height × 1.4):**
- Text zone: left 45% of canvas width
- Logo: top-left, height 36px, margin 36px
- Overline: top-left below logo, 2.5vw, uppercase, accent color
- Headline: left-aligned, vertical center of canvas, 9vw, 2 lines max
- Body copy: below headline, 2.5vw, white, 90% opacity
- Feature icons: below body copy, horizontal row, left-aligned
- Right 55%: product image zone — no text

**BANNER (width > height × 5):**
- Single row layout: logo left | headline center | CTA or stat right
- Headline: 6vw, single line, no wrapping
- No icons strip — too narrow

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

  // Product is rendered by the AI image generation step — no separate HTML overlay needed
  const productDataUri: string | null = null

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

  const brandContext = `Canvas: ${platform.label} — FORMAT TYPE: ${formatLabel.toUpperCase()} — ${platform.width}px × ${platform.height}px`
  + `\nUse the "${formatLabel.toUpperCase()}" layout rules from the PLATFORM-SPECIFIC LAYOUTS section exactly.
Canvas: ${platform.label} (${formatLabel}), ${platform.width}px × ${platform.height}px
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
Product image: ${productDataUri ? 'provided — use <img src="__PRODUCT_DATA_URI__"> as shown in the Product Image Compositing section' : 'none'}
Icons (${trimmedIcons.length}):
${trimmedIcons.map((svg, i) => `Icon ${i + 1}:\n${svg}`).join('\n\n')}`

  const systemPrompt = buildSystemPrompt(!!logoDataUri, !!productDataUri)
    .replace('{{BRAND_CONTEXT}}', brandContext)
    .replace('{{COPY_INSTRUCTIONS}}', copyInstructions)

  console.time('[compose-html] claude-sonnet')
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    messages: [{ role: 'user', content: systemPrompt }],
  })
  console.timeEnd('[compose-html] claude-sonnet')
  console.log(`[compose-html] input_tokens=${message.usage?.input_tokens} output_tokens=${message.usage?.output_tokens}`)

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

  const editScript = `<script>
(function(){
  var CLASSES=['headline','body-copy'];
  CLASSES.forEach(function(cls){
    var el=document.querySelector('.'+cls);
    if(!el)return;
    el.contentEditable='true';
    el.style.outline='none';
    el.style.cursor='text';
    el.style.whiteSpace='pre-wrap';
    el.style.overflow='visible';
    el.style.textOverflow='clip';
    el.style.minWidth='10px';
    el.addEventListener('input',function(){
      parent.postMessage({
        type:'brand-studio-edit',
        headline:(document.querySelector('.headline')||{}).innerText||'',
        body:(document.querySelector('.body-copy')||{}).innerText||''
      },'*');
    });
  });
})();
</script>`

  const html = stripped
    .replace(/__BG_IMAGE__/g, backgroundImageBase64)
    .replace(/__FONT_DATA_URI__/g, fontDataUri)
    .replace(/__LOGO_DATA_URI__/g, logoDataUri ?? '')
    .replace(/__PRODUCT_DATA_URI__/g, productDataUri ?? '')
    .replace('</body>', editScript + '\n</body>')

  return NextResponse.json({ html })
}
