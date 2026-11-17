import { Pill } from "@/features/inventory/components/inventory-shared";
import type { ContaminationGrade, HairType, SupplierStatus } from "../data/suppliers-data";

// Generic form and filter pieces are shared with the Inventory feature.
export { FilterDropdown, SegmentedTabs, Field, Pill, fieldClass } from "@/features/inventory/components/inventory-shared";

export function StatusBadge({ status }: { status: SupplierStatus }) {
  return status === "enrolled" ? (
    <Pill className="bg-success/10 text-success">Enrolled</Pill>
  ) : (
    <Pill className="bg-secondary text-secondary-foreground">Candidate</Pill>
  );
}

export function HairTypeBadge({ hairType }: { hairType: HairType }) {
  return hairType === "treated" ? (
    <Pill className="bg-destructive/10 text-destructive">Treated hair</Pill>
  ) : (
    <Pill className="bg-success/10 text-success">Untreated hair</Pill>
  );
}

const gradeTone: Record<ContaminationGrade, string> = {
  A: "bg-success/10 text-success",
  B: "bg-success/10 text-success",
  C: "bg-secondary text-secondary-foreground",
  D: "bg-destructive/10 text-destructive",
};

export function GradeBadge({ grade }: { grade: ContaminationGrade }) {
  return <Pill className={gradeTone[grade]}>Grade {grade}</Pill>;
}