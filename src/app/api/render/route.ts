import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'

type RenderRequest = {
  html: string
  width: number
  height: number
}

export async function POST(req: NextRequest) {
  const { html, width, height }: RenderRequest = await req.json()

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
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
