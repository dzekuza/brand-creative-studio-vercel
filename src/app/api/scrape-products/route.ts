import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { v4 as uuidv4 } from 'uuid'
import type { ScrapedProduct } from '@/types'

const client = new Anthropic()

function extractImageUrls(html: string, baseUrl: string): string[] {
  const origin = new URL(baseUrl).origin
  const seen = new Set<string>()
  const results: string[] = []

  function add(raw: string) {
    // Handle protocol-relative URLs (//cdn.shopify.com/...)
    const absolute = raw.startsWith('//') ? `https:${raw}` : raw
    // Skip non-http, icons, logos, badges
    if (!absolute.startsWith('http')) return
    if (/icon|favicon|badge|sprite|placeholder|blank|pixel|tracking/i.test(absolute)) return
    // Normalise: strip size suffix Shopify adds like _100x, _300x300
    const cleaned = absolute.replace(/_\d+x\d*(\.|(\?))/, '$2').replace(/[?&]v=\d+/, '')
    if (!seen.has(cleaned)) { seen.add(cleaned); results.push(absolute) }
  }

  // 1. All src= and data-src= attribute values
  for (const [, val] of html.matchAll(/(?:src|data-src)=["']([^"']+)/gi)) add(val.trim())

  // 2. srcset — comma-separated list of "url width" pairs
  for (const [, val] of html.matchAll(/srcset=["']([^"']+)/gi)) {
    for (const part of val.split(',')) add(part.trim().split(/\s+/)[0])
  }

  // 3. data-srcset
  for (const [, val] of html.matchAll(/data-srcset=["']([^"']+)/gi)) {
    for (const part of val.split(',')) add(part.trim().split(/\s+/)[0])
  }

  // 4. Plain URLs in HTML (catches JSON blobs, inline styles, etc.)
  for (const [match] of html.matchAll(/(?:https?:|\/\/)\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)[^\s"'<>,)]*/gi)) {
    add(match)
  }

  // Filter: prefer product-looking URLs, deprioritise header/footer images
  const product = results.filter(u => /product|item|catalog|shop|goods|media/i.test(u))
  const rest    = results.filter(u => !/product|item|catalog|shop|goods|media/i.test(u))
  return [...product, ...rest].slice(0, 60)
}

export async function POST(req: NextRequest) {
  const { url } = (await req.json()) as { url: string }
  if (!url) return NextResponse.json({ error: 'url is required' }, { status: 400 })

  let html = ''
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(20_000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    html = await res.text()
  } catch (e) {
    return NextResponse.json({ error: `Could not fetch URL: ${String(e)}` }, { status: 422 })
  }

  // Strip scripts/styles for text extraction but keep HTML for image extraction
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{3,}/g, '\n')
    .slice(0, 20_000)

  const images = extractImageUrls(html, url)

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: `You are a product data extractor. Given website text and image URLs found on the page, identify distinct products for sale. Return a JSON array only — no markdown, no explanation.

Each product object must have:
{
  "name": "Product name",
  "description": "Short product description (1-2 sentences)",
  "price": "Price string if visible (e.g. '€34,00'), else null",
  "imageUrl": "The single best product image URL from the provided list — pick one that looks like a product photo, not a logo or icon. Must be from the list. null if none fit.",
  "pageUrl": "Product page URL if detectable, else null"
}

IMPORTANT for imageUrl: 
- Only use URLs from the provided image list
- Prefer URLs containing 'product', 'cdn', 'shop', or specific product names
- Do NOT use logo, header, or banner images
- Each product should have a DIFFERENT imageUrl if possible

Return [] if no clear products. Max 20 products.`,
    messages: [{
      role: 'user',
      content: `Website URL: ${url}\n\nPage text (truncated):\n${cleaned}\n\nAll image URLs found on this page (${images.length} total):\n${images.join('\n')}`,
    }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : '[]'
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()

  let items: Omit<ScrapedProduct, 'id' | 'imported'>[] = []
  try {
    items = JSON.parse(text)
  } catch {
    return NextResponse.json({ error: 'Failed to parse products', raw: text }, { status: 500 })
  }

  const products: ScrapedProduct[] = items.map(p => ({
    ...p,
    id: uuidv4(),
    imported: false,
  }))

  return NextResponse.json({ products })
}
