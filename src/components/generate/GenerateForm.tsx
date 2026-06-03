'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PLATFORMS } from '@/lib/platforms'
import { v4 as uuidv4 } from 'uuid'
import { saveCreatives } from '@/lib/creative-history'
import type { AdType, BrandBible, Creative, ImageModel, ScrapedProduct, UploadedAssets } from '@/types'

const PRODUCTS_KEY = 'brand-creative-studio:scraped-products'

const IMAGE_MODELS: { id: ImageModel; label: string; sub: string; note?: string }[] = [
  { id: 'gemini-3.1-flash', label: 'Gemini 3.1 Flash', sub: 'Gateway · Multimodal' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', sub: 'Direct · Multimodal' },
  { id: 'gpt-image-2', label: 'GPT Image 2', sub: 'OpenAI · Multimodal' },
  { id: 'imagen-4', label: 'Imagen 4', sub: 'Gateway · Text-only', note: 'Does not use product/style images' },
]

const AD_TYPES: { id: AdType; label: string; hint: string }[] = [
  { id: 'brand-awareness', label: 'Brand Awareness', hint: 'emotional storytelling, aspirational copy, no hard sell' },
  { id: 'sales', label: 'Sales / Promo', hint: 'offer-first, urgency, price/discount hooks, clear CTA' },
  { id: 'product-launch', label: 'Product Launch', hint: 'excitement, novelty, feature highlights, "introducing" framing' },
  { id: 'engagement', label: 'Engagement', hint: 'community, question-led, relatable, share-worthy' },
  { id: 'custom', label: 'Custom', hint: 'describe exactly what you need in the context field' },
]

type Props = {
  brandBible: BrandBible
  assets: UploadedAssets
  onCreativesUpdate: (creatives: Creative[]) => void
  onRegisterApprove: (fn: (id: string) => void) => void
  onRegisterRecompose: (fn: (id: string, headline: string, body: string) => Promise<void>) => void
  onRegisterApproveSketch: (fn: (id: string, sketchIds: string[]) => void) => void
}

export function GenerateForm({ brandBible, assets, onCreativesUpdate, onRegisterApprove, onRegisterRecompose, onRegisterApproveSketch }: Props) {
  const [platformId, setPlatformId] = useState(PLATFORMS[0].id)
  const [imageModel, setImageModel] = useState<ImageModel>('gemini-3.1-flash')
  const renderMode = 'ai' as const
  const [adType, setAdType] = useState<AdType | ''>('')
  const [adContext, setAdContext] = useState('')
  const [imagePrompt, setImagePrompt] = useState('')
  const [headline, setHeadline] = useState('')
  const [body, setBody] = useState('')
  const [count, setCount] = useState(3)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string>()
  const [scrapedProducts, setScrapedProducts] = useState<ScrapedProduct[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')

  // Ref mirror so approval/recompose callbacks see latest creatives without stale closure
  const creativesRef = useRef<Creative[]>([])
  const approvalCallbacks = useRef<Map<string, (html: string) => void>>(new Map())

  function updateCreatives(updater: (prev: Creative[]) => Creative[]) {
    onCreativesUpdate(updater(creativesRef.current))
    creativesRef.current = updater(creativesRef.current)
  }

  function waitForApproval(id: string): Promise<string> {
    return new Promise(resolve => approvalCallbacks.current.set(id, resolve))
  }

  function approveCreative(id: string) {
    const creative = creativesRef.current.find(c => c.id === id)
    if (!creative?.previewHtml) return
    const html = creative.previewHtml
    creativesRef.current = creativesRef.current.map(c =>
      c.id === id ? { ...c, status: 'rendering' } : c
    )
    onCreativesUpdate([...creativesRef.current])
    approvalCallbacks.current.get(id)?.(html)
    approvalCallbacks.current.delete(id)
  }

  async function recomposeCreative(id: string, newHeadline: string, newBody: string) {
    const creative = creativesRef.current.find(c => c.id === id)
    if (!creative?.previewCompositorInput) return
    creativesRef.current = creativesRef.current.map(c =>
      c.id === id ? { ...c, status: 'generating' } : c
    )
    onCreativesUpdate([...creativesRef.current])
    const composeRes = await fetch('/api/compose-html', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...creative.previewCompositorInput, headline: newHeadline, body: newBody }),
    })
    if (!composeRes.ok) return
    const { html } = await composeRes.json()
    creativesRef.current = creativesRef.current.map(c =>
      c.id === id ? { ...c, status: 'preview', previewHtml: html, editableHeadline: newHeadline, editableBody: newBody } : c
    )
    onCreativesUpdate([...creativesRef.current])
  }

  const sketchApprovalCallbacks = useRef<Map<string, (descriptions: string[]) => void>>(new Map())

  function waitForSketchApproval(id: string): Promise<string[]> {
    return new Promise(resolve => sketchApprovalCallbacks.current.set(id, resolve))
  }

  function approveSketch(id: string, sketchIds: string[]) {
    const creative = creativesRef.current.find(c => c.id === id)
    const descriptions = (creative?.sketches ?? [])
      .filter(s => sketchIds.includes(s.id))
      .map(s => s.description)
    sketchApprovalCallbacks.current.get(id)?.(descriptions)
    sketchApprovalCallbacks.current.delete(id)
    creativesRef.current = creativesRef.current.map(c =>
      c.id === id ? { ...c, status: 'generating' } : c
    )
    onCreativesUpdate([...creativesRef.current])
  }

  useEffect(() => {
    onRegisterApprove(approveCreative)
    onRegisterRecompose(recomposeCreative)
    onRegisterApproveSketch(approveSketch)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PRODUCTS_KEY)
      if (raw) setScrapedProducts(JSON.parse(raw) as ScrapedProduct[])
    } catch {}
  }, [])

  const selectedProduct = scrapedProducts.find(p => p.id === selectedProductId) ?? null
  const effectiveProductImageUrl = selectedProduct?.imageUrl ?? assets.productImageUrl

  function handleProductSelect(id: string) {
    setSelectedProductId(id)
    const product = scrapedProducts.find(p => p.id === id)
    if (product) {
      if (!headline) setHeadline(product.name)
      if (!body) setBody(product.description.slice(0, 120))
    }
  }

  const aiWillGenerateCopy = !!adType && !headline

  async function generate() {
    if (!imagePrompt) { setError('Image generation prompt is required'); return }
    setError(undefined)
    setGenerating(true)

    const platform = PLATFORMS.find(p => p.id === platformId)!
    const ids = Array.from({ length: count }, () => uuidv4())

    const pending: Creative[] = ids.map(id => ({
      id, pngBase64: '', platform, status: 'generating',
    }))
    creativesRef.current = pending
    onCreativesUpdate(pending)

    const iconSvgs: string[] = await Promise.all(
      (assets.iconUrls ?? []).map(async url => {
        const res = await fetch(url)
        return res.ok ? res.text() : ''
      })
    )

    async function generateImage(prompt: string): Promise<string> {
      const imgRes = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          productImageUrl: effectiveProductImageUrl,
          styleRefUrls: assets.styleRefUrls ?? [],
          brandBible,
          platform,
          model: imageModel,
          fullAiMode: renderMode === 'ai',
          aiHeadline: renderMode === 'ai' && !aiWillGenerateCopy ? (headline || brandBible.tagline || '') : undefined,
          aiBody: renderMode === 'ai' && !aiWillGenerateCopy ? (body || '') : undefined,
          adType: renderMode === 'ai' && adType ? adType : undefined,
          adContext: renderMode === 'ai' && adType ? (adContext || undefined) : undefined,
        }),
      })
      if (!imgRes.ok) throw new Error(await imgRes.text())
      const { imageBase64 } = await imgRes.json()
      return imageBase64
    }

    const results = await Promise.allSettled(
      ids.map(async id => {
        let finalPrompt = imagePrompt

        const imageBase64 = await generateImage(finalPrompt)

        // Full AI mode — image already has text/icons baked in, skip compose + render
        if (renderMode === 'ai') {
          return { id, pngBase64: imageBase64 }
        }

        const resolvedHeadline = headline || brandBible.tagline || ''
        const resolvedBody = body || ''

        const compositorInput = {
          backgroundImageBase64: imageBase64,
          brandBible,
          fontUrl: assets.fontUrl,
          fontName: assets.fontName,
          iconSvgs,
          platform,
          logoUrl: assets.logoUrl,
          productImageUrl: effectiveProductImageUrl,
          adType: adType || undefined,
          adContext: adContext || undefined,
        }

        const composeRes = await fetch('/api/compose-html', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...compositorInput, headline: resolvedHeadline, body: resolvedBody }),
        })
        if (!composeRes.ok) throw new Error(await composeRes.text())
        const { html } = await composeRes.json()

        // Pause — show preview for user to edit text before rendering
        creativesRef.current = creativesRef.current.map(c =>
          c.id === id ? {
            ...c,
            status: 'preview',
            previewHtml: html,
            editableHeadline: resolvedHeadline,
            editableBody: resolvedBody,
            previewCompositorInput: compositorInput,
          } : c
        )
        onCreativesUpdate([...creativesRef.current])

        // Wait for user to click "Render PNG"
        const approvedHtml = await waitForApproval(id)

        const renderRes = await fetch('/api/render', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html: approvedHtml, width: platform.width, height: platform.height }),
        })
        if (!renderRes.ok) throw new Error(await renderRes.text())
        const { pngBase64 } = await renderRes.json()

        return { id, pngBase64 }
      })
    )

    const final: Creative[] = ids.map((id, i) => {
      const r = results[i]
      if (r.status === 'fulfilled') {
        return { id, pngBase64: r.value.pngBase64, platform, status: 'done' as const }
      }
      return {
        id, pngBase64: '', platform, status: 'error' as const,
        error: String((r as PromiseRejectedResult).reason),
      }
    })

    saveCreatives(final)
    creativesRef.current = final
    onCreativesUpdate(final)
    setGenerating(false)
  }

  return (
    <div className="space-y-6">

      {/* Product selector */}
      {scrapedProducts.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Product</Label>
          <Select value={selectedProductId} onValueChange={(v) => handleProductSelect(v ?? '')}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="— Use brand assets (no product) —">
                {(value: string | null) => value
                  ? (scrapedProducts.find(p => p.id === value)?.name ?? value)
                  : '— Use brand assets (no product) —'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="" label="— Use brand assets (no product) —">— Use brand assets (no product) —</SelectItem>
              {scrapedProducts.map(p => (
                <SelectItem key={p.id} value={p.id} label={p.name}>
                  {p.name}{p.price ? ` · ${p.price}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedProduct && (
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              {/* Image area */}
              <div className="relative w-full aspect-[4/3] bg-muted overflow-hidden">
                {selectedProduct.imageUrl ? (
                  <>
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover transition-opacity duration-300"
                      onError={e => {
                        const el = e.target as HTMLImageElement
                        el.style.display = 'none'
                        const fb = el.parentElement?.querySelector('[data-fallback]') as HTMLElement | null
                        if (fb) fb.hidden = false
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
                  </>
                ) : null}
                <div data-fallback hidden={!!selectedProduct.imageUrl} className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground/40">
                  <svg className="size-10" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="m21 15-5-5L5 21"/>
                  </svg>
                  <span className="text-xs">No image saved</span>
                </div>
                {/* Price badge overlaid on image */}
                {selectedProduct.price && (
                  <div className="absolute top-2.5 right-2.5">
                    <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm text-foreground border border-border/60 font-semibold text-xs shadow-sm">
                      {selectedProduct.price}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Product info */}
              <div className="px-3.5 py-3 space-y-1.5">
                <p className="text-sm font-semibold leading-tight tracking-tight">{selectedProduct.name}</p>
                {selectedProduct.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{selectedProduct.description}</p>
                )}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <svg className="size-3 text-primary shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-[11px] text-primary font-medium">Product image will be used in generation</span>
                </div>
              </div>
            </div>
          )}

          <div className="h-px bg-border/50" />
        </div>
      )}

      {/* Platform */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Platform</Label>
        <div className="grid grid-cols-2 gap-2">
          {PLATFORMS.map(p => {
            const ar = p.width / p.height
            const isSelected = platformId === p.id
            const previewW = ar >= 1 ? 24 : Math.round(24 * ar)
            const previewH = ar <= 1 ? 24 : Math.round(24 / ar)
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlatformId(p.id)}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isSelected
                    ? 'border-primary bg-primary/8 text-foreground shadow-sm'
                    : 'border-border/60 bg-card text-muted-foreground hover:border-border hover:bg-accent/50 hover:text-foreground'
                }`}
              >
                <span
                  className={`shrink-0 rounded border-2 ${isSelected ? 'border-primary/60 bg-primary/15' : 'border-muted-foreground/30 bg-muted/60'}`}
                  style={{ width: previewW, height: previewH }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold leading-tight truncate">{p.label}</span>
                  <span className="block text-[10px] leading-tight opacity-50 mt-0.5 font-mono">{p.width}×{p.height}</span>
                </span>
                {isSelected && (
                  <span className="size-1.5 rounded-full bg-primary shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="h-px bg-border/50" />

      {/* Image Model */}
      <div className="space-y-2.5">
        <Label className="text-sm font-semibold">Image Model</Label>
        <div className="flex flex-wrap gap-2">
          {IMAGE_MODELS.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => setImageModel(m.id)}
              title={m.note}
              className={`rounded-full border px-3.5 py-1.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                imageModel === m.id
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border/60 bg-card text-muted-foreground hover:border-border hover:text-foreground hover:bg-accent/50'
              }`}
            >
              <span className="block text-xs font-medium leading-tight">{m.label}</span>
              <span className={`block text-[10px] leading-tight mt-0.5 ${imageModel === m.id ? 'opacity-70' : 'opacity-50'}`}>{m.sub}</span>
            </button>
          ))}
        </div>
        {IMAGE_MODELS.find(m => m.id === imageModel)?.note && (
          <p className="text-[11px] text-muted-foreground">{IMAGE_MODELS.find(m => m.id === imageModel)?.note}</p>
        )}
      </div>

      <div className="h-px bg-border/50" />

      {/* Ad Type */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Ad Type</Label>
          {adType && (
            <button
              type="button"
              onClick={() => setAdType('')}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {AD_TYPES.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setAdType(prev => prev === t.id ? '' : t.id)}
              title={t.hint}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                adType === t.id
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border/60 bg-card text-muted-foreground hover:border-border hover:text-foreground hover:bg-accent/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {adType && (
          <p className="text-[11px] text-muted-foreground leading-relaxed px-0.5">
            {AD_TYPES.find(t => t.id === adType)?.hint}
          </p>
        )}
      </div>

      {/* Campaign Context — appears only when ad type selected */}
      {adType && (
        <div className="space-y-2">
          <div className="flex items-baseline gap-1.5">
            <Label className="text-sm font-semibold">Campaign Context</Label>
            {aiWillGenerateCopy && (
              <span className="text-[11px] text-primary font-medium">· AI writes all copy from this</span>
            )}
          </div>
          <Textarea
            value={adContext}
            onChange={e => setAdContext(e.target.value)}
            placeholder={
              adType === 'sales'
                ? 'e.g. 30% off summer sale ends Friday, target: women 25–40, key message: look amazing for less'
                : adType === 'brand-awareness'
                  ? 'e.g. inspire confidence in everyday moments, target: young professionals, feeling: premium but approachable'
                  : adType === 'product-launch'
                    ? 'e.g. launching our new recovery serum, key differentiator: 72-hour hydration, target: skincare enthusiasts'
                    : adType === 'engagement'
                      ? 'e.g. ask followers which scent is their favourite, build community around morning rituals'
                      : 'Describe what you want the ad to say and achieve...'
            }
            rows={3}
            className="resize-none"
          />
        </div>
      )}

      <div className="h-px bg-border/50" />

      {/* Image Prompt */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">
          Image Prompt
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <Textarea
          value={imagePrompt}
          onChange={e => setImagePrompt(e.target.value)}
          placeholder="e.g. minimalist marble surface, warm morning light, product centred with soft shadow"
          rows={3}
          className="resize-none"
        />
      </div>

      {/* Headline */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-1.5">
          <Label className="text-sm font-semibold">Headline</Label>
          <span className="text-[11px] text-muted-foreground">
            {aiWillGenerateCopy ? 'leave blank — AI will create it' : 'leave blank to use tagline'}
          </span>
        </div>
        <Input
          value={headline}
          onChange={e => setHeadline(e.target.value)}
          placeholder={aiWillGenerateCopy ? 'AI-generated' : (brandBible.tagline ?? 'Your headline…')}
        />
      </div>

      {/* Body Copy */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-1.5">
          <Label className="text-sm font-semibold">Body Copy</Label>
          <span className="text-[11px] text-muted-foreground">optional override</span>
        </div>
        <Input
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={aiWillGenerateCopy ? 'AI-generated' : 'Short supporting text'}
        />
      </div>

      <div className="h-px bg-border/50" />

      {/* Count + Generate */}
      <div className="flex items-center gap-3">
        <div className="space-y-1.5 shrink-0">
          <Label className="text-xs text-muted-foreground">Creatives</Label>
          <Input
            type="number"
            min={1}
            max={10}
            value={count}
            onChange={e => setCount(Math.min(10, Math.max(1, Number(e.target.value))))}
            className="w-16 text-center"
          />
        </div>
        <div className="flex-1 pt-6">
          {error && <p className="text-xs text-destructive mb-2">{error}</p>}
          <Button onClick={generate} disabled={generating} className="w-full h-10 font-semibold">
            {generating ? 'Generating…' : `Generate ${count} Creative${count > 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>

    </div>
  )
}
