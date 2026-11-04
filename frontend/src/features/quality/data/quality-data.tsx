/* Quality assessment: configurable thresholds, evaluation against the newest
   lab result per batch, and the admin-authorised batch status. */

import type { LabResult, LabValues } from "../../lab-results/data/lab-results-data";
import { latestResult } from "../../lab-results/data/lab-results-data";

export type QualityStatus =
  | "Pending"
  | "On Hold"
  | "Rejected"
  | "Approved for Supervised Testing";

export const qualityStatuses: QualityStatus[] = [
  "Pending",
  "On Hold",
  "Rejected",
  "Approved for Supervised Testing",
];

export const statusTone: Record<QualityStatus, string> = {
  Pending: "bg-secondary text-secondary-foreground",
  "On Hold": "bg-primary/10 text-primary",
  Rejected: "bg-destructive/10 text-destructive",
  "Approved for Supervised Testing": "bg-success/10 text-success",
};

export type CriterionGroup = "nutrient" | "stability" | "contaminant";

export type Criterion = {
  key: keyof LabValues;
  label: string;
  group: CriterionGroup;
  unit?: string;
  min?: number;
  max?: number;
  /** Minimum acceptable maturity, or the required value for text criteria. */
  equals?: string;
  /** A failed contaminant rejects the batch instead of holding it. */
  critical?: boolean;
};

export const defaultThresholds: Criterion[] = [
  { key: "nitrogen", label: "Nitrogen (N)", group: "nutrient", unit: "%", min: 1.0 },
  {
    key: "phosphorus",
    label: "Phosphorus (P)",
    group: "nutrient",
    unit: "%",
    min: 0.5,
  },
  {
    key: "potassium",
    label: "Potassium (K)",
    group: "nutrient",
    unit: "%",
    min: 0.8,
  },
  {
    key: "ph",
    label: "pH",
    group: "stability",
    min: 6.0,
    max: 8.0,
  },
  {
    key: "moisture",
    label: "Moisture",
    group: "stability",
    unit: "%",
    min: 30,
    max: 55,
  },
  {
    key: "maturity",
    label: "Maturity",
    group: "stability",
    equals: "mature",
  },
  {
    key: "cadmium",
    label: "Cadmium",
    group: "contaminant",
    unit: "mg/kg",
    max: 3,
    critical: true,
  },
  {
    key: "lead",
    label: "Lead",
    group: "contaminant",
    unit: "mg/kg",
    max: 120,
    critical: true,
  },
  {
    key: "arsenic",
    label: "Arsenic",
    group: "contaminant",
    unit: "mg/kg",
    max: 20,
    critical: true,
  },
  {
    key: "mercury",
    label: "Mercury",
    group: "contaminant",
    unit: "mg/kg",
    max: 1,
    critical: true,
  },
  {
    key: "eColi",
    label: "E. coli",
    group: "contaminant",
    unit: "CFU/g",
    max: 1000,
    critical: true,
  },
  {
    key: "salmonella",
    label: "Salmonella",
    group: "contaminant",
    equals: "absent",
    critical: true,
  },
];

const maturityRank: Record<string, number> = {
  immature: 0,
  "semi-mature": 1,
  mature: 2,
};

export type CriterionResult = {
  criterion: Criterion;
  value: string;
  pass: boolean;
};

const formatValue = (criterion: Criterion, value: LabValues[keyof LabValues]) =>
  criterion.unit ? `${value} ${criterion.unit}` : String(value);

/** Compares one lab value against its threshold. */
export function checkCriterion(
  criterion: Criterion,
  values: LabValues,
): CriterionResult {
  const raw = values[criterion.key];
  const value = formatValue(criterion, raw);
  const numeric = Number(raw);

  let pass = true;

  if (criterion.key === "maturity" && criterion.equals) {
    pass = (maturityRank[String(raw)] ?? 0) >= (maturityRank[criterion.equals] ?? 0);
  } else if (typeof criterion.equals === "string") {
    pass = String(raw) === criterion.equals;
  } else {
    if (criterion.min !== undefined) pass = pass && numeric >= criterion.min;
    if (criterion.max !== undefined) pass = pass && numeric <= criterion.max;
  }

  return { criterion, value, pass };
}

export function evaluateResult(result: LabResult, thresholds: Criterion[]) {
  const checks = thresholds.map((criterion) =>
    checkCriterion(criterion, result.values),
  );
  return {
    checks,
    failed: checks.filter((check) => !check.pass),
  };
}

/** Status the system proposes; an admin still has to authorise it. */
export function recommendStatus(failed: CriterionResult[]): QualityStatus {
  if (failed.length === 0) return "Approved for Supervised Testing";
  return failed.some((check) => check.criterion.critical) ? "Rejected" : "On Hold";
}

export type Decision = {
  batchCode: string;
  status: QualityStatus;
  decidedBy: string;
  decidedAt: string;
  remarks?: string;
};

export type HistoryEntry = Decision & {
  id: string;
  previous: QualityStatus;
};

export const initialDecisions: Decision[] = [
  {
    batchCode: "CMP-2026-001",
    status: "Pending",
    decidedBy: "—",
    decidedAt: "2026-10-18",
    remarks: "Awaiting the first sampling.",
  },
  {
    batchCode: "CMP-2026-002",
    status: "Pending",
    decidedBy: "—",
    decidedAt: "2026-10-20",
    remarks: "Result on file, not yet reviewed.",
  },
  {
    batchCode: "CMP-2026-003",
    status: "Approved for Supervised Testing",
    decidedBy: "Admin Reyes",
    decidedAt: "2026-10-16",
    remarks: "Re-test v2 within all thresholds.",
  },
  {
    batchCode: "CMP-2026-004",
    status: "On Hold",
    decidedBy: "Admin Reyes",
    decidedAt: "2026-10-09",
    remarks: "Moisture and pH outside range.",
  },
  {
    batchCode: "CMP-2026-005",
    status: "Pending",
    decidedBy: "—",
    decidedAt: "2026-10-26",
    remarks: "Result on file, not yet reviewed.",
  },
];

export const initialHistory: HistoryEntry[] = [
  {
    id: "QH-0001",
    batchCode: "CMP-2026-003",
    previous: "Pending",
    status: "On Hold",
    decidedBy: "Admin Reyes",
    decidedAt: "2026-10-05",
    remarks: "Lead at 145 mg/kg, above the 120 mg/kg limit.",
  },
  {
    id: "QH-0002",
    batchCode: "CMP-2026-003",
    previous: "On Hold",
    status: "Approved for Supervised Testing",
    decidedBy: "Admin Reyes",
    decidedAt: "2026-10-16",
    remarks: "Re-test v2: lead 96 mg/kg, all criteria within range.",
  },
  {
    id: "QH-0003",
    batchCode: "CMP-2026-004",
    previous: "Pending",
    status: "On Hold",
    decidedBy: "Admin Reyes",
    decidedAt: "2026-10-09",
    remarks: "Moisture 58% and pH 8.3 outside limits; turn and dry.",
  },
];

/** Batches that currently satisfy every threshold on their newest result. */
export function approvedBatches(results: LabResult[], thresholds: Criterion[]) {
  return results
    .map((result) => result.batchCode)
    .filter((code, index, all) => all.indexOf(code) === index)
    .filter((code) => {
      const newest = latestResult(results, code);
      if (!newest) return false;
      return evaluateResult(newest, thresholds).failed.length === 0;
    });
}
