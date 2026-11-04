import { useState } from "react";
import { FlaskConical, Lock, Sprout } from "lucide-react";
import { Button } from "../../../shared/ui/button.tsx";
import { Field, Pill, fieldClass } from "../../../shared/ui/form-controls.tsx";
import { useQuality } from "../../quality/store/quality-store";
import { useExperiments } from "../store/experiments-store";
import {
  defaultTreatments,
  treatmentKinds,
  treatmentColor,
} from "../data/experiments-data";

export function NewExperimentView({ onDone }: { onDone: () => void }) {
  const { decisions } = useQuality();
  const { addExperiment } = useExperiments();

  const approved = decisions.filter(
    (decision) => decision.status === "Approved for Supervised Testing",
  );

  const [form, setForm] = useState({
    title: "",
    crop: "",
    setup: "",
    batchCode: approved[0]?.batchCode ?? "",
    startDate: new Date().toISOString().slice(0, 10),
  });

  const set = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const valid =
    form.title.trim().length > 2 &&
    form.crop.trim().length > 1 &&
    form.setup.trim().length > 3 &&
    form.batchCode.length > 0;

  if (approved.length === 0) {
    return (
      <section className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-14 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <Lock className="size-5" />
        </span>
        <h2 className="text-lg font-medium">No approved batches</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Experiments can only use batches that an admin has approved for
          supervised testing. Approve a batch in Quality Assessment first.
        </p>
      </section>
    );
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    addExperiment({
      title: form.title.trim(),
      crop: form.crop.trim(),
      setup: form.setup.trim(),
      batchCode: form.batchCode,
      startDate: form.startDate,
      status: "active",
      treatments: defaultTreatments,
    });
    onDone();
  };

  return (
    <section className="flex flex-col gap-5">
      <div className="space-y-2">
        <h2 className="text-lg font-medium">Register an experiment</h2>
        <p className="text-sm text-muted-foreground">
          Only batches approved for supervised testing can be used
        </p>
      </div>

      <form
        onSubmit={submit}
        className="flex flex-col gap-5 rounded-xl border bg-card p-4 md:p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Experiment title">
            <input
              className={fieldClass}
              value={form.title}
              onChange={(event) => set("title", event.target.value)}
              placeholder="e.g. Pechay growth trial"
              required
            />
          </Field>
          <Field label="Crop">
            <input
              className={fieldClass}
              value={form.crop}
              onChange={(event) => set("crop", event.target.value)}
              placeholder="e.g. Pechay (Brassica rapa)"
              required
            />
          </Field>
          <Field
            label="Setup"
            hint="Trays or bags, plants per treatment, location"
          >
            <input
              className={fieldClass}
              value={form.setup}
              onChange={(event) => set("setup", event.target.value)}
              placeholder="e.g. Seed trays, 30 plants per treatment, greenhouse"
              required
            />
          </Field>
          <Field label="Start date">
            <input
              type="date"
              className={fieldClass}
              value={form.startDate}
              onChange={(event) => set("startDate", event.target.value)}
            />
          </Field>
        </div>

        <Field
          label="Approved batch"
          hint="Status shown is the admin-authorised quality status"
        >
          <select
            className={fieldClass}
            value={form.batchCode}
            onChange={(event) => set("batchCode", event.target.value)}
          >
            {approved.map((decision) => (
              <option key={decision.batchCode} value={decision.batchCode}>
                {decision.batchCode} · approved
              </option>
            ))}
          </select>
        </Field>

        <div className="rounded-lg bg-secondary/60 p-3">
          <p className="text-xs font-medium text-muted-foreground">Treatments</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {defaultTreatments.map((treatment) => (
              <li key={treatment.id}>
                <Pill className="bg-card text-foreground">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: treatmentColor[treatment.kind] }}
                  />
                  {treatment.label}
                  <span className="text-muted-foreground">
                    {treatmentKinds.find((kind) => kind.value === treatment.kind)
                      ?.hint}
                  </span>
                </Pill>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            {form.batchCode || "No batch selected"}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-1"
              onClick={onDone}
            >
              Cancel
            </Button>
            <Button type="submit" className="h-10 gap-1" disabled={!valid}>
              <Sprout className="size-4" />
              Create experiment
            </Button>
          </div>
        </div>
      </form>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <FlaskConical className="mt-0.5 size-3.5 shrink-0" />
        Growth measurements are logged from the experiment page after it is
        created.
      </p>
    </section>
  );
}
