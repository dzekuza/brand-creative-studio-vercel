'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadBrandBible } from '@/lib/brand-bible'
import { GenerateForm } from '@/components/generate/GenerateForm'
import { CreativeGrid } from '@/components/generate/CreativeGrid'
import { Button } from '@/components/ui/button'
import type { BrandBible, Creative, UploadedAssets } from '@/types'

export default function GeneratePage() {
  const router = useRouter()
  const [bible, setBible] = useState<BrandBible | null>(null)
  const [assets, setAssets] = useState<UploadedAssets | null>(null)
  const [creatives, setCreatives] = useState<Creative[]>([])

  useEffect(() => {
    const b = loadBrandBible()
    const rawAssets = sessionStorage.getItem('brand-creative-studio:assets')
    if (!b || !rawAssets) {
      router.replace('/setup')
      return
    }
    setBible(b)
    setAssets(JSON.parse(rawAssets) as UploadedAssets)
  }, [router])

  if (!bible || !assets) return null

  return (
    <main className="max-w-4xl mx-auto py-10 px-4 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Generate Creatives</h1>
          <p className="text-muted-foreground mt-1">Your brand bible is ready. Generate on-brand ads.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push('/setup')}>
          ← Edit Brand
        </Button>
      </div>

      <GenerateForm
        brandBible={bible}
        assets={assets}
        onCreativesUpdate={setCreatives}
      />

      {creatives.length > 0 && <CreativeGrid creatives={creatives} />}
    </main>
  )
}
