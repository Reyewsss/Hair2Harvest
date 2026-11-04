import { useState } from "react";
import { Check, Clock, X } from "lucide-react";
import { Button } from "../../../shared/ui/button.tsx";
import { Textarea } from "../../../shared/ui/textarea.tsx";
import { useSuppliers } from "../store/suppliers-store";
import {
  formatHours,
  monthlyVolume,
  type Supplier,
} from "../data/suppliers-data";
import { formatDate } from "../../inventory/data/inventory-data";
import { useDashboardNavigation } from "../../dashboard-shell/components/navigation";

export function ApprovalsView() {
  const { pending, review } = useSuppliers();

  if (pending.length === 0) {
    return (
      <section className="flex flex-col gap-5">
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Approval queue</h2>
          <p className="text-sm text-muted-foreground">
            Every registered shop is reviewed before it can be scheduled
          </p>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-xl border bg-card px-6 py-14 text-center">
          <Check className="size-6 text-success" />
          <p className="font-medium">Nothing waiting for review</p>
          <p className="text-sm text-muted-foreground">
            New barbershop registrations will appear here.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="space-y-2">
        <h2 className="text-lg font-medium">Approval queue</h2>
        <p className="text-sm text-muted-foreground">
          {pending.length} shop{pending.length === 1 ? "" : "s"} waiting for
          verification
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {pending.map((supplier) => (
          <ApprovalCard
            key={supplier.id}
            supplier={supplier}
            onApprove={(remarks) => review(supplier.id, "approved", remarks)}
            onReject={(remarks) => review(supplier.id, "rejected", remarks)}
          />
        ))}
      </div>
    </section>
  );
}

function ApprovalCard({
  supplier,
  onApprove,
  onReject,
}: {
  supplier: Supplier;
  onApprove: (remarks?: string) => void;
  onReject: (remarks?: string) => void;
}) {
  const { navigate } = useDashboardNavigation();
  const [remarks, setRemarks] = useState("");

  return (
    <article className="flex flex-col gap-4 rounded-xl border bg-card p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => navigate(`/suppliers/${supplier.id}`)}
            className="text-left text-base font-medium hover:underline"
          >
            {supplier.shopName}
          </button>
          <p className="text-xs text-muted-foreground">
            {supplier.shopCode} · {supplier.barangay} · registered{" "}
            {formatDate(supplier.registeredAt)}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          <Clock className="size-3" />
          Pending
        </span>
      </div>

      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <Detail label="Owner" value={supplier.owner} />
        <Detail label="Phone" value={supplier.phone} />
        <Detail label="Email" value={supplier.email} />
        <Detail label="Address" value={supplier.address} />
        <Detail label="Operating hours" value={formatHours(supplier.operatingHours)} />
        <Detail
          label="Pickup"
          value={`${supplier.pickupFrequency} · ${supplier.weeklyVolumeKg.toFixed(1)} kg/week`}
        />
        <Detail
          label="Est. monthly"
          value={`${monthlyVolume(supplier).toFixed(1)} kg`}
        />
      </dl>

      <div className="flex flex-col gap-2">
        <Textarea
          value={remarks}
          onChange={(event) => setRemarks(event.target.value)}
          placeholder="Verification remarks (required to reject)"
          rows={2}
          className="min-h-16"
        />
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="destructive"
            className="h-10 gap-1 px-3"
            disabled={remarks.trim().length === 0}
            onClick={() => onReject(remarks)}
          >
            <X className="size-4" />
            Reject
          </Button>
          <Button
            type="button"
            className="h-10 gap-1 px-3"
            onClick={() => onApprove(remarks)}
          >
            <Check className="size-4" />
            Approve shop
          </Button>
        </div>
      </div>
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
