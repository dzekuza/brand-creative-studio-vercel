import { NextRequest, NextResponse } from 'next/server'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

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

// --- SSRF guard ---------------------------------------------------------
// A regex on the URL string is not enough: it misses decimal/hex/octal IP
// encodings (http://2130706433 = 127.0.0.1), hostnames that *resolve* to
// internal IPs (DNS rebinding → cloud metadata at 169.254.169.254), and
// redirect chains. We therefore (1) reject IP literals, (2) require the host
// to be on an allowlist (the Vercel Blob CDN — the only host the app ever
// fetches a logo from — mirroring src/lib/fetch-blob.ts), and (3) resolve the
// host and reject if any address falls in a restricted range.
const ALLOWED_LOGO_HOST_SUFFIX = '.public.blob.vercel-storage.com'

function envAllowedHosts(): string[] {
  return (process.env.RENDER_LOGO_HOST_ALLOWLIST || '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
}

function ipv4Forbidden(ip: string): boolean {
  const o = ip.split('.').map(Number)
  if (o.length !== 4 || o.some(n => Number.isNaN(n) || n < 0 || n > 255)) return true
  const [a, b] = o
  if (a === 0) return true                          // 0.0.0.0/8
  if (a === 10) return true                         // 10.0.0.0/8 (private)
  if (a === 127) return true                        // 127.0.0.0/8 (loopback)
  if (a === 169 && b === 254) return true           // 169.254.0.0/16 (link-local incl. metadata)
  if (a === 172 && b >= 16 && b <= 31) return true  // 172.16.0.0/12 (private)
  if (a === 192 && b === 168) return true           // 192.168.0.0/16 (private)
  if (a === 100 && b >= 64 && b <= 127) return true // 100.64.0.0/10 (CGNAT)
  return false
}

function ipv6Forbidden(ip: string): boolean {
  const s = ip.toLowerCase().split('%')[0] // strip zone id
  if (s === '::1' || s === '::') return true              // loopback / unspecified
  const mapped = s.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/) // ::ffff:127.0.0.1 etc.
  if (mapped) return ipv4Forbidden(mapped[1])
  if (/^f[cd]/.test(s)) return true                       // fc00::/7 (ULA)
  if (/^fe[89ab]/.test(s)) return true                    // fe80::/10 (link-local)
  return false
}

function ipForbidden(ip: string): boolean {
  const t = isIP(ip)
  if (t === 4) return ipv4Forbidden(ip)
  if (t === 6) return ipv6Forbidden(ip)
  return true // not a parseable IP — fail closed
}

function hostAllowed(host: string, extra: string[]): boolean {
  const h = host.toLowerCase()
  if (h.endsWith(ALLOWED_LOGO_HOST_SUFFIX)) return true
  const all = [...extra, ...envAllowedHosts()]
  return all.some(a => a !== '' && (h === a || h.endsWith('.' + a)))
}

// Authoritative SSRF check, run on every request hop (covers redirects).
// `extraHosts` adds the app's own request host so self-hosted deployments that
// serve /uploads from their own origin work — the DNS check below still rejects
// a spoofed Host header that points at an internal target.
async function isSafeRenderUrl(rawUrl: string, extraHosts: string[]): Promise<boolean> {
  let u: URL
  try { u = new URL(rawUrl) } catch { return false }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false

  const host = u.hostname // IPv6 brackets already stripped by URL

  // Dev only: the local dev server serves its own /uploads over loopback.
  if (process.env.NODE_ENV !== 'production' &&
      (host === 'localhost' || host === '127.0.0.1' || host === '::1')) {
    return true
  }

  // Reject IP literals (incl. IPv6) — the CDN is always reached by hostname.
  if (isIP(host) !== 0) return false
  // Reject non-dotted IP encodings (decimal / hex) that DNS would coerce.
  if (/^(0x[0-9a-f]+|\d+)$/i.test(host)) return false
  // Must be on the allowlist.
  if (!hostAllowed(host, extraHosts)) return false
  // Defense in depth: resolve and reject if any address is internal.
  try {
    const addrs = await lookup(host, { all: true })
    return addrs.length > 0 && addrs.every(a => !ipForbidden(a.address))
  } catch {
    return false // fail closed on resolution failure
  }
}

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

  // The app's own host is allowlisted for logo fetches (self-hosted /uploads).
  const selfHost = (req.headers.get('host') || '').toLowerCase().split(':')[0]
  const extraHosts = selfHost ? [selfHost] : []

  let html: string
  if (body.logoOverlay) {
    const { imageBase64, logoUrl, logoPosition } = body.logoOverlay
    // Reject a blocked remote logo host up front (absolute http(s) URLs only;
    // relative /uploads paths are handled by buildLogoOverlayHtml).
    if (/^https?:\/\//i.test(logoUrl) && !(await isSafeRenderUrl(logoUrl, extraHosts))) {
      return NextResponse.json({ error: 'logo URL rejected (blocked host)' }, { status: 400 })
    }
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

    // Block SSRF targets — Puppeteer must never reach internal network addresses.
    // This runs for every request, including each redirect hop, so a public URL
    // that 3xx-redirects to an internal one is re-validated and aborted.
    await page.setRequestInterception(true)
    page.on('request', async req => {
      try {
        const url = req.url()
        // Allow inline content only.
        if (url.startsWith('data:') || url.startsWith('about:') || url.startsWith('blob:')) {
          await req.continue(); return
        }
        if (url.startsWith('http://') || url.startsWith('https://')) {
          if (await isSafeRenderUrl(url, extraHosts)) await req.continue()
          else await req.abort('blockedbyclient')
          return
        }
        // Block everything else (file:, ftp:, ws:, chrome:, …).
        await req.abort('blockedbyclient')
      } catch {
        try { await req.abort('failed') } catch { /* already handled */ }
      }
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
