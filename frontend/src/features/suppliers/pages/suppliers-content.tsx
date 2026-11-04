import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import {
  frequencyLabel,
  frequencyOptions,
  statusFromConsent,
  windowLabel,
  type PickupFrequency,
  type SupplierInput,
  type SupplierStatus,
} from "../data/suppliers-data";
import { useSuppliers } from "../store/suppliers-store";
import { Drawer } from "../components/drawer";
import { SupplierForm } from "../components/supplier-form";
import { SupplierPinMap } from "../components/supplier-map";
import { SupplierLink } from "../components/supplier-link";
import { FilterDropdown, SegmentedTabs, StatusBadge } from "../components/supplier-shared";

type StatusFilter = "all" | SupplierStatus;
type FrequencyFilter = "all" | PickupFrequency;
type View = "list" | "map";

const viewOptions: { value: View; label: string }[] = [
  { value: "list", label: "List" },
  { value: "map", label: "Map" },
];

// Main view of the Suppliers tab: every shop as a list or on a map.
// Clicking a shop opens its profile at /suppliers/:id.
export function SuppliersContent() {
  const { suppliers, addSupplier } = useSuppliers();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [frequency, setFrequency] = useState<FrequencyFilter>("all");
  const [barangay, setBarangay] = useState("all");
  const [view, setView] = useState<View>("list");
  const [registering, setRegistering] = useState(false);
  const [notice, setNotice] = useState<{ text: string; id: string } | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  const barangays = useMemo(() => [...new Set(suppliers.map((s) => s.barangay))].sort(), [suppliers]);

  const counts = {
    all: suppliers.length,
    enrolled: suppliers.filter((s) => s.status === "enrolled").length,
    candidate: suppliers.filter((s) => s.status === "candidate").length,
  };

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return suppliers.filter(
      (s) =>
        (status === "all" || s.status === status) &&
        (frequency === "all" || s.frequency === frequency) &&
        (barangay === "all" || s.barangay === barangay) &&
        (query === "" || s.shopName.toLowerCase().includes(query) || s.ownerName.toLowerCase().includes(query)),
    );
  }, [suppliers, search, status, frequency, barangay]);

  const handleRegister = (values: SupplierInput) => {
    const id = addSupplier(values);
    setRegistering(false);
    setNotice({
      id,
      text: `${values.shopName} was registered as ${
        statusFromConsent(values.consentParticipate) === "enrolled" ? "Enrolled" : "a Candidate"
      }.`,
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-8 pb-10 md:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Suppliers</h1>
          <p className="text-lg text-muted-foreground">Partner shops that give hair, and the candidates we are signing up</p>
        </div>
        <Button type="button" className="h-12 gap-2 px-6 text-base" onClick={() => setRegistering(true)}>
          <Plus className="size-5" />
          Register New Shop
        </Button>
      </div>

      {notice ? (
        <p role="status" className="flex flex-wrap items-center gap-2 rounded-lg bg-success/10 px-4 py-3 text-sm text-success">
          {notice.text}
          <SupplierLink href={`/suppliers/${notice.id}`} className="font-medium underline">View profile</SupplierLink>
        </p>
      ) : null}

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <InputGroup className="h-11 w-full border-none bg-secondary px-3 py-1 xl:max-w-sm">
            <InputGroupAddon className="pl-0">
              <Search className="size-3.5 text-input-addon-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              className="h-full p-0 px-1.5!"
              aria-label="Search shops"
              placeholder="Search by shop name or owner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>

          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
            <SegmentedTabs<StatusFilter>
              value={status}
              onChange={setStatus}
              options={[
                { value: "all", label: `All (${counts.all})` },
                { value: "enrolled", label: `Enrolled (${counts.enrolled})` },
                { value: "candidate", label: `Candidate (${counts.candidate})` },
              ]}
            />
            <FilterDropdown<FrequencyFilter>
              value={frequency}
              onChange={setFrequency}
              options={[{ value: "all", label: "All frequencies" }, ...frequencyOptions]}
            />
            <FilterDropdown
              value={barangay}
              onChange={setBarangay}
              options={[{ value: "all", label: "All barangays" }, ...barangays.map((b) => ({ value: b, label: b }))]}
              align="end"
            />
            <SegmentedTabs value={view} onChange={setView} options={viewOptions} />
          </div>
        </div>

        {view === "map" ? (
          <SupplierPinMap suppliers={rows} />
        ) : (
          <Table className="min-w-215">
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[16%]" />
              <col className="w-[15%]" />
              <col className="w-[18%]" />
              <col className="w-[14%]" />
              <col className="w-[13%]" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>Shop</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Barangay</TableHead>
                <TableHead>Pickup schedule</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No shops match your search or filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-normal">
                      <SupplierLink href={`/suppliers/${s.id}`} className="block truncate font-medium hover:underline">
                        {s.shopName}
                      </SupplierLink>
                      <p className="truncate text-xs text-muted-foreground">{s.id}</p>
                    </TableCell>
                    <TableCell>{s.ownerName}</TableCell>
                    <TableCell>{s.barangay}</TableCell>
                    <TableCell className="whitespace-normal">
                      <p>{frequencyLabel(s.frequency)}</p>
                      <p className="text-xs text-muted-foreground">{windowLabel(s)}</p>
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{s.phone}</TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        <p className="text-sm text-muted-foreground">
          Showing {rows.length} of {suppliers.length} shop{suppliers.length === 1 ? "" : "s"}
        </p>
      </div>

      <Drawer
        open={registering}
        title="Register new shop"
        description="Takes about two minutes. Shops never need a login."
        onClose={() => setRegistering(false)}
      >
        <SupplierForm barangays={barangays} onSubmit={handleRegister} onCancel={() => setRegistering(false)} />
      </Drawer>
    </div>
  );
}