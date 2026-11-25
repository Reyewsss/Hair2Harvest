// StockView.tsx
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
  fmtSacks,
  formatDate,
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
import { useSuppliers } from "@/features/suppliers/store/suppliers-store";
import { TablePager, usePaged } from "@/shared/ui/table-pager";

type TypeFilter = "all" | LogType;

const typeOptions: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All entries" },
  { value: "in", label: "Received" },
  { value: "rejected", label: "Rejected" },
  { value: "processed", label: "Processed" },
];

export function StockView({
  logs = [],
  pickups = [],
}: {
  logs?: WeightLog[];
  pickups?: Pickup[];
}) {
  const [filter, setFilter] = useState<TypeFilter>("all");

  const { suppliers } = useSuppliers();
  const supplierByCode = useMemo(
    () => new Map(suppliers.map((s) => [String(s.id), s])),
    [suppliers],
  );

  const resolveShopName = (shopId: string | undefined): string => {
    if (!shopId) return "—";
    const supplier = supplierByCode.get(String(shopId));
    return supplier?.shopName ?? String(shopId);
  };

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

  const paged = usePaged(rows); // 10 rows per page

  return (
    <section className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Sacks on hand"
          value={fmtSacks(onHand)}
          note="Received minus processed"
          hint={"Raw-hair sacks currently stored at the site.\nAll sacks received, minus the sacks taken out for composting batches."}
        />
        <SummaryCard
          label="Awaiting delivery"
          value={fmtSacks(awaiting)}
          note="Collected, not yet at the site"
          hint={"Sacks staff have already collected from shops but that haven't been delivered yet.\nThey join the stock once delivery is verified."}
        />
        <SummaryCard
          label="Received, last 30 days"
          value={fmtSacks(received30)}
          hint="Sacks logged as received in the last 30 days (rejected sacks are not counted)."
        />
        <SummaryCard
          label="Rejected, last 30 days"
          value={fmtSacks(rejected30)}
          hint="Sacks turned away at the site in the last 30 days, for example for contamination."
        />
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h2 className="text-lg font-medium">Sack Log</h2>
            <p className="text-sm text-muted-foreground">
              Every sack count recorded for incoming, rejected and processed hair
            </p>
          </div>
          <FilterDropdown
            value={filter}
            options={typeOptions}
            onChange={(value) => {
              setFilter(value);
              paged.setPage(1);
            }}
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
              <TableHead>Sacks</TableHead>
              <TableHead>Reference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={5}>No entries yet.</EmptyRow>
            ) : (
              paged.rows.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-muted-foreground">
                    {formatDate(l.date)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {resolveShopName(l.shopId)}
                  </TableCell>
                  <TableCell>
                    <LogTypeBadge type={l.type} />
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {l.type === "processed" ? "−" : l.type === "in" ? "+" : ""}
                    {fmtSacks(l.sacks)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {l.pickupId ?? l.batchId ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePager {...paged} />
      </div>
    </section>
  );
}