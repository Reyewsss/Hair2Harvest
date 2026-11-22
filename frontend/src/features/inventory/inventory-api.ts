import { api } from "@/lib/api";

export const inventoryApi = {
  listLogs: async () => {
    const res = await api<{ logs: any[] }>("/inventory");
    return res.logs;
  },
  /** Raw hair on hand, in sacks (received minus processed). */
  stock: () => api<{ onHand: number }>("/inventory/stock").then((r) => r.onHand),
  /** Take sacks out of stock for a compost batch. Admin/operator only; 409 if not enough. */
  consume: (sacks: number, batchId: string, note?: string) =>
    api<{ onHand: number }>("/inventory/processed", { body: { sacks, batchId, note } }),
};
