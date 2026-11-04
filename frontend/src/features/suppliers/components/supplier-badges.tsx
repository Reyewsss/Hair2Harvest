import { Pill } from "@/shared/ui/form-controls";
import { statusMeta, type SupplierStatus } from "../data/suppliers-data";

export function StatusBadge({ status }: { status: SupplierStatus }) {
  return (
    <Pill className={statusMeta[status].tone}>{statusMeta[status].label}</Pill>
  );
}
