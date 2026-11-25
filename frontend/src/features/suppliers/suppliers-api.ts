import { api } from "@/lib/api";
import { isFallbackPin, type Supplier } from "./data/suppliers-data";

// Web sign-ups save null coordinates; treat anything non-numeric as "no pin".
const coord = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

export const mapBackendToFrontend = (b: any): Supplier => {
  // 👇 Safely split the owner field if firstName/lastName are missing
  const owner = b.owner || "";
  const parts = owner.split(" ");
  const firstName = b.firstName || parts[0] || "";
  const lastName = b.lastName || parts.slice(1).join(" ") || "";

  return {
    id: b.code || b._id,
    shopName: b.shopName || "Unnamed shop",
    firstName, // 👈 Add this
    lastName,  // 👈 Add this
    ownerName: owner, // Keep for backward compatibility
    email: b.email || "",
    phone: b.phone || "",
    barangay: b.barangay || "",
    street: b.street || "",
    unit: b.unit || "",
    lat: coord(b.lat),
    lng: coord(b.lng),
    // Older records have no flag; a pin exactly on the old fallback point is approximate too.
    pinApproximate: Boolean(b.pinApproximate) || isFallbackPin(coord(b.lat), coord(b.lng)),
    frequency: b.pickupFrequency === "biweekly" ? "twice-weekly" : b.pickupFrequency,
    windowStart: b.operatingHours?.open || "09:00",
    windowEnd: b.operatingHours?.close || "18:00",
    accessNotes: "",
    consentParticipate: b.consent?.agreed ?? false,
    consentPhotos: b.consent?.agreed ?? false,
    consentDate: b.consent?.agreedAt || b.createdAt || "",
    consentDocument: b.consent?.document,
    registrationSource: b.registrationSource,
    consentAgreedBy: b.consent?.agreedBy,
    status: b.status === "approved" ? "enrolled" : "candidate",
    review: b.status,
    remarks: b.remarks || undefined,
    registeredAt: b.createdAt,
    lastReminder: b.lastReminder?.at
      ? { at: b.lastReminder.at, message: b.lastReminder.message || "" }
      : undefined,
    hairType: "untreated",
    history: [],
  };
};

export const suppliersApi = {
  list: async () => {
    const res = await api<{ suppliers: any[] }>("/suppliers");
    return res.suppliers.map(mapBackendToFrontend);
  },

  get: async (id: string) => {
    const res = await api<{ supplier: any }>(`/suppliers/${id}`);
    return mapBackendToFrontend(res.supplier);
  },

  create: async (formData: FormData) => {
    const data = await api<{ supplier: any }>("/suppliers", { method: "POST", body: formData });
    return mapBackendToFrontend(data.supplier);
  },

  update: async (id: string, formData: FormData) => {
    // 👇 Extract the split names from the FormData
    const payload = {
      shopName: formData.get("shopName"),
      firstName: formData.get("firstName"), // 👈 NEW
      lastName: formData.get("lastName"),   // 👈 NEW
      phone: formData.get("phone"),
      email: formData.get("email"),
      street: formData.get("street"),
      unit: formData.get("unit"),
      pickupFrequency: formData.get("pickupFrequency"),
      weeklyVolumeKg: Number(formData.get("weeklyVolumeKg")) || 0,
      operatingHours: JSON.parse(String(formData.get("operatingHours") || "{}")),
      lat: formData.get("lat"),
      lng: formData.get("lng"),
      pinManuallySet: formData.get("pinManuallySet"),
      noPin: formData.get("noPin"),
    };
    const res = await api<{ supplier: any }>(`/suppliers/${id}`, {
      method: "PATCH",
      body: payload,
    });
    return mapBackendToFrontend(res.supplier);
  },

  delete: async (id: string) => {
    await api(`/suppliers/${id}`, { method: "DELETE" });
  },

  review: async (
    id: string,
    status: "approved" | "rejected",
    remarks?: string,
  ) => {
    const res = await api<{ supplier: any }>(`/suppliers/${id}/review`, {
      method: "PATCH",
      body: { status, remarks },
    });
    return mapBackendToFrontend(res.supplier);
  },

  sendReminder: async (id: string, message: string) => {
    const res = await api<{ success: boolean; smsBatchId?: string }>(
      `/suppliers/${id}/send-reminder`,
      { method: "POST", body: { message } },
    );
    return res;
  },
};

// Everything goes through api(), so reads are cached and any change clears the cache.
export const pickupsApi = {
  schedule: (data: {
    supplierId: string;
    date: string;
    time: string;
    frequency: string;
    assignedTo?: string;
  }) => api<any>("/suppliers/pickups", { method: "POST", body: data }),

  update: (id: string, data: { date: string; time: string; assignedTo?: string }) =>
    api<any>(`/suppliers/pickups/${id}`, { method: "PATCH", body: data }),

  remove: (id: string) => api<any>(`/suppliers/pickups/${id}`, { method: "DELETE" }),

  archive: (id: string) => api<any>(`/suppliers/pickups/${id}/archive`, { method: "PATCH", body: {} }),

  restore: (id: string) => api<any>(`/suppliers/pickups/${id}/restore`, { method: "PATCH", body: {} }),

  getSchedule: (date: string) => api<any>(`/suppliers/pickups?date=${date}`),

  updateStatus: (id: string, status: string, payload: any = {}) =>
    api<any>(`/suppliers/pickups/${id}/status`, { method: "PATCH", body: { status, ...payload } }),

  getOldSchedule: (date: string, scope: "active" | "past" | "archived" = "active") =>
    api<any>(`/suppliers/pickups?date=${date}&scope=${scope}`),

  getPickupHistory: async (supplierId: string) => {
    const res = await api<{ pickups: any[] }>(`/suppliers/pickups/supplier/${supplierId}`);
    return res.pickups;
  },
};

export const staffApi = {
  list: async () => {
    const data = await api<{ staff: any[] }>("/accounts/staff");
    return data.staff;
  },
};
