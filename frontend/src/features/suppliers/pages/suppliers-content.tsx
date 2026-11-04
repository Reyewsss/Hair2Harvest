import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "../../../shared/ui/button.tsx";
import { SegmentedTabs, SummaryCard } from "../../../shared/ui/form-controls.tsx";
import { useSuppliers } from "../store/suppliers-store";
import { monthlyVolume } from "../data/suppliers-data";
import { DirectoryView } from "../views/directory-view";
import { ApprovalsView } from "../views/approvals-view";
import { RegistrationView } from "../views/registration-view";

type SupplierTab = "directory" | "approvals" | "registration";

export function SuppliersContent() {
  const { suppliers, pending, approved } = useSuppliers();
  const [tab, setTab] = useState<SupplierTab>("directory");

  const monthlyCapacity = approved.reduce(
    (sum, supplier) => sum + monthlyVolume(supplier),
    0,
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-8 pb-10 md:px-6">
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Supplier Registry</h1>
            <p className="text-lg text-muted-foreground">
              Barbershop onboarding, verification and collection preferences
            </p>
          </div>
          <Button
            type="button"
            className="h-10 gap-1 px-3.5"
            onClick={() => setTab("registration")}
          >
            <Plus className="size-5" />
            Register shop
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Registered shops"
            value={String(suppliers.length)}
            note={`${approved.length} approved`}
          />
          <SummaryCard
            label="Pending review"
            value={String(pending.length)}
            note={
              pending.length > 0 ? "Needs admin verification" : "Queue is clear"
            }
          />
          <SummaryCard
            label="Active barangays"
            value={String(new Set(approved.map((s) => s.barangay)).size)}
            note="With at least one approved shop"
          />
          <SummaryCard
            label="Expected monthly volume"
            value={`${monthlyCapacity.toFixed(1)} kg`}
            note="From approved collection preferences"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SegmentedTabs
            value={tab}
            onChange={setTab}
            options={[
              { value: "directory", label: "Directory" },
              {
                value: "approvals",
                label: `Approvals${pending.length ? ` (${pending.length})` : ""}`,
              },
              { value: "registration", label: "Registration" },
            ]}
          />
        </div>
      </section>

      {tab === "directory" ? <DirectoryView /> : null}
      {tab === "approvals" ? <ApprovalsView /> : null}
      {tab === "registration" ? (
        <RegistrationView onDone={() => setTab("directory")} />
      ) : null}
    </div>
  );
}
