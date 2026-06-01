import { NextRequest, NextResponse } from 'next/server'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

// Allow up to 60s — rendering 1080px canvases with embedded fonts takes time
export const maxDuration = 60

type RenderRequest = {
  html: string
  width: number
  height: number
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
  const { html, width, height }: RenderRequest = await req.json()

  const executablePath = await getExecutablePath()
  const isLocal = process.env.NODE_ENV !== 'production'

  const browser = await puppeteer.launch({
    args: isLocal ? ['--no-sandbox', '--disable-setuid-sandbox'] : chromium.args,
    defaultViewport: null,
    executablePath,
    headless: true,
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width, height, deviceScaleFactor: 1 })
    await page.setContent(html, { waitUntil: 'load', timeout: 30_000 })
    await page.evaluateHandle('document.fonts.ready')
    const screenshot = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width, height },
    })
    const base64 = Buffer.from(screenshot).toString('base64')
    return NextResponse.json({ pngBase64: base64 })
  } finally {
    await browser.close()
  }
}
