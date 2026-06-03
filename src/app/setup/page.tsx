'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { ProductForm } from '@/components/setup/ProductForm'
import type { BrandBible, UploadedAssets } from '@/types'
import { Layers, Wand2, ImageIcon, Type, AlertCircle } from 'lucide-react'

const STEPS = [
  { icon: ImageIcon, label: 'Product & refs' },
  { icon: Type,      label: 'Font & icons' },
  { icon: Wand2,     label: 'Generate bible' },
  { icon: Layers,    label: 'Create ads' },
]

export default function SetupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const required = searchParams.get('required') === '1'

  function handleComplete(_bible: BrandBible, assets: UploadedAssets) {
    localStorage.setItem('brand-creative-studio:assets', JSON.stringify(assets))
    router.push('/generate')
  }

  return (
    <AppShell>
      <div className="animate-fade-in-up py-2" style={{ animationDelay: '0ms' }}>
        {/* Required banner */}
        {required && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900/60 dark:bg-amber-950/30">
            <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5 dark:text-amber-400" />
            <p className="text-amber-800 dark:text-amber-300">
              <span className="font-semibold">Brand setup required.</span> Complete your brand profile before generating creatives.
            </p>
          </div>
        )}

        {/* Page header */}
        <div className="mb-8 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Brand Setup</h1>
            <p className="text-muted-foreground mt-1 text-sm">Set up your brand once. Generate creatives forever.</p>
          </div>

          {/* Step indicators */}
          <div className="hidden md:flex items-center gap-1 shrink-0">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              const isActive = i === 0
              return (
                <div key={step.label} className="flex items-center gap-1">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${
                    isActive
                      ? 'text-white'
                      : 'text-muted-foreground bg-muted'
                  }`}
                    style={isActive ? { background: 'var(--studio-accent)' } : {}}
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

        {/* Divider */}
        <div className="h-px bg-border mb-8" />

        {/* Two-column layout on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_340px] gap-8 xl:gap-10">
          <ProductForm onComplete={handleComplete} />

          {/* Right sidebar — tips */}
          <aside className="hidden lg:block space-y-4">
            <div className="rounded-2xl border border-border bg-muted/40 p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">What you need</p>
              <ul className="space-y-2.5">
                {[
                  { icon: '●', label: 'Product image', note: 'JPEG or PNG, hero shot' },
                  { icon: '●', label: 'Style references', note: 'Up to 5 mood board images' },
                  { icon: '●', label: 'Brand font', note: '.ttf / .otf / .woff2' },
                  { icon: '○', label: 'Icons (optional)', note: 'SVG vectors' },
                  { icon: '○', label: 'Logo (optional)', note: 'PNG or SVG' },
                ].map(item => (
                  <li key={item.label} className="flex gap-2.5 text-xs">
                    <span className="text-muted-foreground/40 mt-px leading-tight">{item.icon}</span>
                    <div>
                      <span className="font-medium text-foreground">{item.label}</span>
                      <span className="text-muted-foreground ml-1.5">{item.note}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border p-5" style={{ borderColor: 'color-mix(in oklch, var(--studio-accent) 30%, transparent)', background: 'color-mix(in oklch, var(--studio-accent) 6%, transparent)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--studio-accent)' }}>Pro tip</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Upload 3–5 style references that match your desired aesthetic — mood boards, competitor ads, or editorial shots. The AI uses these as composition guidance.
              </p>
            </div>

            <div className="rounded-2xl border border-border p-5">
              <p className="text-xs font-semibold text-foreground mb-3">What gets generated</p>
              <div className="space-y-2">
                {['Brand color palette', 'Typography rules', 'Layout guidelines', 'Tone of voice', 'Brand tagline'].map(item => (
                  <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="size-1.5 rounded-full shrink-0" style={{ background: 'var(--studio-accent)' }} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  )
}
