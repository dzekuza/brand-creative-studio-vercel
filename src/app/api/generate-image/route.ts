import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI, Modality } from '@google/genai'
import { readFile } from 'fs/promises'
import { join } from 'path'
import type { BrandBible, Platform } from '@/types'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

type GenerateImageRequest = {
  prompt: string
  productImageUrl: string
  styleRefUrls: string[]
  brandBible: BrandBible
  platform: Platform
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
  const { colors } = body.brandBible

  const stylePrompt = `Color palette: primary ${colors.primary}, accent ${colors.accent}, background ${colors.background}. Maintain brand visual consistency. The product shown in the reference image must appear prominently in the scene.`

  const productImg = await urlToBase64(body.productImageUrl)
  const styleImgs = await Promise.all(
    body.styleRefUrls.slice(0, 3).map(url => urlToBase64(url))
  )

  const parts = [
    { text: `${body.prompt}. ${stylePrompt}` },
    { inlineData: { mimeType: productImg.mimeType, data: productImg.data } },
    ...styleImgs.map(s => ({ inlineData: { mimeType: s.mimeType, data: s.data } })),
  ]

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-preview-image-generation',
    contents: [{ role: 'user', parts }],
    config: { responseModalities: [Modality.IMAGE] },
  })

  const imagePart = response.candidates?.[0]?.content?.parts?.find(
    (p: { inlineData?: { data?: string } }) => p.inlineData
  )
  if (!imagePart?.inlineData?.data) {
    return NextResponse.json({ error: 'No image in Gemini response' }, { status: 500 })
  }

  return NextResponse.json({ imageBase64: imagePart.inlineData.data })
}
