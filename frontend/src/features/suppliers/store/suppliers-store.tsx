import { useSyncExternalStore } from "react";
import {
  initialSuppliers,
  type NewSupplier,
  type Supplier,
  type SupplierStatus,
} from "../data/suppliers-data";

/* Module-level store, same pattern as the inventory store: every supplier page
   shares one registry without a provider. Swap the updaters for API calls later. */

let state: Supplier[] = initialSuppliers;
const listeners = new Set<() => void>();

const update = (fn: (suppliers: Supplier[]) => Supplier[]) => {
  state = fn(state);
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => state;

const register = (input: NewSupplier) =>
  update((suppliers) => {
    const next =
      Math.max(...suppliers.map((supplier) => Number(supplier.id.slice(2)))) + 1;
    const supplier: Supplier = {
      ...input,
      id: `S-${String(next).padStart(2, "0")}`,
      shopCode: `BBY-${String(100 + next).padStart(4, "0")}`,
      status: "pending",
      registeredAt: new Date().toISOString().slice(0, 10),
    };
    return [...suppliers, supplier];
  });

const review = (
  id: string,
  status: Extract<SupplierStatus, "approved" | "rejected">,
  remarks?: string,
  reviewedBy = "Admin Reyes",
) =>
  update((suppliers) =>
    suppliers.map((supplier) =>
      supplier.id === id
        ? {
            ...supplier,
            status,
            remarks: remarks?.trim() || undefined,
            reviewedAt: new Date().toISOString().slice(0, 10),
            reviewedBy,
          }
        : supplier,
    ),
  );

const updateProfile = (id: string, patch: Partial<Supplier>) =>
  update((suppliers) =>
    suppliers.map((supplier) =>
      supplier.id === id ? { ...supplier, ...patch } : supplier,
    ),
  );

export function useSuppliers() {
  const suppliers = useSyncExternalStore(subscribe, getSnapshot);
  const pending = suppliers.filter((supplier) => supplier.status === "pending");
  const approved = suppliers.filter((supplier) => supplier.status === "approved");

  return { suppliers, pending, approved, register, review, updateProfile };
}
