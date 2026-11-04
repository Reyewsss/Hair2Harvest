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
  shops,
  type Pickup,
} from "../data/inventory-data";
import {
  EmptyRow,
  FilterDropdown,
  SegmentedTabs,
  StageBadge,
} from "../components/inventory-shared";

type Mode = "supplier" | "batch";

const modeOptions: { value: Mode; label: string }[] = [
  { value: "supplier", label: "By supplier" },
  { value: "batch", label: "By batch" },
];

export function HistoryView({ pickups }: { pickups: Pickup[] }) {
  const [mode, setMode] = useState<Mode>("supplier");
  const [shopId, setShopId] = useState(shops[0].id);

  const batchIds = useMemo(
    () =>
      [
        ...new Set(
          pickups
            .map((p) => p.batchId)
            .filter((id): id is string => Boolean(id)),
        ),
      ]
        .sort()
        .reverse(),
    [pickups],
  );
  const [batchId, setBatchId] = useState(batchIds[0] ?? "");

  const rows = useMemo(
    () =>
      pickups
        .filter((p) =>
          mode === "supplier" ? p.shopId === shopId : p.batchId === batchId,
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [pickups, mode, shopId, batchId],
  );

  const totalKg = rows.reduce((sum, p) => sum + (p.weight ?? 0), 0);

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Pickup History</h2>
          <p className="text-sm text-muted-foreground">
            {rows.length} pickup{rows.length === 1 ? "" : "s"} ·{" "}
            {fmtKg(totalKg)} collected
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SegmentedTabs
            value={mode}
            options={modeOptions}
            onChange={setMode}
          />
          {mode === "supplier" ? (
            <FilterDropdown
              value={shopId}
              options={shops.map((s) => ({ value: s.id, label: s.name }))}
              onChange={setShopId}
              align="end"
            />
          ) : (
            <FilterDropdown
              value={batchId}
              options={batchIds.map((id) => ({ value: id, label: id }))}
              onChange={setBatchId}
              align="end"
            />
          )}
        </div>
      </div>

      <Table className="min-w-215">
        <colgroup>
          <col className="w-[20%]" />
          <col className="w-[16%]" />
          <col className="w-[28%]" />
          <col className="w-[16%]" />
          <col className="w-[20%]" />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Pickup</TableHead>
            <TableHead>{mode === "supplier" ? "Batch" : "Supplier"}</TableHead>
            <TableHead>Weight</TableHead>
            <TableHead>Stage</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <EmptyRow colSpan={5}>No pickups found.</EmptyRow>
          ) : (
            rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-muted-foreground">
                  {formatDate(p.date)}
                </TableCell>
                <TableCell className="font-mono">{p.id}</TableCell>
                <TableCell className="font-medium">
                  {mode === "supplier"
                    ? (p.batchId ?? (
                        <span className="font-normal text-muted-foreground">
                          Not yet assigned
                        </span>
                      ))
                    : shopName(p.shopId)}
                </TableCell>
                <TableCell className="tabular-nums">
                  {p.weight ? fmtKg(p.weight) : "—"}
                </TableCell>
                <TableCell>
                  <StageBadge stage={p.stage} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </section>
  );
}
