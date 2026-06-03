'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { loadHistory, clearHistory, type HistoryEntry } from '@/lib/creative-history'
import { ImageIcon, DownloadIcon, Trash2Icon } from 'lucide-react'

export function CreativesGallery() {
  const [history, setHistory] = useState<HistoryEntry[]>([])

  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  function handleClear() {
    clearHistory()
    setHistory([])
  }

  function download(entry: HistoryEntry) {
    const a = document.createElement('a')
    a.href = `data:image/png;base64,${entry.pngBase64}`
    a.download = `creative-${entry.platform.id}-${entry.id.slice(0, 8)}.png`
    a.click()
  }

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Creatives</CardTitle>
          <CardDescription>
            {history.length > 0
              ? `${history.length} creative${history.length !== 1 ? 's' : ''} saved`
              : 'No creatives yet — generate your first one'}
          </CardDescription>
        </div>
        {history.length > 0 && (
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive gap-1.5" onClick={handleClear}>
            <Trash2Icon className="size-3.5" />
            Clear all
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
            <ImageIcon className="size-10 opacity-30" />
            <p className="text-sm">Generated creatives will appear here</p>
            <Button size="sm" variant="outline" nativeButton={false} render={<a href="/generate" />}>
              Generate now
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {history.map(entry => (
              <div key={entry.id} className="group relative rounded-lg overflow-hidden border bg-muted aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${entry.pngBase64}`}
                  alt={`${entry.platform.label} creative`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                  <p className="text-white text-xs font-medium text-center leading-tight">{entry.platform.label}</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-xs gap-1"
                    onClick={() => download(entry)}
                  >
                    <DownloadIcon className="size-3" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
