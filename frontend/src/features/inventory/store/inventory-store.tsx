import { useSyncExternalStore } from "react";
import {
  OPEN_BATCH,
  initialLogs,
  initialPickups,
  occurrences,
  stages,
  type NewPickup,
  type NewRejection,
  type Pickup,
  type WeightLog,
} from "../data/inventory-data";

// Small module-level store so the overview and every sub-page share the same pickups and logs
// without wrapping the routes in a provider. Replace with your API / query layer later.

interface InventoryState {
  pickups: Pickup[];
  logs: WeightLog[];
}

let state: InventoryState = { pickups: initialPickups, logs: initialLogs };
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

// Creates one pickup per date. A recurring schedule creates its repeats up front.
const addPickup = (input: NewPickup) =>
  update((s) => {
    let next = Math.max(...s.pickups.map((p) => Number(p.id.slice(2)))) + 1;
    const created: Pickup[] = occurrences(input.date, input.recurrence).map(
      (date) => ({
        id: `P-${next++}`,
        shopId: input.shopId,
        date,
        time: input.time,
        recurrence: input.recurrence,
        stage: "scheduled",
        estWeight: input.estWeight,
      }),
    );
    return { ...s, pickups: [...s.pickups, ...created] };
  });

// Moves a pickup to its next stage. Weighing records the weight into the inventory log.
const advance = (id: string, weight?: number) =>
  update((s) => {
    const pickup = s.pickups.find((p) => p.id === id);
    if (!pickup) return s;
    const next =
      stages[stages.findIndex((st) => st.value === pickup.stage) + 1];
    if (!next || (next.value === "weighed" && !weight)) return s;

    let logs = s.logs;
    if (next.value === "weighed") {
      logs = [
        {
          id: `L-${id}`,
          date: pickup.date,
          type: "in",
          kg: weight!,
          shopId: pickup.shopId,
          pickupId: id,
        },
        ...logs,
      ];
    }
    if (next.value === "delivered") {
      logs = logs.map((l) =>
        l.pickupId === id && l.type === "in"
          ? { ...l, batchId: OPEN_BATCH }
          : l,
      );
    }

    const pickups = s.pickups.map((p) =>
      p.id !== id
        ? p
        : {
            ...p,
            stage: next.value,
            ...(next.value === "weighed" ? { weight } : {}),
            ...(next.value === "delivered" ? { batchId: OPEN_BATCH } : {}),
          },
    );
    return { pickups, logs };
  });

const addRejection = (input: NewRejection) =>
  update((s) => ({
    ...s,
    logs: [{ id: `R-${Date.now()}`, type: "rejected", ...input }, ...s.logs],
  }));

export function useInventory() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);
  return { ...snapshot, addPickup, advance, addRejection };
}
