import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { fetchBlobAsset } from '@/lib/fetch-blob'
import type { BrandBible, ImageProvider, Platform } from '@/types'

type GenerateImageRequest = {
  prompt: string
  productImageUrl: string
  styleRefUrls: string[]
  brandBible: BrandBible
  platform: Platform
  provider?: ImageProvider
}

const SAFE_UPLOAD_RE = /^\/uploads\/[\w-]+\.(jpg|jpeg|png|webp|svg)$/i
const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
}

async function urlToBase64(url: string): Promise<{ data: string; mimeType: string }> {
  if (url.startsWith('https://') || url.startsWith('http://')) {
    const ext = url.split('?')[0].split('.').pop()?.toLowerCase() ?? ''
    const expectedMime = MIME_MAP[ext]
    const { buffer, mimeType } = await fetchBlobAsset(url, expectedMime)
    return { data: buffer.toString('base64'), mimeType }
  }
  // Local dev: read from public/uploads/
  if (!SAFE_UPLOAD_RE.test(url)) throw new Error(`Unsafe file URL: ${url}`)
  const filePath = join(process.cwd(), 'public', url)
  const buffer = await readFile(filePath)
  const ext = url.split('.').pop()?.toLowerCase() ?? 'jpg'
  return { data: buffer.toString('base64'), mimeType: MIME_MAP[ext] ?? 'image/jpeg' }
}

export async function POST(req: NextRequest) {
  const body: GenerateImageRequest = await req.json()
  const { colors, typography, layout } = body.brandBible

  const platformLabel = body.platform.label
  const aspectNote = body.platform.width > body.platform.height
    ? 'wide landscape format'
    : body.platform.width === body.platform.height
      ? 'square format'
      : 'tall vertical format'

  const stylePrompt = [
    `FORMAT: ${platformLabel} (${aspectNote}, ${body.platform.width}×${body.platform.height}px).`,
    `BRAND TONE: ${body.brandBible.tone}.`,
    `COLOR PALETTE: dominant background color ${colors.background}, primary accent ${colors.primary}, secondary accent ${colors.accent}.`,
    `TYPOGRAPHY MOOD: ${typography.weight === 'bold' || Number(typography.weight) >= 700 ? 'strong, confident' : 'clean, refined'} — heading size ${typography.headingSize}, tight letter-spacing ${typography.letterSpacing}.`,
    `LOGO ZONE: leave clear negative space at the ${layout.logoPosition} corner for a logo icon (approx 80×80px area).`,
    `PRODUCT PLACEMENT — CRITICAL: The product from the reference image MUST be the undisputed hero. Position it prominently, occupying at least 35–45% of the frame area. Place the product in the center or upper-center of the composition. The product must be sharp, well-lit, and fully visible — never cropped, never tiny, never lost in the background.`,
    `BOTTOM STRIP: The bottom 30% of the image must transition to a darker, lower-contrast atmospheric zone (natural vignette, dark gradient fade, or deep shadow). This clean dark strip is required for headline text compositing and for a row of small feature icons. Do NOT place the product in this bottom strip.`,
    `COMPOSITION: cinematic product photography, atmospheric studio or lifestyle lighting, shallow depth-of-field. Strong contrast between the product and background.`,
    `ABSOLUTE NO: NO text, NO captions, NO watermarks, NO logos, NO UI overlays of any kind. The image must be completely clean of any typography. Text and icons will be composited separately.`,
    `STYLE: photorealistic, editorial quality, shot for a premium ${platformLabel} ad campaign.`,
  ].join(' ')

  const productImg = await urlToBase64(body.productImageUrl)
  const styleImgs = await Promise.all(
    body.styleRefUrls.slice(0, 3).map(url => urlToBase64(url))
  )

  const useGoogle = body.provider === 'google' ||
    (!body.provider && process.env.IMAGE_PROVIDER === 'google')

  if (useGoogle) {
    const { GoogleGenAI } = await import('@google/genai')
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

    const parts = [
      { text: `${body.prompt}. ${stylePrompt}` },
      { inlineData: { mimeType: productImg.mimeType, data: productImg.data } },
      ...styleImgs.map(s => ({ inlineData: { mimeType: s.mimeType, data: s.data } })),
    ]

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ role: 'user', parts }],
    })

    const imagePart = response.candidates?.[0]?.content?.parts?.find(
      (p: { inlineData?: { data?: string } }) => p.inlineData
    )
    if (!imagePart?.inlineData?.data) {
      return NextResponse.json({ error: 'No image in Gemini response' }, { status: 500 })
    }
    return NextResponse.json({ imageBase64: imagePart.inlineData.data })
  }

  // Vercel AI Gateway (default)
  const result = await generateText({
    model: 'google/gemini-3.1-flash-image-preview',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: `${body.prompt}. ${stylePrompt}` },
          {
            type: 'image',
            image: Buffer.from(productImg.data, 'base64'),
            mimeType: productImg.mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
          },
          ...styleImgs.map(s => ({
            type: 'image' as const,
            image: Buffer.from(s.data, 'base64'),
            mimeType: s.mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
          })),
        ],
      },
    ],
    providerOptions: {
      gateway: {
        tags: ['feature:image-generation', 'app:brand-creative-studio'],
      },
    },
  })

  const imageFile = result.files?.find(f => f.mediaType?.startsWith('image/'))
  if (!imageFile?.base64) {
    return NextResponse.json({ error: 'No image returned from AI Gateway' }, { status: 500 })
  }

  return NextResponse.json({ imageBase64: imageFile.base64 })
}
