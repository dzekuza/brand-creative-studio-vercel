import type { ReactNode } from 'react'
import { LayoutGridIcon, ImagePlusIcon, SettingsIcon, HistoryIcon, LayersIcon } from 'lucide-react'

export type SidebarNavItem = {
  title: string
  path?: string
  icon?: ReactNode
  isActive?: boolean
  subItems?: SidebarNavItem[]
}

export type SidebarNavGroup = {
  label: string
  items: SidebarNavItem[]
}

export const navGroups: SidebarNavGroup[] = [
  {
    label: 'Studio',
    items: [
      {
        title: 'Dashboard',
        path: '/dashboard',
        icon: <LayoutGridIcon />,
      },
      {
        title: 'Generate',
        path: '/generate',
        icon: <ImagePlusIcon />,
      },
      {
        title: 'Bulk Ads',
        path: '/bulk-ads',
        icon: <LayersIcon />,
      },
      {
        title: 'History',
        path: '/dashboard',
        icon: <HistoryIcon />,
      },
    ],
  },
  {
    label: 'Brand',
    items: [
      {
        title: 'Brand Setup',
        path: '/setup',
        icon: <SettingsIcon />,
      },
    ],
  },
]

export const footerNavLinks: SidebarNavItem[] = []

export const navLinks: SidebarNavItem[] = [
  ...navGroups.flatMap(group =>
    group.items.flatMap(item =>
      item.subItems?.length ? [item, ...item.subItems] : [item]
    )
  ),
  ...footerNavLinks,
]
