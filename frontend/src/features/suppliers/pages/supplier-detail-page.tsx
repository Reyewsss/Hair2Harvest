import { useState } from "react";
import { ArrowLeft, Check, Pencil, X } from "lucide-react";
import { Button } from "../../../shared/ui/button.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../shared/ui/table.tsx";
import { Field, fieldClass } from "../../../shared/ui/form-controls.tsx";
import { Textarea } from "../../../shared/ui/textarea.tsx";
import { useDashboardNavigation } from "../../dashboard-shell/components/navigation";
import { useInventory } from "../../inventory/store/inventory-store";
import { StageBadge, EmptyRow } from "../../inventory/components/inventory-shared";
import { fmtKg, formatDate, formatTime } from "../../inventory/data/inventory-data";
import { useSuppliers } from "../store/suppliers-store";
import { StatusBadge } from "../components/supplier-badges";
import {
  barangays,
  formatHours,
  frequencyOptions,
  monthlyVolume,
  type Supplier,
} from "../data/suppliers-data";

export function SupplierDetailPage({ id }: { id: string }) {
  const { suppliers } = useSuppliers();
  const supplier = suppliers.find((entry) => entry.id === id);

  if (!supplier) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-3 px-4 pt-8 pb-10 md:px-6">
        <p className="text-lg font-medium">Shop not found</p>
        <p className="text-sm text-muted-foreground">
          {id} is not in the supplier registry.
        </p>
        <BackLink />
      </div>
    );
  }

  return <SupplierProfile key={supplier.id} supplier={supplier} />;
}

