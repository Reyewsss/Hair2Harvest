import { useState } from "react";
import { FileUp, FlaskConical } from "lucide-react";
import { Button } from "../../../shared/ui/button.tsx";
import { Field, fieldClass } from "../../../shared/ui/form-controls.tsx";
import { Textarea } from "../../../shared/ui/textarea.tsx";
import { batchCodes, batchOptions } from "../../../shared/data/batches";
import {
  laboratories,
  latestVersion,
  maturityOptions,
  testMethods,
  type LabAttachment,
  type Maturity,
} from "../data/lab-results-data";
import { useLabResults } from "../store/lab-results-store";

const today = () => new Date().toISOString().slice(0, 10);

const initialForm = {
  batchCode: batchCodes[0],
  labName: laboratories[0],
  method: testMethods[0],
  sampledAt: today(),
  receivedAt: today(),
  nitrogen: "",
  phosphorus: "",
  potassium: "",
  ph: "7",
  moisture: "",
  maturity: "mature" as Maturity,
  cadmium: "",
  lead: "",
  arsenic: "",
  mercury: "",
  eColi: "",
  salmonella: "absent" as "absent" | "present",
  notes: "",
};

export function NewResultView({ onDone }: { onDone: () => void }) {
  const { results, addResult } = useLabResults();
  const [form, setForm] = useState(initialForm);
  const [attachment, setAttachment] = useState<LabAttachment | null>(null);

  const set = <K extends keyof typeof initialForm>(
    key: K,
    value: (typeof initialForm)[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const nextVersion = latestVersion(results, form.batchCode) + 1;

  const numericKeys = [
    "nitrogen",
    "phosphorus",
    "potassium",
    "moisture",
    "cadmium",
    "lead",
    "arsenic",
    "mercury",
    "eColi",
  ] as const;

  const valid =
    form.batchCode.length > 0 &&
    form.labName.trim().length > 0 &&
    numericKeys.every((key) => form[key] !== "" && Number(form[key]) >= 0) &&
    Number(form.ph) > 0;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid) return;

    addResult({
      batchCode: form.batchCode,
      labName: form.labName.trim(),
      method: form.method,
      sampledAt: form.sampledAt,
      receivedAt: form.receivedAt,
      attachment: attachment ?? undefined,
      notes: form.notes.trim() || undefined,
      values: {
        nitrogen: Number(form.nitrogen),
        phosphorus: Number(form.phosphorus),
        potassium: Number(form.potassium),
        ph: Number(form.ph),
        moisture: Number(form.moisture),
        maturity: form.maturity,
        cadmium: Number(form.cadmium),
        lead: Number(form.lead),
        arsenic: Number(form.arsenic),
        mercury: Number(form.mercury),
        eColi: Number(form.eColi),
        salmonella: form.salmonella,
      },
    });

    setForm(initialForm);
    setAttachment(null);
    onDone();
  };

  const onFile = (file: File | undefined) => {
    if (!file) {
      setAttachment(null);
      return;
    }
    setAttachment({
      name: file.name,
      kind: file.type === "application/pdf" ? "pdf" : "image",
      sizeKb: Math.max(1, Math.round(file.size / 1024)),
    });
  };

  return (
    <section className="flex flex-col gap-5">
      <div className="space-y-2">
        <h2 className="text-lg font-medium">Enter lab result</h2>
        <p className="text-sm text-muted-foreground">
          Results are linked to a batch. A repeat test for the same batch is kept
          as a new version.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="flex flex-col gap-6 rounded-xl border bg-card p-4 md:p-5"
      >
        <fieldset className="flex flex-col gap-4">
          <legend className="text-sm font-semibold">Sample</legend>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Batch" hint={`Saved as version ${nextVersion}`}>
              <select
                className={fieldClass}
                value={form.batchCode}
                onChange={(event) => set("batchCode", event.target.value)}
              >
                {batchOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Laboratory">
              <select
                className={fieldClass}
                value={form.labName}
                onChange={(event) => set("labName", event.target.value)}
              >
                {laboratories.map((lab) => (
                  <option key={lab} value={lab}>
                    {lab}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Test method">
              <select
                className={fieldClass}
                value={form.method}
                onChange={(event) => set("method", event.target.value)}
              >
                {testMethods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sampled on">
              <input
                type="date"
                className={fieldClass}
                value={form.sampledAt}
                onChange={(event) => set("sampledAt", event.target.value)}
              />
            </Field>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="text-sm font-semibold">Nutrients</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Nitrogen (N) %">
              <input
                type="number"
                min="0"
                step="0.01"
                className={fieldClass}
                value={form.nitrogen}
                onChange={(event) => set("nitrogen", event.target.value)}
                placeholder="1.20"
                required
              />
            </Field>
            <Field label="Phosphorus (P) %">
              <input
                type="number"
                min="0"
                step="0.01"
                className={fieldClass}
                value={form.phosphorus}
                onChange={(event) => set("phosphorus", event.target.value)}
                placeholder="0.65"
                required
              />
            </Field>
            <Field label="Potassium (K) %">
              <input
                type="number"
                min="0"
                step="0.01"
                className={fieldClass}
                value={form.potassium}
                onChange={(event) => set("potassium", event.target.value)}
                placeholder="0.95"
                required
              />
            </Field>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="text-sm font-semibold">Stability</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="pH">
              <input
                type="number"
                min="0"
                max="14"
                step="0.1"
                className={fieldClass}
                value={form.ph}
                onChange={(event) => set("ph", event.target.value)}
                required
              />
            </Field>
            <Field label="Moisture %">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                className={fieldClass}
                value={form.moisture}
                onChange={(event) => set("moisture", event.target.value)}
                placeholder="42"
                required
              />
            </Field>
            <Field label="Maturity">
              <select
                className={fieldClass}
                value={form.maturity}
                onChange={(event) =>
                  set("maturity", event.target.value as Maturity)
                }
              >
                {maturityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="text-sm font-semibold">
            Heavy metals and pathogens
          </legend>
          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
            <Field label="Cadmium (mg/kg)">
              <input
                type="number"
                min="0"
                step="0.01"
                className={fieldClass}
                value={form.cadmium}
                onChange={(event) => set("cadmium", event.target.value)}
                placeholder="0.40"
                required
              />
            </Field>
            <Field label="Lead (mg/kg)">
              <input
                type="number"
                min="0"
                step="0.1"
                className={fieldClass}
                value={form.lead}
                onChange={(event) => set("lead", event.target.value)}
                placeholder="12"
                required
              />
            </Field>
            <Field label="Arsenic (mg/kg)">
              <input
                type="number"
                min="0"
                step="0.1"
                className={fieldClass}
                value={form.arsenic}
                onChange={(event) => set("arsenic", event.target.value)}
                placeholder="1.1"
                required
              />
            </Field>
            <Field label="Mercury (mg/kg)">
              <input
                type="number"
                min="0"
                step="0.01"
                className={fieldClass}
                value={form.mercury}
                onChange={(event) => set("mercury", event.target.value)}
                placeholder="0.05"
                required
              />
            </Field>
            <Field label="E. coli (CFU/g)">
              <input
                type="number"
                min="0"
                step="1"
                className={fieldClass}
                value={form.eColi}
                onChange={(event) => set("eColi", event.target.value)}
                placeholder="120"
                required
              />
            </Field>
            <Field label="Salmonella">
              <select
                className={fieldClass}
                value={form.salmonella}
                onChange={(event) =>
                  set("salmonella", event.target.value as "absent" | "present")
                }
              >
                <option value="absent">Absent</option>
                <option value="present">Present</option>
              </select>
            </Field>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="text-sm font-semibold">Scanned report</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Attach PDF or image"
              hint={
                attachment
                  ? `${attachment.name} · ${attachment.sizeKb} KB`
                  : "Optional, kept with this result"
              }
            >
              <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-secondary px-3 text-sm font-normal">
                <FileUp className="size-4" />
                Choose file
                <input
                  type="file"
                  accept=".pdf,image/*"
                  className="sr-only"
                  onChange={(event) => onFile(event.target.files?.[0])}
                />
              </label>
            </Field>
            <Field label="Notes">
              <Textarea
                value={form.notes}
                onChange={(event) => set("notes", event.target.value)}
                rows={2}
                placeholder="Observations, retest instructions, deviations"
              />
            </Field>
          </div>
        </fieldset>

        <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            {form.batchCode} · version {nextVersion}
          </p>
          <Button type="submit" className="h-10 gap-1" disabled={!valid}>
            <FlaskConical className="size-4" />
            Save result
          </Button>
        </div>
      </form>
    </section>
  );
}
