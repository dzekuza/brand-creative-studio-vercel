'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import type { Creative } from '@/types'

const PREVIEW_WIDTH = 320

type Props = {
  creative: Creative
  onApprove: (id: string) => void
  onRecompose: (id: string, headline: string, body: string) => Promise<void>
  onApproveSketch: (id: string, sketchIds: string[]) => void
}

export function CreativeCard({ creative, onApprove, onRecompose, onApproveSketch }: Props) {
  const [headline, setHeadline] = useState(creative.editableHeadline ?? '')
  const [body, setBody] = useState(creative.editableBody ?? '')
  const [selectedSketches, setSelectedSketches] = useState<Set<string>>(new Set())
  const [rendering, setRendering] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const creativeId = creative.id

  // Sync text when creative updates (e.g. after recompose)
  useEffect(() => {
    setHeadline(creative.editableHeadline ?? '')
    setBody(creative.editableBody ?? '')
  }, [creative.editableHeadline, creative.editableBody])

  // Listen for inline edits from the iframe via postMessage
  useEffect(() => {
    function handler(e: MessageEvent) {
      // Only accept messages from our own preview iframe
      if (e.source !== (iframeRef as RefObject<HTMLIFrameElement>).current?.contentWindow) return
      if (e.data?.type !== 'brand-studio-edit') return
      // Treat as untrusted strings — slice to reasonable max length
      setHeadline(String(e.data.headline ?? '').slice(0, 500))
      setBody(String(e.data.body ?? '').slice(0, 1000))
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [creativeId])

  async function handleRender() {
    setRendering(true)
    // Silent recompose with current (possibly edited) text, then approve
    await onRecompose(creative.id, headline, body)
    onApprove(creative.id)
    setRendering(false)
  }

  function toggleSketch(id: string) {
    setSelectedSketches(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function download() {
    const a = document.createElement('a')
    a.href = `data:image/png;base64,${creative.pngBase64}`
    a.download = `creative-${creative.id}-${creative.platform.id}.png`
    a.click()
  }

  const scale = PREVIEW_WIDTH / creative.platform.width
  const previewHeight = Math.round(creative.platform.height * scale)
  const isLoading = creative.status === 'generating' || creative.status === 'rendering' || creative.status === 'sketching'

  return (
    <Card className={`overflow-hidden${isLoading ? ' py-0' : ''}`}>

      {/* Generating / rendering / sketching skeleton */}
      {isLoading && (
        <div
          className="w-full animate-shimmer"
          style={{ aspectRatio: `${creative.platform.width} / ${creative.platform.height}` }}
        >
          <div className="w-full h-full flex flex-col justify-end p-4 gap-2">
            <div className="h-2 w-1/4 rounded bg-white/10" />
            <div className="h-3 w-1/3 rounded bg-white/10" />
            {creative.status === 'sketching' && (
              <p className="text-white/40 text-[10px] text-center mt-2">Generating layout concepts…</p>
            )}
          </div>
        </div>
      )}

      {/* Sketch review */}
      {creative.status === 'sketch-review' && creative.sketches && (
        <div className="p-4 space-y-3">
          <div>
            <p className="text-xs font-semibold">Choose a layout</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Select one or more concepts, then generate.</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {creative.sketches.map(sketch => {
              const selected = selectedSketches.has(sketch.id)
              return (
                <button
                  key={sketch.id}
                  type="button"
                  onClick={() => toggleSketch(sketch.id)}
                  className={`rounded-lg border-2 overflow-hidden transition-all text-left ${
                    selected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  {/* SVG rendered as img data URI — scripts in SVG are inert when loaded this way */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(sketch.svgData)))}`}
                    alt={sketch.description}
                    className="w-full"
                  />
                  <p className="text-[10px] text-muted-foreground leading-tight p-1.5 line-clamp-2">
                    {sketch.description}
                  </p>
                </button>
              )
            })}
          </div>
          <Button
            size="sm"
            className="w-full h-8 text-xs font-semibold"
            disabled={selectedSketches.size === 0}
            onClick={() => onApproveSketch(creative.id, [...selectedSketches])}
          >
            Generate Image →
          </Button>
        </div>
      )}

      {/* Preview — interactive iframe with inline editing */}
      {creative.status === 'preview' && creative.previewHtml && (
        <div>
          <div
            className="relative overflow-hidden bg-muted cursor-text"
            style={{ width: PREVIEW_WIDTH, height: previewHeight }}
            title="Click on text to edit directly"
          >
            <iframe
              ref={iframeRef}
              srcDoc={creative.previewHtml}
              title="Creative preview — click text to edit"
              sandbox="allow-scripts"
              style={{
                width: creative.platform.width,
                height: creative.platform.height,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                border: 'none',
              }}
            />
            <div className="absolute top-2 left-2 bg-black/60 text-white text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full pointer-events-none">
              Preview
            </div>
          </div>

          <div className="px-3 pt-2.5 pb-3 space-y-2.5 border-t bg-card">
            <p className="text-[10px] text-muted-foreground leading-relaxed">Click headline or body text in the preview to edit directly.</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-9 px-3 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => onRecompose(creative.id, headline, body)}
              >
                <RefreshCw className="size-3" />
                Re-layout
              </Button>
              <Button
                size="sm"
                className="flex-1 h-9 text-xs font-semibold"
                onClick={handleRender}
                disabled={rendering}
              >
                {rendering ? 'Rendering…' : 'Render PNG →'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Done */}
      {creative.status === 'done' && (
        <div className="group relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${creative.pngBase64}`}
            alt="Generated creative"
            className="w-full object-cover"
          />
          <div className="absolute top-2 right-2 bg-black/60 text-white text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full">
            {creative.platform.label}
          </div>
          <div className="px-3 py-2.5 border-t bg-card">
            <Button size="sm" variant="outline" onClick={download} className="w-full h-9 text-xs font-medium gap-1.5">
              Download PNG
            </Button>
          </div>
        </div>
      )}

      {/* Error */}
      {creative.status === 'error' && (
        <div className="aspect-square flex items-center justify-center bg-muted/50 p-4">
          <p className="text-xs text-destructive text-center leading-relaxed">{creative.error}</p>
        </div>
      )}

    </Card>
  )
}
