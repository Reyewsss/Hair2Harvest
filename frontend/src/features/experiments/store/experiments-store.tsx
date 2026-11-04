import { useSyncExternalStore } from "react";
import {
  initialExperiments,
  type Experiment,
  type GrowthEntry,
  type NewExperiment,
} from "../data/experiments-data";

/* Experiments and their growth measurements. */

let state: Experiment[] = initialExperiments;
const listeners = new Set<() => void>();

const update = (fn: (experiments: Experiment[]) => Experiment[]) => {
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

const nextId = (prefix: string, ids: string[], pad: number) =>
  `${prefix}-${String(
    Math.max(0, ...ids.map((id) => Number(id.replace(`${prefix}-`, "")))) + 1,
  ).padStart(pad, "0")}`;

const addExperiment = (input: NewExperiment) =>
  update((experiments) => [
    ...experiments,
    {
      ...input,
      id: nextId(
        "EXP-2026",
        experiments.map((experiment) => experiment.id),
        3,
      ),
      growth: [],
      createdBy: "M. Domer",
    },
  ]);

const addGrowth = (experimentId: string, entry: Omit<GrowthEntry, "id">) =>
  update((experiments) =>
    experiments.map((experiment) =>
      experiment.id === experimentId
        ? {
            ...experiment,
            growth: [
              ...experiment.growth,
              {
                ...entry,
                id: nextId(
                  "G",
                  experiments.flatMap((item) =>
                    item.growth.map((growth) => growth.id),
                  ),
                  4,
                ),
              },
            ],
          }
        : experiment,
    ),
  );

export function useExperiments() {
  const experiments = useSyncExternalStore(subscribe, getSnapshot);
  return { experiments, addExperiment, addGrowth };
}
