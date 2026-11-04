import { initialSuppliers } from "@/features/suppliers/data/suppliers-data";

// Sample data and helpers for the Inventory tab. Replace with API data later.

// Fixed "today" so the sample data always lines up. With real data use:
// new Date().toISOString().slice(0, 10)
export const TODAY = "2026-11-02";
// Batch that newly delivered hair is assigned to.
export const OPEN_BATCH = "B-0143";

/* ---------- Types ---------- */

export type PickupStage =
  | "scheduled"
  | "collected"
  | "inspected"
  | "weighed"
  | "delivered";
export type Recurrence = "none" | "weekly" | "biweekly" | "monthly";
export type RejectReason =
  | "chemicals"
  | "moldy"
  | "foreign-objects"
  | "too-short"
  | "other";
export type LogType = "in" | "rejected" | "processed";

export interface Shop {
  id: string;
  name: string;
  area: string;
}

export interface Pickup {
  id: string;
  shopId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  recurrence: Recurrence;
  stage: PickupStage;
  estWeight: number; // kg
  weight?: number; // kg, recorded when weighed
  batchId?: string; // set when delivered to the processing site
}

export interface WeightLog {
  id: string;
  date: string;
  type: LogType;
  kg: number;
  shopId?: string; // source (missing for processed)
  pickupId?: string;
  batchId?: string;
  reason?: RejectReason;
  note?: string;
}

export interface NewPickup {
  shopId: string;
  date: string;
  time: string;
  recurrence: Recurrence;
  estWeight: number;
}

export interface NewRejection {
  shopId: string;
  date: string;
  kg: number;
  reason: RejectReason;
  note?: string;
}

/* ---------- Options ---------- */

export const stages: { value: PickupStage; label: string }[] = [
  { value: "scheduled", label: "Scheduled" },
  { value: "collected", label: "Collected" },
  { value: "inspected", label: "Inspected" },
  { value: "weighed", label: "Weighed" },
  { value: "delivered", label: "Delivered" },
];

