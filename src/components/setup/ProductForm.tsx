'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { FileUploadZone } from './FileUploadZone'
import { BrandBiblePreview } from './BrandBiblePreview'
import { saveBrandBible, loadBrandBible } from '@/lib/brand-bible'
import { saveSetup, loadSetup } from '@/lib/saved-setup'
import { extractColors } from '@/lib/color-extract'
import type { BrandBible, BrandCategory, ScrapedProduct, UploadedAssets } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import {
  Package, Smartphone, Settings, ShoppingBag, Briefcase, Sparkles, UtensilsCrossed,
} from 'lucide-react'

const BRAND_CATEGORIES: {
  id: BrandCategory
  label: string
  description: string
  icon: React.ElementType
}[] = [
  { id: 'physical-product', label: 'Physical Product',  description: 'Goods shipped to customers',       icon: Package },
  { id: 'mobile-app',       label: 'Mobile App',        description: 'iOS / Android application',        icon: Smartphone },
  { id: 'ecommerce',        label: 'E-commerce',        description: 'Online store or marketplace',      icon: ShoppingBag },
  { id: 'saas',             label: 'SaaS / Software',   description: 'Web platform or subscription',     icon: Settings },
  { id: 'service',          label: 'Service',           description: 'Agency, consulting, freelance',    icon: Briefcase },
  { id: 'beauty-wellness',  label: 'Beauty & Wellness', description: 'Skincare, health, supplements',    icon: Sparkles },
  { id: 'food-beverage',    label: 'Food & Beverage',   description: 'Food products or restaurants',     icon: UtensilsCrossed },
]

const PRODUCTS_KEY = 'brand-creative-studio:scraped-products'

function loadImportedProducts(): ScrapedProduct[] {
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY)
    return raw ? (JSON.parse(raw) as ScrapedProduct[]) : []
  } catch {
    return []
  }
}

function saveImportedProducts(products: ScrapedProduct[]): void {
  try {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products))
  } catch {}
}

type Props = { onComplete: (bible: BrandBible, assets: UploadedAssets) => void }

