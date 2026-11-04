import { useMemo, useState } from "react";
import { Download, MapPin, Search } from "lucide-react";
import { Button } from "../../../shared/ui/button.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../shared/ui/table.tsx";
import { FilterDropdown, fieldClass } from "../../../shared/ui/form-controls.tsx";
import { exportCsv } from "../../../shared/lib/export-csv.ts";
import { useDashboardNavigation } from "../../dashboard-shell/components/navigation";
import { useSuppliers } from "../store/suppliers-store";
import {
  barangays,
  monthlyVolume,
  statusOptions,
  type Supplier,
  type SupplierStatus,
} from "../data/suppliers-data";
import { StatusBadge } from "../components/supplier-badges";
import { EmptyRow } from "../../inventory/components/inventory-shared";
import { formatDate } from "../../inventory/data/inventory-data";

type BarangayFilter = (typeof barangays)[number] | "all";

const barangayOptions: { value: BarangayFilter; label: string }[] = [
  { value: "all", label: "All barangays" },
  ...barangays.map((barangay) => ({ value: barangay, label: barangay })),
];

const csvColumns: { key: keyof Supplier & string; label: string }[] = [
  { key: "shopCode", label: "Shop code" },
  { key: "shopName", label: "Shop" },
  { key: "owner", label: "Owner" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "barangay", label: "Barangay" },
  { key: "address", label: "Address" },
  { key: "pickupFrequency", label: "Pickup frequency" },
  { key: "weeklyVolumeKg", label: "Estimated weekly kg" },
  { key: "status", label: "Status" },
  { key: "registeredAt", label: "Registered" },
];

export function DirectoryView() {
  const { suppliers } = useSuppliers();
  const { navigate } = useDashboardNavigation();
  const [query, setQuery] = useState("");
  const [barangay, setBarangay] = useState<BarangayFilter>("all");
  const [status, setStatus] = useState<SupplierStatus | "all">("all");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return suppliers.filter((supplier) => {
      const matchesQuery =
        !needle ||
        [supplier.shopName, supplier.owner, supplier.email, supplier.shopCode]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      const matchesBarangay =
        barangay === "all" || supplier.barangay === barangay;
      const matchesStatus = status === "all" || supplier.status === status;
      return matchesQuery && matchesBarangay && matchesStatus;
    });
  }, [suppliers, query, barangay, status]);

  const totalMonthly = filtered
    .filter((supplier) => supplier.status === "approved")
    .reduce((sum, supplier) => sum + monthlyVolume(supplier), 0);

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search shop, owner, code or email"
            className={`${fieldClass} pl-9`}
            aria-label="Search suppliers"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterDropdown
            value={barangay}
            options={barangayOptions}
            onChange={setBarangay}
            icon={MapPin}
          />
          <FilterDropdown
            value={status}
            options={statusOptions}
            onChange={setStatus}
          />
          <Button
            type="button"
            variant="secondary"
            className="h-10 gap-1 px-3"
            onClick={() =>
              exportCsv("supplier-registry", filtered, csvColumns)
            }
          >
            <Download className="size-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm text-muted-foreground">
        <span>
          <strong className="font-medium text-foreground">
            {filtered.length}
          </strong>{" "}
          of {suppliers.length} shops
        </span>
        <span>
          Approved monthly volume{" "}
          <strong className="font-medium text-foreground">
            {totalMonthly.toFixed(1)} kg
          </strong>
        </span>
      </div>

      <Table className="min-w-215">
        <colgroup>
          <col className="w-[24%]" />
          <col className="w-[20%]" />
          <col className="w-[14%]" />
          <col className="w-[14%]" />
          <col className="w-[12%]" />
          <col className="w-[16%]" />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead>Shop</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Barangay</TableHead>
            <TableHead>Pickup</TableHead>
            <TableHead>Est. weekly</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <EmptyRow colSpan={6}>
              No shops match these filters.
            </EmptyRow>
          ) : (
            filtered.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => navigate(`/suppliers/${supplier.id}`)}
                    className="text-left font-medium hover:underline"
                  >
                    {supplier.shopName}
                  </button>
                  <p className="text-xs text-muted-foreground">
                    {supplier.shopCode} · joined {formatDate(supplier.registeredAt)}
                  </p>
                </TableCell>
                <TableCell>
                  <p>{supplier.owner}</p>
                  <p className="text-xs text-muted-foreground">
                    {supplier.phone}
                  </p>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {supplier.barangay}
                </TableCell>
                <TableCell className="text-muted-foreground capitalize">
                  {supplier.pickupFrequency}
                </TableCell>
                <TableCell className="tabular-nums">
                  {supplier.weeklyVolumeKg.toFixed(1)} kg
                </TableCell>
                <TableCell>
                  <StatusBadge status={supplier.status} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </section>
  );
}
