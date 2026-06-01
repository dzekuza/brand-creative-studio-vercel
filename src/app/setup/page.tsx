'use client'

import { useRouter } from 'next/navigation'
import { ProductForm } from '@/components/setup/ProductForm'
import type { BrandBible, UploadedAssets } from '@/types'

export default function SetupPage() {
  const router = useRouter()

  function handleComplete(_bible: BrandBible, assets: UploadedAssets) {
    sessionStorage.setItem('brand-creative-studio:assets', JSON.stringify(assets))
    router.push('/generate')
  }

  return (
    <main className="max-w-2xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Brand Setup</h1>
        <p className="text-muted-foreground mt-1">Set up your brand once. Generate creatives forever.</p>
      </div>
      <ProductForm onComplete={handleComplete} />
    </main>
  )
}
