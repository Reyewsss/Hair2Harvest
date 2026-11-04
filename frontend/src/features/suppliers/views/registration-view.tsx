import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Store } from "lucide-react";
import { Button } from "../../../shared/ui/button.tsx";
import { Field, fieldClass } from "../../../shared/ui/form-controls.tsx";
import { useSuppliers } from "../store/suppliers-store";
import {
  barangays,
  frequencyOptions,
  type NewSupplier,
  type PickupFrequency,
} from "../data/suppliers-data";

const steps = ["Shop", "Location", "Collection"] as const;

const emptyForm = {
  shopName: "",
  owner: "",
  phone: "",
  email: "",
  barangay: barangays[0] as string,
  address: "",
  days: "Mon–Sat",
  open: "09:00",
  close: "20:00",
  pickupFrequency: "weekly" as PickupFrequency,
  weeklyVolumeKg: "",
};

export function RegistrationView({ onDone }: { onDone: () => void }) {
  const { register } = useSuppliers();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [created, setCreated] = useState<{ name: string } | null>(null);

  const set = <K extends keyof typeof emptyForm>(
    key: K,
    value: (typeof emptyForm)[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const volume = Number(form.weeklyVolumeKg);

  const stepValid =
    step === 0
      ? form.shopName.trim().length > 1 &&
        form.owner.trim().length > 1 &&
        form.phone.trim().length > 6 &&
        /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)
      : step === 1
        ? form.address.trim().length > 3 && Boolean(form.open && form.close)
        : volume > 0;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!stepValid) return;

    const input: NewSupplier = {
      shopName: form.shopName.trim(),
      owner: form.owner.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      barangay: form.barangay,
      address: form.address.trim(),
      operatingHours: { days: form.days, open: form.open, close: form.close },
      pickupFrequency: form.pickupFrequency,
      weeklyVolumeKg: volume,
    };

    register(input);
    setCreated({ name: input.shopName });
    setForm(emptyForm);
    setStep(0);
  };

  if (created) {
    return (
      <section className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-14 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-success/10 text-success">
          <Check className="size-5" />
        </span>
        <h2 className="text-lg font-medium">Registration submitted</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {created.name} is now in the approval queue. An admin verifies the
          details before pickups can be scheduled.
        </p>
        <Button type="button" className="mt-2 h-10" onClick={onDone}>
          Back to directory
        </Button>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="space-y-2">
        <h2 className="text-lg font-medium">Register a barbershop</h2>
        <p className="text-sm text-muted-foreground">
          Shop details, operating hours and collection preferences — three steps
        </p>
      </div>

      <ol className="flex flex-wrap items-center gap-2">
        {steps.map((label, index) => {
          const active = index === step;
          const complete = index < step;
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                className={[
                  "flex size-7 items-center justify-center rounded-full text-xs font-semibold",
                  active
                    ? "bg-primary text-primary-foreground"
                    : complete
                      ? "bg-success/10 text-success"
                      : "bg-secondary text-muted-foreground",
                ].join(" ")}
              >
                {complete ? <Check className="size-3.5" /> : index + 1}
              </span>
              <span
                className={
                  active
                    ? "text-sm font-medium"
                    : "text-sm text-muted-foreground"
                }
              >
                {label}
              </span>
              {index < steps.length - 1 ? (
                <ChevronRight className="mx-1 size-4 text-muted-foreground" />
              ) : null}
            </li>
          );
        })}
      </ol>

      <form
        onSubmit={submit}
        className="flex flex-col gap-5 rounded-xl border bg-card p-4 md:p-5"
      >
        {step === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Shop name">
              <input
                className={fieldClass}
                value={form.shopName}
                onChange={(event) => set("shopName", event.target.value)}
                placeholder="e.g. Kapitan's Barbershop"
                required
              />
            </Field>
            <Field label="Owner / manager">
              <input
                className={fieldClass}
                value={form.owner}
                onChange={(event) => set("owner", event.target.value)}
                placeholder="Full name"
                required
              />
            </Field>
            <Field label="Phone">
              <input
                className={fieldClass}
                value={form.phone}
                onChange={(event) => set("phone", event.target.value)}
                placeholder="09xx xxx xxxx"
                required
              />
            </Field>
            <Field
              label="Email"
              hint="Used for pickup notices and OTP verification"
            >
              <input
                type="email"
                className={fieldClass}
                value={form.email}
                onChange={(event) => set("email", event.target.value)}
                placeholder="owner@shop.ph"
                required
              />
            </Field>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Barangay">
              <select
                className={fieldClass}
                value={form.barangay}
                onChange={(event) => set("barangay", event.target.value)}
              >
                {barangays.map((barangay) => (
                  <option key={barangay} value={barangay}>
                    {barangay}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Street address">
              <input
                className={fieldClass}
                value={form.address}
                onChange={(event) => set("address", event.target.value)}
                placeholder="House no., street"
                required
              />
            </Field>
            <Field label="Operating days">
              <input
                className={fieldClass}
                value={form.days}
                onChange={(event) => set("days", event.target.value)}
                placeholder="Mon–Sat"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Opens">
                <input
                  type="time"
                  className={fieldClass}
                  value={form.open}
                  onChange={(event) => set("open", event.target.value)}
                />
              </Field>
              <Field label="Closes">
                <input
                  type="time"
                  className={fieldClass}
                  value={form.close}
                  onChange={(event) => set("close", event.target.value)}
                />
              </Field>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="flex flex-col gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Pickup frequency">
                <select
                  className={fieldClass}
                  value={form.pickupFrequency}
                  onChange={(event) =>
                    set("pickupFrequency", event.target.value as PickupFrequency)
                  }
                >
                  {frequencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Estimated weekly hair volume (kg)"
                hint="Used to plan truck capacity and batch sizing"
              >
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  className={fieldClass}
                  value={form.weeklyVolumeKg}
                  onChange={(event) =>
                    set("weeklyVolumeKg", event.target.value)
                  }
                  placeholder="e.g. 12.5"
                  required
                />
              </Field>
            </div>

            <dl className="grid gap-x-6 gap-y-2 rounded-lg bg-secondary/60 p-3 text-sm sm:grid-cols-2">
              <Summary label="Shop" value={form.shopName || "—"} />
              <Summary label="Owner" value={form.owner || "—"} />
              <Summary
                label="Location"
                value={
                  form.address ? `${form.address}, ${form.barangay}` : "—"
                }
              />
              <Summary
                label="Hours"
                value={`${form.days} · ${form.open}–${form.close}`}
              />
              <Summary
                label="Pickup"
                value={
                  frequencyOptions.find(
                    (option) => option.value === form.pickupFrequency,
                  )?.label ?? "—"
                }
              />
              <Summary
                label="Weekly volume"
                value={volume > 0 ? `${volume.toFixed(1)} kg` : "—"}
              />
            </dl>
          </div>
        ) : null}

        <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            className="h-10 gap-1"
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            disabled={step === 0}
          >
            <ChevronLeft className="size-4" />
            Back
          </Button>

          {step < steps.length - 1 ? (
            <Button
              type="button"
              className="h-10 gap-1"
              disabled={!stepValid}
              onClick={() => setStep((current) => current + 1)}
            >
              Continue
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button type="submit" className="h-10 gap-1" disabled={!stepValid}>
              <Store className="size-4" />
              Submit registration
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 sm:block">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}
