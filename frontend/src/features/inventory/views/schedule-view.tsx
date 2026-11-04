import { useMemo, useState, type FormEvent } from "react";
import { CalendarPlus, Repeat } from "lucide-react";
import { Button } from "../../../shared/ui/button.tsx";
import {
  TODAY,
  addDays,
  formatDate,
  formatTime,
  fmtKg,
  occurrences,
  recurrenceOptions,
  shopArea,
  shopName,
  shops,
  type NewPickup,
  type Pickup,
  type Recurrence,
} from "../data/inventory-data";
import { useSuppliers } from "../../suppliers/store/suppliers-store";
import {
  Field,
  FormPanel,
  Pill,
  StageBadge,
  fieldClass,
} from "../components/inventory-shared";

const dayLabel = (date: string) =>
  date === TODAY ? "Today" : date === addDays(TODAY, 1) ? "Tomorrow" : "";

export function ScheduleView({
  pickups,
  onAdd,
}: {
  pickups: Pickup[];
  onAdd: (input: NewPickup) => void;
}) {
  const { approved } = useSuppliers();
  // Only verified shops can be scheduled for collection.
  const schedulable = approved.length
    ? approved
    : shops.map((shop) => ({ id: shop.id, shopName: shop.name }));

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    shopId: schedulable[0]?.id ?? shops[0].id,
    date: TODAY,
    time: "10:00",
    recurrence: "none" as Recurrence,
    estWeight: "",
  });

  // Upcoming pickups grouped by day.
  const groups = useMemo(() => {
    const byDay = new Map<string, Pickup[]>();
    pickups
      .filter((p) => p.stage !== "delivered" && p.date >= TODAY)
      .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
      .forEach((p) => byDay.set(p.date, [...(byDay.get(p.date) ?? []), p]));
    return [...byDay.entries()];
  }, [pickups]);

  const estWeight = Number(form.estWeight);
  const count = occurrences(form.date, form.recurrence).length;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.date || !(estWeight > 0)) return;
    onAdd({ ...form, estWeight });
    setForm((f) => ({ ...f, estWeight: "" }));
    setOpen(false);
  };

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Pickup Schedule</h2>
          <p className="text-sm text-muted-foreground">
            Upcoming collections, grouped by day
          </p>
        </div>
        <Button
          type="button"
          className="h-10 gap-1 px-3.5"
          onClick={() => setOpen((v) => !v)}
        >
          <CalendarPlus className="size-5" />
          Schedule pickup
        </Button>
      </div>

      {open ? (
        <FormPanel onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Field label="Source (shop)" hint="Verified shops only">
              <select
                className={fieldClass}
                value={form.shopId}
                onChange={(e) => setForm({ ...form, shopId: e.target.value })}
              >
                {schedulable.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.shopName}
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
            <Field label="Time">
              <input
                type="time"
                required
                className={fieldClass}
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </Field>
            <Field
              label="Repeats"
              hint={
                form.recurrence === "none"
                  ? undefined
                  : `Creates ${count} pickups`
              }
            >
              <select
                className={fieldClass}
                value={form.recurrence}
                onChange={(e) =>
                  setForm({ ...form, recurrence: e.target.value as Recurrence })
                }
              >
                {recurrenceOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Expected weight (kg)">
              <input
                type="number"
                min="0"
                step="0.1"
                required
                placeholder="e.g. 25"
                className={fieldClass}
                value={form.estWeight}
                onChange={(e) =>
                  setForm({ ...form, estWeight: e.target.value })
                }
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
              Save schedule
            </Button>
          </div>
        </FormPanel>
      ) : null}

      {groups.length === 0 ? (
        <p className="rounded-xl border py-10 text-center text-sm text-muted-foreground">
          No upcoming pickups.
        </p>
      ) : (
        groups.map(([date, items]) => (
          <div key={date} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold">
                {dayLabel(date) ? `${dayLabel(date)} · ` : ""}
                {formatDate(date)}
              </h3>
              <p className="text-xs text-muted-foreground">
                {items.length} pickup{items.length === 1 ? "" : "s"} · about{" "}
                {fmtKg(items.reduce((sum, p) => sum + p.estWeight, 0))}
              </p>
            </div>
            <ul className="divide-y rounded-xl border bg-card">
              {items.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
                >
                  <p className="w-20 shrink-0 text-sm font-medium tabular-nums">
                    {formatTime(p.time)}
                  </p>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {shopName(p.shopId)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {shopArea(p.shopId)} · {p.id}
                    </p>
                  </div>
                  {p.recurrence !== "none" ? (
                    <Pill className="bg-secondary text-secondary-foreground">
                      <Repeat className="size-3" />
                      {
                        recurrenceOptions.find((o) => o.value === p.recurrence)
                          ?.label
                      }
                    </Pill>
                  ) : null}
                  <p className="w-24 text-sm text-muted-foreground tabular-nums sm:text-right">
                    ~{fmtKg(p.estWeight)}
                  </p>
                  <StageBadge stage={p.stage} />
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
