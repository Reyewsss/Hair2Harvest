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

  const addSupplier = async (formData: FormData) => {
    const newSupplier = await suppliersApi.create(formData);
    setSuppliers([newSupplier, ...suppliers]);
    return newSupplier.id;
  };

  // 👈 Updated to accept FormData
  const updateSupplier = async (id: string, formData: FormData) => {
    const updated = await suppliersApi.update(id, formData);
    setSuppliers(suppliers.map((s) => (s.id === id ? updated : s)));
  };

  // 👈 NEW
  const deleteSupplier = async (id: string) => {
    await suppliersApi.delete(id);
    setSuppliers(suppliers.filter((s) => s.id !== id));
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

  const sendReminder = (id: string, message: string) => {
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
    addSupplier,
    updateSupplier,
    deleteSupplier, // 👈 NEW
    setHairType,
    logPickup,
    sendReminder,
  };
}
