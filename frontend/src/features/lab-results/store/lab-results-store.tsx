import { useSyncExternalStore } from "react";
import {
  initialResults,
  latestVersion,
  type LabResult,
  type NewLabResult,
} from "../data/lab-results-data";

/* Shared lab database. A re-test for the same batch becomes version n+1. */

let state: LabResult[] = initialResults;
const listeners = new Set<() => void>();

const update = (fn: (results: LabResult[]) => LabResult[]) => {
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

const addResult = (input: NewLabResult) =>
  update((results) => {
    const next =
      Math.max(...results.map((result) => Number(result.id.slice(3)))) + 1;
    return [
      {
        ...input,
        id: `LR-${String(next).padStart(4, "0")}`,
        version: latestVersion(results, input.batchCode) + 1,
        enteredBy: "M. Domer",
      },
      ...results,
    ];
  });

export function useLabResults() {
  const results = useSyncExternalStore(subscribe, getSnapshot);
  return { results, addResult };
}
