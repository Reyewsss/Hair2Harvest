import { ChevronLeft } from "lucide-react";
import { INVENTORY_HREF, isInventoryTab } from "../data/inventory-tabs";
import { InventoryLink } from "../components/inventory-link";
import { useInventory } from "../store/inventory-store";
import { InventoryContent } from "./inventory-content";
import { StockView } from "../views/stock-view";

export function InventoryViewPage({ tab }: { tab: string | undefined }) {
  const { logs, loading } = useInventory();

  // Unknown sub-page: fall back to the overview.
  if (!isInventoryTab(tab)) return <InventoryContent />;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pt-8 pb-10 md:px-6">
      <div className="space-y-3">
        <InventoryLink
          href={INVENTORY_HREF}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Inventory overview
        </InventoryLink>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Inventory</h1>
          <p className="text-lg text-muted-foreground">Manage raw-hair stock</p>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">
          Loading logs...
        </div>
      ) : (
        tab === "stock" && <StockView logs={logs} pickups={[]} />
      )}
    </div>
  );
}
