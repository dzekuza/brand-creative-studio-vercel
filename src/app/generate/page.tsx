'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadBrandBible } from '@/lib/brand-bible'
import { AppShell } from '@/components/app-shell'
import { GenerateForm } from '@/components/generate/GenerateForm'
import { CreativeGrid } from '@/components/generate/CreativeGrid'
import { Button } from '@/components/ui/button'
import { Zap, Globe, ArrowLeft, LayoutGrid } from 'lucide-react'
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
      <span className="font-mono text-muted-foreground/60">·</span>
      <span className="font-mono">{model}</span>
    </div>
  )
}

export default function GeneratePage() {
  const router = useRouter()
  const [bible, setBible]       = useState<BrandBible | null>(null)
  const [assets, setAssets]     = useState<UploadedAssets | null>(null)
  const [creatives, setCreatives] = useState<Creative[]>([])
  const [provider, setProvider] = useState<ImageProvider>('gateway')

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
      <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
        {/* Page header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h1 className="text-2xl font-bold tracking-tight">Generate Creatives</h1>
                <EngineTag provider={provider} />
              </div>
              <p className="text-muted-foreground text-sm">Your brand bible is ready — configure and generate.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="gap-1.5 text-muted-foreground text-xs">
              <ArrowLeft className="size-3" />
              Switch engine
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/setup')} className="text-xs">
              Edit brand
            </Button>
          </div>
        </div>

        <div className="h-px bg-border mb-8" />

        {/* Main layout: controls left, results right */}
        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-10 items-start">
          {/* Controls panel */}
          <div className="xl:sticky xl:top-6">
            <div className="rounded-2xl border border-border bg-card p-6">
              <GenerateForm
                brandBible={bible}
                assets={assets}
                onCreativesUpdate={setCreatives}
              />
            </div>
          </div>

          {/* Results area */}
          <div>
            {creatives.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20 py-24 px-8 text-center">
                <div className="size-12 rounded-2xl border border-border bg-background flex items-center justify-center mb-4">
                  <LayoutGrid className="size-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No creatives yet</p>
                <p className="text-xs text-muted-foreground max-w-xs">Configure your settings and click Generate to produce your first batch of ad creatives.</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    {doneCount > 0 ? `${doneCount} of ${creatives.length} ready` : `Generating ${creatives.length} creative${creatives.length > 1 ? 's' : ''}…`}
                  </p>
                  {doneCount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[11px] text-muted-foreground">Live</span>
                    </div>
                  )}
                </div>
                <CreativeGrid creatives={creatives} />
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
