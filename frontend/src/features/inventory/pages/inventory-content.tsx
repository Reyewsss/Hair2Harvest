import { CalendarPlus, ChevronRight } from "lucide-react";
import { Button } from "../../../shared/ui/button.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../shared/ui/table.tsx";
import {
  TODAY,
  fmtKg,
  formatDate,
  formatTime,
  shopArea,
  shopName,
  stockSummary,
  volumeByPeriod,
  type Pickup,
  type WeightLog,
} from "../data/inventory-data";
import { inventoryHref } from "../data/inventory-tabs";
import {
  LogTypeBadge,
  StageBadge,
  SummaryCard,
} from "../components/inventory-shared";
import { InventoryLink } from "../components/inventory-link";
import { VolumeChart } from "../components/volume-chart";
import { useInventory } from "../store/inventory-store";

// Overview dashboard for /inventory. The six sub-pages live in the sidebar dropdown.
export function InventoryContent() {
  const { pickups, logs } = useInventory();
  const stock = stockSummary(logs, pickups);

  const dueToday = pickups.filter((p) => p.date === TODAY);
  const toCollect = dueToday.filter((p) => p.stage === "scheduled").length;
  const rejectionRate =
    stock.received30 + stock.rejected30 > 0
      ? (stock.rejected30 / (stock.received30 + stock.rejected30)) * 100
      : 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pt-8 pb-10 md:px-6">
      <section className="flex flex-col gap-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Inventory Overview</h1>
            <p className="text-lg text-muted-foreground">
              Raw-hair stock, pickups and collection volume at a glance
            </p>
          </div>
          <Button
            type="button"
            className="h-10 gap-1 px-3.5"
            render={<InventoryLink href={inventoryHref("schedule")} />}
          >
            <CalendarPlus className="size-5" />
            Schedule pickup
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Raw hair on hand"
            value={fmtKg(stock.onHand)}
            note="Received minus processed"
          />
          <SummaryCard
            label="Awaiting delivery"
            value={fmtKg(stock.awaiting)}
            note="Weighed, not yet at the site"
          />
          <SummaryCard
            label="Pickups today"
            value={String(dueToday.length)}
            note={
              toCollect > 0 ? `${toCollect} still to collect` : "All collected"
            }
          />
          <SummaryCard
            label="Collected, last 30 days"
            value={fmtKg(Math.round(stock.received30 * 10) / 10)}
            note={`${fmtKg(Math.round(stock.rejected30 * 10) / 10)} rejected (${rejectionRate.toFixed(1)}%)`}
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <VolumeChart
          title="Volume collected"
          subtitle="Per week, last 6 weeks"
          volumes={volumeByPeriod(logs, "weekly")}
        />
        <UpcomingPickups pickups={pickups} />
      </section>

      <LatestLog logs={logs} />
    </div>
  );
}

function UpcomingPickups({ pickups }: { pickups: Pickup[] }) {
  const upcoming = pickups
    .filter((p) => p.stage !== "delivered" && p.date >= TODAY)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .slice(0, 5);

  return (
    <article className="flex flex-col rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3 md:px-5">
        <h3 className="text-base font-medium">Upcoming pickups</h3>
        <InventoryLink
          href={inventoryHref("tracking")}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Track
        </InventoryLink>
      </div>
      {upcoming.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          No upcoming pickups.
        </p>
      ) : (
        <ul className="divide-y">
          {upcoming.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 px-4 py-3 md:px-5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {shopName(p.shopId)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDate(p.date)}, {formatTime(p.time)} ·{" "}
                  {shopArea(p.shopId)}
                </p>
              </div>
              <StageBadge stage={p.stage} />
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function LatestLog({ logs }: { logs: WeightLog[] }) {
  const recent = [...logs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Latest Weight Log</h2>
          <p className="text-sm text-muted-foreground">
            Most recent hair received, rejected and processed
          </p>
        </div>
        <Button
          variant="secondary"
          className="gap-1 pr-2 pl-3"
          render={<InventoryLink href={inventoryHref("stock")} />}
        >
          See all
          <ChevronRight className="size-5" />
        </Button>
      </div>

      <Table className="min-w-215">
        <colgroup>
          <col className="w-[20%]" />
          <col className="w-[34%]" />
          <col className="w-[20%]" />
          <col className="w-[26%]" />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Weight</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recent.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="text-muted-foreground">
                {formatDate(l.date)}
              </TableCell>
              <TableCell className="font-medium">
                {shopName(l.shopId)}
              </TableCell>
              <TableCell>
                <LogTypeBadge type={l.type} />
              </TableCell>
              <TableCell className="tabular-nums">{fmtKg(l.kg)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
