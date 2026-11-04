/* Read-only view of the composting batches that lab, quality and experiment
   modules reference. The Batch & Composting module owns creation and recipes —
   this registry only mirrors the identifiers so the DOMER modules agree. */

export type BatchStage =
  | "preparation"
  | "composting"
  | "curing"
  | "sampling"
  | "quality review"
  | "completed";

export type BatchRef = {
  code: string;
  recipeVersion: string;
  operator: string;
  machine: string;
  startedAt: string;
  stage: BatchStage;
};

export const batches: BatchRef[] = [
  {
    code: "CMP-2026-001",
    recipeVersion: "v1.2",
    operator: "R. Reyes",
    machine: "Composter A",
    startedAt: "2026-10-18",
    stage: "composting",
  },
  {
    code: "CMP-2026-002",
    recipeVersion: "v1.2",
    operator: "R. Reyes",
    machine: "Composter A",
    startedAt: "2026-10-08",
    stage: "curing",
  },
  {
    code: "CMP-2026-003",
    recipeVersion: "v1.3",
    operator: "M. Domer",
    machine: "Composter B",
    startedAt: "2026-09-28",
    stage: "quality review",
  },
  {
    code: "CMP-2026-004",
    recipeVersion: "v1.3",
    operator: "M. Domer",
    machine: "Composter B",
    startedAt: "2026-10-02",
    stage: "quality review",
  },
  {
    code: "CMP-2026-005",
    recipeVersion: "v1.3",
    operator: "M. Domer",
    machine: "Composter B",
    startedAt: "2026-10-24",
    stage: "sampling",
  },
];

export const batchCodes = batches.map((batch) => batch.code);

export const batchByCode = (code: string) =>
  batches.find((batch) => batch.code === code);

export const batchOptions = batches.map((batch) => ({
  value: batch.code,
  label: `${batch.code} · ${batch.recipeVersion}`,
}));
