import { DashboardStats } from '@/components/stats'
import { QuickActions } from '@/components/quick-actions'
import { CreativesGallery } from '@/components/creatives-gallery'
import { Sparkles, ArrowRight } from 'lucide-react'

export function Dashboard() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <DashboardStats />

      {/* Hero card */}
      <div className="md:col-span-2 lg:col-span-4">
        <div
          className="relative overflow-hidden rounded-2xl min-h-[180px] flex flex-col justify-between p-7"
          style={{ backgroundImage: 'url(/bg-card-blue.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          {/* Overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/60 via-blue-700/30 to-transparent" />

          <div className="relative z-10 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-blue-200" />
              <span className="text-xs font-semibold text-blue-200 uppercase tracking-widest">AI-Powered</span>
            </div>
            <h2 className="text-2xl font-bold text-white leading-tight max-w-md">
              Turn your brand into scroll-stopping creatives
            </h2>
            <p className="text-sm text-blue-100/80 max-w-sm leading-relaxed">
              Upload your product, define your brand voice, and generate on-brand ad images in seconds.
            </p>
          </div>

          <div className="relative z-10 mt-4 flex items-center gap-3">
            <a
              href="/generate"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-blue-900 shadow-md hover:bg-blue-50 transition-colors"
            >
              Start generating
              <ArrowRight className="size-3.5" />
            </a>
            <a
              href="/setup"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
            >
              Edit brand
            </a>
          </div>
        </div>
      </div>

      <div className="md:col-span-2 lg:col-span-3">
        <CreativesGallery />
      </div>
      <div className="md:col-span-2 lg:col-span-1">
        <QuickActions />
      </div>
    </div>
  )
}
