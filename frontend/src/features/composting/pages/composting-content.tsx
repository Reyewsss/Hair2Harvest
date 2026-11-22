import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity,
  Blend,
  CheckCircle2,
  Droplets,
  History,
  Plus,
  Scale,
  SkipForward,
  Thermometer,
} from "lucide-react";
import { Button } from "@/shared/ui/button.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table.tsx";
import { showResult } from "@/shared/ui/result-modal";
import { AnimatedNumber } from "@/shared/ui/animated-number";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/lib/api";
import { useCan } from "@/features/auth/access";
import { inventoryApi } from "@/features/inventory/inventory-api";
import { LeafLoader } from "@/shared/ui/leaf-loader";
import { useAuth } from "@/features/auth/context/auth-context";
import { DashboardLink } from "@/features/dashboard-shell/components/navigation";
import { SimControls } from "@/features/simulation/sim-controls";
import {
  KG_PER_SACK,
  STAGE_DURATION,
  formatDuration,
  formatSimTime,
  sacksForKg,
  sim,
  stageProgress,
  useSimulation,
  type SimBatch,
} from "@/features/simulation/sim-store";
import { STAGES, mockRecipeVersions } from "../data/composting-data";

const fieldClass = "h-10 w-full rounded-lg border-none bg-secondary px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