export const recurrenceOptions: { value: Recurrence; label: string }[] = [
  { value: "none", label: "Does not repeat" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
];

export const rejectReasons: { value: RejectReason; label: string }[] = [
  { value: "chemicals", label: "Chemical contamination" },
  { value: "moldy", label: "Wet or moldy" },
  { value: "foreign-objects", label: "Foreign objects" },
  { value: "too-short", label: "Too short" },
  { value: "other", label: "Other" },
];

/* Shops come from the supplier registry so both modules agree on identity. */
export const shops: Shop[] = initialSuppliers.map((supplier) => ({
  id: supplier.id,
  name: supplier.shopName,
  area: supplier.barangay,
}));

/* ---------- Date helpers (UTC-based so results don't depend on the time zone) ---------- */

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

export const addDays = (iso: string, n: number) => {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const addMonths = (iso: string, n: number) => {
  const d = toDate(iso);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
};

export const mondayOf = (iso: string) =>
  addDays(iso, -((toDate(iso).getUTCDay() + 6) % 7));

export const formatDate = (iso: string) =>
  toDate(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

export const formatShort = (iso: string) =>
  toDate(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

export const formatTime = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

export const fmtKg = (n: number) =>
  `${n.toLocaleString("en-US", { maximumFractionDigits: 1 })} kg`;

export const shopName = (id?: string) =>
  shops.find((s) => s.id === id)?.name ?? "Processing site";
export const shopArea = (id?: string) =>
  shops.find((s) => s.id === id)?.area ?? "";

/** Dates created by a schedule: the first pickup plus its repeats. */
export function occurrences(start: string, rec: Recurrence): string[] {
  if (rec === "none") return [start];
  if (rec === "weekly") return [0, 1, 2, 3].map((k) => addDays(start, 7 * k));
  if (rec === "biweekly") return [0, 1, 2].map((k) => addDays(start, 14 * k));
  return [0, 1, 2].map((k) => addMonths(start, k));
}

/** Last six weeks or months, oldest first. `end` is exclusive. */
export function periodBuckets(period: "weekly" | "monthly") {
  return [5, 4, 3, 2, 1, 0].map((k) => {
    if (period === "weekly") {
      const start = addDays(mondayOf(TODAY), -7 * k);
      return { start, end: addDays(start, 7), label: formatShort(start) };
    }
    const first = `${TODAY.slice(0, 7)}-01`;
    const start = addMonths(first, -k);
    return {
      start,
      end: addMonths(start, 1),
      label: toDate(start).toLocaleDateString("en-US", {
        month: "short",
        timeZone: "UTC",
      }),
    };
  });
}

/* ---------- Sample data ---------- */

const recurrenceForShop: Recurrence[] = [
  "weekly",
  "none",
  "weekly",
  "biweekly",
  "none",
];
const reasonCycle: RejectReason[] = [
  "chemicals",
  "moldy",
  "foreign-objects",
  "too-short",
];
const reasonNote: Record<string, string> = {
  chemicals: "Strong dye or chemical smell",
  moldy: "Stored wet in the bag",
  "foreign-objects": "Clips and plastic mixed in",
  "too-short": "Under the minimum length",
};

// 40 finished pickups, newest first, grouped four to a batch.
const historyPickups: Pickup[] = Array.from({ length: 40 }, (_, k) => {
  const i = k + 1;
  const kg = 18 + ((i * 7) % 23);
  return {
    id: `P-${2050 - i}`,
    shopId: shops[i % shops.length].id,
    date: addDays(TODAY, -i * 4),
    time: "10:00",
    recurrence: recurrenceForShop[i % shops.length],
    stage: "delivered",
    estWeight: kg + 2,
    weight: kg,
    batchId: `B-${String(142 - Math.floor(k / 4)).padStart(4, "0")}`,
  };
});

const activePickups: Pickup[] = [
  {
    id: "P-2050",
    shopId: "S-04",
    date: addDays(TODAY, -1),
    time: "10:00",
    recurrence: "biweekly",
    stage: "weighed",
    estWeight: 26,
    weight: 24.5,
  },
  {
    id: "P-2051",
    shopId: "S-01",
    date: TODAY,
    time: "09:00",
    recurrence: "weekly",
    stage: "inspected",
    estWeight: 30,
  },
  {
    id: "P-2052",
    shopId: "S-02",
    date: TODAY,
    time: "11:00",
    recurrence: "none",
    stage: "collected",
    estWeight: 25,
  },
  {
    id: "P-2053",
    shopId: "S-03",
    date: TODAY,
    time: "14:00",
    recurrence: "weekly",
    stage: "scheduled",
    estWeight: 40,
  },
  {
    id: "P-2054",
    shopId: "S-04",
    date: addDays(TODAY, 1),
    time: "10:00",
    recurrence: "biweekly",
    stage: "scheduled",
    estWeight: 22,
  },
  {
    id: "P-2055",
    shopId: "S-05",
    date: addDays(TODAY, 1),
    time: "15:00",
    recurrence: "none",
    stage: "scheduled",
    estWeight: 18,
  },
  {
    id: "P-2056",
    shopId: "S-01",
    date: addDays(TODAY, 3),
    time: "09:00",
    recurrence: "weekly",
    stage: "scheduled",
    estWeight: 30,
  },
  {
    id: "P-2057",
    shopId: "S-02",
    date: addDays(TODAY, 4),
    time: "10:30",
    recurrence: "monthly",
    stage: "scheduled",
    estWeight: 28,
  },
  {
    id: "P-2058",
    shopId: "S-03",
    date: addDays(TODAY, 5),
    time: "14:00",
    recurrence: "weekly",
    stage: "scheduled",
    estWeight: 40,
  },
];

export const initialPickups: Pickup[] = [...activePickups, ...historyPickups];

function buildLogs(): WeightLog[] {
  const logs: WeightLog[] = [
    {
      id: "L-P-2050",
      date: addDays(TODAY, -1),
      type: "in",
      kg: 24.5,
      shopId: "S-04",
      pickupId: "P-2050",
    },
  ];

  historyPickups.forEach((p, k) => {
    logs.push({
      id: `L-${p.id}`,
      date: p.date,
      type: "in",
      kg: p.weight!,
      shopId: p.shopId,
      pickupId: p.id,
      batchId: p.batchId,
    });
    if ((k + 1) % 5 === 0) {
      const reason = reasonCycle[k % 4];
      logs.push({
        id: `R-${p.id}`,
        date: p.date,
        type: "rejected",
        kg: 1.5 + (k % 3),
        shopId: p.shopId,
        pickupId: p.id,
        reason,
        note: reasonNote[reason],
      });
    }
  });

  // Hair used up by finished batches (everything except the two newest).
  const closed = new Map<string, { kg: number; date: string }>();
  historyPickups.forEach((p) => {
    if (p.batchId === "B-0142" || p.batchId === "B-0141") return;
    const cur = closed.get(p.batchId!) ?? { kg: 0, date: p.date };
    closed.set(p.batchId!, {
      kg: cur.kg + p.weight!,
      date: p.date > cur.date ? p.date : cur.date,
    });
  });
  closed.forEach((v, batchId) =>
    logs.push({
      id: `U-${batchId}`,
      date: addDays(v.date, 2),
      type: "processed",
      kg: v.kg,
      batchId,
    }),
  );

  return logs;
}

export const initialLogs: WeightLog[] = buildLogs();

/* ---------- Derived numbers used by the overview and the reports ---------- */

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Hair received (kg) in each of the last six weeks or months. */
export function volumeByPeriod(
  logs: WeightLog[],
  period: "weekly" | "monthly",
) {
  return periodBuckets(period).map((b) => ({
    label: b.label,
    value: round1(
      logs
        .filter((l) => l.type === "in" && l.date >= b.start && l.date < b.end)
        .reduce((s, l) => s + l.kg, 0),
    ),
  }));
}

export function stockSummary(logs: WeightLog[], pickups: Pickup[]) {
  const since = addDays(TODAY, -30);
  const sum = (type: LogType, from?: string) =>
    logs
      .filter((l) => l.type === type && (!from || l.date >= from))
      .reduce((s, l) => s + l.kg, 0);

  return {
    onHand: sum("in") - sum("processed"),
    awaiting: pickups
      .filter((p) => p.stage === "weighed")
      .reduce((s, p) => s + (p.weight ?? 0), 0),
    received30: sum("in", since),
    rejected30: sum("rejected", since),
  };
}
