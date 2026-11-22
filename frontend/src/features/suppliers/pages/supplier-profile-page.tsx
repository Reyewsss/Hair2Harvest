import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  X,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import {
  formatDate,
  formatTime,
  fmtSacks,
} from "@/features/inventory/data/inventory-data";
import {
  defaultReminderMessage,
  formatAddress,
  frequencyLabel,
  hasPin,
  historySummary,
  nextPickupLabel,
  sampleCollectors,
  windowLabel,
} from "../data/suppliers-data";
import { useCan } from "@/features/auth/access";
import { useSuppliers } from "../store/suppliers-store";
import { Drawer } from "../components/drawer";
import { SupplierForm } from "../components/supplier-form";
import { LogPickupForm } from "../components/log-pickup-form";
import { SmsReminderForm } from "../components/sms-reminder-form";
import { ShopMap } from "../components/supplier-map";
import { SupplierLink } from "../components/supplier-link";
import { HairTypeBadge, StatusBadge } from "../components/supplier-shared";
import { pickupsApi } from "../suppliers-api";
import { showResult } from "@/shared/ui/result-modal";
import { LeafLoader } from "@/shared/ui/leaf-loader";
import { ReviewPanel } from "../components/review-panel";

type DrawerKind = "edit" | "pickup" | "sms" | null;

const backLink = (
  <SupplierLink
    href="/suppliers"
    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
  >
    <ChevronLeft className="size-4" />
    All suppliers
  </SupplierLink>
);

