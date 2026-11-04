// New content for the dashboard. Lives next to dashboard-content.tsx so the existing
// "../../data" exports (used by other pages) stay untouched.

export type DateRange = "last-7-days" | "last-30-days" | "last-90-days";
export type Role = "admin" | "staff" | "intern";
export type MetricId =
  | "suppliers"
  | "pickups"
  | "batches"
  | "materials"
  | "machines"
  | "experiments";
export type MachineState = "run" | "idle" | "maint";

export interface MetricCard {
  id: MetricId;
  label: string;
  value: string;
  trend?: { tone: "positive" | "neutral"; value: string; label: string };
  footnote?: string;
  progress?: number; // 0-100, renders a progress bar
  segments?: MachineState[]; // one per machine, renders a status bar
}

export interface ChartSeries {
  title: string;
  subtitle: string;
  summary: string;
  summaryNote: string;
  type: "bar" | "line";
  unit: string;
  yMin: number;
  yMax: number;
  ticks: number[];
  band?: { min: number; max: number; label: string };
  live?: boolean;
  data: { label: string; value: number }[];
}

export interface StreamColumn {
  key: string;
  label: string;
  width: string;
  variant?: "primary" | "number" | "status" | "muted";
}
export interface StreamTable {
  title: string;
  description: string;
  href: string;
  columns: StreamColumn[];
  rows: Record<string, string>[];
}

export const dateRangeOptions: { value: DateRange; label: string }[] = [
  { value: "last-7-days", label: "Last 7 days" },
  { value: "last-30-days", label: "Last 30 days" },
  { value: "last-90-days", label: "Last 90 days" },
];

/* ---------- Summary cards ---------- */

// Current-state cards: they don't change with the date range.
const pickups: MetricCard = {
  id: "pickups",
  label: "Pickups Due",
  value: "12",
  footnote: "5 due today, 1 overdue",
};
const machines: MetricCard = {
  id: "machines",
  label: "Machine Status",
  value: "5 of 6",
  footnote: "Running, 1 in maintenance",
  segments: ["run", "run", "run", "run", "run", "maint"],
};

export const metricsByRange: Record<DateRange, Record<MetricId, MetricCard>> = {
  "last-7-days": {
    suppliers: {
      id: "suppliers",
      label: "Suppliers",
      value: "48",
      trend: { tone: "positive", value: "+2", label: "vs previous 7 days" },
    },
    pickups,
    batches: {
      id: "batches",
      label: "Active Batches",
      value: "7",
      footnote: "2 awaiting QC",
    },
    materials: {
      id: "materials",
      label: "Approved Materials",
      value: "134",
      trend: { tone: "positive", value: "+9", label: "vs previous 7 days" },
    },
    machines,
    experiments: {
      id: "experiments",
      label: "Experiment Progress",
      value: "68%",
      footnote: "4 of 6 runs complete",
      progress: 68,
    },
  },
  "last-30-days": {
    suppliers: {
      id: "suppliers",
      label: "Suppliers",
      value: "48",
      trend: { tone: "positive", value: "+6", label: "vs previous 30 days" },
    },
    pickups,
    batches: {
      id: "batches",
      label: "Active Batches",
      value: "7",
      footnote: "31 completed this period",
    },
    materials: {
      id: "materials",
      label: "Approved Materials",
      value: "134",
      trend: { tone: "positive", value: "+21", label: "vs previous 30 days" },
    },
    machines,
    experiments: {
      id: "experiments",
      label: "Experiment Progress",
      value: "72%",
      footnote: "13 of 18 runs complete",
      progress: 72,
    },
  },
  "last-90-days": {
    suppliers: {
      id: "suppliers",
      label: "Suppliers",
      value: "48",
      trend: { tone: "positive", value: "+14", label: "vs previous 90 days" },
    },
    pickups,
    batches: {
      id: "batches",
      label: "Active Batches",
      value: "7",
      footnote: "96 completed this period",
    },
    materials: {
      id: "materials",
      label: "Approved Materials",
      value: "134",
      trend: { tone: "positive", value: "+52", label: "vs previous 90 days" },
    },
    machines,
    experiments: {
      id: "experiments",
      label: "Experiment Progress",
      value: "81%",
      footnote: "44 of 54 runs complete",
      progress: 81,
    },
  },
};

/* ---------- Role setup: which cards, charts and table each role sees ---------- */

export const roleConfig: Record<
  Role,
  {
    label: string;
    metrics: MetricId[];
    charts: ("volume" | "temperature")[];
    table: "pickups" | "batches";
  }
> = {
  // Full picture of the operation
  admin: {
    label: "Admin",
    metrics: [
      "suppliers",
      "pickups",
      "batches",
      "materials",
      "machines",
      "experiments",
    ],
    charts: ["volume", "temperature"],
    table: "pickups",
  },
  // Day-to-day operations: collections, batches and machines
  staff: {
    label: "Staff",
    metrics: ["pickups", "batches", "materials", "machines"],
    charts: ["volume", "temperature"],
    table: "batches",
  },
  // Learning view: batches, approved materials and experiments only
  intern: {
    label: "Intern",
    metrics: ["batches", "materials", "experiments"],
    charts: ["temperature"],
    table: "batches",
  },
};

/* ---------- Trend charts ---------- */

