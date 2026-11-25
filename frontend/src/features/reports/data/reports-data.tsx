// features/reports/data/reports-data.ts

export type ReportCategory =
  | "collection"
  | "equipment"
  | "batch"
  | "lab"
  | "experiment"
  | "traceability";

export const REPORT_CATEGORIES: {
  id: ReportCategory;
  label: string;
  description: string;
}[] = [
  {
    id: "collection",
    label: "Collection Reports",
    description: "Supplier pickups, weights, and dates.",
  },
  {
    id: "equipment",
    label: "Equipment Reports",
    description: "Machine usage, downtime, and maintenance.",
  },
  {
    id: "batch",
    label: "Batch Reports",
    description: "Composting progress and yield analysis.",
  },
  {
    id: "lab",
    label: "Lab Reports",
    description: "Quality tests and moisture analysis.",
  },
  {
    id: "experiment",
    label: "Experiment Reports",
    description: "R&D trial results and variables.",
  },
  {
    id: "traceability",
    label: "Full Traceability",
    description: "End-to-end journey of a specific batch.",
  },
];
