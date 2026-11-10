import { useSyncExternalStore, useEffect, useState } from "react";
import { suppliersApi } from "../suppliers-api";
import type { Supplier } from "../data/suppliers-data";

let suppliers: Supplier[] = [];
const listeners = new Set<() => void>();

const setSuppliers = (newList: Supplier[]) => {
  suppliers = newList;
  listeners.forEach((l) => l());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => suppliers;

export function useSuppliers() {
  const list = useSyncExternalStore(subscribe, getSnapshot);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    suppliersApi
      .list()
      .then((data) => {
        if (mounted) setSuppliers(data);
      })
      .catch(console.error)
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // 👇 NEW: pull fresh data from the server
  const refresh = async () => {
    setLoading(true);
    try {
      const data = await suppliersApi.list();
      setSuppliers(data);
    } finally {
      setLoading(false);
    }
  };

  const addSupplier = async (formData: FormData) => {
    const newSupplier = await suppliersApi.create(formData);
    setSuppliers([newSupplier, ...suppliers]);
    return newSupplier.id;
  };

  const updateSupplier = async (id: string, formData: FormData) => {
    const updated = await suppliersApi.update(id, formData);
    setSuppliers(suppliers.map((s) => (s.id === id ? updated : s)));
  };

  const deleteSupplier = async (id: string) => {
    await suppliersApi.delete(id);
    setSuppliers(suppliers.filter((s) => s.id !== id));
  };

  // 👇 NEW: approve / reject
  const reviewSupplier = async (
    id: string,
    status: "approved" | "rejected",
    remarks?: string,
  ) => {
    const updated = await suppliersApi.review(id, status, remarks);
    setSuppliers(suppliers.map((s) => (s.id === id ? updated : s)));
    return updated;
  };

  const setHairType = (id: string, hairType: Supplier["hairType"]) => {
    setSuppliers(suppliers.map((s) => (s.id === id ? { ...s, hairType } : s)));
  };

  const logPickup = (id: string, input: any) => {
    setSuppliers(
      suppliers.map((s) => {
        if (s.id !== id) return s;
        const newPickup = { id: `H-${Date.now()}`, ...input };
        return { ...s, history: [newPickup, ...s.history] };
      }),
    );
  };

  const sendReminder = async (id: string, message: string) => {
    await suppliersApi.sendReminder(id, message);
    setSuppliers(
      suppliers.map((s) =>
        s.id === id
          ? { ...s, lastReminder: { at: new Date().toISOString(), message } }
          : s,
      ),
    );
  };

  return {
    suppliers: list,
    loading,
    refresh, // 👈 new
    addSupplier,
    updateSupplier,
    deleteSupplier,
    reviewSupplier, // 👈 new
    setHairType,
    logPickup,
    sendReminder,
  };
}
