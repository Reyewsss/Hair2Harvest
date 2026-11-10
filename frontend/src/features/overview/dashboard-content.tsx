import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Calendar,
  ChevronDown,
  ChevronRight,
  Cog,
  Download,
  FlaskConical,
  Layers,
  Search,
  Shield,
  TrendingUp,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLink } from "../dashboard-shell/components/navigation.tsx";
import { Button, buttonVariants } from "@/shared/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table.tsx";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/shared/ui/input-group.tsx";
import {
  batchTemperature,
  dateRangeOptions,
  metricsByRange,
  roleConfig,
  streamTables,
  volumeByRange,
  type ChartSeries,
  type DateRange,
  type MachineState,
  type MetricId,
  type MetricCard,
  type Role,
  type StreamTable,
} from "./data/overview-data.tsx";
import { auditApi, type AuditEntry } from "@/features/audit/audit-api";
import { useAuth } from "@/features/auth/context/auth-context"; // 👈 NEW

export function DashboardContent({ role = "admin" }: { role?: Role }) {
  const { user } = useAuth(); // 👈 NEW
  const effectiveRole = (user?.role ?? role) as Role; // 👈 NEW: use real role
  const [dateRange, setDateRange] = useState<DateRange>("last-7-days");
  const config = roleConfig[effectiveRole];

  const charts: ChartSeries[] = config.charts.map((id) =>
    id === "volume" ? volumeByRange[dateRange] : batchTemperature,
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pt-8 pb-10 md:px-6">
      <OverviewSection
        roleLabel={config.label}
        metrics={config.metrics.map((id) => metricsByRange[dateRange][id])}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />
      <TrendsSection charts={charts} />
      <StreamSection table={streamTables[config.table]} />
      {/* 👇 Audit trail only for admins */}
      {effectiveRole === "admin" ? <AuditSection /> : null}
    </div>
  );
}

function OverviewSection({
  roleLabel,
  metrics,
  dateRange,
  onDateRangeChange,
}: {
  roleLabel: string;
  metrics: MetricCard[];
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}) {
  const rangeLabel = dateRangeOptions.find(
    (option) => option.value === dateRange,
  )?.label;

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Operations Overview</h1>
          <p className="text-lg text-muted-foreground">
            {roleLabel} view of suppliers, pickups, batches and lab activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              type="button"
              className={buttonVariants({
                variant: "secondary",
                className: "h-10 gap-2 px-3.5",
              })}
            >
              <Calendar className="size-5" />
              {rangeLabel}
              <ChevronDown className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              collisionPadding={16}
              className="astrix-dashboard min-w-40"
            >
              <DropdownMenuRadioGroup
                value={dateRange}
                onValueChange={(value) => onDateRangeChange(value as DateRange)}
              >
                {dateRangeOptions.map((option) => (
                  <DropdownMenuRadioItem
                    key={option.value}
                    value={option.value}
                    className="font-normal text-muted-foreground data-[state=checked]:font-medium data-[state=checked]:text-foreground"
                  >
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button type="button" className="h-10 gap-1 px-3.5">
            Export
            <Download className="size-5" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <MetricCardItem key={metric.id} metric={metric} />
        ))}
      </div>
    </section>
  );
}

const metricIcons: Record<MetricId, LucideIcon> = {
  suppliers: Users,
  pickups: Truck,
  batches: Layers,
  materials: BadgeCheck,
  machines: Cog,
  experiments: FlaskConical,
};

const segmentTone: Record<MachineState, string> = {
  run: "bg-success",
  idle: "bg-muted-foreground/40",
  maint: "bg-destructive",
};

