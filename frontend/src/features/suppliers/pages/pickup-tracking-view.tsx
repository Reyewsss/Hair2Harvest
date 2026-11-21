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

/* ─── Self-contained modal content: owns its sack state ──────────── */
function CollectConfirmModal({
  photo,
  onConfirm,
  onRetake,
}: {
  photo: string;
  onConfirm: (sacks: number) => Promise<void> | void;
  onRetake: () => void;
}) {
  const [sacks, setSacks] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    const n = Number(sacks);
    if (!Number.isFinite(n) || n < 0 || sacks.trim() === "") {
      toast.error("Enter a valid number of sacks.");
      return;
    }
    setBusy(true);
    try {
      await onConfirm(n);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-h-[60vh] space-y-3 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="relative overflow-hidden rounded-lg border bg-secondary">
        <img
          src={photo}
          alt="Proof of collection"
          className="h-40 w-full object-cover object-top"
        />
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium backdrop-blur">
          <Camera className="size-3.5" /> Proof photo
        </span>
      </div>

      <div className="space-y-2">
        <label htmlFor="sacks-input" className="text-sm font-medium">
          Number of sacks
        </label>
        <div className="relative">
          <Package className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="sacks-input"
            type="number"
            min={0}
            step={1}
            value={sacks}
            onChange={(e) => setSacks(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleConfirm();
            }}
            placeholder="e.g. 2"
            autoFocus
            className="h-11 w-full rounded-lg border bg-background pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Check the photo is clear before confirming. JPG, PNG or WEBP, up to{" "}
          {formatBytes(PHOTO_RULE.maxBytes)}.
        </p>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t pt-3 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onRetake} disabled={busy}>
          <Camera className="mr-2 size-4" /> Retake
        </Button>
        <Button onClick={handleConfirm} disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 size-4" /> Confirm & Collect
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export function PickupTrackingView() {
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
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([
      pickupsApi
        .getOldSchedule(today, "active")
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
      showResult({ type: status === "collected" ? "success" : "updated", title: `Marked as ${status}` });
      loadTracking();
    } catch (err: any) {
      showResult({ type: "error", title: "Couldn't update pickup", message: err?.message ?? "Please try again." });
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
        openModal({
          title: "Verify Collection",
          size: "md",
          content: (
            <CollectConfirmModal
              photo={base64String}
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
                closeModal();
                setCaptureId(null);
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
  // Earliest pickup first, then narrow by the selected status tab.
  const sortedActive = [...activePickups].sort((a, b) =>
    String(a.scheduledTime ?? "").localeCompare(String(b.scheduledTime ?? "")),
  );
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
          note="Scheduled for today"
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
        description="Today's pickups. Collect with a photo, then mark as delivered."
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
                    ? "No active pickups for today"
                    : "Nothing in this tab"
                }
                description={
                  activePickups.length === 0
                    ? "Scheduled pickups for today will show up here."
                    : "Try another tab to see the rest of today's pickups."
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
                          {busy ? "Saving…" : "Deliver"}
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
