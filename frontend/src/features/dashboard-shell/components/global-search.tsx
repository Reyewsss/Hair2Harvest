import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  CalendarClock,
  CornerDownLeft,
  FileText,
  MapPin,
  Store,
  Truck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { CmdIcon, SearchIcon } from "./icons";
import { useDashboardNavigation } from "./navigation";
import { workspaceNavigation } from "../data";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/context/auth-context";
import { can, canAccessPath, ROLE_LABELS } from "@/features/auth/permissions";
import { useSuppliers } from "@/features/suppliers/store/suppliers-store";
import { displayName, formatAddress } from "@/features/suppliers/data/suppliers-data";
import { accountsApi, type Account } from "@/features/accounts/accounts-api";

/* Global search in the topbar: pages, contributor shops and (for admins) accounts.
 * ↑/↓ to move, Enter to open, Esc to close. Ctrl/⌘+K focuses it (wired in topbar.tsx). */

type Result = {
  id: string;
  group: "Pages" | "Contributors" | "Accounts";
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  badge?: string;
  href: string;
};

// Pages beyond the sidebar list. Reports is left out: it's a 404 for now.
const EXTRA_PAGES: { name: string; href: string; icon: LucideIcon; keywords: string }[] = [
  { name: "Pickup schedule", href: "/suppliers/schedule", icon: CalendarClock, keywords: "calendar collection plan" },
  { name: "Collection tracking", href: "/suppliers/tracking", icon: Truck, keywords: "pickups collected status photo" },
  { name: "My profile", href: "/profile", icon: UserRound, keywords: "account password settings me" },
];

const MAX_PER_GROUP = 5;
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** 0 = no match; higher = better. Every word of the query must appear somewhere. */
function score(query: string, title: string, extra = ""): number {
  const q = norm(query.trim());
  if (!q) return 0;
  const t = norm(title);
  const hay = `${t} ${norm(extra)}`;
  if (!q.split(/\s+/).every((word) => hay.includes(word))) return 0;
  if (t === q) return 4;
  if (t.startsWith(q)) return 3;
  if (t.split(/\s+/).some((w) => w.startsWith(q))) return 2;
  return 1;
}

