import { isAdminRole } from "@/features/auth/permissions";
import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Calendar,
  ChevronDown,
  ChevronLeft,
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
import { scrollToElementById } from "../dashboard-shell/components/notification-modal";
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
  dateRangeOptions,
  roleConfig,
  streamTables,
  type ChartSeries,
  type DateRange,
  type MachineState,
  type MetricId,
  type MetricCard,
  type Role,
  type StreamTable,
} from "./data/overview-data.tsx";
import { auditApi, type AuditEntry } from "@/features/audit/audit-api";
import { useAuth } from "@/features/auth/context/auth-context";
import { api } from "@/lib/api";
import { pickupsApi } from "@/features/suppliers/suppliers-api";
import {
  formatPickupDate,
  formatPickupTime,
} from "@/features/suppliers/components/pickup-ui";
import { AnimatedNumber } from "@/shared/ui/animated-number";
import { Skeleton } from "@/shared/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { ListSkeleton, TableRowsSkeleton } from "@/shared/ui/page-skeleton";
import { KG_PER_SACK, useSimulation } from "@/features/simulation/sim-store";

const PAGE_SIZE = 10;

interface OverviewData {
  suppliers: { total: number; approved: number; pending: number };
  pickups: {
    active: number;
    dueToday: number;
    overdue: number;
    delivered: number;
  };
  staff: { total: number };
  trend: { label: string; value: number }[];
}

