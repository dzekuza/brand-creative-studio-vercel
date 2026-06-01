'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { loadHistory } from '@/lib/creative-history'
import { loadBrandBible } from '@/lib/brand-bible'
import { loadSetup } from '@/lib/saved-setup'

export function DashboardStats() {
  const [total, setTotal] = useState(0)
  const [platforms, setPlatforms] = useState(0)
  const [hasBible, setHasBible] = useState(false)
  const [hasBrand, setHasBrand] = useState(false)

  useEffect(() => {
    const history = loadHistory()
    const bible = loadBrandBible()
    const setup = loadSetup()
    setTotal(history.length)
    setPlatforms(new Set(history.map(h => h.platform.id)).size)
    setHasBible(!!bible)
    setHasBrand(!!(setup?.productName))
  }, [])

  const stats = [
    { label: 'Creatives generated', value: String(total), hint: 'all time' },
    { label: 'Platforms used', value: String(platforms), hint: 'unique formats' },
    { label: 'Brand bible', value: hasBible ? 'Ready' : 'None', hint: hasBible ? 'configured' : 'go to setup' },
    { label: 'Brand profile', value: hasBrand ? 'Saved' : 'Empty', hint: hasBrand ? 'restored on load' : 'fill in setup' },
  ]

  return (
    <>
      {stats.map(s => (
        <Card key={s.label}>
          <CardHeader>
            <CardTitle className="font-normal text-muted-foreground text-xs">{s.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-2xl tabular-nums tracking-tight">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.hint}</p>
          </CardContent>
        </Card>
      ))}
    </>
  )
}
