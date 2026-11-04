import { api } from "@/shared/lib/api";
import { createResourceStore } from "@/shared/lib/resource";
import type { BatchRef } from "./batches";

/* Batch reference data now comes from the API. The Batch & Composting module
   owns these records; the DOMER modules only read them. */

type ApiBatch = {
  code: string;
  recipeVersion: string;
  operator: string;
  machine: string;
  startedAt: string;
  stage: BatchRef["stage"];
  supplierCodes: string[];
};

const store = createResourceStore(async () => {
  const data = await api.get<{ batches: ApiBatch[] }>("/api/batches");
  return data.batches.map(
    (batch): BatchRef => ({
      code: batch.code,
      recipeVersion: batch.recipeVersion,
      operator: batch.operator,
      machine: batch.machine,
      startedAt: batch.startedAt,
      stage: batch.stage,
      supplierIds: batch.supplierCodes,
    }),
  );
}, [] as BatchRef[]);

export function useBatches() {
  const { data: batches, loading, error } = store.useResource();

  return {
    batches,
    loading,
    error,
    batchOptions: batches.map((batch) => ({
      value: batch.code,
      label: `${batch.code} · ${batch.recipeVersion}`,
    })),
    batchByCode: (code: string) =>
      batches.find((batch) => batch.code === code),
  };
}
