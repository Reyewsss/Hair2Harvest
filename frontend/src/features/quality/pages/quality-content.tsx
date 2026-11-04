import { useState } from "react";
import { SegmentedTabs, SummaryCard } from "../../../shared/ui/form-controls.tsx";
import { useBatches } from "../../../shared/data/use-batches";
import { useLabResults } from "../../lab-results/store/lab-results-store";
import { latestResult } from "../../lab-results/data/lab-results-data";
import { useQuality } from "../store/quality-store";
import { evaluateResult, recommendStatus } from "../data/quality-data";
import { StatusBoardView } from "../views/status-board-view";
import { ThresholdsView } from "../views/thresholds-view";

type QualityTab = "board" | "thresholds";

export function QualityContent() {
  const [tab, setTab] = useState<QualityTab>("board");
  const { results } = useLabResults();
  const { batches } = useBatches();
  const { thresholds, decisions } = useQuality();

  const rows = batches.map((batch) => {
    const newest = latestResult(results, batch.code);
    const recommended = newest
      ? recommendStatus(evaluateResult(newest, thresholds).failed)
      : "Pending";
    const current =
      decisions.find((decision) => decision.batchCode === batch.code)?.status ??
      "Pending";
    return { recommended, current };
  });

  const approved = rows.filter(
    (row) => row.current === "Approved for Supervised Testing",
  ).length;
  const held = rows.filter(
    (row) => row.current === "On Hold" || row.current === "Rejected",
  ).length;
  const awaiting = rows.filter((row) => row.recommended !== row.current).length;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-8 pb-10 md:px-6">
      <section className="flex flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Quality Assessment</h1>
          <p className="text-lg text-muted-foreground">
            Threshold evaluation and admin authorisation before a batch is
            released for supervised testing
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Batches on board"
            value={String(batches.length)}
            note="Tracked against lab results"
          />
          <SummaryCard
            label="Approved for testing"
            value={String(approved)}
            note="Cleared by an admin"
          />
          <SummaryCard
            label="On hold or rejected"
            value={String(held)}
            note="Failed at least one criterion"
          />
          <SummaryCard
            label="Awaiting authorisation"
            value={String(awaiting)}
            note="Recommendation differs from status"
          />
        </div>

        <div className="flex">
          <SegmentedTabs
            value={tab}
            onChange={setTab}
            options={[
              { value: "board", label: "Status board" },
              { value: "thresholds", label: "Thresholds" },
            ]}
          />
        </div>
      </section>

      {tab === "board" ? <StatusBoardView /> : null}
      {tab === "thresholds" ? <ThresholdsView /> : null}
    </div>
  );
}
