import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../shared/ui/table.tsx";
import {
  fmtKg,
  formatDate,
  shopName,
  stockSummary,
  type LogType,
  type Pickup,
  type WeightLog,
} from "../data/inventory-data";
import {
  EmptyRow,
  FilterDropdown,
  LogTypeBadge,
  SummaryCard,
} from "../components/inventory-shared";

type TypeFilter = "all" | LogType;

const typeOptions: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All entries" },
  { value: "in", label: "Received" },
  { value: "rejected", label: "Rejected" },
  { value: "processed", label: "Processed" },
];

const LIMIT = 15;

export function StockView({
  logs,
  pickups,
}: {
  logs: WeightLog[];
  pickups: Pickup[];
}) {
  const [filter, setFilter] = useState<TypeFilter>("all");

  const { onHand, awaiting, received30, rejected30 } = stockSummary(
    logs,
    pickups,
  );

  const rows = useMemo(
    () =>
      logs
        .filter((l) => filter === "all" || l.type === filter)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [logs, filter],
  );

  return (
    <section className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Raw hair on hand"
          value={fmtKg(onHand)}
          note="Received minus processed"
        />
        <SummaryCard
          label="Awaiting delivery"
          value={fmtKg(awaiting)}
          note="Weighed, not yet at the site"
        />
        <SummaryCard label="Received, last 30 days" value={fmtKg(received30)} />
        <SummaryCard label="Rejected, last 30 days" value={fmtKg(rejected30)} />
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h2 className="text-lg font-medium">Weight Log</h2>
            <p className="text-sm text-muted-foreground">
              Every weight recorded for incoming, rejected and processed hair
            </p>
          </div>
          <FilterDropdown
            value={filter}
            options={typeOptions}
            onChange={setFilter}
            align="end"
          />
        </div>

        <Table className="min-w-215">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[30%]" />
            <col className="w-[16%]" />
            <col className="w-[16%]" />
            <col className="w-[20%]" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Reference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={5}>No entries yet.</EmptyRow>
            ) : (
              rows.slice(0, LIMIT).map((l) => (
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
                  <TableCell className="tabular-nums">
                    {l.type === "processed" ? "−" : l.type === "in" ? "+" : ""}
                    {fmtKg(l.kg)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {l.pickupId ?? l.batchId ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {rows.length > LIMIT ? (
          <p className="text-sm text-muted-foreground">
            Showing the latest {LIMIT} of {rows.length} entries.
          </p>
        ) : null}
      </div>
    </section>
  );
}
