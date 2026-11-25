import { useState } from "react";
import { Check, Globe, ShieldCheck, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { closeModal, confirm, openModal } from "@/shared/ui/modal";
import { showResult } from "@/shared/ui/result-modal";
import { formatDate } from "@/features/inventory/data/inventory-data";
import type { Supplier } from "../data/suppliers-data";

export type Review = (status: "approved" | "rejected", remarks?: string) => Promise<unknown>;

/** Asks for confirmation, then approves (enrolls) the shop. */
export function approveShop(supplier: Supplier, onReview: Review) {
  confirm({
    title: `Approve ${supplier.shopName}?`,
    description:
      "The shop becomes Enrolled, so pickups can be scheduled and SMS reminders sent.",
    confirmLabel: "Approve & enroll",
    onConfirm: async () => {
      try {
        await onReview("approved");
        showResult({ type: "success", title: `${supplier.shopName} approved and enrolled` });
      } catch (err: any) {
        showResult({ type: "error", title: "Couldn't approve shop", message: err?.message || "Please try again." });
      }
    },
  });
}

/** Opens the reject dialog (a reason is required). */
export function rejectShop(supplier: Supplier, onReview: Review) {
  openModal({
    size: "sm",
    content: (
      <RejectForm
        shopName={supplier.shopName}
        onSubmit={async (remarks) => {
          await onReview("rejected", remarks);
          closeModal();
          showResult({ type: "info", title: `${supplier.shopName} rejected` });
        }}
      />
    ),
  });
}

/** What an admin should check before approving a web sign-up. */
export function missingInfo(supplier: Supplier) {
  return [
    !supplier.phone && "phone",
    !supplier.street && "street",
    !supplier.consentParticipate && "consent",
  ].filter(Boolean) as string[];
}

/**
 * Shown on a candidate shop that signed up through the website. An admin checks the
 * details and approves (enrolls) or rejects it with a reason.
 */
export function ReviewPanel({
  supplier,
  canApprove,
  onReview,
}: {
  supplier: Supplier;
  canApprove: boolean;
  onReview: Review;
}) {
  const rejected = supplier.review === "rejected";
  const source = supplier.registrationSource === "web" ? "the website" : "self sign-up";
  const missing = missingInfo(supplier);

  const approve = () => approveShop(supplier, onReview);
  const reject = () => rejectShop(supplier, onReview);

  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 md:flex-row md:items-center md:justify-between md:p-5 animate-in fade-in slide-in-from-top-2">
      <div className="flex gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-full ${rejected ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
          {rejected ? <X className="size-5" /> : <ShieldCheck className="size-5" />}
        </span>
        <div className="space-y-1">
          <p className="font-medium">
            {rejected ? "Rejected" : "Waiting for admin approval"}
          </p>
          <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <Globe className="size-3.5" />
            Registered through {source}
            {supplier.registeredAt ? ` on ${formatDate(supplier.registeredAt.slice(0, 10))}` : ""}.
            {rejected && supplier.remarks ? ` Reason: ${supplier.remarks}` : ""}
          </p>
          {missing.length > 0 && !rejected ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Check before approving: no {missing.join(", ")} on file. You can add these in Edit Details.
            </p>
          ) : null}
        </div>
      </div>

      {canApprove ? (
        <div className="flex shrink-0 flex-wrap gap-2">
          {!rejected ? (
            <Button type="button" variant="outline" className="h-10 gap-1.5" onClick={reject}>
              <X className="size-4" />
              Reject
            </Button>
          ) : null}
          <Button type="button" className="h-10 gap-1.5" onClick={approve}>
            <Check className="size-4" />
            {rejected ? "Approve anyway" : "Approve & enroll"}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Only an admin can approve this shop.</p>
      )}
    </section>
  );
}

function RejectForm({
  shopName,
  onSubmit,
}: {
  shopName: string;
  onSubmit: (remarks: string) => Promise<void>;
}) {
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!remarks.trim()) return setError("Give a short reason so the team knows why.");
        setBusy(true);
        try {
          await onSubmit(remarks.trim());
        } catch (err: any) {
          setError(err?.message || "Couldn't reject the shop.");
          setBusy(false);
        }
      }}
    >
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Reject {shopName}?</h2>
        <p className="text-sm text-muted-foreground">The shop stays on the list as Rejected. You can approve it later.</p>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Reason
        <textarea
          autoFocus
          rows={3}
          maxLength={300}
          className="w-full resize-none rounded-lg border-none bg-secondary px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          placeholder="e.g. Outside the Novaliches service area"
          value={remarks}
          onChange={(e) => {
            setRemarks(e.target.value);
            setError("");
          }}
        />
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={closeModal} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="destructive" disabled={busy}>
          {busy ? "Rejecting…" : "Reject shop"}
        </Button>
      </div>
    </form>
  );
}
