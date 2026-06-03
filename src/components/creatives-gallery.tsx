'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { loadHistory, clearHistory, type HistoryEntry } from '@/lib/creative-history'
import { ImageIcon, DownloadIcon, Trash2Icon, SparklesIcon } from 'lucide-react'

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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
        <div>
          <CardTitle>Recent creatives</CardTitle>
          <CardDescription>
            {history.length > 0
              ? `${history.length} creative${history.length !== 1 ? 's' : ''} saved locally`
              : 'No creatives yet — generate your first one'}
          </CardDescription>
        </div>
        {history.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive gap-1.5 shrink-0"
            onClick={handleClear}
          >
            <Trash2Icon className="size-3.5" />
            Clear all
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-4">
        {history.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {history.map(entry => (
              <div
                key={entry.id}
                className="group relative rounded-lg overflow-hidden border bg-muted aspect-square"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${entry.pngBase64}`}
                  alt={`${entry.platform.label} creative`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                  <p className="text-white text-xs font-medium text-center leading-tight line-clamp-2">
                    {entry.platform.label}
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-xs gap-1"
                    onClick={() => download(entry)}
                  >
                    <DownloadIcon className="size-3" />
                    Save
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

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="relative flex items-center justify-center">
        <div className="absolute size-20 rounded-full bg-[var(--studio-accent)]/8 animate-pulse" />
        <div className="relative flex size-12 items-center justify-center rounded-xl border bg-muted">
          <ImageIcon className="size-5 text-muted-foreground/60" />
        </div>
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium">No creatives yet</p>
        <p className="text-xs text-muted-foreground max-w-[220px] leading-relaxed">
          Generated ad images will appear here for download and review.
        </p>
      </div>
      <Button size="sm" className="gap-1.5 bg-[var(--studio-accent)] text-white hover:opacity-90" render={<a href="/generate" />}>
        <SparklesIcon className="size-3.5" />
        Generate now
      </Button>
    </div>
  )
}
