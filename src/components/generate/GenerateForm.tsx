'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { PLATFORMS } from '@/lib/platforms'

import { v4 as uuidv4 } from 'uuid'
import { saveCreatives } from '@/lib/creative-history'
import type { BrandBible, Creative, UploadedAssets } from '@/types'

type Props = {
  brandBible: BrandBible
  assets: UploadedAssets
  onCreativesUpdate: (creatives: Creative[]) => void
}

export function GenerateForm({ brandBible, assets, onCreativesUpdate }: Props) {
  const [platformId, setPlatformId] = useState(PLATFORMS[0].id)
  const [prompt, setPrompt] = useState('')
  const [headline, setHeadline] = useState('')
  const [body, setBody] = useState('')
  const [count, setCount] = useState(3)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string>()

  async function generate() {
    if (!prompt) { setError('Image prompt is required'); return }
    setError(undefined)
    setGenerating(true)

    const platform = PLATFORMS.find(p => p.id === platformId)!
    const ids = Array.from({ length: count }, () => uuidv4())

    const pending: Creative[] = ids.map(id => ({
      id, pngBase64: '', platform, status: 'generating',
    }))
    onCreativesUpdate(pending)

    const iconSvgs: string[] = await Promise.all(
      (assets.iconUrls ?? []).map(async url => {
        const res = await fetch(url)
        return res.ok ? res.text() : ''
      })
    )

    const results = await Promise.allSettled(
      ids.map(async id => {
        const imgRes = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            productImageUrl: assets.productImageUrl,
            styleRefUrls: assets.styleRefUrls ?? [],
            brandBible,
            platform,
          }),
        })
        if (!imgRes.ok) throw new Error(await imgRes.text())
        const { imageBase64 } = await imgRes.json()

        const resolvedHeadline = headline || brandBible.tagline || 'Your Headline Here'
        const resolvedBody = body || brandBible.tone

        const composeRes = await fetch('/api/compose-html', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            backgroundImageBase64: imageBase64,
            brandBible,
            fontUrl: assets.fontUrl,
            fontName: assets.fontName,
            iconSvgs,
            headline: resolvedHeadline,
            body: resolvedBody,
            platform,
          }),
        })
        if (!composeRes.ok) throw new Error(await composeRes.text())
        const { html } = await composeRes.json()

        const renderRes = await fetch('/api/render', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html, width: platform.width, height: platform.height }),
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
    onCreativesUpdate(final)
    setGenerating(false)
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label>Platform</Label>
        <div className="grid grid-cols-2 gap-2">
          {PLATFORMS.map(p => {
            const ar = p.width / p.height
            const isSelected = platformId === p.id
            // Small aspect-ratio shape preview capped to a visual box
            const previewW = ar >= 1 ? 28 : Math.round(28 * ar)
            const previewH = ar <= 1 ? 28 : Math.round(28 / ar)
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlatformId(p.id)}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-transparent text-muted-foreground hover:border-border/80 hover:bg-accent hover:text-foreground'
                }`}
              >
                <span
                  className={`shrink-0 rounded-sm border ${isSelected ? 'border-primary bg-primary/20' : 'border-muted-foreground/40 bg-muted'}`}
                  style={{ width: previewW, height: previewH }}
                />
                <span className="min-w-0">
                  <span className="block text-xs font-medium leading-tight truncate">{p.label}</span>
                  <span className="block text-[11px] leading-tight opacity-60">{p.width}×{p.height}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Image Generation Prompt *</Label>
        <Textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="e.g. minimalist marble surface, warm morning light, product centred with soft shadow"
          rows={3}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Headline <span className="text-muted-foreground text-xs">(leave blank to use tagline)</span></Label>
          <Input
            value={headline}
            onChange={e => setHeadline(e.target.value)}
            placeholder={brandBible.tagline ?? 'Your Headline'}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Body Copy <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Input
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Short supporting text"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Number of Creatives (1–10)</Label>
        <Input
          type="number"
          min={1}
          max={10}
          value={count}
          onChange={e => setCount(Math.min(10, Math.max(1, Number(e.target.value))))}
          className="w-24"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={generate} disabled={generating} className="w-full">
        {generating ? 'Generating…' : `Generate ${count} Creative${count > 1 ? 's' : ''} ✨`}
      </Button>
    </div>
  )
}
