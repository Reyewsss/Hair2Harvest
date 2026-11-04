/* Supplier (barbershop) registry. This is the single source of truth for shop
   identity — the inventory module derives its shop list from here. */

export type SupplierStatus = "pending" | "approved" | "rejected";

export type PickupFrequency = "weekly" | "biweekly" | "monthly";

export type OperatingHours = {
  days: string;
  open: string;
  close: string;
};

export type Supplier = {
  id: string;
  shopCode: string;
  shopName: string;
  owner: string;
  phone: string;
  email: string;
  barangay: string;
  address: string;
  operatingHours: OperatingHours;
  pickupFrequency: PickupFrequency;
  weeklyVolumeKg: number;
  status: SupplierStatus;
  registeredAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  remarks?: string;
};

export type NewSupplier = Omit<
  Supplier,
  | "id"
  | "shopCode"
  | "status"
  | "registeredAt"
  | "reviewedAt"
  | "reviewedBy"
  | "remarks"
>;

export const barangays = [
  "Cubao",
  "Katipunan",
  "Commonwealth",
  "Timog",
  "Diliman",
  "Fairview",
  "Novaliches",
  "San Bartolome",
] as const;

export const statusOptions: { value: SupplierStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export const frequencyOptions: {
  value: PickupFrequency;
  label: string;
  perMonth: number;
}[] = [
  { value: "weekly", label: "Weekly", perMonth: 4 },
  { value: "biweekly", label: "Every two weeks", perMonth: 2 },
  { value: "monthly", label: "Monthly", perMonth: 1 },
];

export const statusMeta: Record<
  SupplierStatus,
  { label: string; tone: string }
> = {
  pending: { label: "Pending review", tone: "bg-primary/10 text-primary" },
  approved: { label: "Approved", tone: "bg-success/10 text-success" },
  rejected: {
    label: "Rejected",
    tone: "bg-destructive/10 text-destructive",
  },
};

export const initialSuppliers: Supplier[] = [
  {
    id: "S-01",
    shopCode: "BBY-0101",
    shopName: "Studio Cut Barbers",
    owner: "Marco Reyes",
    phone: "0917 441 2280",
    email: "marco@studiocut.ph",
    barangay: "Cubao",
    address: "12B Aurora Blvd, Cubao",
    operatingHours: { days: "Mon–Sat", open: "09:00", close: "20:00" },
    pickupFrequency: "weekly",
    weeklyVolumeKg: 12.5,
    status: "approved",
    registeredAt: "2026-09-14",
    reviewedAt: "2026-09-16",
    reviewedBy: "Admin Reyes",
  },
  {
    id: "S-02",
    shopCode: "BBY-0102",
    shopName: "Glow Salon",
    owner: "Ana Villanueva",
    phone: "0918 220 7741",
    email: "ana@glowsalon.ph",
    barangay: "Katipunan",
    address: "88 Esteban Abada St, Katipunan",
    operatingHours: { days: "Tue–Sun", open: "10:00", close: "19:00" },
    pickupFrequency: "biweekly",
    weeklyVolumeKg: 8,
    status: "approved",
    registeredAt: "2026-09-22",
    reviewedAt: "2026-09-24",
    reviewedBy: "Admin Reyes",
  },
  {
    id: "S-03",
    shopCode: "BBY-0103",
    shopName: "Kapitan's Barbershop",
    owner: "Dante Cruz",
    phone: "0919 883 1120",
    email: "dante@kapitancuts.ph",
    barangay: "Commonwealth",
    address: "5 Commonwealth Ave, Batasan Hills",
    operatingHours: { days: "Daily", open: "08:00", close: "21:00" },
    pickupFrequency: "weekly",
    weeklyVolumeKg: 15,
    status: "pending",
    registeredAt: "2026-10-28",
  },
  {
    id: "S-04",
    shopCode: "BBY-0104",
    shopName: "Hair & Co.",
    owner: "Liza Santos",
    phone: "0920 551 3390",
    email: "liza@hairandco.ph",
    barangay: "Timog",
    address: "31 Scout Tobias, Timog",
    operatingHours: { days: "Mon–Sat", open: "09:30", close: "20:30" },
    pickupFrequency: "weekly",
    weeklyVolumeKg: 9.5,
    status: "approved",
    registeredAt: "2026-08-30",
    reviewedAt: "2026-09-02",
    reviewedBy: "Admin Reyes",
  },
  {
    id: "S-05",
    shopCode: "BBY-0105",
    shopName: "Bella Beauty Lounge",
    owner: "Grace Lim",
    phone: "0921 776 4482",
    email: "grace@bellalounge.ph",
    barangay: "Diliman",
    address: "7 Sikatuna Ave, Diliman",
    operatingHours: { days: "Wed–Sun", open: "11:00", close: "20:00" },
    pickupFrequency: "monthly",
    weeklyVolumeKg: 6,
    status: "pending",
    registeredAt: "2026-11-01",
  },
  {
    id: "S-06",
    shopCode: "BBY-0106",
    shopName: "Fade Factory",
    owner: "Ron Dela Peña",
    phone: "0922 310 6655",
    email: "ron@fadefactory.ph",
    barangay: "Fairview",
    address: "24 Regalado Ave, Fairview",
    operatingHours: { days: "Daily", open: "09:00", close: "22:00" },
    pickupFrequency: "weekly",
    weeklyVolumeKg: 11,
    status: "rejected",
    registeredAt: "2026-10-12",
    reviewedAt: "2026-10-14",
    reviewedBy: "Admin Reyes",
    remarks: "No covered storage area for segregated hair. Re-apply after setup.",
  },
  {
    id: "S-07",
    shopCode: "BBY-0107",
    shopName: "Novo Cuts",
    owner: "Jenny Ramos",
    phone: "0923 884 1276",
    email: "jenny@novocuts.ph",
    barangay: "Novaliches",
    address: "9 Quirino Hwy, Novaliches",
    operatingHours: { days: "Mon–Sun", open: "08:30", close: "20:00" },
    pickupFrequency: "biweekly",
    weeklyVolumeKg: 7.25,
    status: "approved",
    registeredAt: "2026-10-02",
    reviewedAt: "2026-10-05",
    reviewedBy: "Admin Reyes",
  },
  {
    id: "S-08",
    shopCode: "BBY-0108",
    shopName: "San Bartolome Barbers",
    owner: "Luis Garcia",
    phone: "0924 559 8810",
    email: "luis@sanbartolome.ph",
    barangay: "San Bartolome",
    address: "3 Zabarte Rd, San Bartolome",
    operatingHours: { days: "Tue–Sat", open: "09:00", close: "19:30" },
    pickupFrequency: "weekly",
    weeklyVolumeKg: 10,
    status: "pending",
    registeredAt: "2026-11-02",
  },
];

export const formatHours = (hours: OperatingHours) =>
  `${hours.days} · ${hours.open}–${hours.close}`;

export const supplierName = (
  id: string,
  suppliers: Supplier[] = initialSuppliers,
) => suppliers.find((supplier) => supplier.id === id)?.shopName ?? id;

export const monthlyVolume = (supplier: Supplier) => {
  const frequency = frequencyOptions.find(
    (option) => option.value === supplier.pickupFrequency,
  );
  return supplier.weeklyVolumeKg * (frequency?.perMonth ?? 4);
};
