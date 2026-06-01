import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { readFile } from 'fs/promises'
import { join } from 'path'
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

async function urlToBase64(publicUrl: string): Promise<{ data: string; mimeType: string }> {
  if (!SAFE_UPLOAD_RE.test(publicUrl)) {
    throw new Error(`Unsafe file URL: ${publicUrl}`)
  }
  const filePath = join(process.cwd(), 'public', publicUrl)
  const buffer = await readFile(filePath)
  const ext = publicUrl.split('.').pop()?.toLowerCase() ?? 'jpg'
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  }
  return { data: buffer.toString('base64'), mimeType: mimeMap[ext] ?? 'image/jpeg' }
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
    `LOGO ZONE: leave clear negative space at the ${layout.logoPosition} corner for a logo icon.`,
    `COMPOSITION: cinematic product photography, atmospheric lighting, shallow depth-of-field. The product from the reference image must be the hero of the scene.`,
    `CRITICAL: render ONLY the background scene — NO text, NO captions, NO watermarks, NO UI overlays. Text will be composited separately.`,
    `STYLE: photorealistic, editorial quality, shot for a ${platformLabel} ad campaign.`,
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
