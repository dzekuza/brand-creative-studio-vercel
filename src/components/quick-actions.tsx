import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from '@/components/ui/item'
import { ImagePlusIcon, SettingsIcon, ChevronRightIcon, TrashIcon } from 'lucide-react'

const actions = [
  {
    title: 'Generate creatives',
    description: 'Create new ad images from your brand.',
    href: '/generate',
    icon: <ImagePlusIcon aria-hidden="true" />,
  },
  {
    title: 'Brand setup',
    description: 'Update product info, font, and style refs.',
    href: '/setup',
    icon: <SettingsIcon aria-hidden="true" />,
  },
  {
    title: 'Clear history',
    description: 'Remove all saved creatives from storage.',
    href: '#clear-history',
    icon: <TrashIcon aria-hidden="true" />,
  },
] as const

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick actions</CardTitle>
        <CardDescription>Jump to common tasks.</CardDescription>
      </CardHeader>
      <CardContent>
        <ItemGroup className="gap-0">
          {actions.map(a => (
            <Item key={a.title} size="sm" render={<a href={a.href} />}>
              <ItemMedia variant="icon">{a.icon}</ItemMedia>
              <ItemContent>
                <ItemTitle>{a.title}</ItemTitle>
                <ItemDescription className="line-clamp-1">{a.description}</ItemDescription>
              </ItemContent>
              <ItemActions>
                <ChevronRightIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      </CardContent>
    </Card>
  )
}
