import { useMemo, useState } from "react";
import { Download } from "lucide-react";
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
  fmtKg,
  periodBuckets,
  shops,
  volumeByPeriod,
  type WeightLog,
} from "../data/inventory-data";
import { FilterDropdown } from "../components/inventory-shared";
import { VolumeChart } from "../components/volume-chart";

type Period = "weekly" | "monthly";

const periodOptions: { value: Period; label: string }[] = [
  { value: "weekly", label: "Weekly (6 weeks)" },
  { value: "monthly", label: "Monthly (6 months)" },
];

const round = (n: number) => Math.round(n * 10) / 10;

export function ReportsView({ logs }: { logs: WeightLog[] }) {
  const [period, setPeriod] = useState<Period>("weekly");
  const buckets = useMemo(() => periodBuckets(period), [period]);
  const windowStart = buckets[0].start;
  const windowEnd = buckets[buckets.length - 1].end;

  const volumes = useMemo(() => volumeByPeriod(logs, period), [logs, period]);

  const perShop = useMemo(
    () =>
      shops.map((shop) => {
        const inWindow = logs.filter(
          (l) =>
            l.shopId === shop.id && l.date >= windowStart && l.date < windowEnd,
        );
        const received = inWindow.filter((l) => l.type === "in");
        const collected = received.reduce((s, l) => s + l.kg, 0);
        const rejected = inWindow
          .filter((l) => l.type === "rejected")
          .reduce((s, l) => s + l.kg, 0);
        return {
          name: shop.name,
          pickups: received.length,
          collected: round(collected),
          rejected: round(rejected),
          rate:
            collected + rejected > 0
              ? (rejected / (collected + rejected)) * 100
              : 0,
        };
      }),
    [logs, windowStart, windowEnd],
  );

  const exportCsv = () => {
    const header = [
      "Shop",
      "Pickups",
      "Collected (kg)",
      "Rejected (kg)",
      "Rejection rate (%)",
    ];
    const lines = perShop.map((r) =>
      [
        `"${r.name}"`,
        r.pickups,
        r.collected,
        r.rejected,
        r.rate.toFixed(1),
      ].join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `collection-report-${period}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Collection Reports</h2>
          <p className="text-sm text-muted-foreground">
            Volume collected per period and per shop
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FilterDropdown
            value={period}
            options={periodOptions}
            onChange={setPeriod}
            align="end"
          />
          <Button
            type="button"
            className="h-10 gap-1 px-3.5"
            onClick={exportCsv}
          >
            Export
            <Download className="size-5" />
          </Button>
        </div>
      </div>

      <VolumeChart
        subtitle={
          period === "weekly" ? "Per week, starting Monday" : "Per month"
        }
        volumes={volumes}
      />

      <div className="flex flex-col gap-5">
        <h3 className="text-lg font-medium">Volume per shop</h3>
        <Table className="min-w-215">
          <colgroup>
            <col className="w-[32%]" />
            <col className="w-[14%]" />
            <col className="w-[18%]" />
            <col className="w-[18%]" />
            <col className="w-[18%]" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead>Shop</TableHead>
              <TableHead>Pickups</TableHead>
              <TableHead>Collected</TableHead>
              <TableHead>Rejected</TableHead>
              <TableHead>Rejection rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {perShop.map((r) => (
              <TableRow key={r.name}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="tabular-nums">{r.pickups}</TableCell>
                <TableCell className="tabular-nums">
                  {fmtKg(r.collected)}
                </TableCell>
                <TableCell className="tabular-nums">
                  {fmtKg(r.rejected)}
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {r.rate.toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
