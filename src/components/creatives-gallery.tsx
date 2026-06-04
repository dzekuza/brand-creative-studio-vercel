'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { loadHistory, clearHistory, saveRestoreSession, type HistoryEntry } from '@/lib/creative-history'
import {
  ImageIcon, DownloadIcon, Trash2Icon, SparklesIcon,
  PlayIcon, XIcon, CalendarIcon, MonitorIcon, WandIcon,
  TypeIcon, AlignLeftIcon, SlidersIcon,
} from 'lucide-react'

const AD_TYPE_LABELS: Record<string, string> = {
  'brand-awareness': 'Brand Awareness',
  'sales': 'Sales / Promo',
  'product-launch': 'Product Launch',
  'engagement': 'Engagement',
  'custom': 'Custom',
}

const MODEL_LABELS: Record<string, string> = {
  'gemini-3.1-flash': 'Gemini 3.1 Flash',
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'gpt-image-2': 'GPT Image 2',
  'imagen-4': 'Imagen 4',
}

export function CreativesGallery() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [selected, setSelected] = useState<HistoryEntry | null>(null)

  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  function handleClear() {
    clearHistory()
    setHistory([])
    setSelected(null)
  }

  function download(entry: HistoryEntry) {
    const a = document.createElement('a')
    a.href = `data:image/png;base64,${entry.pngBase64}`
    a.download = `creative-${entry.platform.id}-${entry.id.slice(0, 8)}.png`
    a.click()
  }

  function continueSession(entry: HistoryEntry) {
    if (!entry.sessionConfig) return
    saveRestoreSession(entry.sessionConfig)
    window.location.href = '/generate'
  }

  function handleCardClick(entry: HistoryEntry) {
    setSelected(prev => prev?.id === entry.id ? null : entry)
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
      <CardContent className="pt-4 space-y-4">
        {history.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {history.map(entry => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => handleCardClick(entry)}
                  className={`group relative rounded-lg overflow-hidden border-2 bg-muted aspect-square transition-all ${
                    selected?.id === entry.id
                      ? 'border-primary ring-2 ring-primary/30'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/png;base64,${entry.pngBase64}`}
                    alt={`${entry.platform.label} creative`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-end justify-start p-1.5">
                    <span className="text-[10px] text-white/80 font-medium bg-black/40 rounded px-1 py-0.5 leading-tight">
                      {entry.platform.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {selected && (
              <SessionDetail
                entry={selected}
                onClose={() => setSelected(null)}
                onDownload={() => download(selected)}
                onContinue={() => continueSession(selected)}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function SessionDetail({
  entry,
  onClose,
  onDownload,
  onContinue,
}: {
  entry: HistoryEntry
  onClose: () => void
  onDownload: () => void
  onContinue: () => void
}) {
  const cfg = entry.sessionConfig
  const date = new Date(entry.timestamp).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="rounded-xl border bg-muted/30 p-4 space-y-4">
      <div className="flex items-start gap-4">
        {/* Thumbnail */}
        <div className="shrink-0 rounded-lg overflow-hidden border w-20 h-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${entry.pngBase64}`}
            alt={entry.platform.label}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs gap-1">
                <MonitorIcon className="size-3" />
                {entry.platform.label}
              </Badge>
              <Badge variant="secondary" className="text-xs gap-1">
                {entry.platform.width}×{entry.platform.height}
              </Badge>
              {cfg && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <WandIcon className="size-3" />
                  {MODEL_LABELS[cfg.imageModel] ?? cfg.imageModel}
                </Badge>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <XIcon className="size-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
            <CalendarIcon className="size-3" />
            {date}
          </p>
        </div>
      </div>

      {cfg && (
        <div className="grid gap-3 text-sm">
          {cfg.imagePrompt && (
            <DetailRow icon={<SlidersIcon className="size-3.5" />} label="Image prompt">
              {cfg.imagePrompt}
            </DetailRow>
          )}
          {cfg.adType && (
            <DetailRow icon={<SparklesIcon className="size-3.5" />} label="Ad type">
              {AD_TYPE_LABELS[cfg.adType] ?? cfg.adType}
              {cfg.adContext && <span className="text-muted-foreground ml-1">— {cfg.adContext}</span>}
            </DetailRow>
          )}
          {cfg.headline && (
            <DetailRow icon={<TypeIcon className="size-3.5" />} label="Headline">
              {cfg.headline}
            </DetailRow>
          )}
          {cfg.body && (
            <DetailRow icon={<AlignLeftIcon className="size-3.5" />} label="Body">
              {cfg.body}
            </DetailRow>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
            <span>Count: {cfg.count}</span>
            {cfg.selectedProductId && <span>· Product selected</span>}
          </div>
        </div>
      )}

      {!cfg && (
        <p className="text-xs text-muted-foreground">
          Session config not available — generated before history tracking was added.
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={onDownload}>
          <DownloadIcon className="size-3.5" />
          Download
        </Button>
        {cfg && (
          <Button
            size="sm"
            className="gap-1.5 bg-[var(--studio-accent)] text-white hover:opacity-90"
            onClick={onContinue}
          >
            <PlayIcon className="size-3.5" />
            Continue session
          </Button>
        )}
      </div>
    </div>
  )
}

function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="text-sm leading-snug break-words">{children}</p>
    </div>
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
      <Button
        size="sm"
        className="gap-1.5 bg-[var(--studio-accent)] text-white hover:opacity-90"
        render={<a href="/generate" />}
        nativeButton={false}
      >
        <SparklesIcon className="size-3.5" />
        Generate now
      </Button>
    </div>
  )
}
