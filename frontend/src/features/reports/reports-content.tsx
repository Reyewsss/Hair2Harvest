// features/reports/reports-content.tsx
// Live reports built from real pickups and inventory (server) and the machine/compost simulator.
import { useCallback, useEffect, useMemo, useState } from "react";
import { FileDown, FileSpreadsheet, Printer, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { buttonVariants } from "@/shared/ui/button";
import { ActionButton } from "@/shared/ui/action-button";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { TablePager, usePaged } from "@/shared/ui/table-pager";
import { clearApiCache, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { inventoryApi } from "@/features/inventory/inventory-api";
import { pickupsApi } from "@/features/suppliers/suppliers-api";
import { useSimulation } from "@/features/simulation/sim-store";
import { REPORT_CATEGORIES, type ReportCategory } from "./data/reports-data";
import { DEFAULT_REPORT_CATEGORY, isReportCategory } from "./data/reports-nav";
import { buildReport, downloadCsv, filterOptions, printReport, type ReportFilters } from "./report-engine";

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

const RANGES = [
  { id: "7", label: "7 days", from: () => daysAgo(7), to: () => today() },
  { id: "30", label: "30 days", from: () => daysAgo(30), to: () => today() },
  { id: "90", label: "90 days", from: () => daysAgo(90), to: () => today() },
  { id: "all", label: "All time", from: () => "", to: () => "" },
] as const;

// Which filters make sense for each report.
const USES_SHOP: ReportCategory[] = ["collection"];
const USES_BATCH: ReportCategory[] = ["equipment", "batch", "lab", "traceability"];
const USES_DATES: ReportCategory[] = ["collection", "equipment", "batch", "lab", "experiment"];

function useServerData() {
  const [data, setData] = useState<{ pickups: any[]; logs: any[] } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (force = false) => {
    if (force) clearApiCache(); // Refresh always asks the server
    setLoading(true);
    setError("");
    try {
      const [active, past, archived, logs] = await Promise.all([
        pickupsApi.getOldSchedule("", "active"),
        pickupsApi.getOldSchedule("", "past"),
        pickupsApi.getOldSchedule("", "archived"),
        inventoryApi.listLogs(),
      ]);
      const seen = new Set<string>();
      const pickups = [...active.pickups, ...past.pickups, ...archived.pickups].filter((p: any) => {
        if (seen.has(p._id)) return false;
        seen.add(p._id);
        return true;
      });
      setData({ pickups, logs: logs ?? [] });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  return { data, error, loading, reload: () => load(true) };
}

const selectClass = "h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-primary";

// `category` comes from the URL (/reports/:category) and is chosen in the sidebar dropdown.
export function ReportsContent({ category }: { category?: string }) {
  const activeCategory: ReportCategory = isReportCategory(category) ? category : DEFAULT_REPORT_CATEGORY;
  const info = REPORT_CATEGORIES.find((c) => c.id === activeCategory);
  const sim = useSimulation();
  const { data, error, loading, reload } = useServerData();

  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("30");
  const [filters, setFilters] = useState<ReportFilters>({ from: daysAgo(30), to: today(), shop: "", batch: "", search: "" });
  const patch = (p: Partial<ReportFilters>) => setFilters((f) => ({ ...f, ...p }));

  // Each report starts clean: filters from another report don't carry over.
  useEffect(() => {
    setRange("30");
    setFilters({ from: daysAgo(30), to: today(), shop: "", batch: "", search: "" });
  }, [activeCategory]);

  const input = useMemo(() => ({ pickups: data?.pickups ?? [], logs: data?.logs ?? [], sim }), [data, sim]);
  const options = useMemo(() => filterOptions(input), [input]);
  const report = useMemo(() => buildReport(activeCategory, input, filters), [activeCategory, input, filters]);
  const paged = usePaged(report.rows); // 10 rows per page

  // Page back to the start whenever the filters change.
  useEffect(() => {
    paged.setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, activeCategory]);

  const needsServer = activeCategory === "collection" || activeCategory === "traceability";
  const waiting = needsServer && loading && !data;
  const subtitle = [
    info?.label,
    USES_DATES.includes(activeCategory) && (filters.from || filters.to) ? `${filters.from || "start"} to ${filters.to || "today"}` : "",
    filters.shop,
    filters.batch,
    `Generated ${new Date().toLocaleString()}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const fileName = `${activeCategory}-report-${today()}.csv`;

  const exportCsv = () => {
    if (report.rows.length === 0) return toast.info("Nothing to export with these filters.");
    downloadCsv(fileName, report);
    toast.success(`Saved ${fileName}`);
  };
  const exportPrint = () => {
    if (report.rows.length === 0) return toast.info("Nothing to print with these filters.");
    if (!printReport(info?.label ?? "Report", subtitle, report)) toast.error("Allow pop-ups to print or save as PDF.");
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-8 pb-10 md:px-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">{info?.label}</h1>
          <p className="text-lg text-muted-foreground">{info?.description}</p>
        </div>

        <div className="flex items-center gap-2">
          {needsServer ? <ActionButton icon={RefreshCw} label="Refresh" variant="outline" tone="muted" loading={loading} onClick={reload} /> : null}
          <DropdownMenu>
            <DropdownMenuTrigger type="button" className={buttonVariants({ className: "gap-2" })}>
              <FileDown className="size-4" /> Export
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Export this report</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={exportCsv} className="cursor-pointer gap-2">
                <FileSpreadsheet className="size-4 text-green-600" /> CSV (opens in Excel)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportPrint} className="cursor-pointer gap-2">
                <Printer className="size-4" /> Print / Save as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search this report..."
              aria-label="Search this report"
              value={filters.search}
              onChange={(e) => patch({ search: e.target.value })}
              className="h-9 w-full rounded-md border bg-background pr-3 pl-9 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {USES_DATES.includes(activeCategory) ? (
            <>
              <div className="flex rounded-lg bg-secondary p-0.5" role="group" aria-label="Date range">
                {RANGES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setRange(r.id);
                      patch({ from: r.from(), to: r.to() });
                    }}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      range === r.id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                From
                <input
                  type="date"
                  value={filters.from}
                  max={filters.to || undefined}
                  onChange={(e) => {
                    setRange("all");
                    patch({ from: e.target.value });
                  }}
                  className={selectClass}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                To
                <input
                  type="date"
                  value={filters.to}
                  min={filters.from || undefined}
                  onChange={(e) => {
                    setRange("all");
                    patch({ to: e.target.value });
                  }}
                  className={selectClass}
                />
              </label>
            </>
          ) : null}

          {USES_SHOP.includes(activeCategory) ? (
            <select aria-label="Shop" value={filters.shop} onChange={(e) => patch({ shop: e.target.value })} className={selectClass}>
              <option value="">All shops</option>
              {options.shops.map((shop) => (
                <option key={shop} value={shop}>
                  {shop}
                </option>
              ))}
            </select>
          ) : null}

          {USES_BATCH.includes(activeCategory) ? (
            <select aria-label="Batch" value={filters.batch} onChange={(e) => patch({ batch: e.target.value })} className={selectClass}>
              {activeCategory === "traceability" ? null : <option value="">All batches</option>}
              {options.batches.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        {report.note ? <p className="text-xs text-muted-foreground">{report.note}</p> : null}
      </div>

      {error && needsServer ? (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>Couldn't load the latest data: {error}</span>
          <ActionButton icon={RefreshCw} label="Try again" tone="danger" loading={loading} onClick={reload} />
        </div>
      ) : null}

      {/* SUMMARY */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {waiting
          ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : report.summary.map((s) => (
              <article key={s.label} className="flex flex-col gap-2 rounded-xl border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground md:text-sm">{s.label}</p>
                <p className="text-xl leading-tight font-semibold break-words md:text-2xl">{s.value}</p>
              </article>
            ))}
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {(report.columns.length ? report.columns : [{ key: "x", label: "" }]).map((c) => (
                <TableHead key={c.key} className={cn("whitespace-nowrap", "align" in c && c.align === "right" && "text-right")}>
                  {c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {waiting ? (
              [0, 1, 2, 3, 4].map((r) => (
                <TableRow key={r} className="hover:bg-transparent">
                  {report.columns.map((c) => (
                    <TableCell key={c.key}>
                      <Skeleton className="h-4 w-full max-w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : report.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={Math.max(1, report.columns.length)} className="h-32 text-center text-muted-foreground">
                  {report.empty}
                </TableCell>
              </TableRow>
            ) : (
              paged.rows.map((row, i) => (
                <TableRow key={i}>
                  {report.columns.map((c) => (
                    <TableCell key={c.key} className={cn("whitespace-nowrap", c.align === "right" && "text-right tabular-nums")}>
                      {row[c.key] === "" ? <span className="text-muted-foreground">—</span> : row[c.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePager {...paged} />
      </div>
    </div>
  );
}