export function SupplierProfilePage({
  supplierId,
}: {
  supplierId: string | undefined;
}) {
  const { suppliers, updateSupplier, logPickup, sendReminder, reviewSupplier, loading } =
    useSuppliers();
  const canEdit = useCan("suppliers:edit");
  const canApprove = useCan("suppliers:approve");

  const [drawer, setDrawer] = useState<DrawerKind>(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [submittingSms, setSubmittingSms] = useState(false);

  const [liveHistory, setLiveHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (!supplierId) return;
    setLoadingHistory(true);
    pickupsApi
      .getPickupHistory(supplierId)
      .then((data) => setLiveHistory(data))
      .catch((err) => console.error("Failed to load history:", err))
      .finally(() => setLoadingHistory(false));
  }, [supplierId, drawer]);

  const collectors = useMemo(
    () =>
      [
        ...new Set([
          ...sampleCollectors,
          ...suppliers.flatMap((s) => s.history.map((h) => h.collector)),
        ]),
      ].sort(),
    [suppliers],
  );

  if (loading) {
    return (
      <LeafLoader label="Loading profile" page />
    );
  }

  const supplier = suppliers.find((s) => s.id === supplierId);

  if (!supplier) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pt-8 pb-10 md:px-6">
        {backLink}
        <p className="text-lg text-muted-foreground">
          That shop could not be found.
        </p>
      </div>
    );
  }

  const close = () => setDrawer(null);

  // 👇 summary computed HERE (historySummary is imported, not defined here)
  const summary = historySummary(
    liveHistory.map((h) => ({
      id: h._id,
      date: h.scheduledDate,
      collector: h.collectedBy?.name || "—",
      sacks: h.sacks || 0,
      grade: "A",
    })),
  );

  const canLog = supplier.status === "enrolled";

  const handleEdit = async (formData: FormData) => {
    setSubmittingEdit(true);
    try {
      await updateSupplier(supplier.id, formData);
      close();
      showResult({ type: "updated", title: "Details saved", message: supplier.shopName });
    } catch (error: any) {
      showResult({
        type: "error",
        title: "Couldn't save details",
        message: error.message || "Failed to save details.",
      });
    } finally {
      setSubmittingEdit(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-8 pb-10 md:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          {backLink}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{supplier.shopName}</h1>
            <StatusBadge status={supplier.status} review={supplier.review} />
            <HairTypeBadge hairType={supplier.hairType} />
          </div>
          <p className="text-lg text-muted-foreground">{supplier.ownerName}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <a
              href={`tel:${(supplier.phone || "").replace(/\s/g, "")}`}
              className="inline-flex items-center gap-1.5 hover:text-foreground"
            >
              <Phone className="size-4" />
              {supplier.phone}
            </a>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" />
              {formatAddress(supplier)}
            </span>
          </div>
        </div>

        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            {/* <Button
              type="button"
              className="h-10 gap-1.5 px-3.5"
              disabled={!canLog}
              onClick={() => setDrawer("pickup")}
            >
              <ClipboardPlus className="size-5" />
              Log Pickup
            </Button> */}
            <Button
              type="button"
              variant="secondary"
              className="h-10 gap-1.5 px-3.5"
              onClick={() => setDrawer("edit")}
            >
              <Pencil className="size-4" />
              Edit Details
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-10 gap-1.5 px-3.5"
              onClick={() => setDrawer("sms")}
            >
              <MessageSquare className="size-4" />
              Send SMS Reminder
            </Button>
          </div>
        ) : null}
      </div>

      {!canEdit ? (
        <p className="rounded-lg bg-secondary px-4 py-3 text-sm text-muted-foreground">
          View only. Your role can't change supplier records.
        </p>
      ) : null}

      {!canLog && supplier.registrationSource !== "admin" ? (
        <ReviewPanel
          supplier={supplier}
          canApprove={canApprove}
          onReview={(status, remarks) => reviewSupplier(supplier.id, status, remarks)}
        />
      ) : canEdit && !canLog ? (
        <p className="rounded-lg bg-secondary px-4 py-3 text-sm text-muted-foreground">
          This shop is a Candidate. Open Edit Details and record consent to
          enroll it before logging pickups.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          {/* <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
            <div className="space-y-1">
              <p className="text-sm font-semibold">Hair quality</p>
              <p className="text-sm text-muted-foreground">
                What this shop usually provides. Collectors see this flag before
                each pickup.
              </p>
            </div>
            {canEdit ? (
              <SegmentedTabs
                value={supplier.hairType}
                options={hairOptions}
                onChange={(value) => setHairType(supplier.id, value)}
              />
            ) : (
              <HairTypeBadge hairType={supplier.hairType} />
            )}
          </section> */}

          <section className="flex flex-col gap-4">
            <div className="space-y-2">
              <h2 className="text-lg font-medium">Pickup history</h2>
              <p className="text-sm text-muted-foreground">
                {summary.pickups} pickup{summary.pickups === 1 ? "" : "s"} ·{" "}
                {fmtSacks(summary.sacks)}
              </p>
            </div>

            <Table className="min-w-160">
              <colgroup>
                <col className="w-[28%]" />
                <col className="w-[32%]" />
                <col className="w-[16%]" />
                <col className="w-[24%]" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Collector</TableHead>
                  <TableHead>Sacks</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingHistory ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-10! text-center text-muted-foreground"
                    >
                      <LeafLoader label="Loading history" />
                    </TableCell>
                  </TableRow>
                ) : liveHistory.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No pickups logged yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  liveHistory.map((h) => (
                    <TableRow key={h._id}>
                      <TableCell className="text-muted-foreground">
                        {formatDate(h.scheduledDate)}
                      </TableCell>
                      <TableCell>{h.collectedBy?.name || "—"}</TableCell>
                      <TableCell className="tabular-nums">
                        {h.sacks || "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                            h.status === "delivered"
                              ? "bg-success/20 text-success"
                              : h.status === "collected"
                                ? "bg-primary/10 text-primary"
                                : "bg-secondary"
                          }`}
                        >
                          {h.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <InfoCard title="Pickup rules">
            <Row label="Frequency" value={frequencyLabel(supplier.frequency)} />
            <Row label="Time window" value={windowLabel(supplier)} />
            <Row label="Next pickup" value={nextPickupLabel(supplier)} />
            <Row label="Access notes" value={supplier.accessNotes || "None"} />
            <Row
              label="Last reminder"
              value={
                supplier.lastReminder?.at
                  ? `${formatDate(supplier.lastReminder.at.slice(0, 10))}, ${formatTime(supplier.lastReminder.at.slice(11, 16))}`
                  : "Never sent"
              }
            />
          </InfoCard>

          <InfoCard title="Consent">
            <Consent
              label="Consents to participate"
              yes={supplier.consentParticipate}
            />
            <Consent label="Consents to photos" yes={supplier.consentPhotos} />
            <Row
              label="Consent date"
              value={
                supplier.consentDate
                  ? formatDate(supplier.consentDate)
                  : "Not recorded"
              }
            />
          </InfoCard>

          <InfoCard title="Location">
            {hasPin(supplier) ? (
              <ShopMap
                lat={supplier.lat!}
                lng={supplier.lng!}
                title={supplier.shopName}
                status={supplier.status}
                approximate={supplier.pinApproximate}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No map pin saved. Add one from Edit Details.
              </p>
            )}
          </InfoCard>
        </aside>
      </div>

      <Drawer
        open={drawer === "edit"}
        title="Edit details"
        description={supplier.shopName}
        onClose={close}
      >
        <SupplierForm
          initial={supplier}
          onSubmit={handleEdit}
          onCancel={close}
          busy={submittingEdit}
        />
      </Drawer>

      <Drawer
        open={drawer === "pickup"}
        title="Log pickup"
        description={supplier.shopName}
        onClose={close}
      >
        <LogPickupForm
          collectors={collectors}
          onCancel={close}
          onSubmit={(input) => {
            logPickup(supplier.id, input);
            close();
            showResult({ type: "created", title: "Pickup logged", message: supplier.shopName });
          }}
        />
      </Drawer>

      <Drawer
        open={drawer === "sms"}
        title="Send SMS reminder"
        description={supplier.shopName}
        onClose={close}
      >
        <SmsReminderForm
          recipient={supplier.ownerName}
          phone={supplier.phone}
          defaultMessage={defaultReminderMessage(supplier)}
          onCancel={close}
          busy={submittingSms}
          onSend={async (message) => {
            setSubmittingSms(true);
            try {
              await sendReminder(supplier.id, message);
              close();
              showResult({
                type: "success",
                title: "Reminder sent",
                message: `SMS sent to ${supplier.ownerName}.`,
              });
            } catch (error: any) {
              showResult({
                type: "error",
                title: "Couldn't send reminder",
                message: error.message || "Failed to send reminder.",
              });
            } finally {
              setSubmittingSms(false);
            }
          }}
        />
      </Drawer>
    </div>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-4 md:p-5">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function Consent({ label, yes }: { label: string; yes: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`inline-flex items-center gap-1 font-medium ${yes ? "text-success" : "text-muted-foreground"}`}
      >
        {yes ? <Check className="size-4" /> : <X className="size-4" />}
        {yes ? "Yes" : "No"}
      </span>
    </div>
  );
}
