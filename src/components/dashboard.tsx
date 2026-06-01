import { DashboardStats } from '@/components/stats'
import { QuickActions } from '@/components/quick-actions'
import { CreativesGallery } from '@/components/creatives-gallery'

export function Dashboard() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <DashboardStats />
      <div className="md:col-span-2 lg:col-span-3">
        <CreativesGallery />
      </div>
      <div className="md:col-span-2 lg:col-span-1">
        <QuickActions />
      </div>
    </div>
  )
}
