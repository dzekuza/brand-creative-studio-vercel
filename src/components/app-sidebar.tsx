'use client'

import {
  Sidebar, SidebarContent, SidebarFooter,
  SidebarGroup, SidebarHeader, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem,
} from '@/components/ui/sidebar'
import { NavGroup } from '@/components/nav-group'
import { footerNavLinks, navGroups } from '@/components/app-shared'
import { PlusIcon, SearchIcon } from 'lucide-react'

function VercelLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 116 100" fill="currentColor" className={className} aria-hidden="true">
      <path d="M57.5 0L115 100H0L57.5 0z" />
    </svg>
  )
}

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader className="h-14 justify-center">
        <SidebarMenuButton render={<a href="/dashboard" />}>
          <VercelLogo className="size-4" />
          <span className="font-semibold tracking-tight">Brand Studio</span>
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
              tooltip="Generate creatives"
              render={<a href="/generate" />}
            >
              <PlusIcon />
              <span>Generate</span>
            </SidebarMenuButton>
            <a
              href="/setup"
              aria-label="Brand setup"
              className="size-8 inline-flex items-center justify-center rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors group-data-[collapsible=icon]:opacity-0"
            >
              <SearchIcon className="size-4" />
              <span className="sr-only">Brand setup</span>
            </a>
          </SidebarMenuItem>
        </SidebarGroup>
        {navGroups.map((group, i) => (
          <NavGroup key={i} {...group} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {footerNavLinks.map(item => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                className="text-muted-foreground"
                isActive={item.isActive}
                size="sm"
                render={<a href={item.path} />}
              >
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
