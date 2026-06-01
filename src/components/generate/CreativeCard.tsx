'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Creative } from '@/types'

type Props = { creative: Creative }

export function CreativeCard({ creative }: Props) {
  function download() {
    const a = document.createElement('a')
    a.href = `data:image/png;base64,${creative.pngBase64}`
    a.download = `creative-${creative.id}-${creative.platform.id}.png`
    a.click()
  }

  return (
    <Card className="overflow-hidden">
      {creative.status === 'done' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`data:image/png;base64,${creative.pngBase64}`}
          alt="Generated creative"
          className="w-full object-cover"
        />
      )}
      {creative.status === 'generating' && (
        <div
          className="w-full animate-shimmer"
          style={{ aspectRatio: `${creative.platform.width} / ${creative.platform.height}` }}
        >
          <div className="w-full h-full flex flex-col justify-end p-4 gap-2">
            <div className="h-3 w-1/3 rounded bg-white/10" />
            <div className="h-8 w-3/4 rounded bg-white/10" />
            <div className="h-8 w-1/2 rounded bg-white/10" />
          </div>
        </div>
      )}
      {creative.status === 'error' && (
        <div className="aspect-square flex items-center justify-center bg-muted">
          <p className="text-xs text-destructive px-4 text-center">{creative.error}</p>
        </div>
      )}
      {creative.status === 'done' && (
        <div className="p-3">
          <Button size="sm" variant="outline" onClick={download} className="w-full">
            Download PNG
          </Button>
        </div>
      )}
    </Card>
  )
}
