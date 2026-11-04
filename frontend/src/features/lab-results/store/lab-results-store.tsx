import { api } from "@/shared/lib/api";
import { createResourceStore } from "@/shared/lib/resource";
import type {
  LabAttachment,
  LabResult,
  LabValues,
  NewLabResult,
} from "../data/lab-results-data";

type ApiLabResult = {
  code: string;
  batchCode: string;
  version: number;
  labName: string;
  method: string;
  sampledAt: string;
  receivedAt: string;
  values: LabValues;
  attachment?: LabAttachment;
  notes?: string;
  enteredBy?: { name?: string } | string;
};

const toResult = (result: ApiLabResult): LabResult => ({
  id: result.code,
  batchCode: result.batchCode,
  version: result.version,
  labName: result.labName,
  method: result.method,
  sampledAt: result.sampledAt,
  receivedAt: result.receivedAt,
  values: result.values,
  attachment: result.attachment,
  notes: result.notes,
  enteredBy:
    typeof result.enteredBy === "string"
      ? result.enteredBy
      : (result.enteredBy?.name ?? "—"),
});

const store = createResourceStore(async () => {
  const data = await api.get<{ results: ApiLabResult[] }>("/api/lab-results");
  return data.results.map(toResult);
}, [] as LabResult[]);

export function useLabResults() {
  const { data: results, loading, error } = store.useResource();

  const addResult = async (input: NewLabResult) => {
    await api.post("/api/lab-results", input);
    await store.reload();
  };

  return { results, loading, error, addResult };
}
