"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AppBreadcrumbs } from "@/components/app-breadcrumbs";
import { CustomSidebarTrigger } from "@/components/custom-sidebar-trigger";
import { navLinks } from "@/components/app-shared";
import { NavUser } from "@/components/nav-user";
import { Bell } from "lucide-react";
import { usePathname } from "next/navigation";

export function AppHeader() {
  const pathname = usePathname();
  const activeItem = navLinks.find((item) => item.path === pathname)
    ?? navLinks.find((item) => pathname.startsWith(item.path ?? '___'));

  return (
    <header className={cn("mb-6 flex items-center justify-between gap-2 md:px-2")}>
      <div className="flex items-center gap-3">
        <CustomSidebarTrigger />
        <Separator
          className="mr-2 h-4 data-[orientation=vertical]:self-center"
          orientation="vertical"
        />
        <AppBreadcrumbs page={activeItem} />
      </div>

      <div className="flex items-center gap-2">
        <Button
          aria-label="Notifications"
          size="icon"
          variant="ghost"
          className="size-8 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Bell className="size-4" />
        </Button>
        <Separator
          className="h-4 data-[orientation=vertical]:self-center"
          orientation="vertical"
        />
        <NavUser />
      </div>
    </header>
  );
}
