import { useSyncExternalStore } from "react";
import { TODAY } from "@/features/inventory/data/inventory-data";
import {
  initialSuppliers,
  statusFromConsent,
  type HairType,
  type NewPickupInput,
  type Supplier,
  type SupplierInput,
} from "../data/suppliers-data";

// Module-level store so the list and every profile page share the same suppliers
// without a provider. Replace with your API / query layer later.

let suppliers: Supplier[] = initialSuppliers;
const listeners = new Set<() => void>();

const update = (fn: (s: Supplier[]) => Supplier[]) => {
  suppliers = fn(suppliers);
  listeners.forEach((listener) => listener());
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getSnapshot = () => suppliers;

const patch = (id: string, fn: (s: Supplier) => Supplier) =>
  update((list) => list.map((s) => (s.id === id ? fn(s) : s)));

// A shop that consents to participate is "enrolled"; otherwise it stays a "candidate".
const withConsent = (input: SupplierInput): SupplierInput => ({
  ...input,
  consentDate: input.consentDate || (input.consentParticipate ? TODAY : ""),
});

/** Returns the new shop's id. */
const addSupplier = (input: SupplierInput): string => {
  const next = Math.max(0, ...suppliers.map((s) => Number(s.id.slice(4)))) + 1;
  const id = `SUP-${String(next).padStart(3, "0")}`;
  const values = withConsent(input);
  update((list) => [
    { ...values, id, status: statusFromConsent(values.consentParticipate), hairType: "untreated", history: [] },
    ...list,
  ]);
  return id;
};

const updateSupplier = (id: string, input: SupplierInput) =>
  patch(id, (s) => {
    const values = withConsent(input);
    return { ...s, ...values, status: statusFromConsent(values.consentParticipate) };
  });

const setHairType = (id: string, hairType: HairType) => patch(id, (s) => ({ ...s, hairType }));

const logPickup = (id: string, input: NewPickupInput) =>
  patch(id, (s) => ({
    ...s,
    history: [{ id: `H-${id}-${Date.now()}`, ...input }, ...s.history].sort((a, b) => b.date.localeCompare(a.date)),
  }));

// Demo only: records the reminder. Call your SMS provider here and only record it once it is sent.
const sendReminder = (id: string, message: string) =>
  patch(id, (s) => ({
    ...s,
    lastReminder: { at: `${TODAY}T${new Date().toTimeString().slice(0, 5)}`, message },
  }));

export function useSuppliers() {
  const list = useSyncExternalStore(subscribe, getSnapshot);
  return { suppliers: list, addSupplier, updateSupplier, setHairType, logPickup, sendReminder };
}