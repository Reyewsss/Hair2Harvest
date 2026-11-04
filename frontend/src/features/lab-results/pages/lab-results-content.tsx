import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "../../../shared/ui/button.tsx";
import { SegmentedTabs, SummaryCard } from "../../../shared/ui/form-controls.tsx";
import { formatDate } from "../../inventory/data/inventory-data";
import { useLabResults } from "../store/lab-results-store";
import { ResultsView } from "../views/results-view";
import { NewResultView } from "../views/new-result-view";

type LabTab = "results" | "new";

export function LabResultsContent() {
  const { results } = useLabResults();
  const [tab, setTab] = useState<LabTab>("results");

  const batchesTested = new Set(results.map((result) => result.batchCode)).size;
  const retests = results.filter((result) => result.version > 1).length;
  const latest = [...results].sort((a, b) =>
    b.receivedAt.localeCompare(a.receivedAt),
  )[0];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-8 pb-10 md:px-6">
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Laboratory Results</h1>
            <p className="text-lg text-muted-foreground">
              Batch-linked test results, re-tests and scanned reports
            </p>
          </div>
          <Button
            type="button"
            className="h-10 gap-1 px-3.5"
            onClick={() => setTab("new")}
          >
            <Plus className="size-5" />
            Enter result
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Results on file"
            value={String(results.length)}
            note={`${batchesTested} batches tested`}
          />
          <SummaryCard
            label="Re-tests"
            value={String(retests)}
            note="Kept as later versions"
          />
          <SummaryCard
            label="Laboratories"
            value={String(new Set(results.map((r) => r.labName)).size)}
            note="Accredited partners"
          />
          <SummaryCard
            label="Latest result"
            value={latest ? formatDate(latest.receivedAt) : "—"}
            note={latest ? latest.batchCode : "No results yet"}
          />
        </div>

        <div className="flex">
          <SegmentedTabs
            value={tab}
            onChange={setTab}
            options={[
              { value: "results", label: "Results" },
              { value: "new", label: "New result" },
            ]}
          />
        </div>
      </section>

      {tab === "results" ? <ResultsView /> : null}
      {tab === "new" ? <NewResultView onDone={() => setTab("results")} /> : null}
    </div>
  );
}
