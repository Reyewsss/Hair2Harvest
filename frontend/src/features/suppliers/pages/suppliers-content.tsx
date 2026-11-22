import { API_BASE } from "@/lib/api";
import { useMemo, useState } from "react";
import { Check, FileText, Globe, Plus, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/shared/ui/input-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import {
  displayName, // 👈 IMPORT THIS
  formatAddress,
  frequencyLabel,
  frequencyOptions,
  type PickupFrequency,
  type Supplier,
  windowLabel,
} from "../data/suppliers-data";
import { useCan } from "@/features/auth/access";
import { useSuppliers } from "../store/suppliers-store";
import { Drawer } from "../components/drawer";
import { SupplierForm } from "../components/supplier-form";
import { SupplierPinMap } from "../components/supplier-map";
import { SupplierLink } from "../components/supplier-link";
import {
  FilterDropdown,
  SegmentedTabs,
  StatusBadge,
} from "../components/supplier-shared";
import { confirm } from "@/shared/ui/modal";
import { isDuplicateError, showResult } from "@/shared/ui/result-modal";
import {
  DOCUMENT_RULE,
  formatBytes,
  validateFile,
} from "@/lib/upload-validation";
import { LeafLoader } from "@/shared/ui/leaf-loader";
import { formatDate } from "@/features/inventory/data/inventory-data";
import { approveShop, missingInfo, rejectShop } from "../components/review-panel";

// Consent PDFs are private; the API streams them only to logged-in users.

type FrequencyFilter = "all" | PickupFrequency;
type View = "list" | "map";

const viewOptions: { value: View; label: string }[] = [
  { value: "list", label: "List" },
  { value: "map", label: "Map" },
];

export function SuppliersContent() {
  const { suppliers, addSupplier, deleteSupplier, reviewSupplier, loading } = useSuppliers();
  const canEdit = useCan("suppliers:edit");
  const canApprove = useCan("suppliers:approve");
  const [search, setSearch] = useState("");
  const [frequency, setFrequency] = useState<FrequencyFilter>("all");
  const [view, setView] = useState<View>("list");
  const [registering, setRegistering] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return suppliers.filter(
      (s) =>
        (frequency === "all" || s.frequency === frequency) &&
        (query === "" ||
          s.shopName.toLowerCase().includes(query) ||
          // 👇 Use displayName safely
          displayName(s).toLowerCase().includes(query) ||
          (s.street || "").toLowerCase().includes(query) ||
          (s.unit && s.unit.toLowerCase().includes(query))),
    );
  }, [suppliers, search, frequency]);

  // Three lists: enrolled partners, candidates waiting for review, and rejected shops.
  const enrolled = rows.filter((s) => s.status === "enrolled");
  const candidates = rows.filter((s) => s.status !== "enrolled" && s.review !== "rejected");
  const rejected = rows.filter((s) => s.status !== "enrolled" && s.review === "rejected");
  const filtered = search.trim() !== "" || frequency !== "all";
  const review = (s: Supplier) => (status: "approved" | "rejected", remarks?: string) =>
    reviewSupplier(s.id, status, remarks);

  const handleRegister = async (formData: FormData) => {
    const shopName = String(formData.get("shopName") ?? "").trim();
    const street = String(formData.get("street") ?? "").trim();
    const owner = [formData.get("firstName"), formData.get("lastName")]
      .map((v) => String(v ?? "").trim())
      .filter(Boolean)
      .join(" ");
    const phone = String(formData.get("phone") ?? "").trim();

    const details = [
      { label: "Shop", value: shopName || "—" },
      ...(owner ? [{ label: "Owner", value: owner }] : []),
      ...(street ? [{ label: "Street", value: street }] : []),
      ...(phone ? [{ label: "Phone", value: phone }] : []),
    ];

    // Validate every uploaded file (consent document etc.) before sending.
    for (const [field, value] of formData.entries()) {
      if (!(value instanceof File) || (value.size === 0 && !value.name))
        continue;
      const problem = validateFile(value, DOCUMENT_RULE);
      if (problem) {
        showResult({
          type: "warning",
          title: "Check the uploaded file",
          message: `${value.name || field}: ${problem}`,
          details: [
            { label: "Allowed", value: "PDF, JPG, PNG" },
            { label: "Max size", value: formatBytes(DOCUMENT_RULE.maxBytes) },
          ],
        });
        return;
      }
    }

    // Same shop name on the same street is treated as already registered.
    const duplicate = suppliers.find(
      (s) =>
        s.shopName.trim().toLowerCase() === shopName.toLowerCase() &&
        (s.street || "").trim().toLowerCase() === street.toLowerCase(),
    );
    if (duplicate) {
      showResult({
        type: "exists",
        title: "Shop already registered",
        message: `${duplicate.shopName} is already registered at this address.`,
        details,
      });
      return;
    }

    setSubmitting(true);
    try {
      await addSupplier(formData);
      setRegistering(false);
      showResult({
        type: "created",
        title: "Shop registered",
        message: `${shopName} was added as a partner shop.`,
        details,
      });
    } catch (error: any) {
      if (isDuplicateError(error)) {
        showResult({
          type: "exists",
          title: "Shop already registered",
          message:
            error?.message && !/E11000/i.test(error.message)
              ? error.message
              : "A shop with these details already exists.",
          details,
        });
      } else {
        showResult({
          type: "error",
          title: "Couldn't register shop",
          message: error?.message || "Please try again.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    confirm({
      title: `Delete "${name}"?`,
      description:
        "This will permanently remove the supplier and their consent document.",
      confirmLabel: "Delete",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await deleteSupplier(id);
          showResult({
            type: "deleted",
            title: "Shop removed",
            message: `${name} and its consent document were permanently removed.`,
          });
        } catch (error: any) {
          showResult({
            type: "error",
            title: "Couldn't remove shop",
            message: error?.message || "Please try again.",
          });
        }
      },
    });
  };

  if (loading)
    return (
      <LeafLoader label="Loading contributors" page />
    );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-8 pb-10 md:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Contributor</h1>
          <p className="text-lg text-muted-foreground">
            Partner shops in Barangay Novaliches Proper.
          </p>
        </div>
        {canEdit && (
          <Button
            type="button"
            className="h-12 gap-2 px-6 text-base"
            onClick={() => setRegistering(true)}
          >
            <Plus className="size-5" />
            Register New Shop
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <InputGroup className="h-11 w-full border-none bg-secondary px-3 py-1 xl:max-w-sm">
            <InputGroupAddon className="pl-0">
              <Search className="size-3.5 text-input-addon-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              className="h-full p-0 px-1.5!"
              aria-label="Search shops"
              placeholder="Search by shop, owner, or street..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
            <FilterDropdown<FrequencyFilter>
              value={frequency}
              onChange={setFrequency}
              options={[
                { value: "all", label: "All frequencies" },
                ...frequencyOptions,
              ]}
            />
            <SegmentedTabs
              value={view}
              onChange={setView}
              options={viewOptions}
            />
          </div>
        </div>

        {view === "map" ? (
          <SupplierPinMap suppliers={rows} />
        ) : (
          <>
          <SectionHeading
            title="Enrolled shops"
            count={enrolled.length}
            note="Approved partners. Pickups can be scheduled for these shops."
          />
          <Table className="min-w-215">
            <colgroup>
              <col className="w-[16%]" />
              <col className="w-[12%]" />
              <col className="w-[20%]" />
              <col className="w-[14%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[8%]" />
              <col className="w-[10%]" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>Shop</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Pickup schedule</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrolled.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-10 text-center text-muted-foreground"
                  >
                    {filtered
                      ? "No enrolled shops match your search or filters."
                      : "No enrolled shops yet."}
                  </TableCell>
                </TableRow>
              ) : (
                enrolled.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-normal">
                      <SupplierLink
                        href={`/suppliers/${s.id}`}
                        className="block truncate font-medium hover:underline"
                      >
                        {s.shopName}
                      </SupplierLink>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.id}
                      </p>
                    </TableCell>
                    {/* 👇 Safely display name */}
                    <TableCell>{displayName(s)}</TableCell>
                    <TableCell className="whitespace-normal">
                      <span className="line-clamp-2">
                        {formatAddress(s) || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <p>{frequencyLabel(s.frequency)}</p>
                      <p className="text-xs text-muted-foreground">
                        {windowLabel(s)}
                      </p>
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {s.phone}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} review={s.review} />
                    </TableCell>
                    <TableCell>
                      {s.consentDocument ? (
                        <a
                          href={`${API_BASE}/suppliers/${encodeURIComponent(s.id)}/consent`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                        >
                          <FileText className="size-5" /> View
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          None
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleDelete(s.id, s.shopName)}
                          className="inline-flex items-center gap-1.5 text-sm text-destructive hover:underline"
                        >
                          <Trash2 className="size-4" /> Remove
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <SectionHeading
            icon={<ShieldCheck className="size-5 text-primary" />}
            title="Candidates"
            count={candidates.length}
            note="Waiting for an admin to check and approve before they are enrolled."
          />
          <ReviewTable
            shops={candidates}
            kind="candidate"
            canApprove={canApprove}
            canEdit={canEdit}
            onApprove={(s) => approveShop(s, review(s))}
            onReject={(s) => rejectShop(s, review(s))}
            onDelete={(s) => handleDelete(s.id, s.shopName)}
            empty={filtered ? "No candidates match your search or filters." : "No shops waiting for approval."}
          />

          <SectionHeading
            icon={<X className="size-5 text-destructive" />}
            title="Rejected"
            count={rejected.length}
            note="Turned down during review. They can still be approved later."
          />
          <ReviewTable
            shops={rejected}
            kind="rejected"
            canApprove={canApprove}
            canEdit={canEdit}
            onApprove={(s) => approveShop(s, review(s))}
            onReject={(s) => rejectShop(s, review(s))}
            onDelete={(s) => handleDelete(s.id, s.shopName)}
            empty={filtered ? "No rejected shops match your search or filters." : "No rejected shops."}
          />
          </>
        )}
        <p className="text-sm text-muted-foreground">
          Showing {rows.length} of {suppliers.length} shop
          {suppliers.length === 1 ? "" : "s"}
        </p>
      </div>

      <Drawer
        open={registering}
        title="Register new shop"
        description="Admin registration — verified on submit."
        onClose={() => setRegistering(false)}
      >
        <SupplierForm
          onSubmit={handleRegister}
          onCancel={() => setRegistering(false)}
          busy={submitting}
        />
      </Drawer>
    </div>
  );
}

function SectionHeading({
  title,
  count,
  note,
  icon,
}: {
  title: string;
  count: number;
  note: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mt-4 flex items-start gap-2 first:mt-0">
      {icon ? <span className="mt-1">{icon}</span> : null}
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-lg font-medium">
          {title}
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {count}
          </span>
        </h2>
        <p className="text-sm text-muted-foreground">{note}</p>
      </div>
    </div>
  );
}

const sourceLabel = (s: Supplier) =>
  s.registrationSource === "web" ? "Website" : s.registrationSource === "admin" ? "Admin" : "Self sign-up";

function ReviewTable({
  shops,
  kind,
  canApprove,
  canEdit,
  onApprove,
  onReject,
  onDelete,
  empty,
}: {
  shops: Supplier[];
  kind: "candidate" | "rejected";
  canApprove: boolean;
  canEdit: boolean;
  onApprove: (s: Supplier) => void;
  onReject: (s: Supplier) => void;
  onDelete: (s: Supplier) => void;
  empty: string;
}) {
  return (
    <Table className="min-w-215">
      <colgroup>
        <col className="w-[18%]" />
        <col className="w-[13%]" />
        <col className="w-[19%]" />
        <col className="w-[12%]" />
        <col className="w-[12%]" />
        <col className="w-[13%]" />
        <col className="w-[13%]" />
      </colgroup>
      <TableHeader>
        <TableRow>
          <TableHead>Shop</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead>Address</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Registered</TableHead>
          <TableHead>{kind === "rejected" ? "Reason" : "To check"}</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {shops.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
              {empty}
            </TableCell>
          </TableRow>
        ) : (
          shops.map((s) => {
            const missing = missingInfo(s);
            // Admin-registered shops are verified on entry; they enroll by recording consent.
            const reviewable = s.registrationSource !== "admin";
            return (
              <TableRow key={s.id}>
                <TableCell className="whitespace-normal">
                  <SupplierLink
                    href={`/suppliers/${s.id}`}
                    className="block truncate font-medium hover:underline"
                  >
                    {s.shopName}
                  </SupplierLink>
                  <p className="truncate text-xs text-muted-foreground">{s.id}</p>
                </TableCell>
                <TableCell>{displayName(s)}</TableCell>
                <TableCell className="whitespace-normal">
                  <span className="line-clamp-2">{formatAddress(s) || "—"}</span>
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">{s.phone || "—"}</TableCell>
                <TableCell className="whitespace-normal">
                  <p>{s.registeredAt ? formatDate(s.registeredAt.slice(0, 10)) : "—"}</p>
                  <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    {s.registrationSource === "web" ? <Globe className="size-3" /> : null}
                    {sourceLabel(s)}
                  </p>
                </TableCell>
                <TableCell className="whitespace-normal text-sm">
                  {kind === "rejected" ? (
                    <span className="line-clamp-2 text-muted-foreground">{s.remarks || "—"}</span>
                  ) : !reviewable ? (
                    <span className="text-muted-foreground">Needs consent</span>
                  ) : missing.length ? (
                    <span className="text-amber-700 dark:text-amber-400">No {missing.join(", ")}</span>
                  ) : (
                    <span className="text-success">Complete</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {canApprove && reviewable ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onApprove(s)}
                          className="inline-flex items-center gap-1 text-sm text-success hover:underline"
                        >
                          <Check className="size-4" /> Approve
                        </button>
                        {kind === "candidate" ? (
                          <button
                            type="button"
                            onClick={() => onReject(s)}
                            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline"
                          >
                            <X className="size-4" /> Reject
                          </button>
                        ) : null}
                      </>
                    ) : (
                      <SupplierLink href={`/suppliers/${s.id}`} className="text-sm text-primary hover:underline">
                        Open
                      </SupplierLink>
                    )}
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => onDelete(s)}
                        className="inline-flex items-center gap-1 text-sm text-destructive hover:underline"
                      >
                        <Trash2 className="size-4" /> Remove
                      </button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
