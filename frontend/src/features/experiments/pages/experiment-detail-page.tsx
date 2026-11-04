import { useState } from "react";
import { ArrowLeft, Camera, Plus, Sprout } from "lucide-react";
import { Button } from "../../../shared/ui/button.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../shared/ui/table.tsx";
import { Field, Pill, fieldClass } from "../../../shared/ui/form-controls.tsx";
import { Textarea } from "../../../shared/ui/textarea.tsx";
import { EmptyRow } from "../../inventory/components/inventory-shared";
import { formatDate } from "../../inventory/data/inventory-data";
import { useDashboardNavigation } from "../../dashboard-shell/components/navigation";
import { batchByCode } from "../../../shared/data/batches";
import { useLabResults } from "../../lab-results/store/lab-results-store";
import { useQuality } from "../../quality/store/quality-store";
import { useSuppliers } from "../../suppliers/store/suppliers-store";
import { useExperiments } from "../store/experiments-store";
import {
  healthOptions,
  healthTone,
  type Experiment,
  type HealthScore,
} from "../data/experiments-data";
import { GrowthChart, TreatmentComparison } from "../components/growth-chart";

export function ExperimentDetailPage({ id }: { id: string }) {
  const { experiments } = useExperiments();
  const experiment = experiments.find((entry) => entry.id === id);

  if (!experiment) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-3 px-4 pt-8 pb-10 md:px-6">
        <p className="text-lg font-medium">Experiment not found</p>
        <p className="text-sm text-muted-foreground">
          {id} is not in the experiment register.
        </p>
        <BackLink />
      </div>
    );
  }

  return <ExperimentDetail key={experiment.id} experiment={experiment} />;
}