function MetricCardItem({ metric }: { metric: MetricCard }) {
  const Icon = metricIcons[metric.id];

  return (
    <article className="rounded-xl border bg-card p-3 md:p-4">
      <div className="flex flex-col gap-5 md:gap-8">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex size-7 items-center justify-center rounded-lg border md:size-8">
            <Icon className="size-3.5 md:size-4" />
          </div>
          <p className="text-xs font-medium text-muted-foreground md:text-sm">
            {metric.label}
          </p>
        </div>

        <div className="flex flex-col gap-2 md:gap-3">
          <p className="text-[1.625rem] leading-none font-semibold md:text-[2rem]">
            {metric.value}
          </p>

          {metric.trend ? (
            <div className="flex items-center gap-1">
              {metric.trend.tone === "positive" ? (
                <span className="inline-flex items-center gap-1 rounded-xl bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                  <TrendingUp className="size-3" />
                  {metric.trend.value}
                </span>
              ) : (
                <span className="text-xs font-medium text-primary">
                  {metric.trend.value}
                </span>
              )}
              <span className="text-xs font-medium text-muted-foreground">
                {metric.trend.label}
              </span>
            </div>
          ) : null}

          {metric.footnote ? (
            <p className="text-xs font-medium text-muted-foreground">
              {metric.footnote}
            </p>
          ) : null}

          {metric.progress !== undefined ? (
            <div
              role="progressbar"
              aria-valuenow={metric.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 overflow-hidden rounded-full bg-secondary"
            >
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${metric.progress}%` }}
              />
            </div>
          ) : null}

          {metric.segments ? (
            <div className="flex gap-1" aria-label="Machine states">
              {metric.segments.map((state, i) => (
                <span
                  key={i}
                  title={`Machine ${i + 1}: ${state}`}
                  className={`h-1.5 flex-1 rounded-full ${segmentTone[state]}`}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function TrendsSection({ charts }: { charts: ChartSeries[] }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-medium">Trends</h2>
      <div
        className={`grid gap-4 ${charts.length > 1 ? "lg:grid-cols-2" : ""}`}
      >
        {charts.map((chart) => (
          <TrendCard key={chart.title} chart={chart} />
        ))}
      </div>
    </section>
  );
}

function TrendCard({ chart }: { chart: ChartSeries }) {
  const { data, yMin, yMax, ticks, band, type, unit } = chart;
  const n = data.length;
  const pct = (v: number) => ((v - yMin) / (yMax - yMin)) * 100;
  const x = (i: number) => ((i + 0.5) / n) * 100;
  const cols = { gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` };
  const linePoints = data
    .map((d, i) => `${x(i)},${100 - pct(d.value)}`)
    .join(" ");

  return (
    <article className="rounded-xl border bg-card p-4 md:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-medium">{chart.title}</h3>
            {chart.live ? (
              <span className="relative flex size-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-60" />
                <span className="relative size-full rounded-full bg-success" />
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">{chart.subtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-xl leading-none font-semibold tabular-nums">
            {chart.summary}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {chart.summaryNote}
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <div className="relative h-52 w-10 shrink-0">
          {ticks.map((t) => (
            <span
              key={t}
              style={{ bottom: `${pct(t)}%` }}
              className="absolute right-0 translate-y-1/2 text-xs tabular-nums text-muted-foreground"
            >
              {t.toLocaleString()}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-52">
            {ticks.map((t) => (
              <div
                key={t}
                style={{ bottom: `${pct(t)}%` }}
                className="absolute inset-x-0 border-t border-border"
              />
            ))}

            {band ? (
              <div
                className="absolute inset-x-0 bg-success/10"
                style={{
                  bottom: `${pct(band.min)}%`,
                  height: `${pct(band.max) - pct(band.min)}%`,
                }}
              >
                <span className="absolute top-1 right-1 text-[11px] text-success">
                  {band.label}
                </span>
              </div>
            ) : null}

            {type === "bar" ? (
              <div
                className="absolute inset-0 grid items-end gap-2 px-1 md:gap-3"
                style={cols}
              >
                {data.map((d) => (
                  <div
                    key={d.label}
                    title={`${d.label}: ${d.value.toLocaleString()} ${unit}`}
                    style={{ height: `${pct(d.value)}%` }}
                    className="rounded-t-md bg-primary transition-opacity hover:opacity-80"
                  />
                ))}
              </div>
            ) : (
              <>
                <svg
                  className="absolute inset-0 size-full text-primary"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <polygon
                    points={`${x(0)},100 ${linePoints} ${x(n - 1)},100`}
                    fill="currentColor"
                    fillOpacity="0.1"
                  />
                  <polyline
                    points={linePoints}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                {data.map((d, i) => (
                  <span
                    key={d.label}
                    title={`${d.label}: ${d.value} ${unit}`}
                    style={{ left: `${x(i)}%`, bottom: `${pct(d.value)}%` }}
                    className="absolute size-2.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-primary ring-2 ring-card"
                  />
                ))}
              </>
            )}
          </div>

          <div
            className="mt-2 grid text-center text-xs text-muted-foreground"
            style={cols}
          >
            {data.map((d, i) => (
              <span
                key={d.label}
                className={type === "line" && n > 7 && i % 2 ? "invisible" : ""}
              >
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function StreamSection({ table }: { table: StreamTable }) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-lg font-medium">{table.title}</h2>
          <p className="text-sm text-muted-foreground">{table.description}</p>
        </div>
        <Button
          variant="secondary"
          className="gap-1 pl-3 pr-2"
          render={<DashboardLink href={table.href} />}
        >
          See all
          <ChevronRight className="size-5" />
        </Button>
      </div>

      <Table className="min-w-215">
        <colgroup>
          {table.columns.map((col) => (
            <col key={col.key} className={col.width} />
          ))}
        </colgroup>
        <TableHeader>
          <TableRow>
            {table.columns.map((col) => (
              <TableHead key={col.key}>{col.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.rows.map((row) => (
            <StreamRow key={row.id} row={row} columns={table.columns} />
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

const statusTone: Record<string, string> = {
  Scheduled: "bg-secondary text-secondary-foreground",
  "Due today": "bg-primary/10 text-primary",
  Overdue: "bg-destructive/10 text-destructive",
  Completed: "bg-success/10 text-success",
  Running: "bg-primary/10 text-primary",
  "QC pending": "bg-secondary text-secondary-foreground",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-xl px-2 py-0.5 text-xs font-medium ${
        statusTone[status] ?? "bg-secondary text-secondary-foreground"
      }`}
    >
      {status}
    </span>
  );
}

function StreamRow({
  row,
  columns,
}: {
  row: Record<string, string>;
  columns: StreamTable["columns"];
}) {
  return (
    <TableRow>
      {columns.map((col) => {
        const value = row[col.key];
        switch (col.variant) {
          case "primary":
            return (
              <TableCell key={col.key} className="whitespace-normal">
                <div className="space-y-1">
                  <p className="truncate font-medium">{value}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.id}
                  </p>
                </div>
              </TableCell>
            );
          case "status":
            return (
              <TableCell key={col.key}>
                <StatusBadge status={value} />
              </TableCell>
            );
          case "number":
            return (
              <TableCell key={col.key} className="tabular-nums">
                {value}
              </TableCell>
            );
          case "muted":
            return (
              <TableCell key={col.key} className="text-muted-foreground">
                {value}
              </TableCell>
            );
          default:
            return <TableCell key={col.key}>{value}</TableCell>;
        }
      })}
    </TableRow>
  );
}

/* ---------- Audit Trail Section ---------- */

const actionTone: Record<string, string> = {
  create: "bg-success/10 text-success",
  update: "bg-primary/10 text-primary",
  delete: "bg-destructive/10 text-destructive",
  login: "bg-secondary text-secondary-foreground",
  approve: "bg-success/10 text-success",
  reject: "bg-destructive/10 text-destructive",
  command: "bg-primary/10 text-primary",
  "login-failed": "bg-destructive/10 text-destructive",
  "login-otp-sent": "bg-secondary text-secondary-foreground",
  "otp-failed": "bg-destructive/10 text-destructive",
  "otp-resent": "bg-secondary text-secondary-foreground",
  "password-reset": "bg-primary/10 text-primary",
  "password-reset-requested": "bg-secondary text-secondary-foreground",
  logout: "bg-secondary text-secondary-foreground",
};

const AUDIT_MODULES = [
  "all",
  "auth",
  "accounts",
  "suppliers",
  "pickups",
  "batches",
  "machines",
  "thresholds",
];

function AuditSection() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [module, setModule] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await auditApi.list({
        search: search.trim() || undefined,
        module: module !== "all" ? module : undefined,
        from: from || undefined,
        to: to || undefined,
        limit: 100,
      });
      setEntries(res.entries);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load audit trail");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [search, module, from, to]);

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h2 className="flex items-center gap-2 text-lg font-medium">
            <Shield className="size-5 text-primary" />
            Audit Trail
          </h2>
          <p className="text-sm text-muted-foreground">
            Immutable record of every action. Entries cannot be edited or
            deleted.
          </p>
        </div>
        <Button
          type="button"
          className="h-10 gap-1 px-3.5"
          onClick={() => {
            auditApi.exportCsv();
            toast.success("Audit trail exported");
          }}
        >
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
        {/* 👈 Left: search */}
        <InputGroup className="h-11 w-full border-none bg-secondary px-3 py-1 md:max-w-sm">
          <InputGroupAddon className="pl-0">
            <Search className="size-3.5 text-input-addon-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            className="h-full p-0 px-1.5!"
            aria-label="Search audit"
            placeholder="Search by user, item, or remarks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>

        {/* 👈 Right: filters grouped together */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <select
            value={module}
            onChange={(e) => setModule(e.target.value)}
            className="h-11 rounded-lg bg-secondary px-3 text-sm outline-none"
          >
            {AUDIT_MODULES.map((m) => (
              <option key={m} value={m}>
                {m === "all" ? "All modules" : m}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-11 rounded-lg bg-secondary px-3 text-sm outline-none"
            title="From date"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-11 rounded-lg bg-secondary px-3 text-sm outline-none"
            title="To date"
          />
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <Table className="min-w-215">
          <colgroup>
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[26%]" />
            <col className="w-[26%]" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  Loading audit trail...
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  No audit entries match your filters.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry._id}>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {new Date(entry.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="font-medium">{entry.user}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">
                    {entry.module}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-xl px-2 py-0.5 text-xs font-medium capitalize ${
                        actionTone[entry.action] ??
                        "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {entry.action}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    {entry.item}
                  </TableCell>
                  <TableCell className="whitespace-normal text-muted-foreground">
                    {entry.remarks || "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
