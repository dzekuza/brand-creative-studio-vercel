import { NextRequest, NextResponse } from 'next/server'

export type ScrapedBrandData = {
  colors: string[]        // hex/rgb colors extracted from CSS
  fontFamilies: string[]  // font names used on site
  logoUrl?: string        // absolute URL to logo image
  headings: string[]      // h1/h2 text content
  brandName?: string      // from og:title or <title>
  tagline?: string        // from og:description or meta description
}

function extractColors(html: string): string[] {
  const hexPattern = /#([0-9a-f]{3,8})\b/gi
  const rgbPattern = /rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/gi
  const oklchPattern = /oklch\([^)]+\)/gi
  const cssVarPattern = /--[a-z-]+:\s*(#[0-9a-f]{3,8}|rgb[^;]+)/gi

  const found = new Set<string>()

  for (const [, hex] of html.matchAll(hexPattern)) {
    const h = hex.toLowerCase()
    // Skip very short (< 3 chars) and very common whites/blacks
    if (h.length >= 3 && !['fff', 'ffffff', '000', '000000', 'ccc', 'eee', '333', '666'].includes(h)) {
      found.add(`#${h}`)
    }
  }
  for (const [match] of html.matchAll(rgbPattern)) found.add(match)

  return [...found].slice(0, 20)
}

function extractFonts(html: string): string[] {
  const fonts = new Set<string>()

  // Google Fonts URL
  for (const [, fam] of html.matchAll(/family=([^&"']+)/gi)) {
    fam.split('|').forEach(f => fonts.add(decodeURIComponent(f.split(':')[0].replace(/\+/g, ' '))))
  }
  // font-family CSS
  for (const [, fam] of html.matchAll(/font-family\s*:\s*['"]?([^;,'"]+)/gi)) {
    const clean = fam.trim().replace(/['"]/g, '').split(',')[0].trim()
    if (clean && !['sans-serif', 'serif', 'monospace', 'inherit', 'initial', 'var'].some(s => clean.toLowerCase().includes(s))) {
      fonts.add(clean)
    }
  }
  // @font-face src
  for (const [, name] of html.matchAll(/font-family\s*:\s*['"]([^'"]+)['"]/gi)) fonts.add(name)

  return [...fonts].slice(0, 5)
}

function extractLogo(html: string, baseUrl: string): string | undefined {
  const origin = new URL(baseUrl).origin

  function toAbsolute(url: string): string {
    if (url.startsWith('//')) return `https:${url}`
    if (url.startsWith('/')) return `${origin}${url}`
    if (url.startsWith('http')) return url
    return url
  }

  // 1. og:image (most reliable for brand image)
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
  if (ogImage?.[1]) return toAbsolute(ogImage[1])

  // 2. <link rel="icon"> / apple-touch-icon
  const touchIcon = html.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i)
  if (touchIcon?.[1]) return toAbsolute(touchIcon[1])

  // 3. img with logo/brand in class, alt, or src
  const logoImg = html.match(/<img[^>]+(?:class|alt|id|src)=["'][^"']*(?:logo|brand|header)[^"']*["'][^>]+src=["']([^"']+)["']/i)
    ?? html.match(/<img[^>]+src=["']([^"']+(?:logo|brand)[^"']+)["']/i)
  if (logoImg?.[1]) return toAbsolute(logoImg[1])

  // 4. SVG logo (in <header>)
  // 5. Favicon as last resort
  const favicon = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i)
  if (favicon?.[1]) return toAbsolute(favicon[1])

  return undefined
}

function extractHeadings(html: string): string[] {
  const headings: string[] = []
  for (const [, content] of html.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)) {
    const text = content.replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ')
    if (text.length > 2 && text.length < 200) headings.push(text)
  }
  return [...new Set(headings)].slice(0, 10)
}

function extractMeta(html: string): { brandName?: string; tagline?: string } {
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)

  const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i)
  const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)

  const rawName = ogTitle?.[1] ?? title?.[1] ?? ''
  const brandName = rawName.replace(/<[^>]+>/g, '').trim().split(/[|\-–—]/)[0].trim() || undefined
  const tagline = (ogDesc?.[1] ?? metaDesc?.[1] ?? '').trim().slice(0, 200) || undefined

  return { brandName, tagline }
}

export async function POST(req: NextRequest) {
  const { url } = (await req.json()) as { url: string }
  if (!url) return NextResponse.json({ error: 'url is required' }, { status: 400 })

  let html = ''
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    html = await res.text()
  } catch (e) {
    return NextResponse.json({ error: `Could not fetch URL: ${String(e)}` }, { status: 422 })
  }

  // Also try to fetch the main CSS file for better color/font extraction
  const cssHref = html.match(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+\.css[^"']*)["']/i)?.[1]
  let cssContent = ''
  if (cssHref) {
    try {
      const origin = new URL(url).origin
      const cssUrl = cssHref.startsWith('http') ? cssHref : cssHref.startsWith('//') ? `https:${cssHref}` : `${origin}${cssHref}`
      const cssRes = await fetch(cssUrl, { signal: AbortSignal.timeout(8_000) })
      if (cssRes.ok) cssContent = await cssRes.text()
    } catch { /* ignore */ }
  }

  const combined = html + '\n' + cssContent

  const data: ScrapedBrandData = {
    colors: extractColors(combined),
    fontFamilies: extractFonts(combined),
    logoUrl: extractLogo(html, url),
    headings: extractHeadings(html),
    ...extractMeta(html),
  }

  return NextResponse.json(data)
}
