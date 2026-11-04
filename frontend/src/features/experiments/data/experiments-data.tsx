/* Planting experiments: treatments, growth logs and traceability back to the
   batch, its suppliers and its lab results. */

export type TreatmentKind = "control" | "hair-free" | "hair-containing";

export type Treatment = {
  id: string;
  label: string;
  kind: TreatmentKind;
};

export type HealthScore = "poor" | "fair" | "good" | "excellent";

export type GrowthEntry = {
  id: string;
  date: string;
  treatmentId: string;
  heightCm: number;
  leafCount: number;
  health: HealthScore;
  photo?: string;
  note?: string;
};

export type Experiment = {
  id: string;
  title: string;
  crop: string;
  setup: string;
  batchCode: string;
  startDate: string;
  status: "active" | "completed";
  treatments: Treatment[];
  growth: GrowthEntry[];
  createdBy: string;
};

export type NewExperiment = Omit<Experiment, "id" | "growth" | "createdBy">;

export const treatmentKinds: {
  value: TreatmentKind;
  label: string;
  hint: string;
}[] = [
  { value: "control", label: "Control", hint: "No compost" },
  { value: "hair-free", label: "Hair-free compost", hint: "Compost without hair" },
  {
    value: "hair-containing",
    label: "Hair-containing compost",
    hint: "Compost from this batch",
  },
];

export const healthOptions: { value: HealthScore; label: string }[] = [
  { value: "poor", label: "Poor" },
  { value: "fair", label: "Fair" },
  { value: "good", label: "Good" },
  { value: "excellent", label: "Excellent" },
];

export const healthTone: Record<HealthScore, string> = {
  poor: "bg-destructive/10 text-destructive",
  fair: "bg-secondary text-secondary-foreground",
  good: "bg-primary/10 text-primary",
  excellent: "bg-success/10 text-success",
};

export const treatmentColor: Record<TreatmentKind, string> = {
  control: "var(--muted-foreground)",
  "hair-free": "var(--info)",
  "hair-containing": "var(--success)",
};

export const defaultTreatments: Treatment[] = [
  { id: "T-1", label: "Control", kind: "control" },
  { id: "T-2", label: "Hair-free compost", kind: "hair-free" },
  { id: "T-3", label: "Hair-containing compost", kind: "hair-containing" },
];

export const initialExperiments: Experiment[] = [
  {
    id: "EXP-2026-001",
    title: "Pechay growth trial",
    crop: "Pechay (Brassica rapa)",
    setup: "Seed trays, 30 plants per treatment, greenhouse",
    batchCode: "CMP-2026-003",
    startDate: "2026-10-18",
    status: "active",
    treatments: defaultTreatments,
    createdBy: "M. Domer",
    growth: [
      {
        id: "G-0001",
        date: "2026-10-25",
        treatmentId: "T-1",
        heightCm: 4.2,
        leafCount: 4,
        health: "fair",
      },
      {
        id: "G-0002",
        date: "2026-10-25",
        treatmentId: "T-2",
        heightCm: 5.1,
        leafCount: 5,
        health: "good",
      },
      {
        id: "G-0003",
        date: "2026-10-25",
        treatmentId: "T-3",
        heightCm: 5.6,
        leafCount: 5,
        health: "good",
        photo: "pechay_w1_hair.jpg",
      },
      {
        id: "G-0004",
        date: "2026-11-01",
        treatmentId: "T-1",
        heightCm: 7.8,
        leafCount: 6,
        health: "good",
      },
      {
        id: "G-0005",
        date: "2026-11-01",
        treatmentId: "T-2",
        heightCm: 9.4,
        leafCount: 7,
        health: "good",
      },
      {
        id: "G-0006",
        date: "2026-11-01",
        treatmentId: "T-3",
        heightCm: 10.5,
        leafCount: 8,
        health: "excellent",
        photo: "pechay_w2_hair.jpg",
      },
      {
        id: "G-0007",
        date: "2026-11-08",
        treatmentId: "T-1",
        heightCm: 11.2,
        leafCount: 8,
        health: "good",
      },
      {
        id: "G-0008",
        date: "2026-11-08",
        treatmentId: "T-2",
        heightCm: 13.8,
        leafCount: 9,
        health: "good",
      },
      {
        id: "G-0009",
        date: "2026-11-08",
        treatmentId: "T-3",
        heightCm: 15.4,
        leafCount: 10,
        health: "excellent",
        photo: "pechay_w3_hair.jpg",
      },
    ],
  },
  {
    id: "EXP-2026-002",
    title: "Tomato seedling trial",
    crop: "Tomato (Solanum lycopersicum)",
    setup: "Potting bags, 20 seedlings per treatment, open shade",
    batchCode: "CMP-2026-004",
    startDate: "2026-10-24",
    status: "active",
    treatments: defaultTreatments,
    createdBy: "M. Domer",
    growth: [
      {
        id: "G-0010",
        date: "2026-10-31",
        treatmentId: "T-1",
        heightCm: 6.1,
        leafCount: 5,
        health: "fair",
      },
      {
        id: "G-0011",
        date: "2026-10-31",
        treatmentId: "T-2",
        heightCm: 6.8,
        leafCount: 5,
        health: "good",
      },
      {
        id: "G-0012",
        date: "2026-10-31",
        treatmentId: "T-3",
        heightCm: 7.2,
        leafCount: 6,
        health: "good",
      },
      {
        id: "G-0013",
        date: "2026-11-07",
        treatmentId: "T-1",
        heightCm: 9.5,
        leafCount: 7,
        health: "good",
      },
      {
        id: "G-0014",
        date: "2026-11-07",
        treatmentId: "T-2",
        heightCm: 10.8,
        leafCount: 8,
        health: "good",
      },
      {
        id: "G-0015",
        date: "2026-11-07",
        treatmentId: "T-3",
        heightCm: 11.6,
        leafCount: 9,
        health: "excellent",
        photo: "tomato_w2_hair.jpg",
      },
    ],
  },
];

/** Distinct measurement dates, oldest first. */
export const measurementDates = (experiment: Experiment) =>
  [...new Set(experiment.growth.map((entry) => entry.date))].sort();

export const latestForTreatment = (
  experiment: Experiment,
  treatmentId: string,
) =>
  experiment.growth
    .filter((entry) => entry.treatmentId === treatmentId)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
