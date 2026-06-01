'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, Zap, Globe, CheckCircle2 } from 'lucide-react'
import type { ImageProvider } from '@/types'

const ENGINES = [
  {
    id: 'google' as ImageProvider,
    name: 'Custom Agent',
    model: 'Gemini 2.5 Flash',
    description: 'Direct Google GenAI. Maximum quality, full control.',
    features: ['Fastest generation', 'Latest Gemini model', 'Direct API'],
    icon: Zap,
    delay: '100ms',
  },
  {
    id: 'gateway' as ImageProvider,
    name: 'Vercel AI Studio',
    model: 'Gemini 3.1 Flash',
    description: 'AI Gateway routing with built-in observability.',
    features: ['Production routing', 'Built-in fallbacks', 'Full observability'],
    icon: Globe,
    delay: '200ms',
  },
]

function DecorativePanel() {
  return (
    <div className="relative flex flex-col gap-5 h-full overflow-hidden select-none pointer-events-none">
      {/* Ambient orb */}
      <div
        className="absolute -top-20 -right-20 w-80 h-80 rounded-full animate-orb-pulse"
        style={{ background: 'radial-gradient(circle, var(--studio-accent) 0%, transparent 70%)', opacity: 0.3 }}
      />
      <div
        className="absolute bottom-0 left-0 w-64 h-64 rounded-full animate-orb-pulse"
        style={{ background: 'radial-gradient(circle, oklch(0.55 0.15 260) 0%, transparent 70%)', opacity: 0.2, animationDelay: '2.5s' }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)', backgroundSize: '48px 48px' }}
      />

      {/* Floating preview cards */}
      <div className="relative z-10 mt-12 ml-8 mr-4 space-y-4">
        {/* Card 1 - Stat */}
        <div
          className="animate-float rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5"
          style={{ animationDelay: '0s', animationDuration: '4.5s' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-white/50 uppercase tracking-widest">Creatives generated</span>
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-4xl font-bold tracking-tighter" style={{ color: 'var(--studio-accent)' }}>2,847</div>
          <div className="text-xs text-white/40 mt-1">+23% this week</div>
        </div>

        {/* Card 2 - Platform breakdown */}
        <div
          className="animate-float rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 ml-8"
          style={{ animationDelay: '1.5s', animationDuration: '5s' }}
        >
          <div className="text-xs font-medium text-white/50 uppercase tracking-widest mb-3">Top format</div>
          <div className="flex items-end gap-2">
            <div className="flex flex-col items-center gap-1">
              <div className="w-6 rounded-t" style={{ height: '48px', background: 'var(--studio-accent)' }} />
              <span className="text-[10px] text-white/40">9:16</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-6 bg-white/20 rounded-t" style={{ height: '32px' }} />
              <span className="text-[10px] text-white/40">1:1</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-6 bg-white/20 rounded-t" style={{ height: '20px' }} />
              <span className="text-[10px] text-white/40">16:9</span>
            </div>
          </div>
        </div>

        {/* Card 3 - Status */}
        <div
          className="animate-float rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-3 flex items-center gap-3"
          style={{ animationDelay: '0.8s', animationDuration: '5.5s' }}
        >
          <CheckCircle2 className="size-4 shrink-0" style={{ color: 'var(--studio-accent)' }} />
          <div>
            <div className="text-xs font-semibold text-white/80">Brand bible ready</div>
            <div className="text-[11px] text-white/40">All assets uploaded</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()

  function selectEngine(provider: ImageProvider) {
    localStorage.setItem('brand-creative-studio:provider', provider)
    document.documentElement.classList.toggle('dark', provider === 'gateway')
    router.push('/setup')
  }

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row">
      {/* Left — content */}
      <div className="flex flex-col justify-center px-8 py-16 md:px-16 md:py-0 md:w-[58%] lg:px-24">
        {/* Logo mark */}
        <div className="animate-fade-in-up mb-12" style={{ animationDelay: '0ms' }}>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="size-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--studio-accent)' }}>
              <svg viewBox="0 0 16 16" fill="white" className="size-4">
                <path d="M8 1L15 13H1L8 1z" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground/70">Brand Creative Studio</span>
          </div>
        </div>

        {/* Headline */}
        <div className="animate-fade-in-up mb-10" style={{ animationDelay: '60ms' }}>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter leading-[1.05] text-foreground">
            Generate ads that<br />
            <span style={{ color: 'var(--studio-accent)' }}>stop the scroll.</span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground max-w-md leading-relaxed">
            Choose your AI engine. Upload your brand assets. Ship on-brand creatives in seconds.
          </p>
        </div>

        {/* Engine selector */}
        <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: '120ms' }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">Select engine</p>
          {ENGINES.map((engine) => {
            const Icon = engine.icon
            return (
              <button
                key={engine.id}
                type="button"
                onClick={() => selectEngine(engine.id)}
                className="group w-full text-left rounded-2xl border border-border bg-card transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring p-5"
                style={{ transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="mt-0.5 size-9 rounded-xl border border-border flex items-center justify-center shrink-0 transition-colors duration-200 group-hover:border-transparent"
                      style={{ '--hover-bg': 'var(--studio-accent)' } as React.CSSProperties}
                    >
                      <Icon className="size-4 text-muted-foreground transition-colors duration-200 group-hover:text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm text-foreground">{engine.name}</span>
                        <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{engine.model}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{engine.description}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                        {engine.features.map(f => (
                          <span key={f} className="text-[11px] text-muted-foreground/70">{f}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground/40 shrink-0 mt-1 transition-transform duration-200 group-hover:translate-x-0.5" style={{ color: 'var(--studio-accent)', opacity: 0 }} />
                </div>

                {/* Bottom accent bar */}
                <div
                  className="mt-4 h-px w-0 group-hover:w-full transition-all duration-500 ease-out rounded-full"
                  style={{ background: 'var(--studio-accent)', transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }}
                />
              </button>
            )
          })}
        </div>

        <p className="animate-fade-in mt-8 text-[11px] text-muted-foreground/60" style={{ animationDelay: '300ms' }}>
          Engine choice saved locally — switch anytime from the studio
        </p>
      </div>

      {/* Right — decorative (hidden on mobile) */}
      <div
        className="hidden md:block md:w-[42%] relative"
        style={{ background: 'oklch(0.1 0 0)' }}
      >
        <DecorativePanel />
      </div>
    </div>
  )
}
