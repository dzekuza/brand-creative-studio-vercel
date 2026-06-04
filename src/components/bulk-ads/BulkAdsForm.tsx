'use client'

import { useEffect, useRef, useState } from 'react'
import { loadBrandBible } from '@/lib/brand-bible'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Download,
  ImageIcon,
  Layers,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react'
import type { BrandBible, BulkAdConfig, BulkAdCopy, ImageModel, ScrapedProduct, UploadedAssets } from '@/types'
import { PLATFORMS } from '@/lib/platforms'

// ─── Constants ────────────────────────────────────────────────────────────────


const STEP_LABELS = ['Settings', 'Review']

const AD_PLATFORMS = [
  { id: 'facebook', label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'google', label: 'Google' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'tiktok', label: 'TikTok' },
]

const IMAGE_MODELS: { id: ImageModel; label: string }[] = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5' },
  { id: 'imagen-4', label: 'Imagen 4' },
  { id: 'gpt-image-2', label: 'GPT Image 2' },
]

const PLATFORM_TO_CANVAS_ID: Record<string, string> = {
  facebook: 'facebook-feed',
  instagram: 'instagram-square',
  google: 'banner',
  linkedin: 'facebook-feed',
  tiktok: 'instagram-story',
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center mb-8">
      {Array.from({ length: total }, (_, i) => {
        const done = i + 1 < current
        const active = i + 1 === current
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={[
                  'size-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300',
                  active ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
                  done ? 'bg-emerald-500 text-white' :
                  'bg-muted text-muted-foreground',
                ].join(' ')}
              >
                {done ? <CheckCircle className="size-4" /> : i + 1}
              </div>
              <span className={[
                'text-[10px] font-medium whitespace-nowrap',
                active ? 'text-foreground' : 'text-muted-foreground',
              ].join(' ')}>
                {STEP_LABELS[i]}
              </span>
            </div>
            {i < total - 1 && (
              <div className={[
                'flex-1 h-px mx-2 mb-4 transition-colors duration-300',
                done ? 'bg-emerald-500' : 'bg-border',
              ].join(' ')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function PlatformBadge({ platform }: { platform: string }) {
  const colors: Record<string, string> = {
    facebook: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    instagram: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
    google: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
    linkedin: 'bg-sky-500/10 text-sky-700 border-sky-500/20',
    tiktok: 'bg-zinc-500/10 text-zinc-700 border-zinc-500/20',
  }
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize',
        colors[platform] ?? 'bg-muted text-muted-foreground border-border',
      ].join(' ')}
    >
      {platform}
    </span>
  )
}

// ─── Copy Card ─────────────────────────────────────────────────────────────────

type CopyCardProps = {
  copy: BulkAdCopy
  assets: UploadedAssets | null
  brandBible: BrandBible
  imageModel: ImageModel
  canvasId: string
  scrapedProducts: ScrapedProduct[]
  onChange: (updated: BulkAdCopy) => void
}

function CopyCard({ copy, assets, brandBible, imageModel, canvasId, scrapedProducts, onChange }: CopyCardProps) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effectiveProductImageUrl = copy.productImageUrl ?? assets?.productImageUrls?.[0]
  const canvasPlatform = PLATFORMS.find(p => p.id === canvasId) ?? PLATFORMS[0]

  async function generateImage() {
    if (!assets) return
    setGenerating(true)
    setError(null)
    onChange({ ...copy, status: 'generating-image' })

    try {
      // 1. Generate image
      const imgRes = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: canvasPlatform,
          brandBible,
          prompt: `${copy.headline} — ${copy.body}`,
          model: imageModel,
          fullAiMode: true,
          aiHeadline: copy.headline,
          aiBody: copy.body,
          adType: copy.adType,
          productImageUrl: effectiveProductImageUrl,
          styleRefUrls: assets.styleRefUrls ?? [],
        }),
      })
      const imgData = await imgRes.json() as { imageBase64?: string; error?: string }
      if (!imgRes.ok || !imgData.imageBase64) throw new Error(imgData.error ?? 'Image generation failed')

      // Full AI mode — image has text/layout baked in, use directly as final PNG
      onChange({
        ...copy,
        imageBase64: imgData.imageBase64,
        pngBase64: imgData.imageBase64,
        status: 'done',
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      onChange({ ...copy, status: 'error' })
    } finally {
      setGenerating(false)
    }
  }

  function downloadPng() {
    if (!copy.pngBase64) return
    const a = document.createElement('a')
    a.href = `data:image/png;base64,${copy.pngBase64}`
    a.download = `bulk-ad-${copy.platform}-${copy.id}.png`
    a.click()
  }

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PlatformBadge platform={copy.platform} />
          <Badge variant="outline" className="text-[11px] capitalize">{copy.adType.replace('-', ' ')}</Badge>
        </div>
        {copy.status === 'done' && <CheckCircle className="size-4 text-emerald-500 shrink-0" />}
        {copy.status === 'error' && <AlertTriangle className="size-4 text-destructive shrink-0" />}
        {copy.status === 'generating-image' && <Loader2 className="size-4 text-muted-foreground animate-spin shrink-0" />}
      </div>

      {/* Per-card product selector */}
      {scrapedProducts.length > 0 && (
        <select
          value={scrapedProducts.find(p => p.imageUrl === copy.productImageUrl)?.id ?? ''}
          onChange={e => {
            const product = scrapedProducts.find(p => p.id === e.target.value)
            onChange({ ...copy, productImageUrl: product?.imageUrl ?? undefined })
          }}
          className="w-full rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">— Brand assets —</option>
          {scrapedProducts.map(p => (
            <option key={p.id} value={p.id}>{p.name}{p.price ? ` · ${p.price}` : ''}</option>
          ))}
        </select>
      )}

      {/* Preview image */}
      {copy.pngBase64 ? (
        <div className="relative rounded-lg overflow-hidden border border-border bg-muted aspect-video">
          <img
            src={`data:image/png;base64,${copy.pngBase64}`}
            alt={copy.headline}
            className="w-full h-full object-contain"
          />
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 aspect-video flex items-center justify-center">
          <ImageIcon className="size-8 text-muted-foreground/40" />
        </div>
      )}

      {/* Editable fields */}
      <div className="flex flex-col gap-2">
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">Headline</Label>
          <Input
            value={copy.headline}
            onChange={e => onChange({ ...copy, headline: e.target.value })}
            className="text-sm h-8"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">Body</Label>
          <Textarea
            value={copy.body}
            onChange={e => onChange({ ...copy, body: e.target.value })}
            className="text-sm min-h-[60px] resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[11px] text-muted-foreground mb-1 block">CTA</Label>
            <Input
              value={copy.cta}
              onChange={e => onChange({ ...copy, cta: e.target.value })}
              className="text-sm h-8"
            />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground mb-1 block">Description 1</Label>
            <Input
              value={copy.descriptions[0] ?? ''}
              onChange={e => {
                const descs = [...copy.descriptions]
                descs[0] = e.target.value
                onChange({ ...copy, descriptions: descs })
              }}
              className="text-sm h-8"
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-[11px] text-destructive">{error}</p>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 gap-1.5 text-xs"
          onClick={generateImage}
          disabled={generating}
        >
          {generating
            ? <><Loader2 className="size-3 animate-spin" /> Generating…</>
            : copy.status === 'done'
              ? <><RefreshCw className="size-3" /> Regenerate</>
              : <><Sparkles className="size-3" /> Generate Image</>
          }
        </Button>
        {copy.pngBase64 && (
          <Button size="sm" variant="ghost" onClick={downloadPng} className="gap-1.5 text-xs shrink-0">
            <Download className="size-3" />
            PNG
          </Button>
        )}
      </div>
    </Card>
  )
}

