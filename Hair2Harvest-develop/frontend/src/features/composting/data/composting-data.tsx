// features/composting/data/composting-data.ts

export type BatchStage =
  | "preparation"
  | "composting"
  | "curing"
  | "sampling"
  | "quality review"
  | "completed";

export const STAGES: BatchStage[] = [
  "preparation",
  "composting",
  "curing",
  "sampling",
  "quality review",
  "completed",
];

export type CompostBatch = {
  id: string;
  recipeVersion: string;
  operator: string;
  machine: string;
  initialWeight: number;
  currentWeight: number;
  currentMoisture: number;
  stage: BatchStage;
  createdAt: string;
};

export const mockRawHairInventory = 2500; // kg
export const mockRecipeVersions = [
  "v1.2 (Specialist Approved)",
  "v1.3 (Testing)",
];

export const initialBatches: CompostBatch[] = [
  {
    id: "CMP-2026-001",
    recipeVersion: "v1.2",
    operator: "Vansh Patel",
    machine: "Composter A-1",
    initialWeight: 500,
    currentWeight: 420,
    currentMoisture: 55,
    stage: "composting",
    createdAt: "2026-10-15",
  },
  {
    id: "CMP-2026-002",
    recipeVersion: "v1.2",
    operator: "Jane Doe",
    machine: "Composter B-2",
    initialWeight: 300,
    currentWeight: 290,
    currentMoisture: 60,
    stage: "curing",
    createdAt: "2026-10-20",
  },
];
