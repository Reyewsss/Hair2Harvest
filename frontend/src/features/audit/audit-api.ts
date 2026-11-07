import { api } from "@/lib/api";

export type AuditEntry = {
  _id: string;
  user: string;
  action: string;
  module: string;
  item: string;
  remarks?: string;
  createdAt: string;
};

export const auditApi = {
  list: async (params: {
    search?: string;
    module?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.module) q.set("module", params.module);
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    return api<{ entries: AuditEntry[]; total: number; page: number }>(
      `/audit?${q}`,
    );
  },

  exportCsv: () => {
    const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5001/api";
    window.location.href = `${BASE}/audit/export`;
  },
};