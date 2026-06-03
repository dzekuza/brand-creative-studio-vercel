'use client'

import { Button } from '@/components/ui/button'
import { CreativeCard } from './CreativeCard'
import type { Creative } from '@/types'

type Props = {
  creatives: Creative[]
  onApprove: (id: string) => void
  onRecompose: (id: string, headline: string, body: string) => Promise<void>
  onApproveSketch: (id: string, sketchIds: string[]) => void
}

export function CreativeGrid({ creatives, onApprove, onRecompose, onApproveSketch }: Props) {
  async function downloadAll() {
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    creatives
      .filter(c => c.status === 'done')
      .forEach(c => {
        const bytes = Uint8Array.from(atob(c.pngBase64), ch => ch.charCodeAt(0))
        zip.file(`creative-${c.id}-${c.platform.id}.png`, bytes)
      })
    const blob = await zip.generateAsync({ type: 'blob' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'creatives.zip'
    a.click()
  }

  const doneCount = creatives.filter(c => c.status === 'done').length

  return (
    <div className="space-y-4">
      {doneCount > 1 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={downloadAll}>
            Download All as ZIP ({doneCount})
          </Button>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {creatives.map(c => (
          <CreativeCard
            key={c.id}
            creative={c}
            onApprove={onApprove}
            onRecompose={onRecompose}
            onApproveSketch={onApproveSketch}
          />
        ))}
      </div>
    </div>
  )
}
