import { useState, useEffect, useRef } from "react";
import { CheckCircle2, Camera, ChevronLeft, Loader2, Eye } from "lucide-react";
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
      toast.error("Enter a valid number of sacks");
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
    <div className="space-y-4">
      <img
        src={photo}
        alt="Proof"
        className="w-full rounded-lg border object-cover max-h-64"
      />
      <p className="text-sm text-muted-foreground">
        Confirm the photo and enter the number of sacks collected.
      </p>

      <div className="space-y-2">
        <label className="text-sm font-medium">Number of sacks</label>
        <input
          type="number"
          min={0}
          step={1}
          value={sacks}
          onChange={(e) => setSacks(e.target.value)}
          placeholder="e.g. 2"
          autoFocus
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onRetake} disabled={busy}>
          Retake
        </Button>
        <Button onClick={handleConfirm} disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" /> Saving…
            </>
          ) : (
            "Confirm & Collect"
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

  const [captureId, setCaptureId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadTracking = () => {
    const today = new Date().toISOString().slice(0, 10);
    pickupsApi
      .getOldSchedule(today, "active")
      .then((res) => setActivePickups(res.pickups));
    pickupsApi
      .getOldSchedule("", "past")
      .then((res) => setDeliveredPickups(res.pickups));
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
      toast.success(`Marked as ${status}`);
      loadTracking();
    } catch (err: any) {
      toast.error(err.message);
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

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;

      openModal({
        title: "Verify Collection",
        size: "md",
        content: (
          <CollectConfirmModal
            photo={base64String}
            onConfirm={async (sacksNum) => {
              closeModal();
              setCaptureId(null);
              await handleStatusUpdate(id, "collected", base64String, sacksNum);
            }}
            onRetake={() => {
              closeModal();
              setCaptureId(null);
            }}
          />
        ),
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex w-full flex-col gap-8 p-6">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={fileInputRef}
        className="hidden"
        onChange={handlePhotoSelected}
      />

      <div className="space-y-2">
        <SupplierLink
          href="/suppliers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> All suppliers
        </SupplierLink>
        <h1 className="text-2xl font-semibold">Pickup Tracking</h1>
        <p className="text-muted-foreground">
          Update statuses as drivers collect and deliver.
        </p>
      </div>

      {/* Active Tracking Table */}
      <div className="rounded-xl border bg-card">
        <div className="border-b p-4 flex justify-between items-center">
          <h2 className="font-semibold">Active Pickups</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shop</TableHead>
              <TableHead>Assigned Staff</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Sacks</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activePickups.map((p) => (
              <TableRow key={p._id}>
                <TableCell className="font-medium">
                  {p.supplierId?.shopName || "Unknown"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {p.assignedTo?.name || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {p.supplierId?.street}
                </TableCell>
                <TableCell className="tabular-nums">
                  {p.sacks ?? "—"}
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                      p.status === "scheduled"
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {p.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {p.status === "scheduled" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setCaptureId(p._id);
                        fileInputRef.current?.click();
                      }}
                      disabled={processingId === p._id}
                    >
                      {processingId === p._id ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Camera className="mr-2 size-4" />
                      )}
                      Collect
                    </Button>
                  )}
                  {p.status === "collected" && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusUpdate(p._id, "delivered")}
                      disabled={processingId === p._id}
                      className="bg-success hover:bg-success/90 text-success-foreground"
                    >
                      {processingId === p._id ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 size-4" />
                      )}
                      Deliver
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {activePickups.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-10 text-muted-foreground"
                >
                  No active pickups for today.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delivered History Table */}
      <div className="rounded-xl border bg-card">
        <div className="border-b p-4 flex justify-between items-center">
          <h2 className="font-semibold">Delivered History</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Shop</TableHead>
              <TableHead>Assigned Staff</TableHead>
              <TableHead>Collected By</TableHead>
              <TableHead>Sacks</TableHead>
              <TableHead>Proof</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveredPickups.map((p) => (
              <TableRow key={p._id}>
                <TableCell className="tabular-nums">
                  {p.scheduledDate}
                </TableCell>
                <TableCell>{p.supplierId?.shopName || "Unknown"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {p.assignedTo?.name || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {p.collectedBy?.name || "—"}
                </TableCell>
                <TableCell className="tabular-nums">
                  {p.sacks ?? "—"}
                </TableCell>
                <TableCell>
                  {p.photoUrl ? (
                    <button
                      type="button"
                      onClick={() =>
                        openModal({
                          title: "Collection Proof",
                          content: (
                            <img
                              src={p.photoUrl}
                              alt="Proof"
                              className="w-full rounded-lg"
                            />
                          ),
                          size: "md",
                        })
                      }
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <Eye className="size-4" /> View
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="inline-flex rounded-full bg-success/20 text-success px-2 py-0.5 text-xs font-medium capitalize">
                    Delivered
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {deliveredPickups.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-10 text-muted-foreground"
                >
                  No delivered history yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}