export function ProductForm({ onComplete }: Props) {
  const [category, setCategory]   = useState<BrandCategory | null>(null)
  const [brandName, setBrandName] = useState('')
  const [about, setAbout]         = useState('')
  const [url, setUrl]             = useState('')
  const [assets, setAssets]       = useState<Partial<UploadedAssets>>({})
  const [generating, setGenerating] = useState(false)
  const [generateStatus, setGenerateStatus] = useState('')
  const [bible, setBible]           = useState<BrandBible | null>(null)
  const [error, setError]           = useState<string>()
  const [loaded, setLoaded]         = useState(false)

  // Scrape state
  const [scrapeUrl, setScrapeUrl]         = useState('')
  const [scraping, setScraping]           = useState(false)
  const [scrapeError, setScrapeError]     = useState<string>()
  const [scraped, setScraped]             = useState<ScrapedProduct[]>([])
  const [selected, setSelected]           = useState<Set<string>>(new Set())
  const [importedProducts, setImportedProducts] = useState<ScrapedProduct[]>([])

  useEffect(() => {
    const saved = loadSetup()
    if (saved) {
      setBrandName(saved.brandName ?? '')
      setAbout(saved.about ?? '')
      setUrl(saved.url ?? '')
      setAssets(saved.assets)
      setScrapeUrl(saved.url ?? '')
      if (saved.category) setCategory(saved.category)
    }
    setBible(loadBrandBible())
    setImportedProducts(loadImportedProducts())
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    saveSetup({ brandName, about, url, assets, category: category ?? undefined })
  }, [brandName, about, url, assets, category, loaded])

  useEffect(() => {
    if (url) setScrapeUrl(url)
  }, [url])

  async function generate() {
    if (!brandName) {
      setError('Brand name is required.')
      return
    }
    setError(undefined)
    setGenerating(true)
    setGenerateStatus('Extracting colors from style references…')

    try {
      let currentAssets = { ...assets }
      let webColors: string[] = []
      let webFonts: string[] = []
      let webHeadings: string[] = []
      let webTagline: string | undefined

      // Step 1: Crawl the website URL for styles, logo, headings
      if (url) {
        setGenerateStatus('Crawling website for styles and logo…')
        try {
          const scrapeRes = await fetch('/api/scrape-brand', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
          })
          if (scrapeRes.ok) {
            const scraped = await scrapeRes.json() as {
              colors: string[]; fontFamilies: string[]; logoUrl?: string;
              headings: string[]; brandName?: string; tagline?: string
            }
            webColors = scraped.colors ?? []
            webFonts = scraped.fontFamilies ?? []
            webHeadings = scraped.headings ?? []
            webTagline = scraped.tagline

            // Auto-download logo if none uploaded
            if (!currentAssets.logoUrl && scraped.logoUrl) {
              setGenerateStatus('Downloading logo from website…')
              try {
                const proxyRes = await fetch('/api/proxy-image', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url: scraped.logoUrl }),
                })
                if (proxyRes.ok) {
                  const { url: savedLogoUrl } = await proxyRes.json() as { url: string }
                  currentAssets = { ...currentAssets, logoUrl: savedLogoUrl }
                  setAssets(currentAssets)
                }
              } catch { /* skip */ }
            }
          }
        } catch { /* skip scrape errors — proceed with what we have */ }
      }

      // Step 2: Extract colors from style references
      setGenerateStatus('Extracting brand colors…')
      const styleColors: string[] = []
      for (const ref of currentAssets.styleRefUrls ?? []) {
        const colors = await extractColors(ref, 3)
        styleColors.push(...colors)
      }

      // Merge: style ref colors first (user-uploaded, most accurate), then web colors
      const colorPalette = [...new Set([...styleColors, ...webColors])].slice(0, 12)

      // Step 3: Generate brand bible
      setGenerateStatus('Generating brand bible with AI…')
      const res = await fetch('/api/brand-bible', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName,
          about: about || undefined,
          url: url || undefined,
          fontName: currentAssets.fontNames?.[0] ?? (webFonts[0] || 'BrandFont'),
          webFonts,
          iconNames: (currentAssets.iconUrls ?? []).map((_, i) => `icon-${i}`),
          colorPalette,
          headings: webHeadings.slice(0, 8),
          tagline: webTagline,
          category: category ?? undefined,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const result: BrandBible = await res.json()
      saveBrandBible(result)
      setBible(result)
      onComplete(result, currentAssets as UploadedAssets)
    } catch (e) {
      setError(String(e))
    } finally {
      setGenerating(false)
      setGenerateStatus('')
    }
  }

  async function scrape() {
    if (!scrapeUrl) return
    setScrapeError(undefined)
    setScraping(true)
    setScraped([])
    setSelected(new Set())
    try {
      const res = await fetch('/api/scrape-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scrapeUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Scrape failed')
      const products: ScrapedProduct[] = data.products
      setScraped(products)
      setSelected(new Set(products.map(p => p.id)))
    } catch (e) {
      setScrapeError(String(e))
    } finally {
      setScraping(false)
    }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const [importing, setImporting] = useState(false)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [uploadingProductId, setUploadingProductId] = useState<string | null>(null)

  async function importSelected() {
    const toImport = scraped.filter(p => selected.has(p.id))
    setImporting(true)

    // Download and save each product image locally so generation never depends on external URLs
    const saved: ScrapedProduct[] = await Promise.all(
      toImport.map(async p => {
        if (!p.imageUrl?.startsWith('http')) return { ...p, imported: true }
        try {
          const res = await fetch('/api/proxy-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: p.imageUrl }),
          })
          if (!res.ok) return { ...p, imported: true }
          const { url } = await res.json() as { url: string }
          return { ...p, imageUrl: url, imported: true }
        } catch {
          return { ...p, imported: true }
        }
      })
    )

    const existing = importedProducts.filter(p => !saved.find(n => n.name === p.name))
    const merged = [...existing, ...saved]
    setImportedProducts(merged)
    saveImportedProducts(merged)
    setScraped([])
    setSelected(new Set())
    setImporting(false)
  }

  function removeImported(id: string) {
    const updated = importedProducts.filter(p => p.id !== id)
    setImportedProducts(updated)
    saveImportedProducts(updated)
  }

  async function replaceProductImage(productId: string, file: File) {
    setUploadingProductId(productId)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error(await res.text())
      const { url } = await res.json() as { url: string }
      const updated = importedProducts.map(p => p.id === productId ? { ...p, imageUrl: url } : p)
      setImportedProducts(updated)
      saveImportedProducts(updated)
    } finally {
      setUploadingProductId(null)
    }
  }

  return (
    <div className="space-y-10">

      {/* Brand Category */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Brand Category</h2>
          <p className="text-sm text-muted-foreground mt-0.5">What kind of brand are you? This helps the AI pick the right ad style.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {BRAND_CATEGORIES.map(cat => {
            const Icon = cat.icon
            const active = category === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(active ? null : cat.id)}
                className={`group flex flex-col gap-2 rounded-xl border p-4 text-left transition-all ${
                  active
                    ? 'border-[var(--studio-accent)] bg-[var(--studio-accent)]/8 shadow-sm'
                    : 'border-border bg-card hover:border-[var(--studio-accent)]/50 hover:bg-muted/50'
                }`}
              >
                <div className={`flex size-8 items-center justify-center rounded-lg transition-colors ${
                  active ? 'bg-[var(--studio-accent)] text-white' : 'bg-muted text-muted-foreground group-hover:bg-[var(--studio-accent)]/10 group-hover:text-[var(--studio-accent)]'
                }`}>
                  <Icon className="size-4" />
                </div>
                <div>
                  <p className={`text-xs font-semibold leading-tight ${active ? 'text-[var(--studio-accent)]' : 'text-foreground'}`}>
                    {cat.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{cat.description}</p>
                </div>
              </button>
            )
          })}
        </div>
        {category && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {BRAND_CATEGORIES.find(c => c.id === category)?.label}
            </span>
            {' '}selected — AI will use{' '}
            {['mobile-app', 'saas'].includes(category)
              ? 'mobile app ad references'
              : ['physical-product', 'ecommerce', 'beauty-wellness', 'food-beverage'].includes(category)
              ? 'physical product ad references'
              : 'general ad references'
            }.
          </p>
        )}
      </section>

      {/* Brand Identity */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Brand Identity</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Your brand info — used to generate the brand bible.</p>
        </div>
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label>Brand Name *</Label>
            <Input
              value={brandName}
              onChange={e => setBrandName(e.target.value)}
              placeholder="e.g. Aura Skincare"
            />
          </div>
          <div className="space-y-1.5">
            <Label>About</Label>
            <Textarea
              value={about}
              onChange={e => setAbout(e.target.value)}
              placeholder="Describe your brand — what you sell, who you sell to, your voice and values..."
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Website URL</Label>
            <Input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://yourbrand.com"
              type="url"
            />
          </div>
        </div>
      </section>

      {/* Brand Assets */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Brand Assets</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Upload files used in every creative.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Product Images <span className="text-muted-foreground text-xs">(up to 10)</span></Label>
            <FileUploadZone
              label="Upload product images"
              accept="image/jpeg,image/png,image/webp"
              multiple
              maxFiles={10}
              initialUrls={assets.productImageUrls?.length ? assets.productImageUrls : undefined}
              onUploaded={urls => setAssets(a => ({ ...a, productImageUrls: urls }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Style References <span className="text-muted-foreground text-xs">(up to 5 — mood board)</span></Label>
            <FileUploadZone
              label="Upload style references"
              accept="image/jpeg,image/png,image/webp"
              multiple
              maxFiles={5}
              initialUrls={assets.styleRefUrls?.length ? assets.styleRefUrls : undefined}
              onUploaded={urls => setAssets(a => ({ ...a, styleRefUrls: urls }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Brand Fonts <span className="text-muted-foreground text-xs">(.ttf / .otf / .woff2 — up to 3)</span></Label>
            <FileUploadZone
              label="Upload font files"
              accept=".ttf,.otf,.woff,.woff2"
              multiple
              maxFiles={3}
              initialUrls={assets.fontUrls?.length ? assets.fontUrls : undefined}
              onUploaded={(urls, names) =>
                setAssets(a => ({
                  ...a,
                  fontUrls: urls,
                  fontNames: names.map(n => n.replace(/\.[^.]+$/, '')),
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Icons & Vectors <span className="text-muted-foreground text-xs">(.svg)</span></Label>
            <FileUploadZone
              label="Upload SVG icons"
              accept="image/svg+xml,.svg"
              multiple
              maxFiles={10}
              initialUrls={assets.iconUrls?.length ? assets.iconUrls : undefined}
              onUploaded={urls => setAssets(a => ({ ...a, iconUrls: urls }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Brand Logo <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <FileUploadZone
              label="Upload logo"
              accept="image/png,image/webp,image/svg+xml,.svg"
              initialUrls={assets.logoUrl ? [assets.logoUrl] : undefined}
              onUploaded={([u]) => setAssets(a => ({ ...a, logoUrl: u }))}
            />
          </div>
        </div>
      </section>

      {/* Generate Brand Bible */}
      <section className="space-y-3">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={generate} disabled={generating} className="w-full">
          {generating ? (generateStatus || 'Generating…') : 'Generate Brand Bible ✨'}
        </Button>
        {bible && <BrandBiblePreview bible={bible} />}
      </section>

      {/* Scrape Products */}
      <section className="space-y-4 border-t pt-8">
        <div>
          <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Product Discovery</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Scrape your website to find products — import them to use in ad generation.</p>
        </div>

        <div className="flex gap-2">
          <Input
            value={scrapeUrl}
            onChange={e => setScrapeUrl(e.target.value)}
            placeholder="https://yourbrand.com/products"
            type="url"
            className="flex-1"
          />
          <Button onClick={scrape} disabled={scraping || !scrapeUrl} variant="outline">
            {scraping ? 'Scraping…' : 'Scrape URL'}
          </Button>
        </div>

        {scrapeError && <p className="text-sm text-destructive">{scrapeError}</p>}

        {scraped.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{scraped.length} products found — select to import</p>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set(scraped.map(p => p.id)))}>
                  Select all
                </Button>
                <Button size="sm" onClick={importSelected} disabled={selected.size === 0 || importing}>
                  {importing ? 'Saving images…' : selected.size > 0 ? `Import (${selected.size})` : 'Import'}
                </Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {scraped.map(product => (
                <label
                  key={product.id}
                  className={`flex gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${selected.has(product.id) ? 'border-primary bg-primary/5' : 'border-border'}`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 shrink-0"
                    checked={selected.has(product.id)}
                    onChange={() => toggleSelect(product.id)}
                  />
                  <div className="flex gap-3 min-w-0">
                    {product.imageUrl && (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-14 w-14 rounded object-cover shrink-0"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      {product.price && <Badge variant="secondary" className="text-xs mb-1">{product.price}</Badge>}
                      <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Imported products */}
        {importedProducts.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">{importedProducts.length} imported product{importedProducts.length !== 1 ? 's' : ''}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {importedProducts.map(product => (
                <div key={product.id} className="rounded-lg border border-border overflow-hidden">
                  {/* Product image — drag-and-drop or click to replace */}
                  <div
                    className={`relative bg-muted aspect-video flex items-center justify-center transition-colors ${dragOverId === product.id ? 'bg-primary/10 ring-2 ring-primary ring-inset' : ''}`}
                    onDragOver={e => { e.preventDefault(); setDragOverId(product.id) }}
                    onDragLeave={() => setDragOverId(null)}
                    onDrop={e => {
                      e.preventDefault()
                      setDragOverId(null)
                      const file = e.dataTransfer.files[0]
                      if (file?.type.startsWith('image/')) replaceProductImage(product.id, file)
                    }}
                  >
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={e => {
                          const el = e.target as HTMLImageElement
                          el.style.display = 'none'
                          el.nextElementSibling?.removeAttribute('hidden')
                        }}
                      />
                    ) : null}
                    <div hidden={!!product.imageUrl} className="flex flex-col items-center gap-1 text-muted-foreground/40">
                      <svg className="size-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                      <span className="text-[10px]">No image</span>
                    </div>
                    {/* Hover overlay — click or drop to replace */}
                    <label className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer bg-black/40 group">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (file) replaceProductImage(product.id, file)
                          e.target.value = ''
                        }}
                      />
                      <span className="text-[11px] text-white font-medium px-2 text-center leading-tight">
                        {uploadingProductId === product.id ? 'Uploading…' : 'Drop or click\nto replace'}
                      </span>
                    </label>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-1 right-1 size-6 p-0 bg-background/80 hover:bg-background text-muted-foreground hover:text-destructive rounded-full"
                      onClick={() => removeImported(product.id)}
                    >
                      ✕
                    </Button>
                  </div>
                  {/* Product info */}
                  <div className="p-2.5 space-y-0.5">
                    <p className="text-xs font-semibold leading-tight truncate">{product.name}</p>
                    {product.price && <p className="text-[10px] text-primary font-medium">{product.price}</p>}
                    {product.description && <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1">{product.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
