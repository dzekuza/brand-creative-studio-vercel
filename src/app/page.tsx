'use client'

import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ImageProvider } from '@/types'

const MODES: {
  id: ImageProvider
  name: string
  badge: string
  description: string
  features: string[]
  accent: string
}[] = [
  {
    id: 'google',
    name: 'Custom Agent',
    badge: 'Gemini 2.5 Flash',
    description: 'Direct Google GenAI API. Latest model, maximum quality, full control.',
    features: ['gemini-2.5-flash-image', 'Direct API calls', 'Latest Gemini model'],
    accent: 'border-blue-500/40 hover:border-blue-400/70',
  },
  {
    id: 'gateway',
    name: 'Vercel AI Studio',
    badge: 'Gemini 3.1 Flash',
    description: 'Vercel AI Gateway. Observability, fallbacks, production-ready cloud routing.',
    features: ['AI Gateway routing', 'Built-in observability', 'Production optimized'],
    accent: 'border-violet-500/40 hover:border-violet-400/70',
  },
]

export default function HomePage() {
  const router = useRouter()

  function selectMode(provider: ImageProvider) {
    localStorage.setItem('brand-creative-studio:provider', provider)
    // Apply theme immediately so the next page loads with the correct colour scheme
    if (provider === 'gateway') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    router.push('/setup')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-10">
        <div className="space-y-3 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Brand Creative Studio</h1>
          <p className="text-muted-foreground text-lg">Choose your image generation engine</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {MODES.map(mode => (
            <div
              key={mode.id}
              role="button"
              tabIndex={0}
              onClick={() => selectMode(mode.id)}
              onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && selectMode(mode.id)}
              className={`group cursor-pointer rounded-xl border-2 bg-card p-8 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${mode.accent}`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-xl font-bold leading-tight">{mode.name}</h2>
                  <Badge variant="secondary" className="shrink-0 text-[11px]">{mode.badge}</Badge>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">{mode.description}</p>

                <ul className="space-y-1.5">
                  {mode.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="size-1.5 rounded-full bg-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="pt-2">
                  <Button size="sm" className="w-full pointer-events-none group-hover:opacity-90">
                    Enter Studio
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Your choice is saved locally — switch anytime by returning to this page
        </p>
      </div>
    </div>
  )
}
