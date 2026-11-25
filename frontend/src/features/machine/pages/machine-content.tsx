import { useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Blend,
  Download,
  Gauge,
  Lock,
  LockOpen,
  Play,
  RotateCcw,
  ShieldAlert,
  Square,
  Thermometer,
  WifiOff,
  Wrench,
  Zap,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { TablePager, usePaged } from "@/shared/ui/table-pager";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { confirm } from "@/shared/ui/modal";
import { showResult } from "@/shared/ui/result-modal";
import { AnimatedNumber } from "@/shared/ui/animated-number";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/context/auth-context";
import { useCan } from "@/features/auth/access";
import { DashboardLink } from "@/features/dashboard-shell/components/navigation";
import { SimControls } from "@/features/simulation/sim-controls";
import { IotDiagram } from "../components/iot-diagram";
import {
  formatDuration,
  batchActivity,
  formatSimTime,
  isStoppedStage,
  sim,
  stageProgress,
  useSimulation,
  type SimMachine,
} from "@/features/simulation/sim-store";

type Health = "optimal" | "warning" | "critical";

const healthOf = (m: SimMachine): Health =>
  m.fault ? "critical" : !m.online || m.temp > 65 || m.lidOpen ? "warning" : "optimal";

const healthTone: Record<Health, string> = {
  optimal: "bg-success/10 text-success",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  critical: "bg-destructive/10 text-destructive",
};

export function MachineContent() {
  const s = useSimulation();
  const { user } = useAuth();
  const canControl = useCan("monitoring:control"); // Staff can only monitor
  const operator = user?.name ?? "Operator";
  const [machineId, setMachineId] = useState(s.machines[0]?.id);
  const m = s.machines.find((x) => x.id === machineId) ?? s.machines[0];
  const sessionsPaged = usePaged(s.sessions); // 10 rows per page
  if (!m) return null;

  const batch = s.batches.find((b) => b.id === m.batchId) ?? null;
  const health = healthOf(m);
  const active = m.motor === "running" || m.motor === "mixing";
  // From sampling onward the machine stays stopped.
  const stoppedForSampling = !!batch && isStoppedStage(batch.stage);
  const activity = batch ? batchActivity(batch, m) : null;

  const ask = (title: string, description: string, label: string, run: () => void, done: string) =>
    confirm({
      title,
      description,
      confirmLabel: label,
      cancelLabel: "Cancel",
      onConfirm: () => {
        try {
          run();
          showResult({ type: "success", title: done });
        } catch (err) {
          showResult({ type: "error", title: "Can't do that", message: err instanceof Error ? err.message : "Please try again." });
        }
      },
    });

  const exportCsv = () => {
    const rows = [
      ["Session", "Machine", "Batch", "Start", "End", "Duration", "Avg temp (C)", "Operator"],
      ...s.sessions.map((x) => [
        x.id,
        x.machineId,
        x.batchId ?? "",
        new Date(x.start).toISOString(),
        x.end ? new Date(x.end).toISOString() : "",
        formatDuration((x.end ?? s.clock) - x.start),
        (x.tempSum / Math.max(1, x.samples)).toFixed(1),
        x.operator,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "simulated-machine-sessions.csv" });
    a.click();
    URL.revokeObjectURL(url);
    showResult({ type: "success", title: "Sessions exported" });
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-8 pb-10 md:px-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Machine Control</h1>
          <p className="text-lg text-muted-foreground">Live telemetry and session management</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg bg-secondary p-0.5" role="tablist" aria-label="Test machine">
            {s.machines.map((x) => (
              <button
                key={x.id}
                type="button"
                role="tab"
                aria-selected={x.id === m.id}
                onClick={() => setMachineId(x.id)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  x.id === m.id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "size-2 rounded-full",
                    healthOf(x) === "critical" ? "bg-destructive" : healthOf(x) === "warning" ? "bg-amber-500" : "bg-success",
                  )}
                />
                {x.id}
              </button>
            ))}
          </div>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", healthTone[health])}>
            <Activity className="size-3.5" /> {health.toUpperCase()}
          </span>
        </div>
      </div>

      <SimControls />

      {/* ALERTS */}
      {m.fault ? (
        <Alert tone="critical" icon={<AlertTriangle className="size-5" />} title="Machine fault" text={m.fault}>
          {canControl ? (
            <Button type="button" variant="outline" className="h-9 gap-1.5" onClick={() => sim.resetFault(m.id)}>
              <Wrench className="size-4" /> Reset fault
            </Button>
          ) : null}
        </Alert>
      ) : null}
      {!m.online ? (
        <Alert tone="warning" icon={<WifiOff className="size-5" />} title="Sensor offline" text="Temperature readings are frozen at the last value.">
          {canControl ? (
            <Button type="button" variant="outline" className="h-9 gap-1.5" onClick={() => sim.resetFault(m.id)}>
              <Wrench className="size-4" /> Reconnect
            </Button>
          ) : null}
        </Alert>
      ) : null}

      {/* CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Core temp"
          icon={<Thermometer />}
          value={<AnimatedNumber value={`${m.temp.toFixed(1)}°C`} duration={600} />}
          valueClass={m.temp > 65 ? "text-destructive" : m.temp >= 55 ? "text-success" : ""}
          note={m.online ? (m.temp >= 55 && m.temp <= 65 ? "In thermophilic range" : "Live from sensor") : "Sensor offline"}
        />
        <Stat
          label="Motor"
          icon={<RotateCcw className={active ? "animate-spin text-primary [animation-duration:2s]" : ""} />}
          value={<span className="capitalize">{m.motor}</span>}
          valueClass={m.motor === "fault" ? "text-destructive" : active ? "text-primary" : ""}
          note={`${m.rpm} rpm`}
        />
        <Stat
          label="Lid"
          icon={m.lidOpen ? <LockOpen /> : <Lock />}
          value={m.lidOpen ? "Open" : "Closed"}
          valueClass={m.lidOpen ? "text-amber-600 dark:text-amber-400" : "text-success"}
          note={m.lidOpen ? "Motor locked out" : "Safety lock active"}
        />
        <Stat
          label="Controller"
          icon={<Zap />}
          value={m.online ? "Online" : "Offline"}
          valueClass={m.online ? "text-primary" : "text-destructive"}
          note={<>Simulated · <AnimatedNumber value={`${m.powerKw.toFixed(2)} kW`} duration={400} /></>}
        />
      </div>

      {/* CHART + BATCH */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border bg-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-medium">Core temperature</h2>
              <p className="text-xs text-muted-foreground">Last {m.tempHistory.length} readings · target 55–65 °C</p>
            </div>
            <span className="text-xl font-semibold tabular-nums">{m.temp.toFixed(1)}°C</span>
          </div>
          <TempChart points={m.tempHistory} />
        </section>

        <section className="flex flex-col gap-3 rounded-xl border bg-card p-5">
          <h2 className="font-medium">Loaded batch</h2>
          {batch ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">{batch.id}</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium capitalize text-primary">{batch.stage}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${stageProgress(batch, s.clock) * 100}%` }} />
              </div>
              {activity && activity !== "running" && activity !== "done" ? (
                <p className="rounded-md bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-400">
                  {activity === "waiting-machine"
                    ? "Preparation is done. Start the motor to begin composting."
                    : activity === "paused"
                      ? `Paused: ${batch.stage} only advances while the motor is running.`
                      : "Sampling: the machine is stopped."}
                </p>
              ) : null}
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <Mini label="Weight" value={`${batch.weight.toFixed(1)} of ${batch.initialWeight} kg`} />
                <Mini label="Moisture" value={`${batch.moisture.toFixed(1)}%`} />
                <Mini label="Started" value={formatSimTime(batch.createdAt)} />
                <Mini label="Operator" value={batch.operator} />
              </dl>
              <Button render={<DashboardLink href="/composting" />} nativeButton={false} variant="outline" className="mt-auto h-9">
                Open in Compost
              </Button>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center text-sm text-muted-foreground">
              No batch loaded.
              <Button render={<DashboardLink href="/composting" />} nativeButton={false} variant="outline" className="h-9">
                Start a test batch
              </Button>
            </div>
          )}
        </section>
      </div>

      {/* CONTROLS (admins and operators; Staff only monitor) */}
      {!canControl ? (
        <p className="rounded-xl border border-dashed bg-card px-5 py-4 text-sm text-muted-foreground">
          View only: starting, stopping, mixing and fault testing are for admins and operators.
        </p>
      ) : (
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex flex-col gap-4 rounded-xl border bg-card p-5">
          <div>
            <h2 className="font-medium">Controls</h2>
            <p className="text-sm text-muted-foreground">Commands are confirmed and logged against your name.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="h-10 gap-2"
              disabled={active || !!m.fault || m.lidOpen || stoppedForSampling}
              title={stoppedForSampling ? "The machine stays stopped from sampling onward" : undefined}
              onClick={() => ask(`Start ${m.id}?`, "The drum starts turning slowly to aerate the batch.", "Start motor", () => sim.startMotor(m.id, operator), "Motor started")}
            >
              <Play className="size-4" /> Start motor
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-10 gap-2"
              disabled={!active}
              onClick={() => ask(`Stop ${m.id}?`, "Without aeration the batch will slowly cool.", "Stop motor", () => sim.stopMotor(m.id, operator), "Motor stopped")}
            >
              <Square className="size-4" /> Stop motor
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-10 gap-2"
              disabled={!!m.fault || m.lidOpen || m.motor === "mixing" || stoppedForSampling}
              title={stoppedForSampling ? "The machine stays stopped from sampling onward" : undefined}
              onClick={() => ask(`Run a mixing cycle on ${m.id}?`, "30 simulated minutes of fast turning. Cools the pile and releases moisture.", "Run mixing", () => sim.mix(m.id, operator), "Mixing cycle started")}
            >
              <Blend className="size-4" /> Mixing cycle
            </Button>
            <Button type="button" variant="outline" className="h-10 gap-2" onClick={() => sim.setLid(m.id, !m.lidOpen)}>
              {m.lidOpen ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
              {m.lidOpen ? "Close lid" : "Open lid"}
            </Button>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-xl border border-dashed bg-card p-5">
          <div>
            <h2 className="flex items-center gap-2 font-medium">
              <ShieldAlert className="size-4" /> Fault testing
            </h2>
            <p className="text-sm text-muted-foreground">Trigger failures to check the alarms and interlocks.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="h-10 gap-2" onClick={() => sim.injectFault(m.id, "overheat")}>
              <Thermometer className="size-4" /> Overheat
            </Button>
            <Button type="button" variant="outline" className="h-10 gap-2" disabled={!active} onClick={() => sim.injectFault(m.id, "lid")}>
              <LockOpen className="size-4" /> Open lid while running
            </Button>
            <Button type="button" variant="outline" className="h-10 gap-2" disabled={!m.online} onClick={() => sim.injectFault(m.id, "sensor")}>
              <WifiOff className="size-4" /> Sensor dropout
            </Button>
            <Button type="button" variant="ghost" className="h-10 gap-2" disabled={!m.fault && m.online} onClick={() => sim.resetFault(m.id)}>
              <Wrench className="size-4" /> Clear faults
            </Button>
          </div>
        </section>
      </div>
      )}

      {/* IOT WIRING MODEL */}
      <IotDiagram machine={m} batch={batch} running={s.running} clock={s.clock} readOnly={!canControl} />

      {/* SESSIONS */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-medium">Session history</h2>
            <p className="text-sm text-muted-foreground">Every motor run on the test machines.</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={exportCsv} disabled={!s.sessions.length}>
            <Download className="size-4" /> Export CSV
          </Button>
        </div>
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Machine</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Avg temp</TableHead>
                <TableHead>Operator</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10! text-center text-muted-foreground">
                    No sessions yet. Start a motor to record one.
                  </TableCell>
                </TableRow>
              ) : (
                sessionsPaged.rows.map((x) => (
                  <TableRow key={x.id}>
                    <TableCell className="font-medium">{x.id}</TableCell>
                    <TableCell>{x.machineId}</TableCell>
                    <TableCell>{x.batchId ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatSimTime(x.start)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {x.end ? formatSimTime(x.end) : <span className="font-medium text-success">Active</span>}
                    </TableCell>
                    <TableCell className="tabular-nums">{formatDuration((x.end ?? s.clock) - x.start)}</TableCell>
                    <TableCell className="tabular-nums">{(x.tempSum / Math.max(1, x.samples)).toFixed(1)}°C</TableCell>
                    <TableCell>{x.operator}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePager {...sessionsPaged} />
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  icon,
  value,
  valueClass,
  note,
}: {
  label: string;
  icon: ReactNode;
  value: ReactNode;
  valueClass?: string;
  note: ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-4 flex items-center justify-between text-muted-foreground [&_svg]:size-4">
        <p className="text-sm font-medium">{label}</p>
        {icon}
      </div>
      <p className={cn("text-3xl font-bold", valueClass)}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}

function Alert({
  tone,
  icon,
  title,
  text,
  children,
}: {
  tone: "critical" | "warning";
  icon: ReactNode;
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border p-4",
        tone === "critical"
          ? "border-destructive/20 bg-destructive/10 text-destructive"
          : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
      )}
    >
      {icon}
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="text-sm">{text}</p>
      </div>
      {children}
    </div>
  );
}

/** Line chart of recent core temperatures with the 55–65 °C target band and 72 °C cut-off. */
function TempChart({ points }: { points: number[] }) {
  const W = 600;
  const H = 180;
  const lo = 20;
  const hi = 80;
  const y = (v: number) => H - ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * H;
  if (points.length < 2) {
    return (
      <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
        <Gauge className="mr-2 size-4" /> Collecting readings…
      </div>
    );
  }
  const step = W / (points.length - 1);
  const line = points.map((v, i) => `${i ? "L" : "M"}${(i * step).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full overflow-visible" preserveAspectRatio="none" role="img" aria-label="Core temperature trend">
      <rect x={0} y={y(65)} width={W} height={y(55) - y(65)} className="fill-success/10" />
      <line x1={0} x2={W} y1={y(72)} y2={y(72)} className="stroke-destructive/60" strokeDasharray="6 6" vectorEffect="non-scaling-stroke" />
      {[30, 50, 70].map((v) => (
        <line key={v} x1={0} x2={W} y1={y(v)} y2={y(v)} className="stroke-border" vectorEffect="non-scaling-stroke" />
      ))}
      <path d={`${line} L${W},${H} L0,${H} Z`} className="fill-primary/10" />
      <path d={line} fill="none" className="stroke-primary" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}
