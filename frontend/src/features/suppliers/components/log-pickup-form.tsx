import { useState, type FormEvent } from "react";
import { Button } from "@/shared/ui/button.tsx";
import { TODAY } from "@/features/inventory/data/inventory-data";
import { contaminationGrades, sampleCollectors, type ContaminationGrade, type NewPickupInput } from "../data/suppliers-data";
import { Field, fieldClass } from "./supplier-shared";

export function LogPickupForm({
  collectors = sampleCollectors,
  onSubmit,
  onCancel,
}: {
  collectors?: string[];
  onSubmit: (input: NewPickupInput) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(TODAY);
  const [collector, setCollector] = useState("");
  const [sacks, setSacks] = useState("");
  const [kg, setKg] = useState("");
  const [grade, setGrade] = useState<ContaminationGrade>("A");
  const [submitted, setSubmitted] = useState(false);

  const sacksNum = Number(sacks);
  const kgNum = Number(kg);
  const errors = {
    collector: collector.trim() ? "" : "Enter the collector's name.",
    sacks: Number.isInteger(sacksNum) && sacksNum >= 1 ? "" : "Enter a whole number of sacks.",
    kg: kgNum > 0 ? "" : "Enter the weight in kg.",
  };
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : "");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.values(errors).some(Boolean) || !date) return;
    onSubmit({ date, collector: collector.trim(), sacks: sacksNum, kg: kgNum, grade });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <Field label="Date">
          <input type="date" required className={fieldClass} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Collector">
          <input autoFocus list="collector-options" className={fieldClass} value={collector} onChange={(e) => setCollector(e.target.value)} />
          <datalist id="collector-options">
            {collectors.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {show("collector") ? <span className="text-xs font-normal text-destructive">{show("collector")}</span> : null}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sacks">
            <input type="number" min="1" step="1" className={fieldClass} value={sacks} onChange={(e) => setSacks(e.target.value)} />
            {show("sacks") ? <span className="text-xs font-normal text-destructive">{show("sacks")}</span> : null}
          </Field>
          <Field label="Weight (kg)">
            <input type="number" min="0" step="0.1" className={fieldClass} value={kg} onChange={(e) => setKg(e.target.value)} />
            {show("kg") ? <span className="text-xs font-normal text-destructive">{show("kg")}</span> : null}
          </Field>
        </div>
        <Field label="Contamination grade">
          <select className={fieldClass} value={grade} onChange={(e) => setGrade(e.target.value as ContaminationGrade)}>
            {contaminationGrades.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </Field>
      </div>
      <footer className="flex justify-end gap-2 border-t px-5 py-4">
        <Button type="button" variant="outline" className="h-10" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="h-10">Save pickup</Button>
      </footer>
    </form>
  );
}