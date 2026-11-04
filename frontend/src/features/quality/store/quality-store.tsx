import { api } from "@/shared/lib/api";
import { createResourceStore } from "@/shared/lib/resource";
import {
  defaultThresholds,
  type Criterion,
  type Decision,
  type HistoryEntry,
  type QualityStatus,
} from "../data/quality-data";

type ApiDecision = {
  batchCode: string;
  status: QualityStatus;
  decidedBy?: { name?: string } | string;
  decidedAt: string;
  remarks?: string;
};

type ApiHistory = ApiDecision & { _id: string; previous: QualityStatus };

const nameOf = (value?: { name?: string } | string) =>
  typeof value === "string" ? value : (value?.name ?? "—");

const thresholdsStore = createResourceStore(async () => {
  const data = await api.get<{ criteria: Criterion[] }>(
    "/api/quality/thresholds",
  );
  return data.criteria.length ? data.criteria : defaultThresholds;
}, [] as Criterion[]);

const decisionsStore = createResourceStore(async () => {
  const data = await api.get<{ decisions: ApiDecision[] }>(
    "/api/quality/decisions",
  );
  return data.decisions.map(
    (decision): Decision => ({
      batchCode: decision.batchCode,
      status: decision.status,
      decidedBy: nameOf(decision.decidedBy),
      decidedAt: decision.decidedAt,
      remarks: decision.remarks,
    }),
  );
}, [] as Decision[]);

const historyStore = createResourceStore(async () => {
  const data = await api.get<{ history: ApiHistory[] }>("/api/quality/history");
  return data.history.map(
    (entry): HistoryEntry => ({
      id: entry._id,
      batchCode: entry.batchCode,
      previous: entry.previous,
      status: entry.status,
      decidedBy: nameOf(entry.decidedBy),
      decidedAt: entry.decidedAt,
      remarks: entry.remarks,
    }),
  );
}, [] as HistoryEntry[]);

export function useQuality() {
  const { data: thresholds, loading: thresholdsLoading } =
    thresholdsStore.useResource();
  const { data: decisions, loading: decisionsLoading } =
    decisionsStore.useResource();
  const { data: history, loading: historyLoading } =
    historyStore.useResource();

  const authorize = async (
    batchCode: string,
    status: QualityStatus,
    remarks: string,
  ) => {
    await api.post("/api/quality/decisions", { batchCode, status, remarks });
    await Promise.all([decisionsStore.reload(), historyStore.reload()]);
  };

  const saveThresholds = async (criteria: Criterion[]) => {
    await api.put("/api/quality/thresholds", { criteria });
    await thresholdsStore.reload();
    await decisionsStore.reload();
  };

  return {
    thresholds,
    decisions,
    history,
    loading: thresholdsLoading || decisionsLoading || historyLoading,
    authorize,
    saveThresholds,
  };
}
