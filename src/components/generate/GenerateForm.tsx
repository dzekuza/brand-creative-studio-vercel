'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PLATFORMS } from '@/lib/platforms'
import { buildCreativeHtml } from '@/lib/html-compositor'
import { v4 as uuidv4 } from 'uuid'
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

        const html = buildCreativeHtml({
          backgroundImageBase64: imageBase64,
          brandBible,
          fontUrl: assets.fontUrl,
          fontName: assets.fontName,
          iconSvgs,
          headline: resolvedHeadline,
          body: resolvedBody,
          platform,
        })

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

    onCreativesUpdate(final)
    setGenerating(false)
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label>Platform</Label>
        <Select value={platformId} onValueChange={v => v && setPlatformId(v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {PLATFORMS.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.label} ({p.width}×{p.height})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
