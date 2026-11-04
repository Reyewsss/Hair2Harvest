// Types, options, helpers and SAMPLE data for the Suppliers tab. Replace the sample data with your API.
// There is deliberately no username or password anywhere: shops never log in.
import { TODAY, addDays, formatDate, formatTime } from "@/features/inventory/data/inventory-data";

/* ---------- Types ---------- */

export type SupplierStatus = "candidate" | "enrolled";
export type PickupFrequency = "nightly" | "twice-weekly" | "weekly";
export type HairType = "treated" | "untreated";
export type ContaminationGrade = "A" | "B" | "C" | "D";

export interface SupplierPickup {
  id: string;
  date: string; // YYYY-MM-DD
  collector: string;
  sacks: number;
  kg: number;
  grade: ContaminationGrade;
}

/** What the 2-minute registration form collects. */
export interface SupplierInput {
  shopName: string;
  ownerName: string;
  phone: string;
  barangay: string;
  address: string;
  lat?: number; // optional static map pin
  lng?: number;
  frequency: PickupFrequency;
  windowStart: string; // HH:MM
  windowEnd: string; // HH:MM
  accessNotes: string;
  consentParticipate: boolean;
  consentPhotos: boolean;
  consentDate: string; // YYYY-MM-DD
}

export interface Supplier extends SupplierInput {
  id: string;
  status: SupplierStatus; // enrolled = consented to participate, candidate = not yet
  hairType: HairType;
  history: SupplierPickup[]; // newest first
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

// Edit these labels to match the grading scale your collectors use.
export const contaminationGrades: { value: ContaminationGrade; label: string }[] = [
  { value: "A", label: "A · Clean" },
  { value: "B", label: "B · Minor" },
  { value: "C", label: "C · Moderate" },
  { value: "D", label: "D · Heavy" },
];

export const sampleCollectors = ["Paolo Cruz", "Ana Dizon", "Bea Lim"];

/* ---------- Helpers ---------- */

export const frequencyLabel = (f: PickupFrequency) => frequencyOptions.find((o) => o.value === f)?.label ?? f;

export const statusFromConsent = (consentParticipate: boolean): SupplierStatus =>
  consentParticipate ? "enrolled" : "candidate";

export const windowLabel = (s: Pick<SupplierInput, "windowStart" | "windowEnd">) =>
  `${formatTime(s.windowStart)} – ${formatTime(s.windowEnd)}`;

export const hasPin = (s: Pick<SupplierInput, "lat" | "lng">) => s.lat !== undefined && s.lng !== undefined;

/** Next pickup, counted from the last logged pickup. Candidates have no schedule yet. */
export function nextPickupDate(s: Supplier): string | null {
  if (s.status !== "enrolled") return null;
  const step = s.frequency === "nightly" ? 1 : s.frequency === "twice-weekly" ? 3 : 7;
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

/* ---------- Sample data ---------- */

type Seed = [
  shop: string, owner: string, phone: string, barangay: string, address: string,
  lat: number | undefined, lng: number | undefined,
  frequency: PickupFrequency, start: string, end: string, notes: string,
  enrolled: boolean, hair: HairType,
];

const seeds: Seed[] = [
  ["Studio Cut Barbers", "Rico Valdez", "0917 120 0001", "Project 4", "12 Aurora Blvd", 14.6212, 121.0584, "weekly", "20:00", "22:00", "Ask the guard for the key", true, "untreated"],
  ["Glow Salon", "Marissa Lopez", "0918 220 0002", "Loyola Heights", "45 Katipunan Ave", 14.6402, 121.0768, "twice-weekly", "20:00", "22:00", "Ring the bell at the side door", true, "treated"],
  ["Kapitan's Barbershop", "Alfredo Kapitan", "0919 320 0003", "Commonwealth", "88 Commonwealth Ave", 14.6932, 121.0912, "nightly", "21:00", "23:00", "", true, "untreated"],
  ["Hair & Co.", "Jenny Tan", "0920 420 0004", "South Triangle", "7 Timog Ave", 14.6286, 121.0369, "weekly", "19:00", "21:00", "Collect from the back storage room", true, "treated"],
  ["Bella Beauty Lounge", "Carla Mendoza", "0921 520 0005", "Pinyahan", "23 Visayas Ave", 14.6431, 121.0442, "twice-weekly", "20:00", "22:00", "", true, "untreated"],
  ["Cut Above Barbers", "Noel Reyes", "0922 620 0006", "Kamuning", "101 K-1st St", 14.6307, 121.0393, "nightly", "20:30", "22:30", "Shop is upstairs, park at the corner", true, "untreated"],
  ["Salon de Rosa", "Rosa Flores", "0923 720 0007", "Batasan Hills", "5 IBP Road", 14.6811, 121.1016, "weekly", "18:00", "20:00", "", true, "treated"],
  ["Tandang Sora Cuts", "Ben Aquino", "0924 820 0008", "Tandang Sora", "Lot 3 Tandang Sora Ave", 14.6798, 121.0475, "twice-weekly", "20:00", "22:00", "", true, "untreated"],
  ["Mane Attraction", "Liza Ong", "0925 920 0009", "Project 4", "Unit 2, 30 Aurora Blvd", 14.622, 121.06, "weekly", "20:00", "22:00", "", false, "untreated"],
  ["Fade Factory", "Dennis Uy", "0926 100 0010", "Loyola Heights", "B12 Esteban Abada St", 14.639, 121.079, "twice-weekly", "21:00", "23:00", "Owner prefers a call first", false, "untreated"],
  ["Pretty Locks", "Tess Navarro", "0927 110 0011", "Commonwealth", "14 Commonwealth Ave", 14.685, 121.085, "weekly", "19:00", "21:00", "", false, "untreated"],
  ["Snip Station", "Gerry Lim", "0928 120 0012", "Kamuning", "66 Scout Reyes St", undefined, undefined, "nightly", "20:00", "22:00", "", false, "untreated"],
];

const grades: ContaminationGrade[] = ["A", "A", "B", "A", "B", "C", "A", "B"];

// Eight recent pickups per enrolled shop, spaced by its frequency.
function buildHistory(index: number, frequency: PickupFrequency): SupplierPickup[] {
  const offsets =
    frequency === "nightly"
      ? [1, 2, 3, 4, 5, 6, 7, 8]
      : frequency === "twice-weekly"
        ? [1, 4, 8, 11, 15, 18, 22, 25]
        : [3, 10, 17, 24, 31, 38, 45, 52];
  return offsets.map((offset, k) => {
    const seed = index * 7 + k * 3;
    const sacks = 1 + (seed % 4);
    return {
      id: `H-${index + 1}-${k + 1}`,
      date: addDays(TODAY, -(offset + (frequency === "weekly" ? index % 3 : 0))),
      collector: sampleCollectors[(index + k) % sampleCollectors.length],
      sacks,
      kg: Math.round(sacks * (5.5 + (seed % 5) * 0.6) * 10) / 10,
      grade: grades[(index + k) % grades.length],
    };
  });
}

export const initialSuppliers: Supplier[] = seeds.map(
  ([shopName, ownerName, phone, barangay, address, lat, lng, frequency, windowStart, windowEnd, accessNotes, enrolled, hairType], index) => ({
    id: `SUP-${String(index + 1).padStart(3, "0")}`,
    shopName,
    ownerName,
    phone,
    barangay,
    address,
    lat,
    lng,
    frequency,
    windowStart,
    windowEnd,
    accessNotes,
    consentParticipate: enrolled,
    consentPhotos: enrolled && index % 3 !== 0,
    consentDate: enrolled ? addDays(TODAY, -(60 + index * 9)) : "",
    status: statusFromConsent(enrolled),
    hairType,
    history: enrolled ? buildHistory(index, frequency) : [],
  }),
);