const rank = <T,>(items: T[], scoreOf: (item: T) => number) =>
  items
    .map((item) => ({ item, s: scoreOf(item) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, MAX_PER_GROUP)
    .map((x) => x.item);

/** Bolds the parts of `text` that match a word of the query. */
function Highlight({ text, query }: { text: string; query: string }) {
  const words = query.trim().split(/\s+/).filter(Boolean).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!words.length) return <>{text}</>;
  const parts = text.split(new RegExp(`(${words.join("|")})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-sm bg-primary/15 px-0.5 font-semibold text-foreground">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function GlobalSearch({
  inputRef,
  className,
  autoFocus,
  onDone,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  className?: string;
  autoFocus?: boolean;
  /** Called after a result is opened or Esc is pressed (the mobile bar closes itself). */
  onDone?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close when clicking anywhere outside the search box and its results.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
    onDone?.();
  };

  const showPanel = open && query.trim().length > 0;

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <InputGroup className="h-10 border-none bg-secondary px-3 py-1">
        <InputGroupAddon className="pl-0">
          <SearchIcon className="size-3.5 text-input-addon-foreground" />
        </InputGroupAddon>
        <InputGroupInput
          ref={inputRef}
          autoFocus={autoFocus}
          className="h-full p-0 px-1.5!"
          aria-label="Search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="global-search-results"
          autoComplete="off"
          placeholder="Search shops, owners, streets, pages..."
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              close();
            }
          }}
        />
        {query === "" ? (
          <InputGroupAddon align="inline-end" className="hidden pr-0 text-input-addon-foreground md:flex">
            <div className="flex items-center gap-1 rounded-md bg-background px-2 py-1.5">
              <CmdIcon className="size-2.5" />
              <span className="text-sm leading-none font-medium">K</span>
            </div>
          </InputGroupAddon>
        ) : null}
      </InputGroup>

      {/* Mounted only while open, so shop data is fetched fresh per search and not on every page load. */}
      {showPanel ? <SearchResults query={query} inputRef={inputRef} onOpen={close} /> : null}
    </div>
  );
}

function SearchResults({
  query,
  inputRef,
  onOpen,
}: {
  query: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onOpen: () => void;
}) {
  const { navigate } = useDashboardNavigation();
  const { user } = useAuth();
  const { suppliers, loading: suppliersLoading } = useSuppliers();
  const isAdmin = !!user && can(user.role, "accounts:manage");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;
    accountsApi
      .list()
      .then((list) => alive && setAccounts(list))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [isAdmin]);

  const results = useMemo<Result[]>(() => {
    const pages = [
      ...workspaceNavigation
        .filter((p) => p.href !== "/reports")
        .map((p) => ({ name: p.name, href: p.href, icon: p.icon as LucideIcon, keywords: "" })),
      ...EXTRA_PAGES,
    ].filter((p) => !user || canAccessPath(user.role, p.href));

    const pageResults: Result[] = rank(pages, (p) => score(query, p.name, p.keywords)).map((p) => ({
      id: `page:${p.href}`,
      group: "Pages",
      icon: p.icon ?? FileText,
      title: p.name,
      subtitle: "Go to page",
      href: p.href,
    }));

    const shopResults: Result[] = rank(suppliers, (s) =>
      score(query, s.shopName, `${displayName(s)} ${s.street} ${s.unit ?? ""} ${s.barangay} ${s.phone} ${s.email}`),
    ).map((s) => ({
      id: `shop:${s.id}`,
      group: "Contributors",
      icon: Store,
      title: s.shopName,
      subtitle: `${displayName(s)} · ${formatAddress(s)}`,
      badge: s.status === "enrolled" ? "Enrolled" : "Candidate",
      href: `/suppliers/${s.id}`,
    }));

    const accountResults: Result[] = rank(accounts, (a) => score(query, a.name, `${a.email} ${a.role}`)).map(
      (a) => ({
        id: `account:${a.id}`,
        group: "Accounts",
        icon: UserRound,
        title: a.name,
        subtitle: a.email,
        badge: ROLE_LABELS[a.role],
        href: "/accounts",
      }),
    );

    return [...shopResults, ...accountResults, ...pageResults];
  }, [query, suppliers, accounts, user]);

  // New query → back to the first result.
  useEffect(() => setActive(0), [query]);

  // Keyboard navigation lives on the input (focus stays there while results show).
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!results.length) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((i) => (i + 1) % results.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((i) => (i - 1 + results.length) % results.length);
      } else if (event.key === "Enter") {
        event.preventDefault();
        openResult(results[Math.min(active, results.length - 1)]);
      }
    };
    input.addEventListener("keydown", onKeyDown);
    return () => input.removeEventListener("keydown", onKeyDown);
  });

  // Keep the highlighted row in view.
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function openResult(result: Result | undefined) {
    if (!result) return;
    navigate(result.href);
    onOpen();
  }

  const groups = (["Contributors", "Accounts", "Pages"] as const)
    .map((g) => ({ name: g, items: results.filter((r) => r.group === g) }))
    .filter((g) => g.items.length);

  return (
    <div
      id="global-search-results"
      role="listbox"
      className="absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl animate-in fade-in-0 slide-in-from-top-1 md:min-w-[26rem]"
    >
      <div ref={listRef} className="max-h-[min(26rem,70vh)] overflow-y-auto p-1.5">
        {results.length === 0 ? (
          <Empty>
            {suppliersLoading ? "Searching…" : <>No results for “{query.trim()}”</>}
          </Empty>
        ) : (
          groups.map((group) => (
            <div key={group.name} className="py-1">
              <p className="px-2.5 pt-1 pb-1.5 text-[0.7rem] font-semibold tracking-wider text-muted-foreground uppercase">
                {group.name}
              </p>
              {group.items.map((r) => {
                const index = results.indexOf(r);
                const isActive = index === active;
                const Icon = r.icon;
                return (
                  <button
                    key={r.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    data-index={index}
                    onMouseMove={() => setActive(index)}
                    onClick={() => openResult(r)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                      isActive ? "bg-secondary" : "hover:bg-secondary/60",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg",
                        isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        <Highlight text={r.title} query={query} />
                      </span>
                      {r.subtitle ? (
                        <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                          {r.group === "Contributors" ? <MapPin className="size-3 shrink-0" /> : null}
                          <span className="truncate">{r.subtitle}</span>
                        </span>
                      ) : null}
                    </span>
                    {r.badge ? (
                      <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[0.7rem] font-medium text-muted-foreground">
                        {r.badge}
                      </span>
                    ) : null}
                    {isActive ? <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" /> : null}
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
      <div className="flex items-center justify-between gap-3 border-t px-3 py-2 text-[0.7rem] text-muted-foreground">
        <span>
          {results.length} result{results.length === 1 ? "" : "s"}
        </span>
        <span className="hidden items-center gap-2 sm:flex">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> to move <Kbd>Enter</Kbd> to open <Kbd>Esc</Kbd> to close
        </span>
      </div>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="px-3 py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border bg-secondary px-1.5 py-0.5 font-sans font-medium">{children}</kbd>;
}

