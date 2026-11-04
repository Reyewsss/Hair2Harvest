import { useSyncExternalStore } from "react";
import {
  defaultThresholds,
  initialDecisions,
  initialHistory,
  type Criterion,
  type Decision,
  type HistoryEntry,
  type QualityStatus,
} from "../data/quality-data";

/* Thresholds, current batch statuses and the append-only status history. */

type QualityState = {
  thresholds: Criterion[];
  decisions: Decision[];
  history: HistoryEntry[];
};

let state: QualityState = {
  thresholds: defaultThresholds,
  decisions: initialDecisions,
  history: initialHistory,
};

const listeners = new Set<() => void>();

const update = (fn: (state: QualityState) => QualityState) => {
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

/** Admin authorisation is the only way a batch status changes. */
const authorize = (
  batchCode: string,
  status: QualityStatus,
  remarks: string,
  decidedBy = "Admin Reyes",
) =>
  update((current) => {
    const previous =
      current.decisions.find((decision) => decision.batchCode === batchCode)
        ?.status ?? "Pending";

    const decision: Decision = {
      batchCode,
      status,
      decidedBy,
      decidedAt: new Date().toISOString().slice(0, 10),
      remarks: remarks.trim() || undefined,
    };

    const nextId =
      Math.max(
        0,
        ...current.history.map((entry) => Number(entry.id.replace("QH-", ""))),
      ) + 1;

    return {
      ...current,
      decisions: [
        ...current.decisions.filter(
          (entry) => entry.batchCode !== batchCode,
        ),
        decision,
      ],
      history: [
        {
          id: `QH-${String(nextId).padStart(4, "0")}`,
          previous,
          ...decision,
        },
        ...current.history,
      ],
    };
  });

const saveThresholds = (thresholds: Criterion[]) =>
  update((current) => ({ ...current, thresholds }));

export function useQuality() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);
  return { ...snapshot, authorize, saveThresholds };
}