export function CompostingContent() {
  const s = useSimulation();
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Raw hair on hand comes from the real inventory (sacks); starting a batch deducts from it.
  const [onHand, setOnHand] = useState<number | null>(null);
  const refreshStock = useCallback(() => {
    inventoryApi.stock().then(setOnHand).catch(() => setOnHand(null));
  }, []);
  useEffect(refreshStock, [refreshStock]);

  const active = s.batches.find((b) => b.id === activeId) ?? s.batches.find((b) => b.stage !== "completed") ?? s.batches[0] ?? null;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-8 pb-10 md:px-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Composting Operations</h1>
          <p className="text-lg text-muted-foreground">Track batch life-cycles and environmental data</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-muted-foreground">Raw hair on hand</p>
            <p className="text-xl font-semibold">
              {onHand === null ? "—" : <AnimatedNumber value={`${onHand} sack${onHand === 1 ? "" : "s"}`} duration={500} />}
            </p>
          </div>
          <Button onClick={() => setCreating((v) => !v)} className="h-10 gap-2">
            <Plus className="size-4" /> New test batch
          </Button>
        </div>
      </div>

      <SimControls />

      {creating ? (
        <CreateBatchForm
          operator={user?.name ?? "Operator"}
          onHand={onHand}
          onDone={(id, remaining) => {
            setCreating(false);
            if (id) setActiveId(id);
            if (remaining !== undefined) setOnHand(remaining);
            else refreshStock();
          }}
        />
      ) : null}

      {active ? <BatchTracker batch={active} clock={s.clock} /> : (
        <div className="rounded-xl border border-dashed py-12 text-center text-muted-foreground">
          No batches yet. Create a test batch to get started.
        </div>
      )}

      {/* HISTORY */}
      <section className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-medium">
          <History className="size-5" /> Batch history
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch</TableHead>
              <TableHead>Machine</TableHead>
              <TableHead>Recipe</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Weight (kg)</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {s.batches.map((b) => (
              <TableRow key={b.id} className={b.id === active?.id ? "bg-muted/50" : ""}>
                <TableCell className="font-medium">{b.id}</TableCell>
                <TableCell>{b.machineId ?? "—"}</TableCell>
                <TableCell>{b.recipe}</TableCell>
                <TableCell className="text-muted-foreground">{formatSimTime(b.createdAt)}</TableCell>
                <TableCell className="tabular-nums">
                  {b.weight.toFixed(1)} / {b.initialWeight} kg
                  {b.sacks ? <span className="text-muted-foreground"> · {b.sacks} sack{b.sacks === 1 ? "" : "s"}</span> : null}
                </TableCell>
                <TableCell>
                  <StageBadge stage={b.stage} />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setActiveId(b.id)}>
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}

function CreateBatchForm({
  operator,
  onHand,
  onDone,
}: {
  operator: string;
  onHand: number | null;
  onDone: (id?: string, remaining?: number) => void;
}) {
  const s = useSimulation();
  const canProcess = useCan("inventory:edit"); // the server enforces the same rule
  const free = s.machines.filter((m) => !m.batchId);
  const [recipe, setRecipe] = useState(mockRecipeVersions[0]);
  const [kgText, setKgText] = useState(String(KG_PER_SACK));
  const [machineId, setMachineId] = useState(free[0]?.id ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const kg = Number(kgText);
  const validKg = Number.isFinite(kg) && kg > 0;
  const sacks = validKg ? sacksForKg(kg) : 0;
  const maxKg = (onHand ?? 0) * KG_PER_SACK;
  const tooMany = onHand !== null && sacks > onHand;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!validKg) return setError("Enter the raw-hair weight in kg.");
    if (tooMany) return setError(`Only ${onHand} sack${onHand === 1 ? "" : "s"} (${maxKg} kg) on hand.`);
    if (!sim.machineFree(machineId)) return setError("That test machine is busy. Pick another one.");
    setError("");
    setBusy(true);
    try {
      const id = sim.nextBatchId();
      // Deduct from the real inventory first; only start the batch if that succeeds.
      const { onHand: remaining } = await inventoryApi.consume(sacks, id, `Simulation test batch on ${machineId}: ${kg} kg`);
      sim.createBatch({ machineId, kg, recipe: recipe.split(" ")[0], operator });
      showResult({
        type: "created",
        title: `Batch ${id} started with ${kg} kg (${sacks} sack${sacks === 1 ? "" : "s"} taken from inventory)`,
      });
      onDone(id, remaining);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border bg-card p-6 shadow-sm animate-in fade-in slide-in-from-top-4">
      <h2 className="mb-1 text-lg font-medium">Start a test batch</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Takes raw-hair sacks out of the real inventory and loads them into a free test machine.
      </p>
      {!canProcess ? (
        <p className="rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground">
          Only an admin or operator can take sacks from inventory to start a batch.
        </p>
      ) : free.length === 0 ? (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          Both test machines are busy. Finish a batch (or use “Next stage”) to free one.
        </p>
      ) : onHand === null ? (
        <LeafLoader label="Checking inventory" />
      ) : onHand < 1 ? (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          No raw hair on hand. Deliver collected pickups to add sacks to inventory.
        </p>
      ) : (
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
          {error ? <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-3">{error}</p> : null}
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Recipe version
            <select className={fieldClass} value={recipe} onChange={(e) => setRecipe(e.target.value)}>
              {mockRecipeVersions.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Raw hair (kg)
            <input
              type="number"
              required
              min={1}
              max={maxKg}
              step={0.1}
              className={cn(fieldClass, tooMany && "ring-2 ring-destructive/40")}
              value={kgText}
              onChange={(e) => setKgText(e.target.value)}
            />
            <span className={cn("text-xs font-normal", tooMany ? "text-destructive" : "text-muted-foreground")}>
              {validKg ? `Deducts ${sacks} sack${sacks === 1 ? "" : "s"} · ` : ""}{onHand} on hand ({maxKg} kg, {KG_PER_SACK} kg/sack)
            </span>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Test machine
            <select className={fieldClass} value={machineId} onChange={(e) => setMachineId(e.target.value)}>
              {free.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap justify-end gap-2 sm:col-span-3">
            <Button type="button" variant="outline" onClick={() => onDone()} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || tooMany || !validKg}>
              {busy ? "Starting…" : validKg ? `Start batch with ${kg} kg` : "Start batch"}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

function BatchTracker({ batch, clock }: { batch: SimBatch; clock: number }) {
  const s = useSimulation();
  const { user } = useAuth();
  const stageIndex = STAGES.indexOf(batch.stage);
  const done = batch.stage === "completed";
  const progress = stageProgress(batch, clock);
  const left = done ? 0 : STAGE_DURATION[batch.stage] * 1000 - (clock - batch.stageStartedAt);
  const machine = s.machines.find((m) => m.id === batch.machineId);
  const lossPct = ((batch.initialWeight - batch.weight) / batch.initialWeight) * 100;
  const moistureTone = batch.moisture < 40 ? "text-amber-600 dark:text-amber-400" : batch.moisture > 70 ? "text-info" : "";

  return (
    <section className="flex flex-col gap-8 rounded-xl border bg-card p-6">
      <div className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            {batch.id} <StageBadge stage={batch.stage} />
          </h2>
          <p className="text-sm text-muted-foreground">
            Operator: {batch.operator} · Machine:{" "}
            {machine ? (
              <DashboardLink href="/machine" className="font-medium text-primary hover:underline">
                {machine.name} ({machine.motor})
              </DashboardLink>
            ) : (
              "released"
            )}
          </p>
          {!done ? (
            <p className="text-xs text-muted-foreground">
              {Math.round(progress * 100)}% through {batch.stage} · next stage in {formatDuration(left)} (sim time)
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-3 gap-6 text-right">
          <Reading icon={<Thermometer />} label="Core temp" value={`${batch.temp.toFixed(1)}°C`} />
          <Reading icon={<Scale />} label="Weight" value={`${batch.weight.toFixed(1)} kg`} note={`−${lossPct.toFixed(1)}%`} />
          <Reading icon={<Droplets />} label="Moisture" value={`${batch.moisture.toFixed(1)}%`} valueClass={moistureTone} note={batch.moisture < 40 ? "Too dry" : batch.moisture > 70 ? "Too wet" : "OK"} />
        </div>
      </div>

      {/* STAGE TIMELINE */}
      <div className="relative flex justify-between">
        <div className="absolute top-3 right-3 left-3 h-1 -translate-y-1/2 rounded-full bg-secondary" />
        <div
          className="absolute top-3 left-3 h-1 -translate-y-1/2 rounded-full bg-primary transition-all duration-700"
          style={{ width: `calc((100% - 1.5rem) * ${(stageIndex + (done ? 0 : progress)) / (STAGES.length - 1)})` }}
        />
        {STAGES.map((stage, i) => {
          const complete = i < stageIndex || done;
          const current = i === stageIndex && !done;
          return (
            <div key={stage} className="relative flex flex-col items-center gap-2">
              <div
                className={cn(
                  "flex size-6 items-center justify-center rounded-full border-2 bg-card",
                  complete && "border-primary bg-primary text-primary-foreground",
                  current && "border-primary ring-4 ring-primary/20",
                  !complete && !current && "border-muted",
                )}
              >
                {complete ? <CheckCircle2 className="size-4" /> : current ? <span className="size-2 animate-pulse rounded-full bg-primary" /> : null}
              </div>
              <span className={cn("text-xs font-medium capitalize", current ? "text-primary" : "text-muted-foreground")}>{stage}</span>
            </div>
          );
        })}
      </div>

      {/* ACTIONS */}
      {!done ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" className="h-9 gap-2" onClick={() => { sim.addWater(batch.id, 5); showResult({ type: "success", title: "Water added" }); }}>
            <Droplets className="size-4" /> Add water (+5%)
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-9 gap-2"
            disabled={!machine || !!machine.fault || machine.lidOpen || machine.motor === "mixing"}
            onClick={() => { sim.mix(machine!.id, user?.name ?? "Operator"); showResult({ type: "success", title: "Mixing cycle started" }); }}
          >
            <Blend className="size-4" /> Turn / mix
          </Button>
          <Button type="button" variant="outline" className="h-9 gap-2" onClick={() => sim.advanceStage(batch.id)}>
            <SkipForward className="size-4" /> Next stage (test)
          </Button>
        </div>
      ) : null}

      {/* LOGS */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 font-medium">
          <Activity className="size-4" /> Environmental logs
        </h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sim time</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Temp (°C)</TableHead>
              <TableHead>Weight (kg)</TableHead>
              <TableHead>Moisture (%)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batch.logs.slice(0, 10).map((log, i) => (
              <TableRow key={`${log.t}-${i}`}>
                <TableCell className="text-muted-foreground">{formatSimTime(log.t)}</TableCell>
                <TableCell className={log.event.startsWith("Sensor") ? "text-muted-foreground" : "font-medium"}>{log.event}</TableCell>
                <TableCell className="tabular-nums">{log.temp?.toFixed(1) ?? "—"}</TableCell>
                <TableCell className="tabular-nums">{log.weight?.toFixed(1) ?? "—"}</TableCell>
                <TableCell className="tabular-nums">{log.moisture?.toFixed(1) ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function Reading({ icon, label, value, note, valueClass }: { icon: ReactNode; label: string; value: string; note?: string; valueClass?: string }) {
  return (
    <div>
      <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground [&_svg]:size-3">
        {icon}
        {label}
      </p>
      <p className={cn("text-lg font-semibold", valueClass)}>
        <AnimatedNumber value={value} duration={500} />
      </p>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}

function StageBadge({ stage }: { stage: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xl px-2 py-0.5 text-xs font-medium capitalize",
        stage === "completed" ? "bg-success/10 text-success" : "bg-primary/10 text-primary",
      )}
    >
      {stage}
    </span>
  );
}