function ExperimentDetail({ experiment }: { experiment: Experiment }) {
  const { addGrowth } = useExperiments();
  const { results } = useLabResults();
  const { decisions } = useQuality();
  const { suppliers } = useSuppliers();
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);

  const batch = batchByCode(experiment.batchCode);
  const batchResults = results
    .filter((result) => result.batchCode === experiment.batchCode)
    .sort((a, b) => b.version - a.version);
  const decision = decisions.find(
    (entry) => entry.batchCode === experiment.batchCode,
  );

  const batchSuppliers = (batch?.supplierIds ?? []).map(
    (supplierId) =>
      suppliers.find((supplier) => supplier.id === supplierId)?.shopName ??
      supplierId,
  );

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    treatmentId: experiment.treatments[0]?.id ?? "",
    heightCm: "",
    leafCount: "",
    health: "good" as HealthScore,
    note: "",
  });

  const valid =
    Number(form.heightCm) > 0 && Number(form.leafCount) > 0 && form.treatmentId;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    addGrowth(experiment.id, {
      date: form.date,
      treatmentId: form.treatmentId,
      heightCm: Number(form.heightCm),
      leafCount: Number(form.leafCount),
      health: form.health,
      photo: photo ?? undefined,
      note: form.note.trim() || undefined,
    });
    setForm((current) => ({
      ...current,
      heightCm: "",
      leafCount: "",
      note: "",
    }));
    setPhoto(null);
    setOpen(false);
  };

  const log = [...experiment.growth].sort((a, b) =>
    `${b.date}${b.id}`.localeCompare(`${a.date}${a.id}`),
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-8 pb-10 md:px-6">
      <div className="flex flex-col gap-4">
        <BackLink />

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold">{experiment.title}</h1>
              <Pill
                className={
                  experiment.status === "active"
                    ? "bg-success/10 text-success"
                    : "bg-secondary text-secondary-foreground"
                }
              >
                {experiment.status === "active" ? "Active" : "Completed"}
              </Pill>
            </div>
            <p className="text-lg text-muted-foreground">
              {experiment.crop} · started {formatDate(experiment.startDate)} ·{" "}
              {experiment.id}
            </p>
          </div>
          <Button
            type="button"
            className="h-10 gap-1 px-3.5"
            onClick={() => setOpen((value) => !value)}
          >
            <Plus className="size-4" />
            Log growth
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Batch" value={experiment.batchCode} note={batch?.stage} />
        <Stat
          label="Treatments"
          value={String(experiment.treatments.length)}
          note="Control included"
        />
        <Stat
          label="Measurements"
          value={String(experiment.growth.length)}
          note={`${new Set(experiment.growth.map((entry) => entry.date)).size} dates`}
        />
        <Stat
          label="Quality status"
          value={decision?.status ?? "Pending"}
          note={decision?.decidedBy ?? "Not reviewed"}
        />
      </div>

      {open ? (
        <form
          onSubmit={submit}
          className="flex flex-col gap-4 rounded-xl border bg-card p-4 md:p-5"
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <Field label="Date">
              <input
                type="date"
                className={fieldClass}
                value={form.date}
                onChange={(event) => setForm({ ...form, date: event.target.value })}
              />
            </Field>
            <Field label="Treatment">
              <select
                className={fieldClass}
                value={form.treatmentId}
                onChange={(event) =>
                  setForm({ ...form, treatmentId: event.target.value })
                }
              >
                {experiment.treatments.map((treatment) => (
                  <option key={treatment.id} value={treatment.id}>
                    {treatment.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Height (cm)">
              <input
                type="number"
                min="0.1"
                step="0.1"
                className={fieldClass}
                value={form.heightCm}
                onChange={(event) =>
                  setForm({ ...form, heightCm: event.target.value })
                }
                placeholder="12.4"
                required
              />
            </Field>
            <Field label="Leaf count">
              <input
                type="number"
                min="1"
                step="1"
                className={fieldClass}
                value={form.leafCount}
                onChange={(event) =>
                  setForm({ ...form, leafCount: event.target.value })
                }
                placeholder="8"
                required
              />
            </Field>
            <Field label="Visual health">
              <select
                className={fieldClass}
                value={form.health}
                onChange={(event) =>
                  setForm({ ...form, health: event.target.value as HealthScore })
                }
              >
                {healthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Photo"
              hint={photo ?? "Optional, JPG or PNG"}
            >
              <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-secondary px-3 text-sm font-normal">
                <Camera className="size-4" />
                Attach
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) =>
                    setPhoto(event.target.files?.[0]?.name ?? null)
                  }
                />
              </label>
            </Field>
          </div>

          <Field label="Note">
            <Textarea
              value={form.note}
              onChange={(event) => setForm({ ...form, note: event.target.value })}
              rows={2}
              placeholder="Observations for this interval"
            />
          </Field>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="h-10 gap-1" disabled={!valid}>
              <Sprout className="size-4" />
              Save measurement
            </Button>
          </div>
        </form>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <GrowthChart experiment={experiment} />
        <TreatmentComparison experiment={experiment} />
      </section>

      <section className="flex flex-col gap-4">
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Growth log</h2>
          <p className="text-sm text-muted-foreground">
            Height, leaf count, visual health and photos at each interval
          </p>
        </div>

        <Table className="min-w-190">
          <colgroup>
            <col className="w-[14%]" />
            <col className="w-[24%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[14%]" />
            <col className="w-[24%]" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Treatment</TableHead>
              <TableHead>Height</TableHead>
              <TableHead>Leaves</TableHead>
              <TableHead>Health</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {log.length === 0 ? (
              <EmptyRow colSpan={6}>
                No measurements recorded for this experiment yet.
              </EmptyRow>
            ) : (
              log.map((entry) => {
                const treatment = experiment.treatments.find(
                  (item) => item.id === entry.treatmentId,
                );
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDate(entry.date)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {treatment?.label ?? entry.treatmentId}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {entry.heightCm.toFixed(1)} cm
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {entry.leafCount}
                    </TableCell>
                    <TableCell>
                      <Pill className={healthTone[entry.health]}>
                        {healthOptions.find(
                          (option) => option.value === entry.health,
                        )?.label ?? entry.health}
                      </Pill>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        {entry.photo ? (
                          <Camera className="size-3.5 shrink-0" />
                        ) : null}
                        <span className="truncate">
                          {entry.photo ?? entry.note ?? "—"}
                        </span>
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </section>

      <section className="flex flex-col gap-4">
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Traceability</h2>
          <p className="text-sm text-muted-foreground">
            Experiment, batch, suppliers, processing record and lab results
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <TraceCard title="Experiment">
            <TraceRow label="ID" value={experiment.id} />
            <TraceRow label="Crop" value={experiment.crop} />
            <TraceRow label="Setup" value={experiment.setup} />
            <TraceRow label="Started" value={formatDate(experiment.startDate)} />
          </TraceCard>

          <TraceCard title="Batch">
            <TraceRow label="Batch" value={experiment.batchCode} />
            <TraceRow label="Recipe" value={batch?.recipeVersion ?? "—"} />
            <TraceRow
              label="Processing"
              value={
                batch
                  ? `${batch.operator} · ${batch.machine} · ${batch.stage}`
                  : "—"
              }
            />
            <TraceRow
              label="Started"
              value={batch ? formatDate(batch.startedAt) : "—"}
            />
          </TraceCard>

          <TraceCard title="Suppliers">
            {batchSuppliers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No supplier linked to this batch.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5 text-sm">
                {batchSuppliers.map((name) => (
                  <li key={name} className="truncate">
                    {name}
                  </li>
                ))}
              </ul>
            )}
          </TraceCard>

          <TraceCard title="Quality">
            <TraceRow label="Status" value={decision?.status ?? "Pending"} />
            <TraceRow label="Decided by" value={decision?.decidedBy ?? "—"} />
            <TraceRow
              label="Decided on"
              value={decision ? formatDate(decision.decidedAt) : "—"}
            />
            <div className="mt-2 flex flex-col gap-1">
              {batchResults.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No lab results on file.
                </p>
              ) : (
                batchResults.map((result) => (
                  <p key={result.id} className="text-xs text-muted-foreground">
                    v{result.version} · {result.labName} ·{" "}
                    {formatDate(result.receivedAt)}
                  </p>
                ))
              )}
            </div>
          </TraceCard>
        </div>

        {decision ? (
          <p className="text-xs text-muted-foreground">
            Batch status is{" "}
            <span className="font-medium text-foreground">
              {decision.status}
            </span>{" "}
            — shown here for reference only; it is changed in Quality Assessment.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function BackLink() {
  const { navigate } = useDashboardNavigation();
  return (
    <button
      type="button"
      onClick={() => navigate("/experiments")}
      className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      Back to experiments
    </button>
  );
}

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <article className="flex flex-col gap-2 rounded-xl border bg-card p-3 md:p-4">
      <p className="text-xs font-medium text-muted-foreground md:text-sm">
        {label}
      </p>
      <p className="text-[1.15rem] leading-tight font-semibold break-words">
        {value}
      </p>
      {note ? (
        <p className="truncate text-xs font-medium text-muted-foreground">
          {note}
        </p>
      ) : null}
    </article>
  );
}

function TraceCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="flex flex-col gap-2 rounded-xl border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      {children}
    </article>
  );
}

function TraceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="text-right font-medium break-words">{value}</span>
    </div>
  );
}
