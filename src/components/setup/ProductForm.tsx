'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FileUploadZone } from './FileUploadZone'
import { BrandBiblePreview } from './BrandBiblePreview'
import { saveBrandBible } from '@/lib/brand-bible'
import { extractColors } from '@/lib/color-extract'
import type { BrandBible, UploadedAssets } from '@/types'

type Props = { onComplete: (bible: BrandBible, assets: UploadedAssets) => void }

export function ProductForm({ onComplete }: Props) {
  const [productName, setProductName] = useState('')
  const [description, setDescription] = useState('')
  const [assets, setAssets] = useState<Partial<UploadedAssets>>({})
  const [generating, setGenerating] = useState(false)
  const [bible, setBible] = useState<BrandBible | null>(null)
  const [error, setError] = useState<string>()

  async function generate() {
    if (!productName || !assets.productImageUrl || !assets.fontUrl) {
      setError('Product name, product image, and font are required.')
      return
    }
    setError(undefined)
    setGenerating(true)
    try {
      const colorPalette: string[] = []
      for (const url of assets.styleRefUrls ?? []) {
        const colors = await extractColors(url, 3)
        colorPalette.push(...colors)
      }

      const res = await fetch('/api/brand-bible', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          description,
          fontName: assets.fontName ?? 'BrandFont',
          iconNames: (assets.iconUrls ?? []).map((_, i) => `icon-${i}`),
          colorPalette: [...new Set(colorPalette)].slice(0, 10),
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const result: BrandBible = await res.json()
      saveBrandBible(result)
      setBible(result)
      onComplete(result, assets as UploadedAssets)
    } catch (e) {
      setError(String(e))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="space-y-1.5">
          <Label>Product Name *</Label>
          <Input
            value={productName}
            onChange={e => setProductName(e.target.value)}
            placeholder="e.g. Aura Skincare Serum"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Product Description *</Label>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe your product, target audience, key benefits, and what makes it different..."
            rows={4}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Product Image * <span className="text-muted-foreground text-xs">(used in every creative)</span></Label>
          <FileUploadZone
            label="Upload product image"
            accept="image/jpeg,image/png,image/webp"
            onUploaded={([url]) => setAssets(a => ({ ...a, productImageUrl: url }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Style References <span className="text-muted-foreground text-xs">(up to 5 — mood board)</span></Label>
          <FileUploadZone
            label="Upload style references"
            accept="image/jpeg,image/png,image/webp"
            multiple
            maxFiles={5}
            onUploaded={urls => setAssets(a => ({ ...a, styleRefUrls: urls }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Brand Font * <span className="text-muted-foreground text-xs">(.ttf / .otf / .woff2)</span></Label>
          <FileUploadZone
            label="Upload font file"
            accept=".ttf,.otf,.woff,.woff2"
            onUploaded={([url], [name]) =>
              setAssets(a => ({ ...a, fontUrl: url, fontName: name.replace(/\.[^.]+$/, '') }))
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
            onUploaded={urls => setAssets(a => ({ ...a, iconUrls: urls }))}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={generate} disabled={generating} className="w-full">
        {generating ? 'Generating Brand Bible…' : 'Generate Brand Bible ✨'}
      </Button>

      {bible && <BrandBiblePreview bible={bible} />}
    </div>
  )
}