// ─── Main Form ─────────────────────────────────────────────────────────────────

export function BulkAdsForm() {
  const [step, setStep] = useState(1)
  const [bible, setBible] = useState<BrandBible | null>(null)
  const [assets, setAssets] = useState<UploadedAssets | null>(null)
  const [copies, setCopies] = useState<BulkAdCopy[]>([])
  const [generatingCopies, setGeneratingCopies] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const generatingAllRef = useRef(false)

  const [config, setConfig] = useState<BulkAdConfig>({
    productType: 'product',
    subcategory: '',
    description: '',
    targetAudience: '',
    platforms: ['facebook', 'instagram'],
    count: 6,
    imageModel: 'gemini-2.5-flash',
    canvasId: 'instagram-square',
  })
  const [scrapedProducts, setScrapedProducts] = useState<ScrapedProduct[]>([])
  const [bulkProductId, setBulkProductId] = useState<string>('')

  useEffect(() => {
    const b = loadBrandBible()
    const rawAssets = localStorage.getItem('brand-creative-studio:assets')
    const rawProducts = localStorage.getItem('brand-creative-studio:scraped-products')
    if (b) setBible(b)
    if (rawAssets) {
      try { setAssets(JSON.parse(rawAssets) as UploadedAssets) } catch { /* ignore */ }
    }
    if (rawProducts) {
      try { setScrapedProducts(JSON.parse(rawProducts) as ScrapedProduct[]) } catch { /* ignore */ }
    }
  }, [])

  function togglePlatform(id: string) {
    setConfig(prev => ({
      ...prev,
      platforms: prev.platforms.includes(id)
        ? prev.platforms.filter(p => p !== id)
        : [...prev.platforms, id],
    }))
  }

  function updateCopy(updated: BulkAdCopy) {
    setCopies(prev => prev.map(c => c.id === updated.id ? updated : c))
  }

  async function generateCopies() {
    if (!bible) return
    setGeneratingCopies(true)
    setCopyError(null)
    try {
      // Auto-build description from scraped products + brand bible — no manual input needed
      const rawProducts = localStorage.getItem('brand-creative-studio:scraped-products')
      let autoDescription = config.description
      if (!autoDescription.trim()) {
        const productDescriptions: string[] = []
        if (rawProducts) {
          try {
            const prods = JSON.parse(rawProducts) as Array<{ name?: string; description?: string; price?: string }>
            prods.slice(0, 3).forEach(p => {
              if (p.name || p.description) {
                productDescriptions.push([p.name, p.description].filter(Boolean).join(': '))
              }
            })
          } catch { /* ignore */ }
        }
        if (bible.tagline) productDescriptions.unshift(bible.tagline)
        autoDescription = productDescriptions.join('. ') || bible.tone
      }
      const enrichedConfig = { ...config, description: autoDescription }
      const res = await fetch('/api/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: enrichedConfig, brandBible: bible }),
      })
      const data = await res.json() as { copies?: BulkAdCopy[]; error?: string }
      if (!res.ok || !data.copies) throw new Error(data.error ?? 'Generation failed')
      setCopies(data.copies)
      setStep(2)
    } catch (err) {
      setCopyError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setGeneratingCopies(false)
    }
  }

  async function generateAllImages() {
    if (generatingAllRef.current || !assets) return
    generatingAllRef.current = true
    const pending = copies.filter(c => c.status !== 'done')
    await Promise.all(
      pending.map(async (copy) => {
        const canvasPlatform = PLATFORMS.find(p => p.id === config.canvasId) ?? PLATFORMS[0]
        try {
          updateCopy({ ...copy, status: 'generating-image' })
          const imgRes = await fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              platform: canvasPlatform,
              brandBible: bible,
              prompt: `${copy.headline} — ${copy.body}`,
              model: config.imageModel,
              fullAiMode: true,
              aiHeadline: copy.headline,
              aiBody: copy.body,
              adType: copy.adType,
              productImageUrl: copy.productImageUrl ?? assets?.productImageUrls?.[0],
              styleRefUrls: assets?.styleRefUrls ?? [],
            }),
          })
          const imgData = await imgRes.json() as { imageBase64?: string; error?: string }
          if (!imgRes.ok || !imgData.imageBase64) throw new Error(imgData.error ?? 'Image failed')

          // Full AI mode — use image directly, skip compose-html + render
          updateCopy({ ...copy, imageBase64: imgData.imageBase64, pngBase64: imgData.imageBase64, status: 'done' })
        } catch {
          updateCopy({ ...copy, status: 'error' })
        }
      })
    )
    generatingAllRef.current = false
  }

