import { useMemo, useState } from "react";
import { Button } from "../../../shared/ui/button.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../shared/ui/table.tsx";
import { cn } from "@/lib/utils";
import {
  fmtKg,
  formatDate,
  formatTime,
  shopName,
  stages,
  type Pickup,
  type PickupStage,
} from "../data/inventory-data";
import {
  EmptyRow,
  FilterDropdown,
  StageProgress,
  fieldClass,
} from "../components/inventory-shared";

type StageFilter = "active" | "all" | PickupStage;

const filterOptions: { value: StageFilter; label: string }[] = [
  { value: "active", label: "In progress" },
  { value: "all", label: "All pickups" },
  ...stages.map((s) => ({ value: s.value as StageFilter, label: s.label })),
];

const nextLabel: Record<PickupStage, string> = {
  scheduled: "Mark collected",
  collected: "Mark inspected",
  inspected: "Record weight",
  weighed: "Mark delivered",
  delivered: "",
};

const LIMIT = 15;

export function TrackingView({
  pickups,
  onAdvance,
}: {
  pickups: Pickup[];
  onAdvance: (id: string, weight?: number) => void;
}) {
  const [filter, setFilter] = useState<StageFilter>("active");
  const [weights, setWeights] = useState<Record<string, string>>({});

  const rows = useMemo(() => {
    const matches = pickups.filter((p) =>
      filter === "all"
        ? true
        : filter === "active"
          ? p.stage !== "delivered"
          : p.stage === filter,
    );
    const key = (p: Pickup) => `${p.date}${p.time}`;
    return matches.sort((a, b) =>
      filter === "active"
        ? key(a).localeCompare(key(b))
        : key(b).localeCompare(key(a)),
    );
  }, [pickups, filter]);

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Pickup Tracking</h2>
          <p className="text-sm text-muted-foreground">
            Scheduled, collected, inspected, weighed, then delivered to the
            processing site
          </p>
        </div>
        <FilterDropdown
          value={filter}
          options={filterOptions}
          onChange={setFilter}
          align="end"
        />
      </div>

      <Table className="min-w-215">
        <colgroup>
          <col className="w-[26%]" />
          <col className="w-[16%]" />
          <col className="w-[22%]" />
          <col className="w-[14%]" />
          <col className="w-[22%]" />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead>Pickup</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Weight</TableHead>
            <TableHead>Next step</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <EmptyRow colSpan={5}>No pickups at this stage.</EmptyRow>
          ) : (
            rows.slice(0, LIMIT).map((p) => {
              const typed = Number(weights[p.id]);
              return (
                <TableRow key={p.id}>
                  <TableCell className="whitespace-normal">
                    <div className="space-y-1">
                      <p className="truncate font-medium">
                        {shopName(p.shopId)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.id}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(p.date)}
                    <span className="block text-xs">{formatTime(p.time)}</span>
                  </TableCell>
                  <TableCell>
                    <StageProgress stage={p.stage} />
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {p.weight ? (
                      fmtKg(p.weight)
                    ) : (
                      <span className="text-muted-foreground">
                        ~{fmtKg(p.estWeight)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.stage === "delivered" ? (
                      <span className="text-sm text-muted-foreground">
                        {p.batchId ?? "Done"}
                      </span>
                    ) : p.stage === "inspected" ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="kg"
                          aria-label={`Weight for ${p.id} in kg`}
                          className={cn(fieldClass, "h-9 w-20")}
                          value={weights[p.id] ?? ""}
                          onChange={(e) =>
                            setWeights({ ...weights, [p.id]: e.target.value })
                          }
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-9"
                          disabled={!(typed > 0)}
                          onClick={() => onAdvance(p.id, typed)}
                        >
                          Weigh
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-9"
                        onClick={() => onAdvance(p.id)}
                      >
                        {nextLabel[p.stage]}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      {rows.length > LIMIT ? (
        <p className="text-sm text-muted-foreground">
          Showing the latest {LIMIT} of {rows.length} pickups.
        </p>
      ) : null}
    </section>
  );
}
