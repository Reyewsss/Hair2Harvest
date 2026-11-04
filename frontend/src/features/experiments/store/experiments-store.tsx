import { api } from "@/shared/lib/api";
import { createResourceStore } from "@/shared/lib/resource";
import type {
  Experiment,
  GrowthEntry,
  HealthScore,
  NewExperiment,
  Treatment,
} from "../data/experiments-data";

type ApiGrowth = {
  _id: string;
  date: string;
  treatmentId: string;
  heightCm: number;
  leafCount: number;
  health: HealthScore;
  photo?: string;
  note?: string;
};

type ApiExperiment = {
  code: string;
  title: string;
  crop: string;
  setup: string;
  batchCode: string;
  startDate: string;
  status: Experiment["status"];
  treatments: Treatment[];
  growth?: ApiGrowth[];
  createdBy?: { name?: string } | string;
};

const toExperiment = (experiment: ApiExperiment): Experiment => ({
  id: experiment.code,
  title: experiment.title,
  crop: experiment.crop,
  setup: experiment.setup,
  batchCode: experiment.batchCode,
  startDate: experiment.startDate,
  status: experiment.status,
  treatments: experiment.treatments,
  growth: (experiment.growth ?? []).map(
    (entry): GrowthEntry => ({
      id: entry._id,
      date: entry.date,
      treatmentId: entry.treatmentId,
      heightCm: entry.heightCm,
      leafCount: entry.leafCount,
      health: entry.health,
      photo: entry.photo,
      note: entry.note,
    }),
  ),
  createdBy:
    typeof experiment.createdBy === "string"
      ? experiment.createdBy
      : (experiment.createdBy?.name ?? "—"),
});

const store = createResourceStore(async () => {
  const data = await api.get<{ experiments: ApiExperiment[] }>(
    "/api/experiments",
  );
  return data.experiments.map(toExperiment);
}, [] as Experiment[]);

export function useExperiments() {
  const { data: experiments, loading, error } = store.useResource();

  const addExperiment = async (input: NewExperiment) => {
    await api.post("/api/experiments", input);
    await store.reload();
  };

  const addGrowth = async (
    experimentId: string,
    entry: Omit<GrowthEntry, "id">,
  ) => {
    await api.post(`/api/experiments/${experimentId}/growth`, entry);
    await store.reload();
  };

  return { experiments, loading, error, addExperiment, addGrowth };
}
