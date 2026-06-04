import { DashboardStats } from '@/components/stats'
import { QuickActions } from '@/components/quick-actions'
import { CreativesGallery } from '@/components/creatives-gallery'
import { DashboardCard } from '@/components/ui/dashboard-card'
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SparklesIcon, ArrowRightIcon, PencilIcon } from 'lucide-react'

export function Dashboard() {
  return (
    <div className="flex flex-col gap-6">
      {/* Bordered grid: stats + hero + quick actions */}
      <div className="overflow-hidden rounded-xl border">
        <div className="grid grid-cols-1 gap-px bg-border md:grid-cols-2 lg:grid-cols-4">
          {/* Row 1 — 4 stat cells */}
          <DashboardStats />

          {/* Row 2 — Hero CTA */}
          <DashboardCard className="relative md:col-span-2 lg:col-span-2 min-h-[220px] overflow-hidden">
            {/* Subtle accent orb */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -top-8 size-52 rounded-full bg-[var(--studio-accent)]/10 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute right-8 bottom-0 size-32 rounded-full bg-[var(--studio-accent)]/6 blur-2xl"
            />

            <CardHeader className="relative">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[var(--studio-accent)]">
                <SparklesIcon className="size-3" aria-hidden="true" />
                AI-Powered Creative Studio
              </div>
              <CardTitle className="text-xl font-semibold tracking-tight leading-snug max-w-xs">
                Turn your brand into scroll-stopping ad creatives
              </CardTitle>
              <CardDescription className="max-w-sm leading-relaxed">
                Upload your product, define your brand voice, and generate platform-ready ad images in seconds.
              </CardDescription>
            </CardHeader>

            <CardContent className="relative flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                className="bg-[var(--studio-accent)] text-white hover:opacity-90 active:scale-[0.98] transition-all gap-1.5"
                render={<a href="/generate" />}
                nativeButton={false}
              >
                <SparklesIcon className="size-3.5" />
                Start generating
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                render={<a href="/setup" />}
                nativeButton={false}
              >
                <PencilIcon className="size-3.5" />
                Edit brand
              </Button>
            </CardContent>
          </DashboardCard>

          {/* Row 2 — Quick actions */}
          <QuickActions />
        </div>
      </div>

      {/* Recent creatives gallery */}
      <CreativesGallery />
    </div>
  )
}
