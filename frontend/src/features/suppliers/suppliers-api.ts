import { api } from "@/lib/api";
import type { Supplier } from "./data/suppliers-data";

export const mapBackendToFrontend = (b: any): Supplier => ({
  id: b.code || b._id,
  shopName: b.shopName,
  ownerName: b.owner,
  email: b.email || "",
  phone: b.phone,
  barangay: b.barangay,
  address: b.address,
  frequency: b.pickupFrequency === "biweekly" ? "twice-weekly" : b.pickupFrequency,
  windowStart: b.operatingHours?.open || "09:00",
  windowEnd: b.operatingHours?.close || "18:00",
  accessNotes: "",
  consentParticipate: b.hasConsent,
  consentPhotos: b.hasConsent,
  consentDate: b.createdAt || "",
  status: b.status === "approved" ? "enrolled" : "candidate",
  hairType: "untreated",
  history: [],
  consentDocument: b.consentDocument,
});

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
      throw new Error(data?.message || "Failed to create supplier");
    }
    const data = await res.json();
    return mapBackendToFrontend(data.supplier);
  },

  // 👈 Updated to extract data from FormData
  update: async (id: string, formData: FormData) => {
    const payload = {
      shopName: formData.get("shopName"),
      owner: formData.get("owner"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      address: formData.get("address"),
      pickupFrequency: formData.get("pickupFrequency"),
      weeklyVolumeKg: Number(formData.get("weeklyVolumeKg")) || 0,
      operatingHours: JSON.parse(String(formData.get("operatingHours") || "{}")),
    };
    const res = await api<{ supplier: any }>(`/suppliers/${id}`, { method: "PATCH", body: payload });
    return mapBackendToFrontend(res.supplier);
  },

  // 👈 NEW
  delete: async (id: string) => {
    await api(`/suppliers/${id}`, { method: "DELETE" });
  },
};