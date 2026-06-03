'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardCard } from '@/components/ui/dashboard-card'
import { loadHistory } from '@/lib/creative-history'
import { loadBrandBible } from '@/lib/brand-bible'
import { loadSetup } from '@/lib/saved-setup'
import { cn } from '@/lib/utils'
import { ImageIcon, LayoutGridIcon, CheckCircle2Icon, CircleDashedIcon } from 'lucide-react'

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
    setHasBrand(!!(setup?.brandName))
  }, [])

  return (
    <>
      <StatCard
        icon={<ImageIcon />}
        label="Creatives generated"
        value={String(total)}
        footer="all time"
      />
      <StatCard
        icon={<LayoutGridIcon />}
        label="Platforms used"
        value={String(platforms)}
        footer="unique formats"
      />
      <StatCard
        icon={hasBible ? <CheckCircle2Icon /> : <CircleDashedIcon />}
        label="Brand bible"
        value={hasBible ? 'Configured' : 'Not set'}
        footer={hasBible ? 'ready to generate' : 'go to setup'}
        iconVariant={hasBible ? 'ok' : 'empty'}
      />
      <StatCard
        icon={hasBrand ? <CheckCircle2Icon /> : <CircleDashedIcon />}
        label="Brand profile"
        value={hasBrand ? 'Saved' : 'Empty'}
        footer={hasBrand ? 'auto-loaded on start' : 'fill in setup'}
        iconVariant={hasBrand ? 'ok' : 'empty'}
      />
    </>
  )
}

function StatCard({
  icon,
  label,
  value,
  footer,
  iconVariant = 'default',
}: {
  icon: ReactNode
  label: string
  value: string
  footer: string
  iconVariant?: 'default' | 'ok' | 'empty'
}) {
  return (
    <DashboardCard>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-normal text-xs tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
        <span
          className={cn(
            '[&_svg]:size-3.5 [&_svg]:shrink-0',
            iconVariant === 'ok' && 'text-emerald-500',
            iconVariant === 'empty' && 'text-muted-foreground/40',
            iconVariant === 'default' && 'text-muted-foreground',
          )}
        >
          {icon}
        </span>
      </CardHeader>
      <CardContent>
        <p className="font-semibold text-2xl tabular-nums tracking-tight">{value}</p>
      </CardContent>
      <CardFooter className="rounded-none bg-background text-xs text-muted-foreground">
        {footer}
      </CardFooter>
    </DashboardCard>
  )
}
