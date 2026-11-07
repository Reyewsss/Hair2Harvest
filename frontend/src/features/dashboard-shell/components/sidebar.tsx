import { useEffect, useState } from "react";
import { ChevronDown, LogOut, Moon, Settings, Sun, User } from "lucide-react";
import Logo from "../../../assets/hair2harvest-logo.svg";
import LogoWhite from "../../../assets/hair2harvest-bnw-logo.svg";
import { SidebarToggleIcon } from "./icons";
import { DashboardLink, useDashboardNavigation } from "./navigation";
import { useTheme } from "./theme-provider";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/shared/ui/sidebar";
import { workspaceNavigation, type NavigationItem } from "../data";
import { useAuth } from "@/features/auth/context/auth-context";
import { ROLE_LABELS, canAccessPath } from "@/features/auth/permissions";
// Adjust this path to where your inventory folder lives.
import {
  INVENTORY_HREF,
  getActiveInventoryTab,
  inventoryTabs,
  isInventorySection,
} from "@/features/inventory/data/inventory-tabs";
import {
  REPORTS_HREF,
  getActiveReportCategory,
  isReportsSection,
  reportLinks,
} from "@/features/reports/data/reports-nav";
import { cn } from "@/lib/utils";
import { confirm } from "@/shared/ui/modal";

const dropdownTriggerClassName =
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm ring-sidebar-ring outline-hidden transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0";

