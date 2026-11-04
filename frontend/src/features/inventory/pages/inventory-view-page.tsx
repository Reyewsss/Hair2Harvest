import { ChevronLeft } from "lucide-react";
import { INVENTORY_HREF, isInventoryTab } from "../data/inventory-tabs";
import { InventoryLink } from "../components/inventory-link";
import { useInventory } from "../store/inventory-store";
import { InventoryContent } from "./inventory-content";
import { ScheduleView } from "../views/schedule-view";
import { TrackingView } from "../views/tracking-view";
import { StockView } from "../views/stock-view";
import { RejectedView } from "../views/rejected-view";
import { HistoryView } from "../views/history-view";
import { ReportsView } from "../views/reports-view";

// Page for /inventory/:tab. Pass the `tab` route param straight in.
export function InventoryViewPage({ tab }: { tab: string | undefined }) {
  const { pickups, logs, addPickup, advance, addRejection } = useInventory();

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
          <p className="text-lg text-muted-foreground">
            Plan pickups, track collections and manage raw-hair stock
          </p>
        </div>
      </div>

      {tab === "schedule" && (
        <ScheduleView pickups={pickups} onAdd={addPickup} />
      )}
      {tab === "tracking" && (
        <TrackingView pickups={pickups} onAdvance={advance} />
      )}
      {tab === "stock" && <StockView logs={logs} pickups={pickups} />}
      {tab === "rejected" && <RejectedView logs={logs} onAdd={addRejection} />}
      {tab === "history" && <HistoryView pickups={pickups} />}
      {tab === "reports" && <ReportsView logs={logs} />}
    </div>
  );
}
