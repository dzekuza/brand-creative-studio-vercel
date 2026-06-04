export type Platform = {
  id: string
  label: string
  width: number
  height: number
}

export type BrandBible = {
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
  }
  typography: {
    headingSize: string
    bodySize: string
    weight: string
    letterSpacing: string
  }
  layout: {
    padding: string
    logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  }
  tone: string
  tagline?: string
  rules: string[]
}

export type UploadedAssets = {
  productImageUrls: string[]
  styleRefUrls: string[]
  fontUrl: string
  fontName: string
  iconUrls: string[]
  logoUrl?: string
}

export type AdType = 'brand-awareness' | 'sales' | 'product-launch' | 'engagement' | 'custom'

export type GenerateRequest = {
  platform: Platform
  prompt: string
  adCopy?: { headline: string; body: string }
  count: number
}

export type LayoutSketch = {
  id: string
  svgData: string
  description: string
}

export type Creative = {
  id: string
  pngBase64: string
  platform: Platform
  status: 'pending' | 'sketching' | 'sketch-review' | 'generating' | 'preview' | 'rendering' | 'done' | 'error'
  error?: string
  // Populated when status === 'sketch-review'
  sketches?: LayoutSketch[]
  // Populated when status === 'preview'
  previewHtml?: string
  editableHeadline?: string
  editableBody?: string
  previewCompositorInput?: Omit<CompositorInput, 'headline' | 'body'>
}

export type ImageProvider = 'google' | 'gateway'

export type ImageModel = 'gemini-2.5-flash' | 'gemini-3.1-flash' | 'imagen-4' | 'gpt-image-2'

export type CompositorInput = {
  backgroundImageBase64: string
  brandBible: BrandBible
  fontUrl: string
  fontName: string
  iconSvgs: string[]
  headline: string
  body: string
  platform: Platform
  logoUrl?: string
  productImageUrl?: string
  adType?: AdType
  adContext?: string
}

export type BulkAdCopy = {
  id: string
  platform: string
  adType: AdType
  headline: string
  body: string
  cta: string
  descriptions: string[]
  imageBase64?: string
  pngBase64?: string
  productImageUrl?: string
  status: 'pending' | 'generating-image' | 'done' | 'error'
}

export type BulkAdConfig = {
  productType: 'product' | 'service'
  subcategory: string
  description: string
  targetAudience: string
  platforms: string[]
  count: number
  imageModel: ImageModel
  canvasId: string
}

export type ScrapedProduct = {
  id: string
  name: string
  description: string
  price?: string
  imageUrl?: string
  pageUrl?: string
  imported: boolean
}
