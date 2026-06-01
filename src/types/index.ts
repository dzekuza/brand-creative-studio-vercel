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
  productImageUrl: string
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

export type Creative = {
  id: string
  pngBase64: string
  platform: Platform
  status: 'pending' | 'generating' | 'done' | 'error'
  error?: string
}

export type ImageProvider = 'google' | 'gateway'

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
  adType?: AdType
  adContext?: string
}