export function DashboardContent({ role = "admin" }: { role?: Role }) {
  const { user } = useAuth();
  // Normalise the role ("Staff" → "staff") so it matches the roleConfig keys.
  const userRole = String(user?.role ?? role).toLowerCase() as Role;
  const hasConfig = userRole in roleConfig;
  const effectiveRole: Role = hasConfig ? userRole : role;
  const [dateRange, setDateRange] = useState<DateRange>("last-7-days");
  // Roles without their own entry in roleConfig fall back to the default view
  // instead of crashing. Add the role to roleConfig in overview-data.tsx to customise it.
  const config = roleConfig[effectiveRole] ?? Object.values(roleConfig)[0];

  useEffect(() => {
    if (user?.role && !hasConfig) {
      console.warn(
        `[dashboard] No roleConfig entry for role "${user.role}". Using the "${effectiveRole}" view.`,
      );
    }
  }, [user?.role, hasConfig, effectiveRole]);

  const [data, setData] = useState<OverviewData | null>(null);
  const sim = useSimulation();
  const activeBatches = sim.batches.filter((b) => b.machineId && b.stage !== "completed");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<OverviewData>("/overview")
      .then((res) => setData(res))
      .catch(() => toast.error("Failed to load dashboard metrics."))
      .finally(() => setLoading(false));
  }, []);

  const machineLines = sim.machines
    .map((m) => `
${m.name ?? m.id}: ${!m.online ? "offline" : m.motor}`)
    .join("");

  const metricsMap: Record<MetricId, MetricCard> = {
    suppliers: {
      id: "suppliers",
      label: "Suppliers",
      value: loading ? "..." : String(data?.suppliers.total ?? 0),
      footnote: loading
        ? undefined
        : `${data?.suppliers.pending ?? 0} pending review`,
      hint: loading
        ? undefined
        : `Every registered shop.
${data?.suppliers.approved ?? 0} approved and enrolled
${data?.suppliers.pending ?? 0} waiting for review`,
    },
    pickups: {
      id: "pickups",
      label: "Active Pickups",
      value: loading ? "..." : String(data?.pickups.active ?? 0),
      footnote: loading
        ? undefined
        : `${data?.pickups.dueToday ?? 0} due today, ${data?.pickups.overdue ?? 0} overdue`,
      hint: loading
        ? undefined
        : `Pickups that are scheduled or collected but not yet delivered.
${data?.pickups.dueToday ?? 0} due today
${data?.pickups.overdue ?? 0} overdue`,
    },
    batches: {
      id: "batches",
      label: "Active Batches",
      value: String(activeBatches.length),
      footnote: activeBatches.length
        ? `${activeBatches.filter((b) => b.stage === "composting").length} composting · test machines`
        : "No batch running",
      hint: `Composting batches currently in progress on the test machines.
${activeBatches.length} active, ${activeBatches.filter((b) => b.stage === "composting").length} composting`,
    },
    materials: {
      id: "materials",
      label: "Approved Materials",
      value: loading ? "..." : String(data?.suppliers.approved ?? 0),
      trend: { tone: "positive", value: "+2", label: "this week" },
      hint: "Shops approved to supply hair waste. Only approved shops can be scheduled for pickups.",
    },
    machines: {
      id: "machines",
      label: "Machine Status",
      value: `${sim.machines.filter((m) => m.motor === "running" || m.motor === "mixing").length} of ${sim.machines.length}`,
      footnote: (() => {
        const faults = sim.machines.filter((m) => m.motor === "fault").length;
        return faults ? `${faults} fault${faults === 1 ? "" : "s"} · running` : "running (test machines)";
      })(),
      hint: `Machines running or mixing right now (test machines).${machineLines}`,
      segments: sim.machines.map((m): MachineState =>
        m.motor === "fault" || !m.online ? "maint" : m.motor === "stopped" ? "idle" : "run",
      ),
    },
    experiments: {
      id: "experiments",
      label: "Experiment Progress",
      value: "0%",
      footnote: "No data yet",
      hint: "Overall progress of the composting experiment. No experiment data has been recorded yet.",
      progress: 0,
    },
  };

  // Collected volume: sacks received into inventory per day (from the backend).
  const trend = data?.trend ?? [];
  const totalSacks = trend.reduce((sum, d) => sum + d.value, 0);
  const volMax = niceMax(Math.max(4, ...trend.map((d) => d.value)));
  const volumeChart: ChartSeries = {
    title: "Collected Volume",
    subtitle: "Sacks received per day, last 7 days",
    summary: loading ? "..." : `${totalSacks.toLocaleString()} sack${totalSacks === 1 ? "" : "s"}`,
    summaryNote: loading ? "total collected" : `≈ ${(totalSacks * KG_PER_SACK).toLocaleString()} kg collected`,
    type: "bar",
    unit: "sacks",
    yMin: 0,
    yMax: volMax,
    ticks: [0, volMax / 4, volMax / 2, (volMax * 3) / 4, volMax],
    data: trend,
  };

  // Batch temperature: live readings from the machine running the active batch.
  const tempBatch =
    activeBatches.find((b) => b.stage === "composting") ?? activeBatches[0];
  const tempMachine = sim.machines.find((m) => m.id === tempBatch?.machineId);
  const temperatureChart = buildTemperatureChart(tempBatch?.id, tempMachine, sim.clock, sim.speed);

  const charts: ChartSeries[] = config.charts.map((id) =>
    id === "volume" ? volumeChart : temperatureChart,
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pt-8 pb-10 md:px-6">
      <OverviewSection
        roleLabel={config.label}
        metrics={config.metrics.map((id) => metricsMap[id])}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />
      <TrendsSection charts={charts} />
      {streamTables[config.table] ? (
        isPickupsTable(streamTables[config.table]) ? (
          <PickupsDueSection table={streamTables[config.table]} />
        ) : (
          <StreamSection table={streamTables[config.table]} />
        )
      ) : null}
      {isAdminRole(user?.role) ? <AuditSection /> : null}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Overview Section (Metrics)
 * ───────────────────────────────────────────────────────────────────── */

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
          {/* <Button type="button" className="h-10 gap-1 px-3.5">
            Export
            <Download className="size-5" />
          </Button> */}
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

  const card = (
    <article
      tabIndex={metric.hint ? 0 : undefined}
      className="rounded-xl border bg-card p-3 md:p-4 min-w-0 transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
    >
      <div className="flex flex-col gap-5 md:gap-8">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex size-7 items-center justify-center rounded-lg border md:size-8">
            <Icon className="size-3.5 md:size-4" />
          </div>
          <p className="text-xs font-medium text-muted-foreground md:text-sm">
            {metric.label}
          </p>
        </div>

        <div className="flex flex-col gap-2 md:gap-3 break-words min-w-0">
          <p className="text-[1.625rem] leading-none font-semibold md:text-[2rem]">
            {metric.value === "..." ? <Skeleton className="h-8 w-20 md:h-9" /> : <AnimatedNumber value={metric.value} />}
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
            <p className="text-xs font-medium text-muted-foreground break-all">
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

          {metric.segments && metric.segments.length > 0 ? (
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

  if (!metric.hint) return card;
  return (
    <Tooltip>
      <TooltipTrigger render={card} />
      <TooltipContent side="bottom" className="max-w-64 whitespace-pre-line text-left">
        {metric.hint}
      </TooltipContent>
    </Tooltip>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Trends Section (Charts)
 * ───────────────────────────────────────────────────────────────────── */

/** Rounds a chart maximum up to 1/2/5 × 10ⁿ, divisible into 4 even ticks. */
function niceMax(v: number) {
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 4 ? 4 : n <= 8 ? 8 : 10;
  return m * pow;
}

const TEMP_POINTS = 12;

function buildTemperatureChart(
  batchId: string | undefined,
  machine: { name: string; temp: number; tempHistory: number[]; online: boolean } | undefined,
  clock: number,
  speed: number,
): ChartSeries {
  const base = {
    title: "Batch Temperature",
    type: "line" as const,
    unit: "°C",
    band: { min: 55, max: 65, label: "Target 55–65 °C" },
  };
  if (!batchId || !machine) {
    return {
      ...base,
      subtitle: "No active batch. Start one in Compost.",
      summary: "—",
      summaryNote: "current",
      yMin: 20,
      yMax: 80,
      ticks: [20, 40, 60, 80],
      data: [],
    };
  }
  // Evenly sample the machine's recent readings (one per real second of the sim).
  const hist = machine.tempHistory;
  const every = Math.max(1, Math.floor(hist.length / TEMP_POINTS));
  const idx: number[] = [];
  for (let i = hist.length - 1; i >= 0 && idx.length < TEMP_POINTS; i -= every) idx.unshift(i);
  const data = idx.map((i) => {
    const t = new Date(clock - (hist.length - 1 - i) * speed * 1000);
    return {
      label: t.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
      value: hist[i],
    };
  });
  const values = data.map((d) => d.value);
  const yMin = Math.min(50, Math.floor((Math.min(...values) - 2) / 10) * 10);
  const yMax = Math.max(80, Math.ceil((Math.max(...values) + 2) / 10) * 10);
  const step = (yMax - yMin) / 3;
  return {
    ...base,
    subtitle: `Batch ${batchId} on ${machine.name}${machine.online ? "" : " · sensor offline"}`,
    summary: `${machine.temp.toFixed(1)} °C`,
    summaryNote: "current",
    live: machine.online,
    yMin,
    yMax,
    ticks: [yMin, yMin + step, yMin + 2 * step, yMax].map((t) => Math.round(t)),
    data,
  };
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
            <AnimatedNumber value={chart.summary} />
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {chart.summaryNote}
          </p>
        </div>
      </div>

      {n === 0 ? (
        <div className="mt-6 grid h-52 place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">
          No readings yet
        </div>
      ) : (
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
                {data.map((d, i) => (
                  <div
                    key={i}
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
                    key={i}
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
                key={i}
                className={type === "line" && n > 7 && i % 2 ? "invisible" : ""}
              >
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>
      )}
    </article>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Stream Section (Recent Activity Table)
 * ───────────────────────────────────────────────────────────────────── */

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
          nativeButton={false}
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

/* ─────────────────────────────────────────────────────────────────────
 * Pickups Due (live data)
 * ───────────────────────────────────────────────────────────────────── */

/** The static stream table that lists pickups gets replaced by live data. */
function isPickupsTable(table: StreamTable) {
  return /pickup/i.test(`${table.title} ${table.href}`);
}

function localToday() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function PickupsDueSection({ table }: { table: StreamTable }) {
  const [pickups, setPickups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      pickupsApi
        .getOldSchedule("", "active")
        .then((res: any) => {
          if (cancelled) return;
          setPickups(Array.isArray(res) ? res : (res?.pickups ?? []));
          setFailed(false);
        })
        .catch(() => !cancelled && setFailed(true))
        .finally(() => !cancelled && setLoading(false));

    void load();
    // Keep the list fresh when returning to the tab and every minute.
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, []);

  const today = localToday();
  const due = pickups
    .filter(
      (p) =>
        p.status === "scheduled" &&
        (p.scheduledDate ?? "").slice(0, 10) <= today,
    )
    .sort((a, b) =>
      `${a.scheduledDate?.slice(0, 10)} ${a.scheduledTime ?? ""}`.localeCompare(
        `${b.scheduledDate?.slice(0, 10)} ${b.scheduledTime ?? ""}`,
      ),
    );

  const shown = due.slice(0, 6);
  const emptyText = loading
    ? <ListSkeleton rows={3} />
    : failed
      ? "Couldn't load pickups."
      : "No pickups due. You're all caught up.";

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-lg font-medium">{table.title}</h2>
          <p className="text-sm text-muted-foreground">
            {loading
              ? table.description
              : `${due.length} pickup${due.length === 1 ? "" : "s"} due today or overdue.`}
          </p>
        </div>
        <Button
          variant="secondary"
          className="gap-1 pl-3 pr-2"
          render={<DashboardLink href={table.href} />}
          nativeButton={false}
        >
          See all
          <ChevronRight className="size-5" />
        </Button>
      </div>

      <Table className="min-w-215">
        <TableHeader>
          <TableRow>
            <TableHead>Supplier</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Assigned to</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="px-6! py-10! text-center text-muted-foreground"
              >
                {emptyText}
              </TableCell>
            </TableRow>
          ) : (
            shown.map((p) => {
              const overdue = (p.scheduledDate ?? "").slice(0, 10) < today;
              const shop =
                p.supplierId && typeof p.supplierId === "object"
                  ? p.supplierId
                  : null;
              const staff =
                p.assignedTo && typeof p.assignedTo === "object"
                  ? p.assignedTo
                  : null;
              return (
                <TableRow key={p._id ?? p.id}>
                  <TableCell className="whitespace-normal">
                    <div className="space-y-1">
                      <p className="truncate font-medium">
                        {shop?.shopName ?? "[deleted supplier]"}
                      </p>
                      {shop?.code ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {shop.code}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatPickupDate(p.scheduledDate, "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatPickupTime(p.scheduledTime)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {staff?.name ?? "Unassigned"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={overdue ? "Overdue" : "Due today"} />
                  </TableCell>
                </TableRow>
              );
            })
          )}
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

/* ─────────────────────────────────────────────────────────────────────
 * Audit Trail Section
 * ───────────────────────────────────────────────────────────────────── */

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
  const [page, setPage] = useState(1);

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
      setPage(1);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load audit trail.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [search, module, from, to]);

  // Arriving from the notification bell's "View all" on another page:
  // scroll once after the first load, then drop the hash so later visits
  // to the Dashboard tab (or filter changes) don't scroll again.
  const hasHandledHashRef = useRef(false);
  useEffect(() => {
    if (loading || hasHandledHashRef.current) return;
    hasHandledHashRef.current = true;
    if (window.location.hash !== "#audit-trail") return;
    scrollToElementById("audit-trail");
    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname + window.location.search,
    );
  }, [loading]);

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedEntries = entries.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <section id="audit-trail" className="flex flex-col gap-5">
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
            toast.success("Audit trail exported.");
          }}
        >
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
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
              <TableRowsSkeleton colSpan={6} rows={5} />
            ) : paginatedEntries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  No audit entries match your filters.
                </TableCell>
              </TableRow>
            ) : (
              paginatedEntries.map((entry) => (
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

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {Math.min(startIndex + 1, entries.length)}–
          {Math.min(startIndex + PAGE_SIZE, entries.length)} of {entries.length}{" "}
          entries
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className="size-10"
            aria-label="Previous page"
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className="size-10"
            aria-label="Next page"
            disabled={currentPage >= totalPages}
            onClick={() => setPage(currentPage + 1)}
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}
