import { api } from "@/shared/lib/api";
import { createResourceStore } from "@/shared/lib/resource";
import type {
  LogType,
  NewPickup,
  NewRejection,
  Pickup,
  PickupStage,
  Recurrence,
  RejectReason,
  WeightLog,
} from "../data/inventory-data";

/* Pickups and weight logs live in MongoDB; both lists are cached here so the
   overview and every sub-page read the same records. */

type ApiPickup = {
  code: string;
  supplierCode: string;
  date: string;
  time: string;
  recurrence: Recurrence;
  stage: PickupStage;
  estimatedWeightKg: number;
  weightKg?: number;
  batchCode?: string;
};

type ApiLog = {
  code: string;
  supplierCode?: string;
  pickupCode?: string;
  date: string;
  type: LogType;
  weightKg: number;
  batchCode?: string;
  reason?: RejectReason;
  note?: string;
};

const toPickup = (pickup: ApiPickup): Pickup => ({
  id: pickup.code,
  shopId: pickup.supplierCode,
  date: pickup.date,
  time: pickup.time,
  recurrence: pickup.recurrence,
  stage: pickup.stage,
  estWeight: pickup.estimatedWeightKg,
  weight: pickup.weightKg,
  batchId: pickup.batchCode,
});

const toLog = (log: ApiLog): WeightLog => ({
  id: log.code,
  date: log.date,
  type: log.type,
  kg: log.weightKg,
  shopId: log.supplierCode,
  pickupId: log.pickupCode,
  batchId: log.batchCode,
  reason: log.reason,
  note: log.note,
});

const pickupsStore = createResourceStore(async () => {
  const data = await api.get<{ pickups: ApiPickup[] }>(
    "/api/collections/pickups",
  );
  return data.pickups.map(toPickup);
}, [] as Pickup[]);

const logsStore = createResourceStore(async () => {
  const data = await api.get<{ logs: ApiLog[] }>("/api/collections/logs");
  return data.logs.map(toLog);
}, [] as WeightLog[]);

export function useInventory() {
  const { data: pickups, loading: pickupsLoading } = pickupsStore.useResource();
  const { data: logs, loading: logsLoading } = logsStore.useResource();

  const reload = () =>
    Promise.all([pickupsStore.reload(), logsStore.reload()]);

  const addPickup = async (input: NewPickup) => {
    await api.post("/api/collections/pickups", {
      supplierCode: input.shopId,
      date: input.date,
      time: input.time,
      recurrence: input.recurrence,
      estimatedWeightKg: input.estWeight,
    });
    await reload();
  };

  const advance = async (id: string, weight?: number) => {
    await api.patch(`/api/collections/pickups/${id}/advance`, {
      weightKg: weight,
    });
    await reload();
  };

  const addRejection = async (input: NewRejection) => {
    await api.post("/api/collections/logs", {
      supplierCode: input.shopId,
      date: input.date,
      type: "rejected",
      weightKg: input.kg,
      reason: input.reason,
      note: input.note,
    });
    await reload();
  };

  return {
    pickups,
    logs,
    loading: pickupsLoading || logsLoading,
    addPickup,
    advance,
    addRejection,
  };
}
