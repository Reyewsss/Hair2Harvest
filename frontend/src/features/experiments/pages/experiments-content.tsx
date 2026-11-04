import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "../../../shared/ui/button.tsx";
import { SegmentedTabs, SummaryCard } from "../../../shared/ui/form-controls.tsx";
import { useExperiments } from "../store/experiments-store";
import { ExperimentsView } from "../views/experiments-view";
import { NewExperimentView } from "../views/new-experiment-view";

type ExperimentTab = "list" | "new";

export function ExperimentsContent() {
  const { experiments } = useExperiments();
  const [tab, setTab] = useState<ExperimentTab>("list");

  const active = experiments.filter(
    (experiment) => experiment.status === "active",
  ).length;
  const crops = new Set(experiments.map((experiment) => experiment.crop)).size;
  const measurements = experiments.reduce(
    (sum, experiment) => sum + experiment.growth.length,
    0,
  );
  const batchesUsed = new Set(
    experiments.map((experiment) => experiment.batchCode),
  ).size;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-8 pb-10 md:px-6">
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Planting Experiments</h1>
            <p className="text-lg text-muted-foreground">
              Growth trials on approved compost, with full traceability back to
              the batch
            </p>
          </div>
          <Button
            type="button"
            className="h-10 gap-1 px-3.5"
            onClick={() => setTab("new")}
          >
            <Plus className="size-5" />
            New experiment
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Experiments"
            value={String(experiments.length)}
            note={`${active} active`}
          />
          <SummaryCard
            label="Crops tested"
            value={String(crops)}
            note="Across all trials"
          />
          <SummaryCard
            label="Measurements logged"
            value={String(measurements)}
            note="Height, leaves and health"
          />
          <SummaryCard
            label="Batches used"
            value={String(batchesUsed)}
            note="Approved for supervised testing"
          />
        </div>

        <div className="flex">
          <SegmentedTabs
            value={tab}
            onChange={setTab}
            options={[
              { value: "list", label: "Experiments" },
              { value: "new", label: "New experiment" },
            ]}
          />
        </div>
      </section>

      {tab === "list" ? <ExperimentsView /> : null}
      {tab === "new" ? (
        <NewExperimentView onDone={() => setTab("list")} />
      ) : null}
    </div>
  );
}