function SupplierProfile({ supplier }: { supplier: Supplier }) {
  const { review, updateProfile } = useSuppliers();
  const { pickups, logs } = useInventory();
  const [editing, setEditing] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [draft, setDraft] = useState({
    shopName: supplier.shopName,
    owner: supplier.owner,
    phone: supplier.phone,
    email: supplier.email,
    barangay: supplier.barangay,
    address: supplier.address,
    days: supplier.operatingHours.days,
    open: supplier.operatingHours.open,
    close: supplier.operatingHours.close,
    pickupFrequency: supplier.pickupFrequency,
    weeklyVolumeKg: String(supplier.weeklyVolumeKg),
  });

  const history = pickups
    .filter((pickup) => pickup.shopId === supplier.id)
    .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));

  const collected = logs
    .filter((log) => log.shopId === supplier.id && log.type === "in")
    .reduce((sum, log) => sum + log.kg, 0);

  const rejected = logs.filter(
    (log) => log.shopId === supplier.id && log.type === "rejected",
  ).length;

  const lastPickup = history.find((pickup) => pickup.stage !== "scheduled");

  const saveProfile = (event: React.FormEvent) => {
    event.preventDefault();
    updateProfile(supplier.id, {
      shopName: draft.shopName.trim(),
      owner: draft.owner.trim(),
      phone: draft.phone.trim(),
      email: draft.email.trim(),
      barangay: draft.barangay,
      address: draft.address.trim(),
      operatingHours: {
        days: draft.days,
        open: draft.open,
        close: draft.close,
      },
      pickupFrequency: draft.pickupFrequency,
      weeklyVolumeKg: Number(draft.weeklyVolumeKg) || 0,
    });
    setEditing(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-8 pb-10 md:px-6">
      <div className="flex flex-col gap-4">
        <BackLink />

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold">{supplier.shopName}</h1>
              <StatusBadge status={supplier.status} />
            </div>
            <p className="text-lg text-muted-foreground">
              {supplier.shopCode} · {supplier.barangay} · joined{" "}
              {formatDate(supplier.registeredAt)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              className="h-10 gap-1 px-3"
              onClick={() => setEditing((value) => !value)}
            >
              <Pencil className="size-4" />
              {editing ? "Cancel edit" : "Edit profile"}
            </Button>
            {supplier.status !== "approved" ? (
              <Button
                type="button"
                className="h-10 gap-1 px-3"
                onClick={() => review(supplier.id, "approved", remarks)}
              >
                <Check className="size-4" />
                Approve
              </Button>
            ) : null}
            {supplier.status !== "rejected" ? (
              <Button
                type="button"
                variant="destructive"
                className="h-10 gap-1 px-3"
                disabled={remarks.trim().length === 0}
                onClick={() => review(supplier.id, "rejected", remarks)}
              >
                <X className="size-4" />
                Reject
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total collected" value={fmtKg(collected)} note="All time" />
        <Stat
          label="Pickups logged"
          value={String(history.length)}
          note={`${rejected} rejected loads`}
        />
        <Stat
          label="Last pickup"
          value={lastPickup ? formatDate(lastPickup.date) : "—"}
          note={lastPickup ? lastPickup.id : "No collection yet"}
        />
        <Stat
          label="Est. monthly volume"
          value={`${monthlyVolume(supplier).toFixed(1)} kg`}
          note={`${supplier.pickupFrequency} pickup`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 md:p-5">
          <h2 className="text-base font-medium">Shop profile</h2>

          {editing ? (
            <form onSubmit={saveProfile} className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Shop name">
                  <input
                    className={fieldClass}
                    value={draft.shopName}
                    onChange={(event) =>
                      setDraft({ ...draft, shopName: event.target.value })
                    }
                    required
                  />
                </Field>
                <Field label="Owner">
                  <input
                    className={fieldClass}
                    value={draft.owner}
                    onChange={(event) =>
                      setDraft({ ...draft, owner: event.target.value })
                    }
                    required
                  />
                </Field>
                <Field label="Phone">
                  <input
                    className={fieldClass}
                    value={draft.phone}
                    onChange={(event) =>
                      setDraft({ ...draft, phone: event.target.value })
                    }
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    className={fieldClass}
                    value={draft.email}
                    onChange={(event) =>
                      setDraft({ ...draft, email: event.target.value })
                    }
                  />
                </Field>
                <Field label="Barangay">
                  <select
                    className={fieldClass}
                    value={draft.barangay}
                    onChange={(event) =>
                      setDraft({ ...draft, barangay: event.target.value })
                    }
                  >
                    {barangays.map((barangay) => (
                      <option key={barangay} value={barangay}>
                        {barangay}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Address">
                  <input
                    className={fieldClass}
                    value={draft.address}
                    onChange={(event) =>
                      setDraft({ ...draft, address: event.target.value })
                    }
                  />
                </Field>
                <Field label="Operating days">
                  <input
                    className={fieldClass}
                    value={draft.days}
                    onChange={(event) =>
                      setDraft({ ...draft, days: event.target.value })
                    }
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Opens">
                    <input
                      type="time"
                      className={fieldClass}
                      value={draft.open}
                      onChange={(event) =>
                        setDraft({ ...draft, open: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Closes">
                    <input
                      type="time"
                      className={fieldClass}
                      value={draft.close}
                      onChange={(event) =>
                        setDraft({ ...draft, close: event.target.value })
                      }
                    />
                  </Field>
                </div>
                <Field label="Pickup frequency">
                  <select
                    className={fieldClass}
                    value={draft.pickupFrequency}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        pickupFrequency: event.target
                          .value as Supplier["pickupFrequency"],
                      })
                    }
                  >
                    {frequencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Estimated weekly volume (kg)">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className={fieldClass}
                    value={draft.weeklyVolumeKg}
                    onChange={(event) =>
                      setDraft({ ...draft, weeklyVolumeKg: event.target.value })
                    }
                  />
                </Field>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="h-10">
                  Save profile
                </Button>
              </div>
            </form>
          ) : (
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Detail label="Owner" value={supplier.owner} />
              <Detail label="Phone" value={supplier.phone} />
              <Detail label="Email" value={supplier.email} />
              <Detail label="Barangay" value={supplier.barangay} />
              <Detail label="Address" value={supplier.address} />
              <Detail
                label="Operating hours"
                value={formatHours(supplier.operatingHours)}
              />
              <Detail
                label="Pickup preference"
                value={
                  frequencyOptions.find(
                    (option) => option.value === supplier.pickupFrequency,
                  )?.label ?? supplier.pickupFrequency
                }
              />
              <Detail
                label="Estimated weekly volume"
                value={`${supplier.weeklyVolumeKg.toFixed(1)} kg`}
              />
            </dl>
          )}
        </section>

        <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 md:p-5">
          <h2 className="text-base font-medium">Verification</h2>
          <dl className="grid gap-3 text-sm">
            <Detail
              label="Reviewed on"
              value={supplier.reviewedAt ? formatDate(supplier.reviewedAt) : "—"}
            />
            <Detail label="Reviewed by" value={supplier.reviewedBy ?? "—"} />
          </dl>

          {supplier.status === "pending" ? (
            <Field label="Review remarks" hint="Required when rejecting a shop">
              <Textarea
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                rows={3}
                placeholder="e.g. storage area needs verification"
              />
            </Field>
          ) : (
            <div className="rounded-lg bg-secondary/60 p-3 text-sm">
              <p className="text-xs text-muted-foreground">Remarks</p>
              <p className="mt-1">{supplier.remarks ?? "No remarks recorded."}</p>
            </div>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-4">
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Pickup history</h2>
          <p className="text-sm text-muted-foreground">
            Collections recorded for this shop, newest first
          </p>
        </div>

        <Table className="min-w-150">
          <colgroup>
            <col className="w-[16%]" />
            <col className="w-[14%]" />
            <col className="w-[18%]" />
            <col className="w-[18%]" />
            <col className="w-[18%]" />
            <col className="w-[16%]" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Pickup</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Batch</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.length === 0 ? (
              <EmptyRow colSpan={6}>No pickups recorded for this shop yet.</EmptyRow>
            ) : (
              history.map((pickup) => (
                <TableRow key={pickup.id}>
                  <TableCell className="text-muted-foreground">
                    {formatDate(pickup.date)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatTime(pickup.time)}
                  </TableCell>
                  <TableCell className="font-medium">{pickup.id}</TableCell>
                  <TableCell>
                    <StageBadge stage={pickup.stage} />
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {pickup.weight ? fmtKg(pickup.weight) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {pickup.batchId ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}

function BackLink() {
  const { navigate } = useDashboardNavigation();
  return (
    <button
      type="button"
      onClick={() => navigate("/suppliers")}
      className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      Back to suppliers
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
      <p className="text-[1.5rem] leading-none font-semibold">{value}</p>
      {note ? (
        <p className="text-xs font-medium text-muted-foreground">{note}</p>
      ) : null}
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}
