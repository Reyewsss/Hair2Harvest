import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import {
  Archive,
  ArchiveRestore,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  ChevronLeft,
  History,
  Loader2,
  MapPin,
  PackageCheck,
  Pencil,
  Phone,
  Route,
  Trash2,
  UserX,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Field,
  fieldClass,
} from "@/features/inventory/components/inventory-shared";
import { useSuppliers } from "../store/suppliers-store";
import { pickupsApi, staffApi } from "../suppliers-api";
import { SupplierLink } from "../components/supplier-link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import {
  CountPill,
  PersonCell,
  PickupStatusBadge,
  SectionCard,
  StatCard,
  TableEmpty,
  TableSkeleton,
  formatPickupDate,
  formatPickupTime,
} from "../components/pickup-ui";
import { closeModal, confirm, openModal } from "@/shared/ui/modal";
import { isDuplicateError, showResult } from "@/shared/ui/result-modal";

/** Native <select> with a real chevron icon inset from the right edge. */
function SelectBox({
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`${fieldClass} h-11 w-full cursor-pointer appearance-none pr-10 ${className}`}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

/** Supplier/staff refs come back either populated ({ _id, ... }) or as a raw id. */
function refId(ref: any): string {
  if (!ref) return "";
  return typeof ref === "object"
    ? String(ref.id ?? ref._id ?? "")
    : String(ref);
}

/* ─── Edit modal: owns its own form state ────────────────────────── */
function EditPickupModal({
  pickup,
  shopName,
  staffList,
  onSave,
}: {
  pickup: any;
  shopName: string;
  staffList: any[];
  onSave: (data: {
    date: string;
    time: string;
    assignedTo?: string;
  }) => Promise<boolean>;
}) {
  const currentStaff =
    pickup.assignedTo && typeof pickup.assignedTo === "object"
      ? (pickup.assignedTo.id ?? pickup.assignedTo._id)
      : (pickup.assignedTo ?? "");
  const [editDate, setEditDate] = useState<string>(
    pickup.scheduledDate?.slice(0, 10) ?? "",
  );
  const [editTime, setEditTime] = useState<string>(pickup.scheduledTime ?? "");
  const [editStaff, setEditStaff] = useState<string>(
    String(currentStaff ?? ""),
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        date: editDate,
        time: editTime,
        assignedTo: editStaff || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg bg-secondary/60 px-4 py-3 text-sm">
        <p className="text-muted-foreground">Shop</p>
        <p className="font-medium">{shopName}</p>
      </div>

      <Field label="Assign Staff">
        <SelectBox
          value={editStaff}
          onChange={(e) => setEditStaff(e.target.value)}
        >
          <option value="">-- Unassigned --</option>
          {staffList.map((s) => (
            <option key={s.id ?? s._id} value={s.id ?? s._id}>
              {s.name}
            </option>
          ))}
        </SelectBox>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date">
          <input
            type="date"
            className={fieldClass}
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            required
          />
        </Field>
        <Field label="Time">
          <input
            type="time"
            className={fieldClass}
            value={editTime}
            onChange={(e) => setEditTime(e.target.value)}
            required
          />
        </Field>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => closeModal()}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={saving} className="gap-2">
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Pencil className="size-4" />
          )}
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

