'use client'

import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { ProductForm } from '@/components/setup/ProductForm'
import { saveSetup } from '@/lib/saved-setup'
import type { BrandBible, UploadedAssets } from '@/types'

export default function SetupPage() {
  const router = useRouter()

  function handleComplete(_bible: BrandBible, assets: UploadedAssets) {
    saveSetup({ productName: '', description: '', assets })
    localStorage.setItem('brand-creative-studio:assets', JSON.stringify(assets))
    router.push('/generate')
  }

  return (
    <AppShell>
      <div className="py-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Brand Setup</h1>
          <p className="text-muted-foreground mt-1">Set up your brand once. Generate creatives forever.</p>
        </div>
        <ProductForm onComplete={handleComplete} />
      </div>
    </AppShell>
  )
}
