// frontend/src/features/suppliers/data/suppliers-data.ts
import {
  TODAY,
  addDays,
  formatDate,
  formatTime,
} from "@/features/inventory/data/inventory-data";

export type SupplierStatus = "candidate" | "enrolled";
export type PickupFrequency = "nightly" | "twice-weekly" | "weekly";
export type HairType = "treated" | "untreated";
export type ContaminationGrade = "A" | "B" | "C" | "D";

export interface SupplierPickup {
  id: string;
  date: string;
  collector: string;
  sacks: number;
  kg: number;
  grade: ContaminationGrade;
}

export interface SupplierInput {
  shopName: string;
  ownerName: string;
  email: string;
  phone: string;
  barangay: string;
  street: string; // 👈 replaced `address`
  unit?: string; // 👈 optional unit/floor
  lat?: number;
  lng?: number;
  frequency: PickupFrequency;
  windowStart: string;
  windowEnd: string;
  accessNotes: string;
  consentParticipate: boolean;
  consentPhotos: boolean;
  consentDate: string;
  consentDocument?: string;
  registrationSource?: "admin" | "self"; // 👈 new
  consentAgreedBy?: string; // 👈 new
}

export interface Supplier extends SupplierInput {
  id: string;
  status: SupplierStatus;
  hairType: HairType;
  history: SupplierPickup[];
  lastReminder?: { at: string; message: string };
}

export type NewPickupInput = Omit<SupplierPickup, "id">;

/* ---------- Options ---------- */

export const frequencyOptions: { value: PickupFrequency; label: string }[] = [
  { value: "nightly", label: "Nightly" },
  { value: "twice-weekly", label: "Twice Weekly" },
  { value: "weekly", label: "Weekly" },
];

export const statusOptions: { value: SupplierStatus; label: string }[] = [
  { value: "enrolled", label: "Enrolled" },
  { value: "candidate", label: "Candidate" },
];

export const contaminationGrades: {
  value: ContaminationGrade;
  label: string;
}[] = [
  { value: "A", label: "A · Clean" },
  { value: "B", label: "B · Minor" },
  { value: "C", label: "C · Moderate" },
  { value: "D", label: "D · Heavy" },
];

export const sampleCollectors = ["Paolo Cruz", "Ana Dizon", "Bea Lim"];

/* ---------- Helpers ---------- */

export const frequencyLabel = (f: PickupFrequency) =>
  frequencyOptions.find((o) => o.value === f)?.label ?? f;

export const statusFromConsent = (
  consentParticipate: boolean,
): SupplierStatus => (consentParticipate ? "enrolled" : "candidate");

export const windowLabel = (
  s: Pick<SupplierInput, "windowStart" | "windowEnd">,
) => `${formatTime(s.windowStart)} – ${formatTime(s.windowEnd)}`;

export const hasPin = (s: Pick<SupplierInput, "lat" | "lng">) =>
  s.lat !== undefined && s.lng !== undefined;

/** Formats the split address for display */
export const formatAddress = (
  s: Pick<SupplierInput, "street" | "unit" | "barangay">,
) => [s.unit, s.street, s.barangay].filter(Boolean).join(", ");

export function nextPickupDate(s: Supplier): string | null {
  if (s.status !== "enrolled") return null;
  const step =
    s.frequency === "nightly" ? 1 : s.frequency === "twice-weekly" ? 3 : 7;
  const next = addDays(s.history[0]?.date ?? TODAY, step);
  return next < TODAY ? TODAY : next;
}

export const nextPickupLabel = (s: Supplier) => {
  const next = nextPickupDate(s);
  return next ? `${formatDate(next)}, ${windowLabel(s)}` : "Not scheduled yet";
};

export function historySummary(history: SupplierPickup[]) {
  return {
    pickups: history.length,
    sacks: history.reduce((sum, p) => sum + p.sacks, 0),
    kg: Math.round(history.reduce((sum, p) => sum + p.kg, 0) * 10) / 10,
  };
}

export const defaultReminderMessage = (s: Supplier) => {
  const next = nextPickupDate(s);
  const when = next ? `${formatDate(next)} between ${windowLabel(s)}` : "soon";
  return `Hi ${s.ownerName.split(" ")[0]}, this is a reminder from Hair2Harvest: the next hair pickup at ${s.shopName} is on ${when}. Please have your sacks ready. Thank you!`;
};
