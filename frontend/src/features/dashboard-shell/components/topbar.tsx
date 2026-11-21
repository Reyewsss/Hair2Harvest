import { useEffect, useRef, useState } from "react";
import { X, Sun, Moon } from "lucide-react";
import { BellIcon, SearchIcon } from "./icons";
import { GlobalSearch } from "./global-search";
import { Button, buttonVariants } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { SidebarTrigger } from "@/shared/ui/sidebar";
import { useTheme } from "./theme-provider";
import {
  formatRelativeTime,
  scrollToElementById,
  useAuditNotifications,
} from "./notification-modal";

const AUDIT_TRAIL_ID = "audit-trail";

function scrollToAuditTrail() {
  // Wait for the menu to close and hand focus back to the bell,
  // otherwise that focus jump can cancel the scroll.
  window.setTimeout(() => {
    // Already on the dashboard: just scroll, don't touch the URL.
    if (!scrollToElementById(AUDIT_TRAIL_ID)) {
      // Not on the dashboard page — go there; AuditSection scrolls on arrival.
      window.location.href = `/#${AUDIT_TRAIL_ID}`;
    }
  }, 150);
}

export function DashboardTopbar() {
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  const { theme, toggleTheme } = useTheme();
  const {
    entries: auditEntries,
    isLoading: isAuditLoading,
    error: auditError,
    unreadCount,
    lastSeen,
    markAllSeen,
    refresh: refreshAudit,
  } = useAuditNotifications(8);

  const openMobileSearch = () => {
    setIsMobileSearchOpen(true);
    requestAnimationFrame(() => {
      mobileSearchInputRef.current?.focus();
    });
  };

  const closeMobileSearch = () => {
    setIsMobileSearchOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();

        if (window.matchMedia("(max-width: 767px)").matches) {
          setIsMobileSearchOpen(true);
          requestAnimationFrame(() => {
            mobileSearchInputRef.current?.focus();
          });
          return;
        }

        requestAnimationFrame(() => {
          searchInputRef.current?.focus();
        });
      }

      if (event.key === "Escape") {
        setIsMobileSearchOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="flex h-16 items-center justify-between gap-4 px-4 md:px-6 md:pr-8">
      {isMobileSearchOpen ? (
        <div className="flex w-full items-center gap-2.5 md:hidden">
          <GlobalSearch
            inputRef={mobileSearchInputRef}
            className="flex-1"
            autoFocus
            onDone={closeMobileSearch}
          />
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className="size-10"
            aria-label="Close search"
            onClick={closeMobileSearch}
          >
            <X className="size-4.5" />
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-1 items-center gap-2 md:max-w-105">
            <SidebarTrigger className="size-10 md:hidden [&_svg]:size-5!" />
            <GlobalSearch inputRef={searchInputRef} className="hidden flex-1 md:block" />
          </div>

          <div className="flex shrink-0 items-center gap-2 md:gap-4">
            <Button
              type="button"
              variant="secondary"
              size="icon-lg"
              className="relative size-10 md:hidden"
              aria-label="Open search"
              onClick={openMobileSearch}
            >
              <SearchIcon className="size-4.5" />
            </Button>

            {/* 👇 FIXED DARK MODE TOGGLE BUTTON 👇 */}
            <Button
              type="button"
              variant="secondary"
              size="icon-lg"
              className="relative size-10 overflow-hidden"
              aria-label="Toggle theme"
              onClick={toggleTheme}
            >
              {theme === "dark" ? (
                <Sun className="size-5 transition-all duration-300 animate-in spin-in-90 zoom-in" />
              ) : (
                <Moon className="size-5 transition-all duration-300 animate-in spin-in-90 zoom-in" />
              )}
            </Button>

            <DropdownMenu
              onOpenChange={(open) => {
                if (open) {
                  refreshAudit();
                } else if (unreadCount > 0) {
                  // Mark as seen on close so the "new" highlight stays visible while open.
                  markAllSeen();
                }
              }}
            >
              <DropdownMenuTrigger
                type="button"
                className={buttonVariants({
                  variant: "secondary",
                  size: "icon-lg",
                  className: "size-10",
                })}
                aria-label={
                  unreadCount > 0
                    ? `Notifications (${unreadCount} new)`
                    : "Notifications"
                }
              >
                <span className="relative">
                  <BellIcon className="size-5" />
                  {unreadCount > 0 ? (
                    <span className="absolute top-0 right-0.5 size-2 rounded-full bg-destructive" />
                  ) : null}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="center"
                className="astrix-dashboard w-78"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notifications</span>
                    {unreadCount > 0 ? (
                      <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-medium text-white">
                        {unreadCount} new
                      </span>
                    ) : null}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {isAuditLoading && auditEntries.length === 0 ? (
                    <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                      Loading…
                    </p>
                  ) : auditError && auditEntries.length === 0 ? (
                    <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                      {auditError}
                    </p>
                  ) : auditEntries.length === 0 ? (
                    <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                      No recent activity
                    </p>
                  ) : (
                    <div className="max-h-96 overflow-y-auto">
                      {auditEntries.map((entry) => {
                        const isNew =
                          new Date(entry.createdAt).getTime() > lastSeen;
                        return (
                          <DropdownMenuItem
                            key={entry._id}
                            className="min-w-0 items-start gap-2 py-2"
                          >
                            <span
                              className={`mt-1.5 size-2 shrink-0 rounded-full ${
                                isNew ? "bg-destructive" : "bg-transparent"
                              }`}
                              aria-hidden
                            />
                            <div className="min-w-0">
                              <p className="font-medium">
                                {entry.action}
                                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                  · {entry.module}
                                </span>
                              </p>
                              <p className="truncate text-sm text-muted-foreground">
                                {entry.user} — {entry.item}
                                {entry.remarks ? ` (${entry.remarks})` : ""}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground/60">
                                {formatRelativeTime(entry.createdAt)}
                              </p>
                            </div>
                          </DropdownMenuItem>
                        );
                      })}
                    </div>
                  )}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="justify-center hover:underline focus:bg-transparent"
                  onClick={scrollToAuditTrail}
                >
                  View all
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}
    </header>
  );
}