function NavItem({ item }: { item: NavigationItem }) {
  const { pathname } = useDashboardNavigation();
  const { isMobile, setOpenMobile } = useSidebar();
  const isActive =
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        tooltip={item.name}
        className={cn(
          "h-auto [&_svg]:size-5",
          "group-data-[collapsible=icon]:size-12!",
          "group-data-[collapsible=icon]:px-3.5!",
        )}
        render={
          <DashboardLink
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            onClick={() => {
              if (isMobile) setOpenMobile(false);
            }}
            className={cn(
              "group/nav flex h-12 w-full items-center gap-2.5 overflow-hidden rounded-xl px-3 py-2.5 text-muted-foreground hover:text-foreground",
              "transition-[width,padding] ease-linear",
              "aria-[current=page]:bg-sidebar-accent aria-[current=page]:text-primary aria-[current=page]:[filter:var(--shadow-sidebar-item)]",
            )}
          />
        }
      >
        <item.icon className="size-5" />
        <span className="truncate text-base group-data-[collapsible=icon]:hidden">
          {item.name}
        </span>
        {item.badge ? (
          <span className="ml-auto rounded-md bg-foreground/10 px-1.5 py-0.5 text-xs font-medium text-foreground group-data-[collapsible=icon]:hidden group-aria-[current=page]/nav:bg-primary/10 group-aria-[current=page]/nav:text-primary">
            {item.badge}
          </span>
        ) : null}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

// Sidebar items that open a list of sub-pages. Add an entry here to give another item a dropdown.
// overview: true  -> the row links to the item's own page, and the chevron opens the sub-pages.
// overview: false -> the row links to the first sub-page (there is no overview page).
type NavGroupConfig = {
  overview: boolean;
  items: { value: string; label: string; href: string }[];
  isSection: (pathname: string) => boolean;
  activeItem: (pathname: string) => string | null;
};

const navGroups: Record<string, NavGroupConfig> = {
  [INVENTORY_HREF]: {
    overview: true,
    items: inventoryTabs,
    isSection: isInventorySection,
    activeItem: getActiveInventoryTab,
  },
  [REPORTS_HREF]: {
    overview: false,
    items: reportLinks,
    isSection: isReportsSection,
    activeItem: getActiveReportCategory,
  },
};

// Icon-only sidebar: the icon opens a dropdown menu to the right instead of an inline list.
function NavGroup({
  item,
  group,
}: {
  item: NavigationItem;
  group: NavGroupConfig;
}) {
  const { pathname } = useDashboardNavigation();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const activeItem = group.activeItem(pathname);
  const { user } = useAuth();
  // Sub-pages the signed-in role may open (interns lose Schedule, Tracking and Rejected).
  const items = group.items.filter(
    (sub) => !user || canAccessPath(user.role, sub.href),
  );
  const isOverview = group.overview && pathname === item.href;
  const inSection = group.isSection(pathname);
  const isCollapsed = state === "collapsed" && !isMobile;
  const linkHref = group.overview ? item.href : (items[0]?.href ?? item.href);
  const [open, setOpen] = useState(inSection);

  useEffect(() => {
    if (inSection) setOpen(true);
  }, [inSection]);

  const closeMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  if (isCollapsed) {
    return (
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            type="button"
            aria-label={item.name}
            className={cn(
              "flex size-12 items-center justify-center rounded-xl text-muted-foreground outline-hidden hover:text-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              inSection &&
                "bg-sidebar-accent text-primary [filter:var(--shadow-sidebar-item)]",
            )}
          >
            <item.icon className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="start"
            className="astrix-dashboard w-52"
          >
            <DropdownMenuLabel className="font-normal text-muted-foreground">
              {item.name}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {group.overview ? (
              <DropdownMenuItem
                className={cn(isOverview && "font-medium text-primary")}
                render={<DashboardLink href={item.href} />}
              >
                Overview
              </DropdownMenuItem>
            ) : null}
            {items.map((sub) => (
              <DropdownMenuItem
                key={sub.value}
                className={cn(
                  activeItem === sub.value && "font-medium text-primary",
                )}
                render={<DashboardLink href={sub.href} />}
              >
                {sub.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isOverview}
        tooltip={item.name}
        className="h-auto [&_svg]:size-5"
        render={
          <DashboardLink
            href={linkHref}
            aria-current={isOverview ? "page" : undefined}
            onClick={closeMobile}
            className={cn(
              "group/nav flex h-12 w-full items-center gap-2.5 overflow-hidden rounded-xl py-2.5 pr-11 pl-3 text-muted-foreground hover:text-foreground",
              "transition-[width,padding] ease-linear",
              inSection && "text-primary",
              "aria-[current=page]:bg-sidebar-accent aria-[current=page]:text-primary aria-[current=page]:[filter:var(--shadow-sidebar-item)]",
            )}
          />
        }
      >
        <item.icon className="size-5" />
        <span className="truncate text-base">{item.name}</span>
      </SidebarMenuButton>

      <button
        type="button"
        aria-label={
          open ? `Collapse ${item.name} menu` : `Expand ${item.name} menu`
        }
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-lg text-muted-foreground outline-hidden hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
      >
        <ChevronDown
          className={cn("size-4 transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <ul className="mx-3.5 mt-1 flex min-w-0 flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5">
          {items.map((sub) => (
            <li key={sub.value}>
              <DashboardLink
                href={sub.href}
                aria-current={activeItem === sub.value ? "page" : undefined}
                onClick={closeMobile}
                className={cn(
                  "flex h-9 items-center rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:text-foreground",
                  "aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-medium aria-[current=page]:text-primary",
                )}
              >
                {sub.label}
              </DashboardLink>
            </li>
          ))}
        </ul>
      ) : null}
    </SidebarMenuItem>
  );
}

// Sidebar categories. Each section lists the hrefs of the items it contains.
// Rename a section or move an href to change the grouping. Items not listed here
// are still shown, in a final group with no heading.
const navigationSections: { label: string; hrefs: string[] }[] = [
  { label: "Overview", hrefs: ["/"] },
  {
    label: "Operations",
    hrefs: ["/suppliers", "/inventory", "/machine", "/composting"],
  },
  { label: "Management", hrefs: ["/accounts", "/reports"] },
];

function groupNavigation(items: NavigationItem[]) {
  const sections = navigationSections
    .map((section) => ({
      label: section.label,
      items: section.hrefs
        .map((href) => items.find((item) => item.href === href))
        .filter((item): item is NavigationItem => Boolean(item)),
    }))
    .filter((section) => section.items.length > 0);

  const listed = new Set(
    navigationSections.flatMap((section) => section.hrefs),
  );
  const rest = items.filter((item) => !listed.has(item.href));
  return rest.length > 0 ? [...sections, { label: "", items: rest }] : sections;
}

export function DashboardSidebar() {
  const { toggleSidebar } = useSidebar();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const me = {
    name: user?.name ?? "",
    email: user?.email ?? "",
    initials: (user?.name ?? "")
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join(""),
  };
  // Only list pages this role can open.
  const visibleNavigation = workspaceNavigation.filter(
    (item) => !user || canAccessPath(user.role, item.href),
  );

  return (
    <Sidebar
      collapsible="icon"
      // Added m-3, rounded-xl, border, shadow, and dynamic height calculation
      className="m-3 h-[calc(110.7svh-1.3rem)] group-data-[collapsible=icon]:m-3 group-data-[collapsible=icon]:h-[calc(110.7svh-1.3rem)] rounded-xl border border-border/50 shadow-md bg-sidebar transition-all duration-300"
    >
      <SidebarHeader className="h-16 flex-row items-center rounded-xl justify-between px-3 transition-[padding] ease-linear group-data-[collapsible=icon]:px-4.25">
        <div className="flex min-w-0 items-center gap-2 overflow-hidden group-data-[collapsible=icon]:hidden">
          <img
            src={theme === "dark" ? LogoWhite : Logo}
            alt="Hair2Harvest logo"
            // Added w-8 h-8 (32px by 32px)
            className="w-8 h-8 object-contain shrink-0 transition-all duration-300"
          />
          <div className="ml-2.75 leading-tight whitespace-nowrap overflow-hidden">
            <span className="truncate text-xl text-sidebar-primary font-bold">
              Hair2Harvest
            </span>
            <p className="text-[11px] text-muted-foreground">
              {user ? `${ROLE_LABELS[user.role]} workspace` : "Workspace"}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-lg"
          onClick={toggleSidebar}
          className="ml-auto text-muted-foreground hover:text-foreground group-data-[collapsible=icon]:size-12"
        >
          <SidebarToggleIcon className="size-6" />
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
      </SidebarHeader>

      <SidebarContent className="gap-5 overflow-x-hidden px-3 py-4 transition-[padding] ease-linear group-data-[collapsible=icon]:px-4.25">
        {groupNavigation(visibleNavigation).map((section, index) => (
          <div key={section.label || "other"} className="flex flex-col gap-2">
            {index > 0 ? (
              // Icon-only sidebar has no headings, so a short divider separates the groups.
              <div className="mx-auto hidden h-px w-6 bg-border group-data-[collapsible=icon]:block" />
            ) : null}
            {section.label ? (
              <p className="px-3 text-xs font-medium text-muted-foreground group-data-[collapsible=icon]:hidden">
                {section.label}
              </p>
            ) : null}
            <SidebarMenu className="gap-3">
              {section.items.map((item) => {
                const group = navGroups[item.href];
                return group ? (
                  <NavGroup key={item.href} item={item} group={group} />
                ) : (
                  <NavItem key={item.href} item={item} />
                );
              })}
            </SidebarMenu>
          </div>
        ))}
      </SidebarContent>

      <SidebarFooter className="px-3 py-2 transition-[padding] ease-linear group-data-[collapsible=icon]:px-5.25">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                type="button"
                className={cn(
                  dropdownTriggerClassName,
                  "h-auto gap-2.5 overflow-hidden rounded-xl px-1.5 py-1.5 group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:rounded-full! group-data-[collapsible=icon]:p-0!",
                )}
                aria-label="Account menu"
              >
                <Avatar className="size-10 after:border-[0.15625rem]">
                  <AvatarFallback>{me.initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden">
                  <p className="truncate text-base text-sidebar-primary font-semibold">
                    {me.name}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {me.email}
                  </p>
                </div>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="start"
                side="top"
                className="astrix-dashboard w-56"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal">
                    <p className="font-medium text-foreground">{me.name}</p>
                    <p className="text-xs text-muted-foreground">{me.email}</p>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User />
                  Profile Settings
                </DropdownMenuItem>
                {/* <DropdownMenuItem>
                  <Settings />
                  Account Settings
                </DropdownMenuItem> */}
                {/* <DropdownMenuItem onClick={toggleTheme}>
                  {theme === "dark" ? <Sun /> : <Moon />}
                  {theme === "dark" ? "Light mode" : "Dark mode"}
                </DropdownMenuItem> */}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    confirm({
                      title: "Sign out?",
                      description:
                        "You'll need to sign in again to access your workspace.",
                      confirmLabel: "Confirm",
                      cancelLabel: "Cancel",
                      variant: "destructive",
                      onConfirm: () => void logout(),
                    });
                  }}
                >
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
