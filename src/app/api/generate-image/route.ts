import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { fetchBlobAsset } from '@/lib/fetch-blob'
import type { BrandBible, ImageModel, ImageProvider, Platform } from '@/types'

type GenerateImageRequest = {
  prompt: string
  productImageUrl: string
  styleRefUrls: string[]
  brandBible: BrandBible
  platform: Platform
  provider?: ImageProvider
  model?: ImageModel
  fullAiMode?: boolean
  aiHeadline?: string
  aiBody?: string
  adType?: string
  adContext?: string
}

const SAFE_UPLOAD_RE = /^\/uploads\/[\w-]+\.(jpg|jpeg|png|webp|svg)$/i

const AD_TYPE_COPY_HINTS: Record<string, string> = {
  'brand-awareness': 'emotionally resonant, aspirational copy — 3–6 word headline, no hard sell',
  'sales': 'offer-first, urgency-driven — lead with price/discount hook, include a clear CTA',
  'product-launch': 'excitement and novelty — "Introducing…" framing, highlight the key differentiator',
  'engagement': 'community-first, question-led — relatable, invite participation or a share',
  'custom': 'match the campaign context provided above',
}
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

  try {  const body: GenerateImageRequest = await req.json()
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
      `LIGHTING: cinematic studio or lifestyle lighting, atmospheric, shallow depth-of-field, with light and shadows matching the product placement.`,
      `PRODUCT PLACEMENT: The product image provided MUST appear naturally in the scene — placed in the composition zone described above, fully visible, sharp, and hero-sized. The product must look like it physically belongs in the environment: match the scene lighting onto the product, add a subtle ground shadow or surface reflection beneath it. Do NOT alter the product's label, colors, or packaging design.`,
      ...(body.fullAiMode ? [
        `FULL AD RENDER — include all typography and graphic elements directly in the image:`,
        ...(body.adType && !body.aiHeadline ? [
          `COPY STRATEGY: This is a "${body.adType}" ad${body.adContext ? ` for: ${body.adContext}` : ''}. ${AD_TYPE_COPY_HINTS[body.adType] ?? ''}. Generate a headline and body copy that match this intent — do NOT use the tagline.`,
        ] : [
          `HEADLINE: "${body.aiHeadline || body.brandBible.tagline || ''}" — render in massive bold type (weight 900), flush-left, brand text color ${colors.text}, occupying the left or lower-left zone of the canvas. Line-height very tight (0.9). One word or phrase may be in accent color ${colors.accent}.`,
          `BODY COPY: "${body.aiBody || body.brandBible.tone}" — render smaller, clean white text, directly below the headline, max 2 lines.`,
        ]),
        `BOTTOM ICON STRIP: render 3–4 small circular badges at the bottom of the canvas, each with a minimal white line-art icon and a 2-word white uppercase label below it. Represent product benefits (e.g. energy, natural, premium, protection).`,
        `BRAND MARK ZONE: leave clear space at the ${layout.logoPosition} corner for the brand logo (approx 120×40px area).`,
      ] : [
        `ABSOLUTE NO: NO text, NO captions, NO watermarks, NO logos, NO UI overlays.`,
      ]),
      `STYLE: photorealistic, editorial quality, premium ${platformLabel} ad campaign.`,
    ].join(' ')
  
    console.time('[generate-image] load-images')
    const styleImgs = (await Promise.all(
      (body.styleRefUrls ?? []).slice(0, 3).map(url =>
        urlToBase64(url).catch(() => null)
      )
    )).filter((s): s is { data: string; mimeType: string } => s !== null)
  
    let productImg: { data: string; mimeType: string } | null = null
    if (body.productImageUrl) {
      try { productImg = await urlToBase64(body.productImageUrl) } catch { /* skip if unreadable */ }
    }
    console.timeEnd('[generate-image] load-images')
    console.log(`[generate-image] styleRefs=${styleImgs.length} hasProduct=${!!productImg}`)
  
    // model field takes precedence; fall back to legacy provider field
    const resolvedModel: ImageModel = body.model
      ?? (body.provider === 'google' ? 'gemini-2.5-flash'
        : body.provider === 'gateway' ? 'gemini-3.1-flash'
        : process.env.IMAGE_PROVIDER === 'google' ? 'gemini-2.5-flash'
        : 'gemini-3.1-flash')
  
    const useGoogle = resolvedModel === 'gemini-2.5-flash'
    const useImagen = resolvedModel === 'imagen-4'
    const useOpenAI = resolvedModel === 'gpt-image-2'
  
    if (useGoogle) {
      const { GoogleGenAI } = await import('@google/genai')
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
  
      const parts = [
        ...(productImg ? [
          { text: `PRODUCT REFERENCE — this is the exact product to place in the scene. Keep its label, colors, and packaging exactly as shown. Match the scene lighting onto it:` },
          { inlineData: { mimeType: productImg.mimeType, data: productImg.data } },
        ] : []),
        { text: `${body.prompt}. ${stylePrompt}` },
        ...(styleImgs.length > 0 ? [{ text: `MOOD / STYLE REFERENCES — use these for lighting, atmosphere, and color palette:` }] : []),
        ...styleImgs.map(s => ({ inlineData: { mimeType: s.mimeType, data: s.data } })),
      ]
  
      console.time('[generate-image] gemini-2.5-flash-image')
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [{ role: 'user', parts }],
      })
      console.timeEnd('[generate-image] gemini-2.5-flash-image')
  
      const imagePart = response.candidates?.[0]?.content?.parts?.find(
        (p: { inlineData?: { data?: string } }) => p.inlineData
      )
      if (!imagePart?.inlineData?.data) {
        return NextResponse.json({ error: 'No image in Gemini response' }, { status: 500 })
      }
      return NextResponse.json({ imageBase64: imagePart.inlineData.data })
    }
  
    // Imagen 4 via AI Gateway (text-to-image, no multimodal input)
    if (useImagen) {
      const { experimental_generateImage: generateImage } = await import('ai')
      const { images } = await generateImage({
        model: 'google/imagen-4.0-generate-001' as never,
        prompt: `${body.prompt}. ${stylePrompt}`,
      })
      if (!images?.[0]?.base64) {
        return NextResponse.json({ error: 'No image returned from Imagen 4' }, { status: 500 })
      }
      return NextResponse.json({ imageBase64: images[0].base64 })
    }
  
    // GPT Image 2 via direct OpenAI SDK — supports product image as reference via images.edit
    if (useOpenAI) {
      const { default: OpenAI, toFile } = await import('openai')
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      const fullPrompt = `${body.prompt}. ${stylePrompt}`
      // Map to closest supported GPT Image 2 size
      const gptSize = isStory ? '1024x1536' as const
        : isSquare ? '1024x1024' as const
        : '1536x1024' as const
  
      console.time('[generate-image] gpt-image-2')
      let imageBase64: string
      if (productImg) {
        const productFile = await toFile(
          Buffer.from(productImg.data, 'base64'),
          'product.png',
          { type: productImg.mimeType }
        )
        const response = await openai.images.edit({
          model: 'gpt-image-2',
          image: productFile,
          prompt: fullPrompt,
          size: gptSize,
          n: 1,
        })
        if (!response.data?.[0]?.b64_json) {
          return NextResponse.json({ error: 'No image returned from GPT Image 2' }, { status: 500 })
        }
        imageBase64 = response.data[0].b64_json
      } else {
        const response = await openai.images.generate({
          model: 'gpt-image-2',
          prompt: fullPrompt,
          size: gptSize,
          n: 1,
        })
        if (!response.data?.[0]?.b64_json) {
          return NextResponse.json({ error: 'No image returned from GPT Image 2' }, { status: 500 })
        }
        imageBase64 = response.data[0].b64_json
      }
      console.timeEnd('[generate-image] gpt-image-2')
      return NextResponse.json({ imageBase64 })
    }
  
    // Vercel AI Gateway — Gemini 3.1 Flash (default)
    console.time('[generate-image] gateway-gemini-3.1-flash')
    const result = await generateText({
      model: 'google/gemini-3.1-flash-image-preview',
      messages: [
        {
          role: 'user',
          content: [
            ...(productImg ? [
              { type: 'text' as const, text: `PRODUCT REFERENCE — this is the exact product to place in the scene. Keep its label, colors, and packaging exactly as shown. Match the scene lighting onto it:` },
              { type: 'image' as const, image: Buffer.from(productImg.data, 'base64'), mimeType: productImg.mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' },
            ] : []),
            { type: 'text' as const, text: `${body.prompt}. ${stylePrompt}` },
            ...(styleImgs.length > 0 ? [{ type: 'text' as const, text: `MOOD / STYLE REFERENCES — use these for lighting, atmosphere, and color palette:` }] : []),
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
  
    console.timeEnd('[generate-image] gateway-gemini-3.1-flash')
  
    const imageFile = result.files?.find(f => f.mediaType?.startsWith('image/'))
    if (!imageFile?.base64) {
      return NextResponse.json({ error: 'No image returned from AI Gateway' }, { status: 500 })
    }
  
    return NextResponse.json({ imageBase64: imageFile.base64 })
  
  } catch (e) {
    console.error("[generate-image] unhandled error", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }

}