export function PickupScheduleView() {
  const { suppliers } = useSuppliers();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [activePickups, setActivePickups] = useState<any[]>([]);
  const [pastPickups, setPastPickups] = useState<any[]>([]);
  const [allActive, setAllActive] = useState<any[]>([]);
  const [archivedPickups, setArchivedPickups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);

  const [selectedShop, setSelectedShop] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [time, setTime] = useState("20:00");
  const [frequency, setFrequency] = useState("weekly");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    staffApi
      .list()
      .then(setStaffList)
      .catch(() =>
        showResult({
          type: "error",
          title: "Couldn't load staff",
          message:
            "The staff list failed to load. You can still schedule a pickup as unassigned.",
        }),
      );
  }, []);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const [activeData, allActiveData, pastData, archivedData] =
        await Promise.all([
          pickupsApi.getOldSchedule(date, "active"),
          pickupsApi.getOldSchedule("", "active"), // every date
          pickupsApi.getOldSchedule("", "past"),
          pickupsApi.getOldSchedule("", "archived"),
        ]);
      setActivePickups(activeData.pickups);
      setAllActive(allActiveData.pickups);
      setPastPickups(pastData.pickups);
      setArchivedPickups(archivedData.pickups);
    } catch (err: any) {
      showResult({
        type: "error",
        title: "Couldn't load the schedule",
        message: err?.message || "Please refresh and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSchedule();
  }, [date]);

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShop) {
      showResult({
        type: "warning",
        title: "Select a shop",
        message: "Choose which shop this pickup is for before scheduling.",
      });
      return;
    }
    if (submitting) return;

    const shopName =
      suppliers.find((s) => s.id === selectedShop)?.shopName ?? "This shop";
    const details = [
      { label: "Shop", value: shopName },
      { label: "Date", value: formatPickupDate(date) },
      { label: "Time", value: formatPickupTime(time) },
    ];

    // Catch duplicates before hitting the server (the route list is for this same date).
    const alreadyScheduled = activePickups.some(
      (p) => refId(p.supplierId) === selectedShop && p.scheduledTime === time,
    );
    if (alreadyScheduled) {
      showResult({
        type: "exists",
        title: "Pickup already scheduled",
        message:
          "This shop already has a pickup at this date and time. Choose a different time or edit the existing pickup.",
        details,
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await pickupsApi.schedule({
        supplierId: selectedShop,
        date,
        time,
        frequency,
        assignedTo: assignedTo || undefined,
      });
      setSelectedShop("");
      setAssignedTo("");
      await loadSchedule();
      if (result?.sms?.sent === false) {
        showResult({
          type: "warning",
          title: "Pickup scheduled, but the SMS wasn't sent",
          message: result.sms.error || "The SMS gateway didn't accept the message.",
          details,
        });
      } else {
        showResult({
          type: "created",
          title: "Pickup scheduled",
          message: "The shop has been notified by SMS.",
          details,
        });
      }
    } catch (err: any) {
      if (isDuplicateError(err)) {
        showResult({
          type: "exists",
          title: "Pickup already scheduled",
          message: "This shop already has a pickup at this date and time.",
          details,
        });
      } else {
        showResult({
          type: "error",
          title: "Couldn't schedule pickup",
          message: err?.message || "Please try again.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (p: any) => {
    const shopName =
      resolveShop(p.supplierId)?.shopName || "[deleted supplier]";
    openModal({
      title: "Edit pickup",
      size: "md",
      content: (
        <EditPickupModal
          pickup={p}
          shopName={shopName}
          staffList={staffList}
          onSave={async (data) => {
            const details = [
              { label: "Shop", value: shopName },
              { label: "Date", value: formatPickupDate(data.date) },
              { label: "Time", value: formatPickupTime(data.time) },
            ];
            try {
              await pickupsApi.update(p._id, data);
              closeModal();
              await loadSchedule();
              showResult({ type: "updated", title: "Pickup updated", details });
              return true;
            } catch (err: any) {
              closeModal();
              showResult(
                isDuplicateError(err)
                  ? {
                      type: "exists",
                      title: "Time slot taken",
                      message:
                        "This shop already has another pickup at that date and time.",
                      details,
                    }
                  : {
                      type: "error",
                      title: "Couldn't update pickup",
                      message: err?.message || "Please try again.",
                    },
              );
              return false;
            }
          }}
        />
      ),
    });
  };

  const handleArchive = (p: any) => {
    const shopName =
      resolveShop(p.supplierId)?.shopName || "[deleted supplier]";
    confirm({
      title: "Archive this pickup?",
      description: `${shopName} · ${formatPickupDate(p.scheduledDate)} at ${formatPickupTime(p.scheduledTime)}. It moves to the Archived table and can be restored.`,
      confirmLabel: "Archive",
      cancelLabel: "Cancel",
      onConfirm: async () => {
        try {
          await pickupsApi.archive(p._id);
          await loadSchedule();
          showResult({
            type: "archived",
            title: "Pickup archived",
            message: `The ${formatPickupTime(p.scheduledTime)} pickup for ${shopName} was moved to Archived.`,
          });
        } catch (err: any) {
          showResult({
            type: "error",
            title: "Couldn't archive pickup",
            message: err?.message || "Please try again.",
          });
        }
      },
    });
  };

  const handleRestore = async (p: any) => {
    const shopName =
      resolveShop(p.supplierId)?.shopName || "[deleted supplier]";
    try {
      await pickupsApi.restore(p._id);
      await loadSchedule();
      showResult({
        type: "restored",
        title: "Pickup restored",
        message: `${shopName} is scheduled again for ${formatPickupDate(p.scheduledDate)} at ${formatPickupTime(p.scheduledTime)}.`,
      });
    } catch (err: any) {
      showResult({
        type: "error",
        title: "Couldn't restore pickup",
        message: err?.message || "Please try again.",
      });
    }
  };

  const handleDelete = (p: any) => {
    const shopName =
      resolveShop(p.supplierId)?.shopName || "[deleted supplier]";
    confirm({
      title: "Delete this pickup?",
      description: `${shopName} · ${formatPickupDate(p.scheduledDate)} at ${formatPickupTime(p.scheduledTime)}. This can't be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await pickupsApi.remove(p._id);
          await loadSchedule();
          showResult({
            type: "deleted",
            title: "Pickup deleted",
            message: `The ${formatPickupTime(p.scheduledTime)} pickup for ${shopName} was removed.`,
          });
        } catch (err: any) {
          showResult({
            type: "error",
            title: "Couldn't delete pickup",
            message: err?.message || "Please try again.",
          });
        }
      },
    });
  };

  const enrolledShops = suppliers.filter((s) => s.status === "enrolled");

  // Resolve populated vs. raw refs → robust against old records
  const supplierById = useMemo(
    () => new Map(suppliers.map((s) => [s.id, s])),
    [suppliers],
  );
  const staffById = useMemo(
    () => new Map(staffList.map((s) => [s.id ?? s._id, s])),
    [staffList],
  );
  const resolveShop = (ref: any) =>
    ref && typeof ref === "object" ? ref : supplierById.get(String(ref));
  const resolveStaff = (ref: any) =>
    ref && typeof ref === "object" ? ref : staffById.get(String(ref));

  const unassignedCount = activePickups.filter(
    (p) => !resolveStaff(p.assignedTo),
  ).length;
  const deliveredCount = pastPickups.filter(
    (p) => p.status === "delivered",
  ).length;
  const isToday = date === format(new Date(), "yyyy-MM-dd");

  // Active pickups on dates other than the one selected above.
  const upcomingPickups = allActive.filter(
    (p) => p.scheduledDate?.slice(0, 10) !== date,
  );

  // Edit / Archive / Delete for a scheduled pickup, shared by both active tables.
  const renderActions = (p: any) =>
    p.status === "scheduled" ? (
      <div className="inline-flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Edit pickup"
          title="Edit"
          onClick={() => handleEdit(p)}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Archive pickup"
          title="Archive"
          onClick={() => handleArchive(p)}
        >
          <Archive className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Delete pickup"
          title="Delete"
          onClick={() => handleDelete(p)}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    ) : (
      <span className="text-xs text-muted-foreground">Locked</span>
    );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-8 pb-10 md:px-6">
      {/* Header */}
      <div className="space-y-3">
        <SupplierLink
          href="/suppliers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> All suppliers
        </SupplierLink>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Collection Scheduling</h1>
          <p className="text-muted-foreground">
            Plan routes, assign staff, and notify shops via SMS.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={CalendarDays}
          label={isToday ? "Scheduled today" : "Scheduled on date"}
          value={loading ? "…" : activePickups.length}
          note={formatPickupDate(date)}
          tone="primary"
        />
        <StatCard
          icon={UserX}
          label="Unassigned"
          value={loading ? "…" : unassignedCount}
          note={
            unassignedCount > 0 ? "Needs a staff member" : "All pickups covered"
          }
          tone={unassignedCount > 0 ? "warning" : "default"}
        />
        <StatCard
          icon={PackageCheck}
          label="Delivered"
          value={loading ? "…" : deliveredCount}
          note="From past pickups"
          tone="success"
        />
        <StatCard
          icon={History}
          label="Old records"
          value={loading ? "…" : pastPickups.length}
          note={`${enrolledShops.length} enrolled shops`}
        />
      </div>

      {/* Schedule form */}
      <SectionCard
        icon={CalendarPlus}
        title="Schedule a pickup"
        description="The shop receives an SMS once the pickup is saved."
      >
        <form
          onSubmit={handleSchedule}
          className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
        >
          <div className="min-w-0">
            <Field label="Select Shop">
              <SelectBox
                value={selectedShop}
                onChange={(e) => setSelectedShop(e.target.value)}
                required
              >
                <option value="">-- Choose --</option>
                {enrolledShops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.shopName} ({s.street})
                  </option>
                ))}
              </SelectBox>
            </Field>
          </div>

          <div className="min-w-0">
            <Field label="Assign Staff">
              <SelectBox
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              >
                <option value="">-- Unassigned --</option>
                {staffList.map((s) => (
                  <option key={s.id ?? s._id} value={s.id ?? s._id}>
                    {s.name}
                  </option>
                ))}
              </SelectBox>
            </Field>
          </div>

          <div className="min-w-0">
            <Field label="Frequency">
              <SelectBox
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
              >
                <option value="none">Manual</option>
                <option value="daily">Daily</option>
                <option value="twice-weekly">Twice Weekly</option>
                <option value="weekly">Weekly</option>
              </SelectBox>
            </Field>
          </div>

          <div className="min-w-0">
            <Field label="Date">
              <input
                type="date"
                className={`${fieldClass} h-11 w-full`}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </Field>
          </div>

          <div className="min-w-0">
            <Field label="Time">
              <input
                type="time"
                className={`${fieldClass} h-11 w-full`}
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </Field>
          </div>

          <div className="flex flex-col gap-3 border-t pt-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between lg:col-span-5">
            <p className="text-sm text-muted-foreground">
              {selectedShop
                ? `Pickup on ${formatPickupDate(date)} at ${formatPickupTime(time)}.`
                : "Choose a shop to schedule a pickup."}
            </p>
            <Button
              type="submit"
              disabled={submitting}
              className="h-10 gap-2 px-4"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CalendarPlus className="size-4" />
              )}
              {submitting ? "Scheduling..." : "Schedule & Notify"}
            </Button>
          </div>
        </form>
      </SectionCard>

      {/* Active route */}
      <SectionCard
        icon={Route}
        title={`Route for ${formatPickupDate(date)}`}
        description="Pickups for the selected date."
        aside={<CountPill>{activePickups.length} scheduled</CountPill>}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Time</TableHead>
              <TableHead>Shop</TableHead>
              <TableHead>Assigned Staff</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-5 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton colSpan={6} />
            ) : activePickups.length === 0 ? (
              <TableEmpty
                colSpan={6}
                icon={CalendarDays}
                title="No pickups scheduled for this day"
                description="Use the form above to add one, or pick another date."
              />
            ) : (
              activePickups.map((p) => {
                const shop = resolveShop(p.supplierId);
                return (
                  <TableRow key={p._id}>
                    <TableCell className="pl-5">
                      <span className="inline-flex rounded-md bg-secondary px-2 py-1 text-sm font-medium tabular-nums">
                        {formatPickupTime(p.scheduledTime)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">
                        {shop?.shopName || "[deleted supplier]"}
                      </p>
                      {shop?.street ? (
                        <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3" /> {shop.street}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <PersonCell name={resolveStaff(p.assignedTo)?.name} />
                    </TableCell>
                    <TableCell>
                      {shop?.phone ? (
                        <a
                          href={`tel:${shop.phone}`}
                          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                        >
                          <Phone className="size-3.5" /> {shop.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <PickupStatusBadge status={p.status} />
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      {renderActions(p)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </SectionCard>

      {/* Upcoming — other dates */}
      <SectionCard
        icon={CalendarClock}
        title="Upcoming Schedule"
        description="Active pickups on other dates."
        aside={<CountPill>{upcomingPickups.length} upcoming</CountPill>}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Shop</TableHead>
              <TableHead>Assigned Staff</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-5 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && allActive.length === 0 ? (
              <TableSkeleton colSpan={6} />
            ) : upcomingPickups.length === 0 ? (
              <TableEmpty
                colSpan={6}
                icon={CalendarClock}
                title="No pickups on other dates"
                description="Pickups scheduled for other days will show up here."
              />
            ) : (
              upcomingPickups.map((p) => {
                const shop = resolveShop(p.supplierId);
                return (
                  <TableRow key={p._id}>
                    <TableCell className="pl-5 tabular-nums">
                      {formatPickupDate(p.scheduledDate, "EEE, MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {formatPickupTime(p.scheduledTime)}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">
                        {shop?.shopName || "[deleted supplier]"}
                      </p>
                      {shop?.street ? (
                        <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3" /> {shop.street}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <PersonCell name={resolveStaff(p.assignedTo)?.name} />
                    </TableCell>
                    <TableCell>
                      <PickupStatusBadge status={p.status} />
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      {renderActions(p)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </SectionCard>

      {/* Past records */}
      <SectionCard
        icon={History}
        title="Old Records"
        description="Past pickups across all dates."
        aside={<CountPill>{pastPickups.length} records</CountPill>}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Date</TableHead>
              <TableHead>Shop</TableHead>
              <TableHead>Assigned Staff</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="pr-5">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && pastPickups.length === 0 ? (
              <TableSkeleton colSpan={5} />
            ) : pastPickups.length === 0 ? (
              <TableEmpty
                colSpan={5}
                icon={History}
                title="No old records found"
                description="Completed and past pickups will appear here."
              />
            ) : (
              pastPickups.map((p) => (
                <TableRow key={p._id}>
                  <TableCell className="pl-5 tabular-nums">
                    {formatPickupDate(p.scheduledDate, "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="font-medium">
                    {resolveShop(p.supplierId)?.shopName ||
                      "[deleted supplier]"}
                  </TableCell>
                  <TableCell>
                    <PersonCell name={resolveStaff(p.assignedTo)?.name} />
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatPickupTime(p.scheduledTime)}
                  </TableCell>
                  <TableCell className="pr-5">
                    <PickupStatusBadge status={p.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </SectionCard>

      {/* Archived */}
      <SectionCard
        icon={Archive}
        title="Archived"
        description="Archived pickups. Restore them or delete them for good."
        aside={<CountPill>{archivedPickups.length} archived</CountPill>}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Shop</TableHead>
              <TableHead>Assigned Staff</TableHead>
              <TableHead className="pr-5 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && archivedPickups.length === 0 ? (
              <TableSkeleton colSpan={5} />
            ) : archivedPickups.length === 0 ? (
              <TableEmpty
                colSpan={5}
                icon={Archive}
                title="No archived pickups"
                description="Archive a scheduled pickup to keep it here without deleting it."
              />
            ) : (
              archivedPickups.map((p) => (
                <TableRow key={p._id}>
                  <TableCell className="pl-5 tabular-nums">
                    {formatPickupDate(p.scheduledDate, "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatPickupTime(p.scheduledTime)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {resolveShop(p.supplierId)?.shopName ||
                      "[deleted supplier]"}
                  </TableCell>
                  <TableCell>
                    <PersonCell name={resolveStaff(p.assignedTo)?.name} />
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Restore pickup"
                        title="Restore"
                        onClick={() => void handleRestore(p)}
                      >
                        <ArchiveRestore className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Delete pickup permanently"
                        title="Delete permanently"
                        onClick={() => handleDelete(p)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}
