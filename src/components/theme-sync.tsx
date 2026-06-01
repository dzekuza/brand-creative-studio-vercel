'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const PROVIDER_KEY = 'brand-creative-studio:provider'

export function ThemeSync() {
  const pathname = usePathname()

  useEffect(() => {
    function apply() {
      const provider = localStorage.getItem(PROVIDER_KEY)
      const html = document.documentElement
      if (provider === 'gateway') {
        html.classList.add('dark')
      } else {
        html.classList.remove('dark')
      }
    }

    apply()

    // Re-apply when another tab changes the provider
    window.addEventListener('storage', apply)
    return () => window.removeEventListener('storage', apply)
  }, [pathname])

  return null
}
