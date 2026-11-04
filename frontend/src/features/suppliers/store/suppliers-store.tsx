import { api } from "@/shared/lib/api";
import { createResourceStore } from "@/shared/lib/resource";
import type {
  NewSupplier,
  Supplier,
  SupplierStatus,
} from "../data/suppliers-data";

type ApiSupplier = {
  code: string;
  shopCode: string;
  shopName: string;
  owner: string;
  phone: string;
  email: string;
  barangay: string;
  address: string;
  operatingHours: Supplier["operatingHours"];
  pickupFrequency: Supplier["pickupFrequency"];
  weeklyVolumeKg: number;
  status: SupplierStatus;
  createdAt?: string;
  reviewedAt?: string;
  reviewedBy?: { name?: string } | null;
  remarks?: string;
};

const toSupplier = (supplier: ApiSupplier): Supplier => ({
  id: supplier.code,
  shopCode: supplier.shopCode,
  shopName: supplier.shopName,
  owner: supplier.owner,
  phone: supplier.phone,
  email: supplier.email,
  barangay: supplier.barangay,
  address: supplier.address,
  operatingHours: supplier.operatingHours,
  pickupFrequency: supplier.pickupFrequency,
  weeklyVolumeKg: supplier.weeklyVolumeKg,
  status: supplier.status,
  registeredAt: (supplier.createdAt ?? "").slice(0, 10),
  reviewedAt: supplier.reviewedAt,
  reviewedBy: supplier.reviewedBy?.name,
  remarks: supplier.remarks,
});

const store = createResourceStore(async () => {
  const data = await api.get<{ suppliers: ApiSupplier[] }>("/api/suppliers");
  return data.suppliers.map(toSupplier);
}, [] as Supplier[]);

export function useSuppliers() {
  const { data: suppliers, loading, error } = store.useResource();

  const pending = suppliers.filter((supplier) => supplier.status === "pending");
  const approved = suppliers.filter(
    (supplier) => supplier.status === "approved",
  );

  const register = async (input: NewSupplier) => {
    await api.post("/api/suppliers", input);
    await store.reload();
  };

  const review = async (
    id: string,
    status: Exclude<SupplierStatus, "pending">,
    remarks?: string,
  ) => {
    await api.patch(`/api/suppliers/${id}/review`, { status, remarks });
    await store.reload();
  };

  const updateProfile = async (id: string, patch: Partial<Supplier>) => {
    const {
      shopName,
      owner,
      phone,
      email,
      barangay,
      address,
      operatingHours,
      pickupFrequency,
      weeklyVolumeKg,
    } = patch;
    await api.patch(`/api/suppliers/${id}`, {
      shopName,
      owner,
      phone,
      email,
      barangay,
      address,
      operatingHours,
      pickupFrequency,
      weeklyVolumeKg,
    });
    await store.reload();
  };

  return {
    suppliers,
    pending,
    approved,
    loading,
    error,
    register,
    review,
    updateProfile,
  };
}
