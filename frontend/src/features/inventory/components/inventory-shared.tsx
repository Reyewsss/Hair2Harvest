import type { ReactNode } from "react";
import { TableCell, TableRow } from "../../../shared/ui/table.tsx";
import { cn } from "@/lib/utils";
import { stages, type LogType, type PickupStage } from "../data/inventory-data";
import { Pill } from "@/shared/ui/form-controls";

/* Inventory-specific badges. Generic form primitives live in shared/ui/form-controls. */

export {
  Field,
  FilterDropdown,
  FormPanel,
  Pill,
  SegmentedTabs,
  SummaryCard,
  fieldClass,
} from "@/shared/ui/form-controls";

const stageTone: Record<PickupStage, string> = {
  scheduled: "bg-secondary text-secondary-foreground",
  collected: "bg-primary/10 text-primary",
  inspected: "bg-primary/10 text-primary",
  weighed: "bg-primary/10 text-primary",
  delivered: "bg-success/10 text-success",
};

export function StageBadge({ stage }: { stage: PickupStage }) {
  return (
    <Pill className={stageTone[stage]}>
      {stages.find((s) => s.value === stage)?.label}
    </Pill>
  );
}

/** Five segments, one per stage. */
export function StageProgress({ stage }: { stage: PickupStage }) {
  const index = stages.findIndex((s) => s.value === stage);
  return (
    <div className="flex items-center gap-3">
      <div className="flex w-24 gap-1" aria-hidden="true">
        {stages.map((s, i) => (
          <span
            key={s.value}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              i <= index
                ? stage === "delivered"
                  ? "bg-success"
                  : "bg-primary"
                : "bg-secondary",
            )}
          />
        ))}
      </div>
      <StageBadge stage={stage} />
    </div>
  );
}

export function EmptyRow({
  colSpan,
  children,
}: {
  colSpan: number;
  children: ReactNode;
}) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className="py-10 text-center text-muted-foreground"
      >
        {children}
      </TableCell>
    </TableRow>
  );
}

const logTypeTone: Record<LogType, { label: string; className: string }> = {
  in: { label: "Received", className: "bg-success/10 text-success" },
  rejected: {
    label: "Rejected",
    className: "bg-destructive/10 text-destructive",
  },
  processed: {
    label: "Processed",
    className: "bg-secondary text-secondary-foreground",
  },
};

export function LogTypeBadge({ type }: { type: LogType }) {
  return (
    <Pill className={logTypeTone[type].className}>
      {logTypeTone[type].label}
    </Pill>
  );
}
