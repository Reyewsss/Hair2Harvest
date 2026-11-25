import { API_BASE, api } from "@/lib/api";
import type { Role } from "@/features/auth/permissions";

export interface Account {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone?: string;
  /** Optional second address for pickup / collection reminders. */
  notifyEmail?: string;
  /** True when a staff ID file is on record (the file itself is only served to account managers). */
  hasIdDocument?: boolean;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface NewAccount {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  notifyEmail?: string;
  role: Role;
  password: string;
}

// All of these are administrator-only on the server.
export const accountsApi = {
  list: () => api<{ accounts: Account[] }>("/accounts").then((r) => r.accounts),
  create: (input: NewAccount) =>
    api<{ account: Account }>("/accounts", { body: input }).then((r) => r.account),
  update: (
    id: string,
    patch: Partial<Pick<Account, "firstName" | "lastName" | "name" | "role" | "isActive" | "phone" | "notifyEmail">> & {
      password?: string;
    },
  ) =>
    api<{ account: Account }>(`/accounts/${id}`, { method: "PATCH", body: patch }).then(
      (r) => r.account,
    ),
  /** Uploads (or replaces) the optional staff ID: PDF, JPG or PNG, 5 MB max. */
  uploadId: async (id: string, file: File) => {
    const body = new FormData();
    body.append("idDocument", file);
    const data = await api<{ account: Account }>(`/accounts/${id}/id-document`, { method: "POST", body });
    return data.account;
  },
  removeId: (id: string) =>
    api<{ account: Account }>(`/accounts/${id}/id-document`, { method: "DELETE" }).then((r) => r.account),
  idUrl: (id: string) => `${API_BASE}/accounts/${id}/id-document`,
  remove: (id: string) => api<{ message: string }>(`/accounts/${id}`, { method: "DELETE" }),
};