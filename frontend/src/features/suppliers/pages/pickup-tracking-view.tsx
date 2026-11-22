import { useState, useEffect, useRef } from "react";
import {
  Camera,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Loader2,
  MapPin,
  Package,
  Phone,
  PackageCheck,
  Truck,
  ZoomIn,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { pickupsApi } from "../suppliers-api";
import { SupplierLink } from "../components/supplier-link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { openModal, closeModal } from "@/shared/ui/modal";
import { showResult } from "@/shared/ui/result-modal";
import { cn } from "@/lib/utils";
import { useCan } from "@/features/auth/access";
import {
  PHOTO_RULE,
  compressImageToDataUrl,
  formatBytes,
  validateFile,
} from "@/lib/upload-validation";
import {
  CountPill,
  PersonCell,
  PickupProgress,
  PickupStatusBadge,
  SectionCard,
  StatCard,
  TableEmpty,
  TableSkeleton,
  formatPickupDate,
  formatPickupTime,
} from "../components/pickup-ui";

/* ─── Verify collection: photo check + sack count (owns its own state) ─ */
const MAX_SACKS = 99;

type CollectContext = {
  shopName: string;
  street?: string;
  time?: string;
  assignedTo?: string;
};

// Size of a base64 data URL's payload, for the "312 KB" badge.
const dataUrlBytes = (url: string) =>
  Math.round(((url.length - url.indexOf(",") - 1) * 3) / 4);

function CollectConfirmModal({
  photo,
  context,
  onConfirm,
  onRetake,
}: {
  photo: string;
  context: CollectContext;
  onConfirm: (sacks: number) => Promise<void> | void;
  onRetake: () => void;
}) {
  const [sacks, setSacks] = useState<number | "">("");
  const [expanded, setExpanded] = useState(false);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  const valid =
    typeof sacks === "number" &&
    Number.isInteger(sacks) &&
    sacks >= 1 &&
    sacks <= MAX_SACKS;
  const error =
    !touched || valid
      ? ""
      : sacks === ""
        ? "Enter how many sacks you collected."
        : `Enter a whole number from 1 to ${MAX_SACKS}.`;

  const change = (n: number) => {
    setTouched(true);
    setSacks(Math.min(MAX_SACKS, Math.max(1, n)));
  };

  const handleConfirm = async () => {
    setTouched(true);
    if (!valid || busy) return;
    setBusy(true);
    try {
      await onConfirm(sacks as number);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void handleConfirm();
      }}
    >
      {/* Which pickup this is */}
      <div className="flex items-center gap-3 rounded-lg bg-secondary/70 p-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Package className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{context.shopName}</p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {context.street ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" /> {context.street}
              </span>
            ) : null}
            {context.time ? <span>{context.time}</span> : null}
            {context.assignedTo ? (
              <span>Assigned: {context.assignedTo}</span>
            ) : null}
          </p>
        </div>
      </div>

      {/* Photo */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Proof photo</p>
          <button
            type="button"
            onClick={onRetake}
            disabled={busy}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline disabled:opacity-50"
          >
            <Camera className="size-3.5" /> Retake photo
          </button>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="relative block w-full overflow-hidden rounded-lg border bg-secondary"
          aria-label={expanded ? "Shrink photo" : "Enlarge photo"}
        >
          <img
            src={photo}
            alt="Proof of collection"
            className={cn(
              "mx-auto w-full object-contain transition-[max-height] duration-300",
              expanded ? "max-h-[55vh]" : "max-h-52",
            )}
          />
          <span className="absolute right-2 bottom-2 rounded-full bg-background/90 px-2 py-0.5 text-[0.7rem] font-medium text-muted-foreground backdrop-blur">
            {formatBytes(dataUrlBytes(photo))} ·{" "}
            {expanded ? "Tap to shrink" : "Tap to enlarge"}
          </span>
        </button>
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
          Make sure every sack is visible and the photo isn't blurry.
        </p>
      </div>

      {/* Sacks */}
      <div className="space-y-2">
        <label htmlFor="sacks-input" className="text-sm font-medium">
          Sacks collected
        </label>
        <div className="flex items-stretch gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-12 w-12 shrink-0 text-xl"
            aria-label="One less sack"
            disabled={busy || sacks === "" || sacks <= 1}
            onClick={() => change((sacks || 1) - 1)}
          >
            −
          </Button>
          <input
            id="sacks-input"
            inputMode="numeric"
            autoComplete="off"
            value={sacks}
            placeholder="0"
            aria-invalid={!!error}
            aria-describedby="sacks-help"
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
              setTouched(true);
              setSacks(digits === "" ? "" : Number(digits));
            }}
            className={cn(
              "h-12 min-w-0 flex-1 rounded-lg border bg-background text-center text-2xl font-semibold tabular-nums outline-none placeholder:text-muted-foreground/40 focus-visible:ring-2 focus-visible:ring-primary/30",
              error && "border-destructive focus-visible:ring-destructive/20",
            )}
          />
          <Button
            type="button"
            variant="secondary"
            className="h-12 w-12 shrink-0 text-xl"
            aria-label="One more sack"
            disabled={busy || (sacks !== "" && sacks >= MAX_SACKS)}
            onClick={() => change((sacks || 0) + 1)}
          >
            +
          </Button>
        </div>
        <p
          id="sacks-help"
          className={cn(
            "text-xs",
            error ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {error || "Count every sealed sack from this shop."}
        </p>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="h-10"
          onClick={onRetake}
          disabled={busy}
        >
          <Camera className="mr-2 size-4" /> Retake
        </Button>
        <Button
          type="submit"
          className="h-10 min-w-44"
          disabled={busy || (touched && !valid)}
        >
          {busy ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 size-4" />
              {valid
                ? `Confirm ${sacks} sack${sacks === 1 ? "" : "s"}`
                : "Confirm collection"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

/** Today's date in the Philippines (YYYY-MM-DD), matching how pickups are stored. */
function manilaToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

function addDaysIso(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "Today", "Tomorrow", "Overdue · Nov 20" or "Mon, Nov 30" under the pickup time. */
function DayLabel({ date, today, status }: { date?: string; today: string; status: string }) {
  if (!date) return null;
  const late = date < today && status === "scheduled";
  const text =
    date === today
      ? "Today"
      : date === addDaysIso(today, 1)
        ? "Tomorrow"
        : formatPickupDate(date, date < today ? "MMM d" : "EEE, MMM d");
  return (
    <p
      className={`mt-1 text-xs ${
        late ? "font-medium text-destructive" : date === today ? "font-medium text-primary" : "text-muted-foreground"
      }`}
    >
      {late ? `Overdue · ${text}` : text}
    </p>
  );
}

export function PickupTrackingView() {
  // Only admins and operators verify deliveries; staff collect and hand over.
  const canVerifyDelivery = useCan("suppliers:edit");
  const [activePickups, setActivePickups] = useState<any[]>([]);
  const [deliveredPickups, setDeliveredPickups] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [captureId, setCaptureId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "scheduled" | "collected">(
    "all",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadTracking = () => {
    // Every scheduled / collected pickup, whatever its date: overdue ones still need
    // collecting, and upcoming ones should be visible before the day arrives.
    Promise.all([
      pickupsApi
        .getOldSchedule("", "active")
        .then((res) => setActivePickups(res.pickups)),
      pickupsApi
        .getOldSchedule("", "past")
        .then((res) => setDeliveredPickups(res.pickups)),
    ])
      .catch((err: any) =>
        toast.error(err?.message ?? "Failed to load pickups."),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTracking();
  }, []);

  /* ─── Status update ───────────────────────────────────────────── */
  const handleStatusUpdate = async (
    id: string,
    status: string,
    photoBase64?: string,
    sacks?: number,
  ) => {
    setProcessingId(id);
    try {
      const payload: Record<string, unknown> = {};
      if (status === "collected") {
        payload.photoUrl = photoBase64;
        payload.sacks = sacks;
      }
      await pickupsApi.updateStatus(id, status, payload);
      showResult({
        type: status === "collected" ? "success" : "updated",
        title: `Marked as ${status}`,
      });
      loadTracking();
    } catch (err: any) {
      showResult({
        type: "error",
        title: "Couldn't update pickup",
        message: err?.message ?? "Please try again.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  /* ─── Photo verification modal ────────────────────────────────── */
  const handlePhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const id = captureId;
    // Reset the file input immediately so re-selecting the same file works
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file || !id) return;

    const problem = validateFile(file, PHOTO_RULE);
    if (problem) {
      setCaptureId(null);
      showResult({
        type: "warning",
        title: "Can't use this photo",
        message: problem,
      });
      return;
    }

    compressImageToDataUrl(file)
      .then((base64String) => {
        const p = activePickups.find((x) => x._id === id);
        openModal({
          title: "Verify collection",
          description: "Check the photo, then count the sacks.",
          size: "md",
          closeOnOverlayClick: false, // don't lose the photo to a stray click
          content: (
            <CollectConfirmModal
              photo={base64String}
              context={{
                shopName: p?.supplierId?.shopName || "Unknown shop",
                street: p?.supplierId?.street,
                time: p?.scheduledTime
                  ? formatPickupTime(p.scheduledTime)
                  : undefined,
                assignedTo: p?.assignedTo?.name,
              }}
              onConfirm={async (sacksNum) => {
                closeModal();
                setCaptureId(null);
                await handleStatusUpdate(
                  id,
                  "collected",
                  base64String,
                  sacksNum,
                );
              }}
              onRetake={() => {
                // Straight back to the camera / file picker for the same pickup.
                closeModal();
                fileInputRef.current?.click();
              }}
            />
          ),
        });
      })
      .catch(() => {
        setCaptureId(null);
        showResult({
          type: "error",
          title: "Couldn't read the photo",
          message: "The file could not be read. Please try again.",
        });
      });
  };

  const openProof = (p: any) =>
    openModal({
      title: "Collection Proof",
      size: "md",
      content: (
        <div className="space-y-3">
          <img
            src={p.photoUrl}
            alt="Proof of collection"
            className="w-full rounded-lg border"
          />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{p.supplierId?.shopName || "Unknown shop"}</span>
            <span>{formatPickupDate(p.scheduledDate)}</span>
            {p.sacks != null ? <span>{p.sacks} sacks</span> : null}
          </div>
        </div>
      ),
    });

  const awaitingCollection = activePickups.filter(
    (p) => p.status === "scheduled",
  ).length;
  const awaitingDelivery = activePickups.filter(
    (p) => p.status === "collected",
  ).length;
  // Earliest date and time first (overdue → today → upcoming), then narrow by tab.
  const today = manilaToday();
  const sortedActive = [...activePickups].sort((a, b) =>
    `${a.scheduledDate ?? ""} ${a.scheduledTime ?? ""}`.localeCompare(
      `${b.scheduledDate ?? ""} ${b.scheduledTime ?? ""}`,
    ),
  );
  const dueToday = activePickups.filter((p) => p.scheduledDate === today).length;
  const overdue = activePickups.filter(
    (p) => p.status === "scheduled" && p.scheduledDate < today,
  ).length;
  const visiblePickups =
    filter === "all"
      ? sortedActive
      : sortedActive.filter((p) => p.status === filter);
  const filterTabs = [
    { value: "all" as const, label: "All", count: activePickups.length },
    {
      value: "scheduled" as const,
      label: "To collect",
      count: awaitingCollection,
    },
    {
      value: "collected" as const,
      label: "In transit",
      count: awaitingDelivery,
    },
  ];
  const totalSacks = deliveredPickups.reduce(
    (sum, p) => sum + (Number(p.sacks) || 0),
    0,
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-8 pb-10 md:px-6">
      <input
        type="file"
        accept={PHOTO_RULE.mimeTypes.join(",")}
        capture="environment"
        ref={fileInputRef}
        className="hidden"
        onChange={handlePhotoSelected}
      />

      {/* Header */}
      <div className="space-y-3">
        <SupplierLink
          href="/suppliers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> All suppliers
        </SupplierLink>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Pickup Tracking</h1>
          <p className="text-muted-foreground">
            Update statuses as drivers collect and deliver.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Clock}
          label="Awaiting collection"
          value={loading ? "…" : awaitingCollection}
          note={
            loading
              ? "Scheduled pickups"
              : overdue > 0
                ? `${dueToday} due today · ${overdue} overdue`
                : `${dueToday} due today`
          }
          tone={awaitingCollection > 0 ? "primary" : "default"}
        />
        <StatCard
          icon={Truck}
          label="Awaiting delivery"
          value={loading ? "…" : awaitingDelivery}
          note="Collected, in transit"
          tone="primary"
        />
        <StatCard
          icon={PackageCheck}
          label="Delivered"
          value={loading ? "…" : deliveredPickups.length}
          note="All-time pickups"
          tone="success"
        />
        <StatCard
          icon={Package}
          label="Sacks delivered"
          value={loading ? "…" : totalSacks.toLocaleString()}
          note="Across delivered pickups"
        />
      </div>

      {/* Active tracking */}
      <SectionCard
        icon={Truck}
        title="Active Pickups"
        description={
          canVerifyDelivery
            ? "Overdue, today's and upcoming pickups. Collect with a photo, then verify the delivery."
            : "Overdue, today's and upcoming pickups. Collect with a photo; an admin or operator verifies the delivery."
        }
        aside={<CountPill>{activePickups.length} active</CountPill>}
      >
        <div className="flex flex-wrap gap-2 border-b px-5 py-3">
          {filterTabs.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setFilter(t.value)}
              aria-pressed={filter === t.value}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === t.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-1.5 text-xs tabular-nums ${
                  filter === t.value
                    ? "bg-primary-foreground/20"
                    : "bg-background"
                }`}
              >
                {loading ? "…" : t.count}
              </span>
            </button>
          ))}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Time</TableHead>
              <TableHead>Shop</TableHead>
              <TableHead>Assigned Staff</TableHead>
              <TableHead>Sacks</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-5 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton colSpan={6} />
            ) : visiblePickups.length === 0 ? (
              <TableEmpty
                colSpan={6}
                icon={Truck}
                title={
                  activePickups.length === 0
                    ? "No active pickups"
                    : "Nothing in this tab"
                }
                description={
                  activePickups.length === 0
                    ? "Pickups you schedule will show up here until they are delivered."
                    : "Try another tab to see the rest of the active pickups."
                }
              />
            ) : (
              visiblePickups.map((p) => {
                const busy = processingId === p._id;
                return (
                  <TableRow key={p._id} className={busy ? "opacity-60" : ""}>
                    <TableCell className="pl-5">
                      <span className="inline-flex rounded-md bg-secondary px-2 py-1 text-sm font-medium tabular-nums">
                        {formatPickupTime(p.scheduledTime)}
                      </span>
                      <DayLabel date={p.scheduledDate} today={today} status={p.status} />
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">
                        {p.supplierId?.shopName || "Unknown"}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {p.supplierId?.street ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3" /> {p.supplierId.street}
                          </span>
                        ) : null}
                        {p.supplierId?.phone ? (
                          <a
                            href={`tel:${p.supplierId.phone}`}
                            className="inline-flex items-center gap-1 hover:text-foreground"
                          >
                            <Phone className="size-3" /> {p.supplierId.phone}
                          </a>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <PersonCell name={p.assignedTo?.name} />
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {p.sacks != null ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-sm font-medium">
                          <Package className="size-3.5 text-muted-foreground" />
                          {p.sacks}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1.5">
                        <PickupStatusBadge status={p.status} />
                        <PickupProgress status={p.status} />
                      </div>
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      {p.status === "scheduled" ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            setCaptureId(p._id);
                            fileInputRef.current?.click();
                          }}
                          disabled={busy}
                          aria-label={`Collect pickup from ${p.supplierId?.shopName || "shop"}`}
                          className="h-9 min-w-32 gap-2 rounded-lg px-4 font-medium shadow-sm transition-all hover:-translate-y-px hover:shadow-md active:translate-y-0"
                        >
                          {busy ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Camera className="size-4" />
                          )}
                          {busy ? "Saving…" : "Collect"}
                        </Button>
                      ) : p.status === "collected" && !canVerifyDelivery ? (
                        // Staff: collected sacks wait for an admin/operator to verify delivery.
                        <span
                          className="inline-flex h-9 min-w-32 cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-dashed px-4 text-sm font-medium text-muted-foreground"
                          title="An admin or operator verifies the delivery"
                          aria-label={`Pickup from ${p.supplierId?.shopName || "shop"} is waiting for delivery verification`}
                        >
                          <Truck className="size-4" /> For delivery
                        </span>
                      ) : p.status === "collected" ? (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(p._id, "delivered")}
                          disabled={busy}
                          aria-label={`Mark pickup from ${p.supplierId?.shopName || "shop"} as delivered`}
                          className="h-9 min-w-32 gap-2 rounded-lg bg-success px-4 font-medium text-success-foreground shadow-sm transition-all hover:-translate-y-px hover:bg-success/90 hover:shadow-md active:translate-y-0"
                        >
                          {busy ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="size-4" />
                          )}
                          {busy ? "Saving…" : "Delivered"}
                        </Button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                          <CheckCircle2 className="size-4" /> Done
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </SectionCard>

      {/* Delivered history */}
      <SectionCard
        icon={PackageCheck}
        title="Delivered History"
        description="Completed pickups with photo proof."
        aside={<CountPill>{deliveredPickups.length} delivered</CountPill>}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Proof</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Shop</TableHead>
              <TableHead>Assigned Staff</TableHead>
              <TableHead>Collected By</TableHead>
              <TableHead>Sacks</TableHead>
              <TableHead className="pr-5">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton colSpan={7} />
            ) : deliveredPickups.length === 0 ? (
              <TableEmpty
                colSpan={7}
                icon={PackageCheck}
                title="No delivered history yet"
                description="Delivered pickups and their proof photos will appear here."
              />
            ) : (
              deliveredPickups.map((p) => (
                <TableRow key={p._id}>
                  <TableCell className="pl-5">
                    {p.photoUrl ? (
                      <button
                        type="button"
                        onClick={() => openProof(p)}
                        aria-label="View collection proof"
                        className="group relative block size-11 overflow-hidden rounded-lg border"
                      >
                        <img
                          src={p.photoUrl}
                          alt=""
                          className="size-full object-cover"
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                          <ZoomIn className="size-4 text-white" />
                        </span>
                      </button>
                    ) : (
                      <span className="flex size-11 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                        —
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatPickupDate(p.scheduledDate, "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="font-medium">
                    {p.supplierId?.shopName || "Unknown"}
                  </TableCell>
                  <TableCell>
                    <PersonCell name={p.assignedTo?.name} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.collectedBy?.name || "—"}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {p.sacks ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="pr-5">
                    <PickupStatusBadge status="delivered" />
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