export const volumeByRange: Record<DateRange, ChartSeries> = {
  "last-7-days": {
    title: "Collected Volume",
    subtitle: "Daily, last 7 days",
    summary: "3,100 kg",
    summaryNote: "total collected",
    type: "bar",
    unit: "kg",
    yMin: 0,
    yMax: 800,
    ticks: [0, 200, 400, 600, 800],
    data: [
      { label: "Mon", value: 420 },
      { label: "Tue", value: 510 },
      { label: "Wed", value: 380 },
      { label: "Thu", value: 640 },
      { label: "Fri", value: 590 },
      { label: "Sat", value: 300 },
      { label: "Sun", value: 260 },
    ],
  },
  "last-30-days": {
    title: "Collected Volume",
    subtitle: "Weekly, last 30 days",
    summary: "13,200 kg",
    summaryNote: "total collected",
    type: "bar",
    unit: "kg",
    yMin: 0,
    yMax: 4000,
    ticks: [0, 1000, 2000, 3000, 4000],
    data: [
      { label: "Week 1", value: 2900 },
      { label: "Week 2", value: 3400 },
      { label: "Week 3", value: 3100 },
      { label: "Week 4", value: 3800 },
    ],
  },
  "last-90-days": {
    title: "Collected Volume",
    subtitle: "Monthly, last 90 days",
    summary: "39,200 kg",
    summaryNote: "total collected",
    type: "bar",
    unit: "kg",
    yMin: 0,
    yMax: 16000,
    ticks: [0, 4000, 8000, 12000, 16000],
    data: [
      { label: "Aug", value: 12400 },
      { label: "Sep", value: 13600 },
      { label: "Oct", value: 13200 },
    ],
  },
};

// Temperature is a live reading, so it ignores the date range.
export const batchTemperature: ChartSeries = {
  title: "Batch Temperature",
  subtitle: "Batch B-0142, last 10 hours",
  summary: "66 °C",
  summaryNote: "current",
  type: "line",
  unit: "°C",
  yMin: 50,
  yMax: 80,
  ticks: [50, 60, 70, 80],
  band: { min: 65, max: 72, label: "Target 65–72 °C" },
  live: true,
  data: [
    { label: "08:00", value: 58 },
    { label: "09:00", value: 61 },
    { label: "10:00", value: 64 },
    { label: "11:00", value: 68 },
    { label: "12:00", value: 71 },
    { label: "13:00", value: 70 },
    { label: "14:00", value: 72 },
    { label: "15:00", value: 69 },
    { label: "16:00", value: 66 },
    { label: "17:00", value: 66 },
  ],
};

/* ---------- Tables ---------- */

export const streamTables: Record<"pickups" | "batches", StreamTable> = {
  pickups: {
    title: "Pickups Due",
    description: "Upcoming and overdue supplier collections",
    href: "/pickups",
    columns: [
      {
        key: "supplier",
        label: "Supplier",
        width: "w-[30%]",
        variant: "primary",
      },
      { key: "material", label: "Material", width: "w-[20%]" },
      { key: "volume", label: "Volume", width: "w-[14%]", variant: "number" },
      { key: "status", label: "Status", width: "w-[18%]", variant: "status" },
      {
        key: "scheduled",
        label: "Scheduled",
        width: "w-[18%]",
        variant: "muted",
      },
    ],
    rows: [
      {
        id: "PU-2041",
        supplier: "GreenCycle Co.",
        material: "PET plastic",
        volume: "420 kg",
        status: "Due today",
        scheduled: "Today, 2:00 PM",
      },
      {
        id: "PU-2039",
        supplier: "Metro Recovery",
        material: "Mixed scrap",
        volume: "310 kg",
        status: "Overdue",
        scheduled: "Yesterday",
      },
      {
        id: "PU-2044",
        supplier: "Harbor Foods",
        material: "Organic waste",
        volume: "540 kg",
        status: "Scheduled",
        scheduled: "Tomorrow, 9:00 AM",
      },
      {
        id: "PU-2046",
        supplier: "Lakeside Farms",
        material: "Organic waste",
        volume: "260 kg",
        status: "Scheduled",
        scheduled: "Thu, 11:30 AM",
      },
      {
        id: "PU-2036",
        supplier: "Northwind Textiles",
        material: "Cotton offcuts",
        volume: "180 kg",
        status: "Completed",
        scheduled: "Mon, 10:00 AM",
      },
    ],
  },
  batches: {
    title: "Active Batches",
    description: "Batches currently running or waiting for quality checks",
    href: "/batches",
    columns: [
      { key: "batch", label: "Batch", width: "w-[30%]", variant: "primary" },
      { key: "machine", label: "Machine", width: "w-[20%]" },
      {
        key: "temperature",
        label: "Temperature",
        width: "w-[14%]",
        variant: "number",
      },
      { key: "status", label: "Status", width: "w-[18%]", variant: "status" },
      { key: "started", label: "Started", width: "w-[18%]", variant: "muted" },
    ],
    rows: [
      {
        id: "B-0142",
        batch: "PET flakes, lot 12",
        machine: "Reactor A",
        temperature: "66 °C",
        status: "Running",
        started: "Today, 8:00 AM",
      },
      {
        id: "B-0141",
        batch: "Organic blend, lot 9",
        machine: "Reactor B",
        temperature: "58 °C",
        status: "Running",
        started: "Today, 6:30 AM",
      },
      {
        id: "B-0139",
        batch: "Cotton fibre, lot 4",
        machine: "Shredder A",
        temperature: "41 °C",
        status: "QC pending",
        started: "Yesterday",
      },
      {
        id: "B-0138",
        batch: "Mixed scrap, lot 7",
        machine: "Reactor C",
        temperature: "63 °C",
        status: "QC pending",
        started: "Yesterday",
      },
      {
        id: "B-0135",
        batch: "PET flakes, lot 11",
        machine: "Reactor A",
        temperature: "—",
        status: "Completed",
        started: "Mon",
      },
    ],
  },
};
