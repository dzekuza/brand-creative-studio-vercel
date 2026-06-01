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
  const { width, height } = body.platform
  const ar = width / height
  const isStory    = ar < 0.7
  const isSquare   = Math.abs(ar - 1) < 0.2
  const isBanner   = ar > 5

  const compositionGuide = isStory
    ? `COMPOSITION FOR TALL STORY (${width}×${height}px, 9:16): Product must occupy the center-upper zone — roughly top 55–70% of the frame — and feel LARGE and heroic in the vertical space. The product must be fully visible, sharp, and at least 40% of frame area. The bottom 30% of the image MUST fade to near-black via natural vignette or deep shadow — this is the text and icons zone, keep it clean and product-free.`
    : isSquare
    ? `COMPOSITION FOR SQUARE FORMAT (${width}×${height}px, 1:1): Product centered or slightly right-of-center, occupying 40–50% of the frame. Product must be sharp and clearly dominant. The bottom 20% must be darker atmosphere for text overlay. Upper corners clear for brand mark placement.`
    : isBanner
    ? `COMPOSITION FOR LEADERBOARD BANNER (${width}×${height}px, very wide strip): Product on the right 35% of the image. Left 65% must be a clean, slightly darker gradient area for text overlay. Tight horizontal composition, no bottom strip needed.`
    : `COMPOSITION FOR LANDSCAPE (${width}×${height}px): Product on the right half or center-right, occupying 40–50% of the frame. Left third is clean atmospheric zone (slightly darker) for text overlay. Product fully visible, sharp, well-lit.`

  const stylePrompt = [
    `FORMAT: ${platformLabel} (${width}×${height}px).`,
    `BRAND TONE: ${body.brandBible.tone}.`,
    `COLOR PALETTE: dominant background color ${colors.background}, primary accent ${colors.primary}, secondary accent ${colors.accent}.`,
    `TYPOGRAPHY MOOD: ${typography.weight === 'bold' || Number(typography.weight) >= 700 ? 'strong, confident' : 'clean, refined'}.`,
    `LOGO ZONE: leave clear negative space at the ${layout.logoPosition} corner (~80×80px).`,
    compositionGuide,
    `LIGHTING: cinematic studio or lifestyle lighting, atmospheric, shallow depth-of-field. Strong contrast between product and background.`,
    `ABSOLUTE NO: NO text, NO captions, NO watermarks, NO logos, NO UI overlays. Image must be completely clean — text and icons are composited separately.`,
    `STYLE: photorealistic, editorial quality, premium ${platformLabel} ad campaign.`,
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
