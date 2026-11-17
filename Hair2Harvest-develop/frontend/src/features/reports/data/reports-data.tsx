// features/reports/data/reports-data.ts

export type ReportCategory =
  | "collection"
  | "equipment"
  | "batch"
  | "lab"
  | "experiment"
  | "traceability";
export type ReportStatus = "completed" | "processing" | "failed";
export type ExportFormat = "CSV" | "PDF" | "Excel";

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

export type GeneratedReport = {
  id: string;
  name: string;
  category: ReportCategory;
  status: ReportStatus;
  dateGenerated: string;
  batchId?: string;
  shopName: string;
};

export const mockGeneratedReports: GeneratedReport[] = [
  {
    id: "RPT-COL-001",
    name: "Weekly Supplier Collections",
    category: "collection",
    status: "completed",
    dateGenerated: "2026-10-24",
    shopName: "Main Shop",
  },
  {
    id: "RPT-EQP-042",
    name: "Composter A-1 Downtime Log",
    category: "equipment",
    status: "completed",
    dateGenerated: "2026-10-22",
    shopName: "Main Shop",
  },
  {
    id: "RPT-BAT-012",
    name: "Batch Yield Summary Q3",
    category: "batch",
    status: "completed",
    dateGenerated: "2026-10-20",
    shopName: "Warehouse B",
  },
  {
    id: "RPT-LAB-099",
    name: "Moisture Content Analysis",
    category: "lab",
    status: "processing",
    dateGenerated: "2026-10-25",
    shopName: "Main Shop",
  },
  {
    id: "RPT-EXP-005",
    name: "Experiment: Hair vs. Plant Fiber",
    category: "experiment",
    status: "completed",
    dateGenerated: "2026-10-18",
    shopName: "R&D Lab",
  },
  {
    id: "RPT-TRC-001",
    name: "Full Traceability: CMP-2026-001",
    category: "traceability",
    status: "completed",
    dateGenerated: "2026-10-26",
    batchId: "CMP-2026-001",
    shopName: "Main Shop",
  },
];

export const mockShops = ["All Shops", "Main Shop", "Warehouse B", "R&D Lab"];
export const mockBatches = [
  "All Batches",
  "CMP-2026-001",
  "CMP-2026-002",
  "CMP-2026-003",
];
