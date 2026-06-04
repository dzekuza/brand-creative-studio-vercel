import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import type { SidebarNavGroup } from "@/components/app-shared";
import { ChevronRightIcon } from "lucide-react";
import { usePathname } from "next/navigation";

export function NavGroup({ label, items }: SidebarNavGroup) {
	const pathname = usePathname();
	const isActive = (path?: string) => !!path && pathname === path;
	const isAnySubActive = (subItems?: { path?: string }[]) =>
		subItems?.some((i) => isActive(i.path)) ?? false;

	return (
		<SidebarGroup>
			{label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
			<SidebarMenu>
				{items.map((item) => (
					<Collapsible
						className="group/collapsible"
						defaultOpen={isActive(item.path) || isAnySubActive(item.subItems)}
						key={item.title}
						render={<SidebarMenuItem />}
					>
						{item.subItems?.length ? (
							<>
								<CollapsibleTrigger render={<SidebarMenuButton isActive={isActive(item.path)} />}>
									{item.icon}<span>{item.title}</span>
									<ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
								</CollapsibleTrigger>
								<CollapsibleContent>
									<SidebarMenuSub>
										{item.subItems.map((subItem) => (
											<SidebarMenuSubItem key={subItem.title}>
												<SidebarMenuSubButton isActive={isActive(subItem.path)} render={<a href={subItem.path} />} nativeButton={false}>
													{subItem.icon}<span>{subItem.title}</span>
												</SidebarMenuSubButton>
											</SidebarMenuSubItem>
										))}
									</SidebarMenuSub>
								</CollapsibleContent>
							</>
						) : (
							<SidebarMenuButton isActive={isActive(item.path)} render={<a href={item.path} />} nativeButton={false}>
								{item.icon}<span>{item.title}</span>
							</SidebarMenuButton>
						)}
					</Collapsible>
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
}
