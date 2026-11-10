import { api } from "@/lib/api";
import type { Role } from "@/features/auth/permissions";

export interface Account {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface NewAccount {
  name: string;
  email: string;
  role: Role;
  password: string;
}

// All of these are administrator-only on the server.
export const accountsApi = {
  list: () => api<{ accounts: Account[] }>("/accounts").then((r) => r.accounts),
  create: (input: NewAccount) => api<{ account: Account }>("/accounts", { body: input }).then((r) => r.account),
  update: (id: string, patch: Partial<Pick<Account, "name" | "role" | "isActive">> & { password?: string }) =>
    api<{ account: Account }>(`/accounts/${id}`, { method: "PATCH", body: patch }).then((r) => r.account),
  remove: (id: string) => api<{ message: string }>(`/accounts/${id}`, { method: "DELETE" }),
};