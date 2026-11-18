import { api } from "@/lib/api";

export const inventoryApi = {
  listLogs: async () => {
    const res = await api<{ logs: any[] }>("/inventory");
    return res.logs;
  },
};