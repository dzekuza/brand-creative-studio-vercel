'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { ProductForm } from '@/components/setup/ProductForm'
import type { BrandBible, UploadedAssets } from '@/types'
import { Layers, Wand2, ImageIcon, Type, AlertCircleIcon, CheckCircle2Icon } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  { icon: ImageIcon, label: 'Product & refs' },
  { icon: Type,      label: 'Font & icons' },
  { icon: Wand2,     label: 'Generate bible' },
  { icon: Layers,    label: 'Create ads' },
]

const WHAT_YOU_NEED = [
  { required: true,  label: 'Product image',      note: 'JPEG or PNG, hero shot' },
  { required: true,  label: 'Style references',   note: 'Up to 5 mood board images' },
  { required: true,  label: 'Brand font',         note: '.ttf / .otf / .woff2' },
  { required: false, label: 'Icons',              note: 'SVG vectors, optional' },
  { required: false, label: 'Logo',               note: 'PNG or SVG, optional' },
]

const WHAT_GETS_GENERATED = [
  'Brand color palette',
  'Typography rules',
  'Layout guidelines',
  'Tone of voice',
  'Brand tagline',
]

function SetupPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const required = searchParams.get('required') === '1'

  function handleComplete(_bible: BrandBible, assets: UploadedAssets) {
    localStorage.setItem('brand-creative-studio:assets', JSON.stringify(assets))
    router.push('/generate')
  }

  return (
    <AppShell>
      <div className="animate-fade-in-up flex flex-col gap-6">
        {/* Required banner */}
        {required && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900/60 dark:bg-amber-950/30">
            <AlertCircleIcon className="size-4 text-amber-600 shrink-0 mt-0.5 dark:text-amber-400" />
            <p className="text-amber-800 dark:text-amber-300">
              <span className="font-semibold">Brand setup required.</span>{' '}
              Complete your brand profile before generating creatives.
            </p>
          </div>
        )}

        {/* Page header */}
        <div className="relative overflow-hidden rounded-xl border bg-card">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-[var(--studio-accent)]/10 blur-3xl"
          />
          <div className="relative flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Brand Setup</h1>
              <p className="text-muted-foreground mt-0.5 text-sm">
                Set up your brand once. Generate creatives forever.
              </p>
            </div>

            {/* Step indicators */}
            <div className="hidden lg:flex items-center gap-1 shrink-0">
              {STEPS.map((step, i) => {
                const Icon = step.icon
                const isActive = i === 0
                return (
                  <div key={step.label} className="flex items-center gap-1">
                    <div
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors',
                        isActive
                          ? 'bg-[var(--studio-accent)] text-white'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      <Icon className="size-3" />
                      {step.label}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="w-4 h-px bg-border mx-0.5" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_340px] gap-6 xl:gap-8 items-start">
          <ProductForm onComplete={handleComplete} />

          {/* Right sidebar */}
          <aside className="hidden lg:flex flex-col gap-4">
            {/* What you need */}
            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="border-b px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  What you need
                </p>
              </div>
              <ul className="divide-y">
                {WHAT_YOU_NEED.map(item => (
                  <li key={item.label} className="flex items-start gap-3 px-5 py-3">
                    <CheckCircle2Icon
                      className={cn(
                        'size-3.5 shrink-0 mt-0.5',
                        item.required ? 'text-[var(--studio-accent)]' : 'text-muted-foreground/40',
                      )}
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-foreground">{item.label}</span>
                      <span className="text-xs text-muted-foreground ml-1.5">{item.note}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro tip */}
            <div className="overflow-hidden rounded-xl border border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-950/20 px-5 py-4">
              <p className="text-xs font-semibold text-[var(--studio-accent)]">Pro tip</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Upload 3–5 style references that match your desired aesthetic — mood boards,
                competitor ads, or editorial shots. The AI uses these as composition guidance.
              </p>
            </div>

            {/* What gets generated */}
            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="border-b px-5 py-4">
                <p className="text-xs font-semibold text-foreground">What gets generated</p>
              </div>
              <ul className="divide-y">
                {WHAT_GETS_GENERATED.map(item => (
                  <li key={item} className="flex items-center gap-3 px-5 py-3">
                    <div className="size-1.5 rounded-full shrink-0 bg-[var(--studio-accent)]" />
                    <span className="text-xs text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  )
}

export default function SetupPage() {
  return (
    <Suspense>
      <SetupPageContent />
    </Suspense>
  )
}
