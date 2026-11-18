import { api } from "@/lib/api";
import type { Supplier } from "./data/suppliers-data";

export const mapBackendToFrontend = (b: any): Supplier => {
  // 👇 Safely split the owner field if firstName/lastName are missing
  const owner = b.owner || "";
  const parts = owner.split(" ");
  const firstName = b.firstName || parts[0] || "";
  const lastName = b.lastName || parts.slice(1).join(" ") || "";

  return {
    id: b.code || b._id,
    shopName: b.shopName,
    firstName, // 👈 Add this
    lastName,  // 👈 Add this
    ownerName: owner, // Keep for backward compatibility
    email: b.email || "",
    phone: b.phone,
    barangay: b.barangay,
    street: b.street || "",
    unit: b.unit || "",
    lat: b.lat,
    lng: b.lng,
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
    const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5001/api";
    const res = await fetch(`${BASE}/suppliers`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw Object.assign(new Error(data?.message || "Failed to create supplier"), {
        status: res.status,
      });
    }
    const data = await res.json();
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

export const pickupsApi = {
  schedule: async (data: {
    supplierId: string;
    date: string;
    time: string;
    frequency: string;
    assignedTo?: string;
  }) => {
    const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5001/api";
    const res = await fetch(`${BASE}/suppliers/pickups`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      // Keep the HTTP status so the UI can tell "already exists" (409) apart from other errors.
      throw Object.assign(new Error(body?.message || "Failed to schedule"), {
        status: res.status,
      });
    }
    return res.json();
  },

  update: async (
    id: string,
    data: { date: string; time: string; assignedTo?: string },
  ) => {
    const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5001/api";
    const res = await fetch(`${BASE}/suppliers/pickups/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw Object.assign(new Error(body?.message || "Failed to update pickup"), {
        status: res.status,
      });
    }
    return res.json();
  },

  remove: async (id: string) => {
    const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5001/api";
    const res = await fetch(`${BASE}/suppliers/pickups/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw Object.assign(new Error(body?.message || "Failed to delete pickup"), {
        status: res.status,
      });
    }
    return res.json();
  },

  archive: async (id: string) => {
    const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5001/api";
    const res = await fetch(`${BASE}/suppliers/pickups/${id}/archive`, {
      method: "PATCH",
      credentials: "include",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw Object.assign(new Error(body?.message || "Failed to archive pickup"), {
        status: res.status,
      });
    }
    return res.json();
  },

  restore: async (id: string) => {
    const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5001/api";
    const res = await fetch(`${BASE}/suppliers/pickups/${id}/restore`, {
      method: "PATCH",
      credentials: "include",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw Object.assign(new Error(body?.message || "Failed to restore pickup"), {
        status: res.status,
      });
    }
    return res.json();
  },

  getSchedule: async (date: string) => {
    const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5001/api";
    const res = await fetch(`${BASE}/suppliers/pickups?date=${date}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to load schedule");
    return res.json();
  },

  updateStatus: async (id: string, status: string, payload: any = {}) => {
    const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5001/api";
    const res = await fetch(`${BASE}/suppliers/pickups/${id}/status`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...payload }),
    });
    if (!res.ok) throw new Error((await res.json()).message || "Failed to update status");
    return res.json();
  },

  getOldSchedule: async (
    date: string,
    scope: "active" | "past" | "archived" = "active",
  ) => {
    const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5001/api";
    const res = await fetch(`${BASE}/suppliers/pickups?date=${date}&scope=${scope}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to load schedule");
    return res.json();
  },

  getPickupHistory: async (supplierId: string) => {
    const res = await api<{ pickups: any[] }>(`/suppliers/pickups/supplier/${supplierId}`);
    return res.pickups;
  },
};

export const staffApi = {
  list: async () => {
    const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5001/api";
    const res = await fetch(`${BASE}/accounts/staff`, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to load staff");
    const data = await res.json();
    return data.staff;
  },
};