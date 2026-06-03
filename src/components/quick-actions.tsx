'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from '@/components/ui/item'
import { ImagePlusIcon, SettingsIcon, ChevronRightIcon, TrashIcon } from 'lucide-react'
import { clearHistory } from '@/lib/creative-history'

function isBrandConfigured() {
  if (typeof window === 'undefined') return false
  return (
    !!localStorage.getItem('brand-creative-studio:brand-bible') &&
    !!localStorage.getItem('brand-creative-studio:assets')
  )
}

export function QuickActions() {
  const router = useRouter()

  function handleGenerate() {
    if (isBrandConfigured()) {
      router.push('/generate')
    } else {
      router.push('/setup?required=1')
    }
  }

  function handleClearHistory() {
    clearHistory()
    window.location.reload()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick actions</CardTitle>
        <CardDescription>Jump to common tasks.</CardDescription>
      </CardHeader>
      <CardContent>
        <ItemGroup className="gap-0">
          <Item size="sm" render={<button type="button" onClick={handleGenerate} className="w-full text-left" />}>
            <ItemMedia variant="icon"><ImagePlusIcon aria-hidden="true" /></ItemMedia>
            <ItemContent>
              <ItemTitle>Generate creatives</ItemTitle>
              <ItemDescription className="line-clamp-1">Create new ad images from your brand.</ItemDescription>
            </ItemContent>
            <ItemActions>
              <ChevronRightIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            </ItemActions>
          </Item>

          <Item size="sm" render={<a href="/setup" />}>
            <ItemMedia variant="icon"><SettingsIcon aria-hidden="true" /></ItemMedia>
            <ItemContent>
              <ItemTitle>Brand setup</ItemTitle>
              <ItemDescription className="line-clamp-1">Update product info, font, and style refs.</ItemDescription>
            </ItemContent>
            <ItemActions>
              <ChevronRightIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            </ItemActions>
          </Item>

          <Item size="sm" render={<button type="button" onClick={handleClearHistory} className="w-full text-left" />}>
            <ItemMedia variant="icon"><TrashIcon aria-hidden="true" /></ItemMedia>
            <ItemContent>
              <ItemTitle>Clear history</ItemTitle>
              <ItemDescription className="line-clamp-1">Remove all saved creatives from storage.</ItemDescription>
            </ItemContent>
            <ItemActions>
              <ChevronRightIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            </ItemActions>
          </Item>
        </ItemGroup>
      </CardContent>
    </Card>
  )
}
