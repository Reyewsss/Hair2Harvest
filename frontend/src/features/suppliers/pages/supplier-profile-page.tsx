import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ClipboardPlus,
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
  fmtKg,
} from "@/features/inventory/data/inventory-data";
import {
  defaultReminderMessage,
  frequencyLabel,
  hasPin,
  historySummary,
  nextPickupLabel,
  sampleCollectors,
  windowLabel,
  type HairType,
} from "../data/suppliers-data";
import { useCan } from "@/features/auth/access";
import { useSuppliers } from "../store/suppliers-store";
import { Drawer } from "../components/drawer";
import { SupplierForm } from "../components/supplier-form";
import { LogPickupForm } from "../components/log-pickup-form";
import { SmsReminderForm } from "../components/sms-reminder-form";
import { ShopMap } from "../components/supplier-map";
import { SupplierLink } from "../components/supplier-link";
import {
  GradeBadge,
  HairTypeBadge,
  SegmentedTabs,
  StatusBadge,
} from "../components/supplier-shared";

type DrawerKind = "edit" | "pickup" | "sms" | null;

const hairOptions: { value: HairType; label: string }[] = [
  { value: "untreated", label: "Untreated" },
  { value: "treated", label: "Treated" },
];

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
  const {
    suppliers,
    updateSupplier,
    setHairType,
    logPickup,
    sendReminder,
    loading,
  } = useSuppliers();
  const supplier = suppliers.find((s) => s.id === supplierId);
  const canEdit = useCan("suppliers:edit");
  const [drawer, setDrawer] = useState<DrawerKind>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

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
      <div className="p-8 text-center text-muted-foreground">
        Loading profile...
      </div>
    );
  }

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
  const summary = historySummary(supplier.history);
  const canLog = supplier.status === "enrolled";

  // 👈 Simplified handleEdit
  const handleEdit = async (formData: FormData) => {
    try {
      await updateSupplier(supplier.id, formData);
      close();
      setNotice("Details saved.");
    } catch (error: any) {
      alert(error.message || "Failed to save details.");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-8 pb-10 md:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          {backLink}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{supplier.shopName}</h1>
            <StatusBadge status={supplier.status} />
            <HairTypeBadge hairType={supplier.hairType} />
          </div>
          <p className="text-lg text-muted-foreground">{supplier.ownerName}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <a
              href={`tel:${supplier.phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-1.5 hover:text-foreground"
            >
              <Phone className="size-4" />
              {supplier.phone}
            </a>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" />
              {supplier.address}
            </span>
          </div>
        </div>

        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="h-10 gap-1.5 px-3.5"
              disabled={!canLog}
              onClick={() => setDrawer("pickup")}
            >
              <ClipboardPlus className="size-5" />
              Log Pickup
            </Button>
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

      {notice ? (
        <p
          role="status"
          className="rounded-lg bg-success/10 px-4 py-3 text-sm text-success"
        >
          {notice}
        </p>
      ) : null}
      {canEdit && !canLog ? (
        <p className="rounded-lg bg-secondary px-4 py-3 text-sm text-muted-foreground">
          This shop is a Candidate. Open Edit Details and record consent to
          enroll it before logging pickups.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
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
          </section>

          <section className="flex flex-col gap-4">
            <div className="space-y-2">
              <h2 className="text-lg font-medium">Pickup history</h2>
              <p className="text-sm text-muted-foreground">
                {summary.pickups} pickup{summary.pickups === 1 ? "" : "s"} ·{" "}
                {summary.sacks} sacks · {fmtKg(summary.kg)}
              </p>
            </div>
            <Table className="min-w-160">
              <colgroup>
                <col className="w-[24%]" />
                <col className="w-[26%]" />
                <col className="w-[12%]" />
                <col className="w-[16%]" />
                <col className="w-[22%]" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Collector</TableHead>
                  <TableHead>Sacks</TableHead>
                  <TableHead>KG</TableHead>
                  <TableHead>Contamination</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplier.history.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No pickups logged yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  supplier.history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="text-muted-foreground">
                        {formatDate(h.date)}
                      </TableCell>
                      <TableCell>{h.collector}</TableCell>
                      <TableCell className="tabular-nums">{h.sacks}</TableCell>
                      <TableCell className="tabular-nums">{h.kg}</TableCell>
                      <TableCell>
                        <GradeBadge grade={h.grade} />
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
                supplier.lastReminder
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
            setNotice("Pickup logged.");
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
          onSend={(message) => {
            sendReminder(supplier.id, message);
            close();
            setNotice("Reminder recorded.");
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
