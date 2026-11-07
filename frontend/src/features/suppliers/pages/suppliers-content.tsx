import { useEffect, useMemo, useState } from "react";
import { FileText, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
  frequencyLabel,
  frequencyOptions,
  type PickupFrequency,
  type SupplierStatus,
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
import { confirm } from "@/shared/ui/modal"; // 👈 Import the global modal

type StatusFilter = "all" | SupplierStatus;
type FrequencyFilter = "all" | PickupFrequency;
type View = "list" | "map";

const viewOptions: { value: View; label: string }[] = [
  { value: "list", label: "List" },
  { value: "map", label: "Map" },
];

export function SuppliersContent() {
  const { suppliers, addSupplier, deleteSupplier, loading } = useSuppliers();
  const canEdit = useCan("suppliers:edit");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [frequency, setFrequency] = useState<FrequencyFilter>("all");
  const [view, setView] = useState<View>("list");
  const [registering, setRegistering] = useState(false);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return suppliers.filter(
      (s) =>
        (status === "all" || s.status === status) &&
        (frequency === "all" || s.frequency === frequency) &&
        (query === "" ||
          s.shopName.toLowerCase().includes(query) ||
          s.ownerName.toLowerCase().includes(query) ||
          (s.address && s.address.toLowerCase().includes(query))), // 👈 Added address to search
    );
  }, [suppliers, search, status, frequency]);

  const handleRegister = async (formData: FormData) => {
    try {
      await addSupplier(formData);
      setRegistering(false);
      toast.success(`${formData.get("shopName")} was registered successfully.`);
    } catch (error: any) {
      toast.error(error.message || "Failed to register shop.");
    }
  };

  const handleDelete = (id: string, name: string) => {
    confirm({
      title: `Delete "${name}"?`,
      description:
        "This will permanently remove the supplier and their uploaded document.",
      confirmLabel: "Delete",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await deleteSupplier(id);
          toast.success(`${name} was removed.`);
        } catch (error: any) {
          toast.error(error.message || "Failed to delete supplier.");
        }
      },
    });
  };

  if (loading)
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading suppliers...
      </div>
    );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-8 pb-10 md:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Contributor</h1>
          <p className="text-lg text-muted-foreground">
            Partner shops that give hair, and the candidates we are signing up
          </p>
        </div>
        {canEdit ? (
          <Button
            type="button"
            className="h-12 gap-2 px-6 text-base"
            onClick={() => setRegistering(true)}
          >
            <Plus className="size-5" />
            Register New Shop
          </Button>
        ) : null}
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
              placeholder="Search by shop, owner, or address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>

          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
            <SegmentedTabs<StatusFilter>
              value={status}
              onChange={setStatus}
              options={[
                { value: "all", label: `All (${suppliers.length})` },
                { value: "enrolled", label: `Enrolled` },
                { value: "candidate", label: `Candidate` },
              ]}
            />
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
          <Table className="min-w-215">
            <colgroup>
              {/* 👈 Adjusted widths: Address gets more space */}
              <col className="w-[18%]" />
              <col className="w-[14%]" />
              <col className="w-[18%]" />
              <col className="w-[13%]" />
              <col className="w-[11%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[10%]" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>Shop</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Address</TableHead> {/* 👈 Changed from Barangay */}
                <TableHead>Pickup schedule</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No shops match your search or filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((s) => (
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
                    <TableCell>{s.ownerName}</TableCell>
                    <TableCell className="whitespace-normal">
                      {/* 👈 Changed from Barangay to Address */}
                      <span className="line-clamp-2">{s.address || "—"}</span>
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
                      <StatusBadge status={s.status} />
                    </TableCell>
                    <TableCell>
                      {s.consentDocument ? (
                        <a
                          href={`http://localhost:5001/${s.consentDocument}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                          title="View signed document"
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
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(s.id, s.shopName)}
                          className="inline-flex items-center gap-1.5 text-sm text-destructive hover:underline"
                          title="Delete supplier"
                        >
                          <Trash2 className="size-4" /> Remove
                        </button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
        <p className="text-sm text-muted-foreground">
          Showing {rows.length} of {suppliers.length} shop
          {suppliers.length === 1 ? "" : "s"}
        </p>
      </div>

      <Drawer
        open={registering}
        title="Register new shop"
        description="Takes about two minutes. Shops never need a login."
        onClose={() => setRegistering(false)}
      >
        <SupplierForm
          onSubmit={handleRegister}
          onCancel={() => setRegistering(false)}
        />
      </Drawer>
    </div>
  );
}