const step3Valid = config.platforms.length > 0 && config.count >= 1 && config.count <= 20

  const doneCount = copies.filter(c => c.status === 'done').length

  // ── Step 1: Batch Settings ────────────────────────────────────────────────────
  function renderStep1() {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-1">Batch Settings</h2>
          <p className="text-sm text-muted-foreground">Choose platforms and how many copies to generate.</p>
        </div>

        {!bible && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
            <AlertTriangle className="size-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-700">No brand set up</p>
              <p className="text-sm text-muted-foreground mt-0.5">Set up your brand first so we can match tone and style.</p>
              <a href="/setup" className="inline-flex items-center mt-3 px-3 py-1.5 rounded-md border border-border bg-background text-xs font-medium hover:bg-accent transition-colors">
                Go to Brand Setup
              </a>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-5">
          <div>
            <Label className="mb-2 block text-sm">Platforms</Label>
            <div className="flex flex-wrap gap-2">
              {AD_PLATFORMS.map(p => {
                const selected = config.platforms.includes(p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    className={[
                      'px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors',
                      selected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-foreground border-border hover:border-primary/50',
                    ].join(' ')}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
            {config.platforms.length === 0 && (
              <p className="text-xs text-destructive mt-1.5">Select at least one platform</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">
              Number of Ad Copies
              <span className="text-muted-foreground font-normal ml-1">(1–20)</span>
            </Label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, count: Math.max(1, prev.count - 1) }))}
                disabled={config.count <= 1}
                className="size-8 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="w-8 text-center text-sm font-semibold tabular-nums">{config.count}</span>
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, count: Math.min(20, prev.count + 1) }))}
                disabled={config.count >= 20}
                className="size-8 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Plus className="size-3.5" />
              </button>
              <span className="text-xs text-muted-foreground ml-1">copies per platform</span>
            </div>
          </div>

          {/* Canvas / Aspect Ratio */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm">Aspect Ratio</Label>
            <div className="grid grid-cols-2 gap-2">
              {PLATFORMS.map(p => {
                const ar = p.width / p.height
                const isSelected = config.canvasId === p.id
                const previewW = ar >= 1 ? 24 : Math.round(24 * ar)
                const previewH = ar <= 1 ? 24 : Math.round(24 / ar)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, canvasId: p.id }))}
                    className={[
                      'flex items-center gap-2.5 rounded-xl border px-3 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isSelected
                        ? 'border-primary bg-primary/8 text-foreground shadow-sm'
                        : 'border-border/60 bg-card text-muted-foreground hover:border-border hover:bg-accent/50 hover:text-foreground',
                    ].join(' ')}
                  >
                    <span
                      className={`shrink-0 rounded border-2 ${isSelected ? 'border-primary/60 bg-primary/15' : 'border-muted-foreground/30 bg-muted/60'}`}
                      style={{ width: previewW, height: previewH }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold leading-tight truncate">{p.label}</span>
                      <span className="block text-[10px] leading-tight opacity-50 mt-0.5 font-mono">{p.width}×{p.height}</span>
                    </span>
                    {isSelected && <span className="size-1.5 rounded-full bg-primary shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <Label className="mb-2 block text-sm">Image Model</Label>
            <div className="flex flex-wrap gap-2">
              {IMAGE_MODELS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setConfig(prev => ({ ...prev, imageModel: m.id }))}
                  className={[
                    'px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors',
                    config.imageModel === m.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:border-primary/50',
                  ].join(' ')}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {copyError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-xs text-destructive">{copyError}</p>
          </div>
        )}
      </div>
    )
  }

  // ── Step 2: Review & Generate Images ─────────────────────────────────────────
  function renderStep2() {
    const anyGenerating = copies.some(c => c.status === 'generating-image')

    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold tracking-tight">Review & Generate Images</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm text-muted-foreground">
                Edit copy, then generate images per card or all at once.
                {doneCount > 0 && ` ${doneCount}/${copies.length} done.`}
              </p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border bg-muted text-[11px] font-medium text-muted-foreground">
                <Sparkles className="size-3" />
                {IMAGE_MODELS.find(m => m.id === config.imageModel)?.label ?? config.imageModel}
              </span>
            </div>
          </div>
          <Button
            onClick={generateAllImages}
            disabled={anyGenerating || doneCount === copies.length || !assets}
            className="gap-1.5 text-sm shrink-0"
          >
            {anyGenerating
              ? <><Loader2 className="size-4 animate-spin" /> Generating…</>
              : <><Sparkles className="size-4" /> Generate All Images</>
            }
          </Button>
        </div>

        {/* Bulk product selector */}
        {scrapedProducts.length > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
            <span className="text-xs font-medium text-muted-foreground shrink-0">Apply product to all:</span>
            <select
              value={bulkProductId}
              onChange={e => {
                const id = e.target.value
                setBulkProductId(id)
                const product = scrapedProducts.find(p => p.id === id)
                setCopies(prev => prev.map(c => ({ ...c, productImageUrl: product?.imageUrl ?? undefined })))
              }}
              className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— Use brand assets —</option>
              {scrapedProducts.map(p => (
                <option key={p.id} value={p.id}>{p.name}{p.price ? ` · ${p.price}` : ''}</option>
              ))}
            </select>
            {bulkProductId && (
              <button
                type="button"
                onClick={() => {
                  setBulkProductId('')
                  setCopies(prev => prev.map(c => ({ ...c, productImageUrl: undefined })))
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        )}

        {!assets && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-2">
            <AlertTriangle className="size-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              No uploaded assets found. Image generation requires an active Brand Setup session with a product image.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {copies.map(copy => (
            <CopyCard
              key={copy.id}
              copy={copy}
              assets={assets}
              brandBible={bible!}
              imageModel={config.imageModel}
              canvasId={config.canvasId}
              scrapedProducts={scrapedProducts}
              onChange={updateCopy}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
      {/* Page header */}
      <div
        className="relative mb-8 overflow-hidden rounded-2xl border border-border/60 bg-card"
        style={{ backgroundImage: 'url(/bg-card-blue.jpg)', backgroundSize: 'cover', backgroundPosition: 'center top' }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/75 to-background/50" />
        <div className="relative z-10 flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Layers className="size-5 text-primary" />
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Bulk Ads</h1>
            </div>
            <p className="text-muted-foreground text-sm">Generate multiple ad copies and creatives in one batch.</p>
          </div>
        </div>
      </div>

      {step < 2 ? (
        /* Wizard layout: centered narrow card */
        <div className="max-w-xl mx-auto">
          <StepIndicator current={step} total={2} />

          <div className="rounded-2xl border border-border bg-card p-6">
            {step === 1 && renderStep1()}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <div />

            <Button
              onClick={generateCopies}
              disabled={!step3Valid || generatingCopies || !bible}
              className="gap-1.5 text-sm"
            >
              {generatingCopies
                ? <><Loader2 className="size-4 animate-spin" /> Generating Copies…</>
                : <><Sparkles className="size-4" /> Generate Copies</>
              }
            </Button>
          </div>
        </div>
      ) : (
        /* Full-width results */
        <div>
          <div className="flex items-center gap-3 mb-6">
            <StepIndicator current={step} total={2} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep(1)}
              className="gap-1.5 text-xs ml-auto text-muted-foreground"
            >
              <ArrowLeft className="size-3" />
              Back to Settings
            </Button>
          </div>
          {renderStep2()}
        </div>
      )}
    </div>
  )
}
