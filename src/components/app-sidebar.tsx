'use client'

import {
  Sidebar, SidebarContent, SidebarFooter,
  SidebarGroup, SidebarHeader, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem,
} from '@/components/ui/sidebar'
import { NavGroup } from '@/components/nav-group'
import { footerNavLinks, navGroups } from '@/components/app-shared'
import { Sparkles, Settings2 } from 'lucide-react'

function StudioMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M8 1L15 13H1L8 1z" />
    </svg>
  )
}

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader className="h-14 justify-center">
        <SidebarMenuButton render={<a href="/dashboard" />} className="gap-2.5">
          <div
            className="size-5 rounded-md flex items-center justify-center shrink-0"
            style={{ background: 'var(--studio-accent)' }}
          >
            <StudioMark className="size-3 text-white" />
          </div>
          <span className="font-semibold tracking-tight text-sm">Brand Studio</span>
        </SidebarMenuButton>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              className="min-w-8 text-white duration-200 ease-out hover:opacity-90 active:scale-[0.98] transition-all"
              style={{ background: 'var(--studio-accent)' }}
              tooltip="Generate creatives"
              render={<a href="/generate" />}
            >
              <Sparkles className="size-4" />
              <span>Generate</span>
            </SidebarMenuButton>
            <a
              href="/setup"
              aria-label="Brand setup"
              className="size-8 inline-flex items-center justify-center rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors group-data-[collapsible=icon]:opacity-0"
            >
              <Settings2 className="size-4" />
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
