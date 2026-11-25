import { useSyncExternalStore, useEffect, useState } from "react";
import { inventoryApi } from "../inventory-api";
import type { WeightLog } from "../data/inventory-data";

interface InventoryState {
  logs: WeightLog[];
}

let state: InventoryState = { logs: [] };
let loadedOnce = false; // after the first load, pages show the logs at once and refresh behind them
const listeners = new Set<() => void>();

const update = (fn: (s: InventoryState) => InventoryState) => {
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

export function useInventory() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);
  const [loading, setLoading] = useState(!loadedOnce);

  useEffect(() => {
    inventoryApi
      .listLogs()
      .then((logs) => update(() => ({ logs: logs || [] }))) // 👈 Ensure it's an array
      .catch((err) => {
        console.error(err);
        update(() => ({ logs: [] }));
      })
      .finally(() => {
        loadedOnce = true;
        setLoading(false);
      });
  }, []);

  return { ...snapshot, loading };
}
