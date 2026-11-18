import { useMemo, useState, type FormEvent } from "react";
import { Ban } from "lucide-react";
import { Button } from "../../../shared/ui/button.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../shared/ui/table.tsx";
import {
  TODAY,
  fmtKg,
  formatDate,
  rejectReasons,
  shopName,
  shops,
  type NewRejection,
  type RejectReason,
  type WeightLog,
} from "../data/inventory-data";
import {
  EmptyRow,
  Field,
  FormPanel,
  Pill,
  fieldClass,
} from "../components/inventory-shared";

export function RejectedView({
  logs,
  onAdd,
}: {
  logs: WeightLog[];
  onAdd: (input: NewRejection) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    shopId: shops[0].id,
    date: TODAY,
    kg: "",
    reason: "chemicals" as RejectReason,
    note: "",
  });

  const rows = useMemo(
    () =>
      logs
        .filter((l) => l.type === "rejected")
        .sort((a, b) => b.date.localeCompare(a.date)),
    [logs],
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const kg = Number(form.kg);
    if (!(kg > 0)) return;
    onAdd({
      shopId: form.shopId,
      date: form.date,
      kg,
      reason: form.reason,
      note: form.note.trim() || undefined,
    });
    setForm((f) => ({ ...f, kg: "", note: "" }));
    setOpen(false);
  };

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Rejected Material</h2>
          <p className="text-sm text-muted-foreground">
            Contaminated or unusable hair, with the reason
          </p>
        </div>
        <Button
          type="button"
          className="h-10 gap-1 px-3.5"
          onClick={() => setOpen((v) => !v)}
        >
          <Ban className="size-5" />
          Log rejection
        </Button>
      </div>

      {open ? (
        <FormPanel onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Source (shop)">
              <select
                className={fieldClass}
                value={form.shopId}
                onChange={(e) => setForm({ ...form, shopId: e.target.value })}
              >
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date">
              <input
                type="date"
                required
                className={fieldClass}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </Field>
            <Field label="Weight rejected (kg)">
              <input
                type="number"
                min="0"
                step="0.1"
                required
                placeholder="e.g. 2.5"
                className={fieldClass}
                value={form.kg}
                onChange={(e) => setForm({ ...form, kg: e.target.value })}
              />
            </Field>
            <Field label="Reason">
              <select
                className={fieldClass}
                value={form.reason}
                onChange={(e) =>
                  setForm({ ...form, reason: e.target.value as RejectReason })
                }
              >
                {rejectReasons.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Note (optional)">
              <input
                type="text"
                placeholder="What did you find?"
                className={fieldClass}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </Field>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="h-10">
              Save
            </Button>
          </div>
        </FormPanel>
      ) : null}

      <Table className="min-w-215">
        <colgroup>
          <col className="w-[18%]" />
          <col className="w-[26%]" />
          <col className="w-[14%]" />
          <col className="w-[20%]" />
          <col className="w-[22%]" />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Weight</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Note</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <EmptyRow colSpan={5}>No rejected material logged.</EmptyRow>
          ) : (
            rows.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="text-muted-foreground">
                  {formatDate(l.date)}
                </TableCell>
                <TableCell className="whitespace-normal">
                  <p className="truncate font-medium">{shopName(l.shopId)}</p>
                  {l.pickupId ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {l.pickupId}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell className="tabular-nums">{fmtKg(l.kg)}</TableCell>
                <TableCell>
                  <Pill className="bg-destructive/10 text-destructive">
                    {rejectReasons.find((r) => r.value === l.reason)?.label}
                  </Pill>
                </TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">
                  {l.note ?? "—"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </section>
  );
}
