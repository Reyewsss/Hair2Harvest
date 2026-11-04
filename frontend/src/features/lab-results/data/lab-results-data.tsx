/* Laboratory results for compost batches. Re-tests are stored as new versions
   of the same batch rather than overwriting the earlier result. */

export type Maturity = "immature" | "semi-mature" | "mature";

export type LabValues = {
  nitrogen: number; // N, %
  phosphorus: number; // P, %
  potassium: number; // K, %
  ph: number;
  moisture: number; // %
  maturity: Maturity;
  cadmium: number; // mg/kg
  lead: number; // mg/kg
  arsenic: number; // mg/kg
  mercury: number; // mg/kg
  eColi: number; // CFU/g
  salmonella: "absent" | "present";
};

export type LabAttachment = {
  name: string;
  kind: "pdf" | "image";
  sizeKb: number;
};

export type LabResult = {
  id: string;
  batchCode: string;
  version: number;
  labName: string;
  method: string;
  sampledAt: string;
  receivedAt: string;
  values: LabValues;
  attachment?: LabAttachment;
  notes?: string;
  enteredBy: string;
};

export type NewLabResult = Omit<LabResult, "id" | "version" | "enteredBy">;

export const maturityOptions: { value: Maturity; label: string }[] = [
  { value: "immature", label: "Immature" },
  { value: "semi-mature", label: "Semi-mature" },
  { value: "mature", label: "Mature" },
];

export const laboratories = [
  "Verde Analytical Services",
  "UPLB Soil and Plant Analysis Lab",
  "Metro Manila Environmental Testing",
];

export const testMethods = [
  "AOAC 2001.11 (Kjeldahl)",
  "AOAC 958.01 (spectrophotometric)",
  "EPA 3050B / ICP-OES",
  "EPA 1682 (Salmonella)",
  "SM 9221 (E. coli)",
];

export const emptyValues: LabValues = {
  nitrogen: 0,
  phosphorus: 0,
  potassium: 0,
  ph: 7,
  moisture: 0,
  maturity: "semi-mature",
  cadmium: 0,
  lead: 0,
  arsenic: 0,
  mercury: 0,
  eColi: 0,
  salmonella: "absent",
};

export const initialResults: LabResult[] = [
  {
    id: "LR-0001",
    batchCode: "CMP-2026-002",
    version: 1,
    labName: "Verde Analytical Services",
    method: "AOAC 2001.11 (Kjeldahl)",
    sampledAt: "2026-10-18",
    receivedAt: "2026-10-20",
    values: {
      nitrogen: 1.42,
      phosphorus: 0.86,
      potassium: 1.18,
      ph: 6.9,
      moisture: 41,
      maturity: "mature",
      cadmium: 0.4,
      lead: 12,
      arsenic: 1.1,
      mercury: 0.05,
      eColi: 120,
      salmonella: "absent",
    },
    attachment: {
      name: "CMP-2026-002_lab-report.pdf",
      kind: "pdf",
      sizeKb: 412,
    },
    enteredBy: "M. Domer",
  },
  {
    id: "LR-0002",
    batchCode: "CMP-2026-003",
    version: 1,
    labName: "Verde Analytical Services",
    method: "EPA 3050B / ICP-OES",
    sampledAt: "2026-10-03",
    receivedAt: "2026-10-05",
    values: {
      nitrogen: 1.05,
      phosphorus: 0.61,
      potassium: 0.92,
      ph: 7.4,
      moisture: 46,
      maturity: "semi-mature",
      cadmium: 1.2,
      lead: 145,
      arsenic: 3.4,
      mercury: 0.18,
      eColi: 640,
      salmonella: "absent",
    },
    attachment: {
      name: "CMP-2026-003_retest-required.pdf",
      kind: "pdf",
      sizeKb: 388,
    },
    notes: "Lead above threshold. Re-curing recommended before re-test.",
    enteredBy: "M. Domer",
  },
  {
    id: "LR-0003",
    batchCode: "CMP-2026-003",
    version: 2,
    labName: "Verde Analytical Services",
    method: "EPA 3050B / ICP-OES",
    sampledAt: "2026-10-14",
    receivedAt: "2026-10-16",
    values: {
      nitrogen: 1.18,
      phosphorus: 0.72,
      potassium: 1.02,
      ph: 7.1,
      moisture: 43,
      maturity: "mature",
      cadmium: 0.8,
      lead: 96,
      arsenic: 2.2,
      mercury: 0.09,
      eColi: 210,
      salmonella: "absent",
    },
    attachment: {
      name: "CMP-2026-003_retest_v2.pdf",
      kind: "pdf",
      sizeKb: 431,
    },
    notes: "Re-test after 11 days of additional curing. Lead within limit.",
    enteredBy: "M. Domer",
  },
  {
    id: "LR-0004",
    batchCode: "CMP-2026-004",
    version: 1,
    labName: "UPLB Soil and Plant Analysis Lab",
    method: "SM 9221 (E. coli)",
    sampledAt: "2026-10-07",
    receivedAt: "2026-10-09",
    values: {
      nitrogen: 0.94,
      phosphorus: 0.48,
      potassium: 0.77,
      ph: 8.3,
      moisture: 58,
      maturity: "semi-mature",
      cadmium: 0.5,
      lead: 22,
      arsenic: 1.6,
      mercury: 0.07,
      eColi: 180,
      salmonella: "absent",
    },
    attachment: {
      name: "CMP-2026-004_report_scan.jpg",
      kind: "image",
      sizeKb: 1240,
    },
    notes: "Moisture high and pH above range. Turn and dry before re-test.",
    enteredBy: "M. Domer",
  },
  {
    id: "LR-0005",
    batchCode: "CMP-2026-004",
    version: 2,
    labName: "UPLB Soil and Plant Analysis Lab",
    method: "SM 9221 (E. coli)",
    sampledAt: "2026-10-20",
    receivedAt: "2026-10-22",
    values: {
      nitrogen: 1.09,
      phosphorus: 0.55,
      potassium: 0.88,
      ph: 7.3,
      moisture: 44,
      maturity: "mature",
      cadmium: 0.5,
      lead: 21,
      arsenic: 1.5,
      mercury: 0.06,
      eColi: 150,
      salmonella: "absent",
    },
    attachment: {
      name: "CMP-2026-004_retest_v2.pdf",
      kind: "pdf",
      sizeKb: 402,
    },
    notes: "Re-test after turning and drying.",
    enteredBy: "M. Domer",
  },
  {
    id: "LR-0006",
    batchCode: "CMP-2026-005",
    version: 1,
    labName: "Metro Manila Environmental Testing",
    method: "EPA 1682 (Salmonella)",
    sampledAt: "2026-10-24",
    receivedAt: "2026-10-26",
    values: {
      nitrogen: 1.31,
      phosphorus: 0.79,
      potassium: 1.11,
      ph: 6.7,
      moisture: 39,
      maturity: "mature",
      cadmium: 0.3,
      lead: 9,
      arsenic: 0.9,
      mercury: 0.04,
      eColi: 90,
      salmonella: "absent",
    },
    enteredBy: "M. Domer",
  },
];

export const labNameOptions = [
  ...new Set([...laboratories, ...initialResults.map((r) => r.labName)]),
].map((name) => ({ value: name, label: name }));

export const latestVersion = (results: LabResult[], batchCode: string) =>
  results
    .filter((result) => result.batchCode === batchCode)
    .reduce((max, result) => Math.max(max, result.version), 0);

export const latestResult = (results: LabResult[], batchCode: string) =>
  results
    .filter((result) => result.batchCode === batchCode)
    .sort((a, b) => b.version - a.version)[0];
