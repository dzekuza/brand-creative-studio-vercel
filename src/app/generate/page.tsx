'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadBrandBible } from '@/lib/brand-bible'
import { AppShell } from '@/components/app-shell'
import { GenerateForm } from '@/components/generate/GenerateForm'
import { CreativeGrid } from '@/components/generate/CreativeGrid'
import { Button } from '@/components/ui/button'
import { Zap, Globe, LayoutGrid, PencilIcon, SparklesIcon } from 'lucide-react'
import type { BrandBible, Creative, ImageProvider, UploadedAssets } from '@/types'

function EngineTag({ provider }: { provider: ImageProvider }) {
  const isGoogle = provider === 'google'
  const Icon = isGoogle ? Zap : Globe
  const label = isGoogle ? 'Custom Agent' : 'Vercel AI Studio'
  const model = isGoogle ? 'Gemini 2.5' : 'Gemini 3.1'
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border text-[11px] font-medium text-muted-foreground">
      <Icon className="size-3" />
      {label}
      <span className="font-mono text-muted-foreground/50">·</span>
      <span className="font-mono">{model}</span>
    </div>
  )
}

export default function GeneratePage() {
  const router = useRouter()
  const [bible, setBible]         = useState<BrandBible | null>(null)
  const [assets, setAssets]       = useState<UploadedAssets | null>(null)
  const [creatives, setCreatives] = useState<Creative[]>([])
  const [history, setHistory]     = useState<Creative[][]>([])
  const [provider, setProvider]   = useState<ImageProvider>('gateway')
  const creativesSnapshotRef      = useRef<Creative[]>([])

  const approveRef        = useRef<(id: string) => void>(() => {})
  const recomposeRef      = useRef<(id: string, h: string, b: string) => Promise<void>>(() => Promise.resolve())
  const approveSketchRef  = useRef<(id: string, sketchIds: string[]) => void>(() => {})

  useEffect(() => {
    const b = loadBrandBible()
    const rawAssets = localStorage.getItem('brand-creative-studio:assets')
    if (!b || !rawAssets) { router.replace('/setup'); return }
    setBible(b)
    setAssets(JSON.parse(rawAssets) as UploadedAssets)
    setProvider((localStorage.getItem('brand-creative-studio:provider') ?? 'gateway') as ImageProvider)
  }, [router])

  if (!bible || !assets) return null

  const doneCount = creatives.filter(c => c.status === 'done').length

  return (
    <AppShell>
      <div className="animate-fade-in-up flex flex-col gap-6">
        {/* Page header */}
        <div className="relative overflow-hidden rounded-xl border bg-card">
          {/* Accent orb */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-[var(--studio-accent)]/10 blur-3xl"
          />
          <div className="relative flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-semibold tracking-tight">Generate Creatives</h1>
                <EngineTag provider={provider} />
              </div>
              <p className="text-muted-foreground text-sm">
                Your brand bible is ready — configure and generate.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                render={<a href="/setup" />}
                nativeButton={false}
              >
                <PencilIcon className="size-3" />
                Edit brand
              </Button>
            </div>
          </div>
        </div>

        {/* Main layout: controls left, results right */}
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr] gap-6 xl:gap-8 items-start">
          {/* Controls panel */}
          <div className="lg:sticky lg:top-6">
            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="border-b px-5 py-4">
                <p className="text-sm font-medium tracking-tight">Generation settings</p>
                <p className="text-xs text-muted-foreground mt-0.5">Configure format, model, and copy.</p>
              </div>
              <div className="p-5">
                <GenerateForm
                  brandBible={bible}
                  assets={assets}
                  onCreativesUpdate={batch => {
                    creativesSnapshotRef.current = batch
                    setCreatives(batch)
                  }}
                  onGenerateStart={() => {
                    const done = creativesSnapshotRef.current.filter(c => c.status === 'done')
                    if (done.length > 0) setHistory(h => [done, ...h])
                    creativesSnapshotRef.current = []
                    setCreatives([])
                  }}
                  onRegisterApprove={fn => { approveRef.current = fn }}
                  onRegisterRecompose={fn => { recomposeRef.current = fn }}
                  onRegisterApproveSketch={fn => { approveSketchRef.current = fn }}
                />
              </div>
            </div>
          </div>

          {/* Results area */}
          <div className="flex flex-col gap-8">
            {creatives.length === 0 && history.length === 0 ? (
              <ResultsEmptyState />
            ) : (
              <>
                {creatives.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs font-medium text-muted-foreground">
                        {doneCount > 0
                          ? `${doneCount} of ${creatives.length} ready`
                          : `Generating ${creatives.length} creative${creatives.length > 1 ? 's' : ''}…`}
                      </p>
                      {doneCount > 0 && (
                        <div className="flex items-center gap-1.5">
                          <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[11px] text-muted-foreground">Live</span>
                        </div>
                      )}
                    </div>
                    <CreativeGrid
                      creatives={creatives}
                      onApprove={id => approveRef.current(id)}
                      onRecompose={(id, h, b) => recomposeRef.current(id, h, b)}
                      onApproveSketch={(id, ids) => approveSketchRef.current(id, ids)}
                    />
                  </div>
                )}

                {history.map((batch, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-3 mb-4">
                      <p className="text-xs font-medium text-muted-foreground shrink-0">
                        Batch {history.length - i}
                      </p>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <CreativeGrid
                      creatives={batch}
                      onApprove={() => {}}
                      onRecompose={() => Promise.resolve()}
                      onApproveSketch={() => {}}
                    />
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function ResultsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 py-24 px-8 text-center">
      <div className="relative mb-4 flex items-center justify-center">
        <div className="absolute size-20 rounded-full bg-[var(--studio-accent)]/8 animate-pulse" />
        <div className="relative flex size-12 items-center justify-center rounded-xl border bg-background">
          <LayoutGrid className="size-5 text-muted-foreground/60" />
        </div>
      </div>
      <p className="text-sm font-medium mb-1">No creatives yet</p>
      <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
        Configure your settings and click Generate to produce your first batch of ad creatives.
      </p>
      <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground/60">
        <SparklesIcon className="size-3" />
        <span>Results appear here in real time</span>
      </div>
    </div>
  )
}
