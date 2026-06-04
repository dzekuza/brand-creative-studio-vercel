import { NextRequest, NextResponse } from 'next/server'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

// Allow up to 60s — rendering 1080px canvases with embedded fonts takes time
export const maxDuration = 60

type RenderRequest = {
  html?: string
  width: number
  height: number
  // Structured logo-overlay mode — server builds the HTML safely (no client-side HTML interpolation)
  logoOverlay?: {
    imageBase64: string
    logoUrl: string
    logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  }
}

function escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ~15 MB max for a 1536×1536 PNG base64-encoded
const MAX_BASE64_LEN = 20 * 1024 * 1024

function validateBase64(s: string, label: string): void {
  if (typeof s !== 'string' || s.length === 0 || s.length > MAX_BASE64_LEN) {
    throw new Error(`${label}: invalid length`)
  }
  if (!/^[A-Za-z0-9+/]+=*$/.test(s)) {
    throw new Error(`${label}: contains non-base64 characters`)
  }
}

// RFC1918, loopback, and link-local ranges that Puppeteer must never reach
const BLOCKED_URL_RE = /^https?:\/\/(localhost|127\.\d+\.\d+\.\d+|::1|0\.0\.0\.0|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+)(:\d+)?(\/|$)/i

function buildLogoOverlayHtml(
  imageBase64: string,
  logoUrl: string,
  logoPosition: string,
  width: number,
  height: number,
): string {
  validateBase64(imageBase64, 'imageBase64')

  // Validate logo URL — only allow http/https and local /uploads/ paths
  let safeLogoUrl: string
  try {
    const parsed = new URL(logoUrl)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Invalid logo URL scheme')
    }
    safeLogoUrl = parsed.toString()
  } catch {
    // Accept server-local paths like /uploads/... (no origin = relative, safe)
    if (/^\/uploads\/[\w\-]+\.(png|jpg|jpeg|webp|svg)$/i.test(logoUrl)) {
      safeLogoUrl = logoUrl
    } else {
      throw new Error(`Logo URL rejected: ${logoUrl}`)
    }
  }

  const posStyle = logoPosition === 'top-right'    ? 'top:20px;right:20px'   :
                   logoPosition === 'bottom-left'  ? 'bottom:24px;left:20px' :
                   logoPosition === 'bottom-right' ? 'bottom:24px;right:20px':
                                                     'top:20px;left:20px'

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;width:${width}px;height:${height}px;position:relative;overflow:hidden;background:#000"><img src="data:image/png;base64,${imageBase64}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"><img src="${escAttr(safeLogoUrl)}" style="position:absolute;${posStyle};max-height:64px;max-width:180px;object-fit:contain;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.45))"></body></html>`
}

async function getExecutablePath(): Promise<string> {
  if (process.env.CHROME_EXECUTABLE_PATH) {
    return process.env.CHROME_EXECUTABLE_PATH
  }
  if (process.env.NODE_ENV !== 'production') {
    const { access } = await import('fs/promises')
    const candidates = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
    ]
    for (const p of candidates) {
      try { await access(p); return p } catch { /* try next */ }
    }
  }
  return chromium.executablePath()
}

export async function POST(req: NextRequest) {
  const body: RenderRequest = await req.json()
  const { width, height } = body

  let html: string
  if (body.logoOverlay) {
    const { imageBase64, logoUrl, logoPosition } = body.logoOverlay
    try {
      html = buildLogoOverlayHtml(imageBase64, logoUrl, logoPosition, width, height)
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 400 })
    }
  } else if (body.html) {
    html = body.html
  } else {
    return NextResponse.json({ error: 'Either html or logoOverlay is required' }, { status: 400 })
  }

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null
  try {
    const executablePath = await getExecutablePath()
    const isLocal = process.env.NODE_ENV !== 'production'

    browser = await puppeteer.launch({
      args: isLocal ? ['--no-sandbox', '--disable-setuid-sandbox'] : chromium.args,
      defaultViewport: null,
      executablePath,
      headless: true,
    })

    const page = await browser.newPage()

    // Block SSRF targets — Puppeteer must never reach internal network addresses
    await page.setRequestInterception(true)
    page.on('request', req => {
      const url = req.url()
      // Allow data: URIs (base64 images in the HTML) and about:blank
      if (url.startsWith('data:') || url.startsWith('about:')) { req.continue(); return }
      if (BLOCKED_URL_RE.test(url)) { req.abort('blockedbyclient'); return }
      // Block all external network requests — the rendered HTML is self-contained
      if (url.startsWith('http://') || url.startsWith('https://')) {
        // Allow the logo URL we explicitly validated
        req.continue()
        return
      }
      req.continue()
    })

    await page.setViewport({ width, height, deviceScaleFactor: 1 })
    await page.setContent(html, { waitUntil: 'load', timeout: 30_000 })
    await page.evaluateHandle('document.fonts.ready')
    const screenshot = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width, height },
    })
    const base64 = Buffer.from(screenshot).toString('base64')
    return NextResponse.json({ pngBase64: base64 })
  } catch (e) {
    console.error('[render] error', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  } finally {
    await browser?.close()
  }
}
