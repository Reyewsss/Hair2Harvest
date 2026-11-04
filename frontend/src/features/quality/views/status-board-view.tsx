import { useState } from "react";
import { AlertTriangle, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "../../../shared/ui/button.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../shared/ui/table.tsx";
import { Field, Pill, fieldClass } from "../../../shared/ui/form-controls.tsx";
import { Textarea } from "../../../shared/ui/textarea.tsx";
import { EmptyRow } from "../../inventory/components/inventory-shared";
import { formatDate } from "../../inventory/data/inventory-data";
import { useBatches } from "../../../shared/data/use-batches";
import { useLabResults } from "../../lab-results/store/lab-results-store";
import { latestResult } from "../../lab-results/data/lab-results-data";
import { useQuality } from "../store/quality-store";
import {
  evaluateResult,
  qualityStatuses,
  recommendStatus,
  statusTone,
  type QualityStatus,
} from "../data/quality-data";

export function StatusBoardView() {
  const { results } = useLabResults();
  const { batches } = useBatches();
  const { thresholds, decisions, history, authorize } = useQuality();
  const [selected, setSelected] = useState<string | null>(null);

  const rows = batches.map((batch) => {
    const newest = latestResult(results, batch.code);
    const evaluation = newest ? evaluateResult(newest, thresholds) : null;
    const recommended: QualityStatus = evaluation
      ? recommendStatus(evaluation.failed)
      : "Pending";
    const current =
      decisions.find((decision) => decision.batchCode === batch.code)?.status ??
      "Pending";

    return {
      batch,
      newest,
      evaluation,
      recommended,
      current,
      needsReview: recommended !== current,
    };
  });

  const awaiting = rows.filter((row) => row.needsReview).length;
  const approved = rows.filter(
    (row) => row.current === "Approved for Supervised Testing",
  ).length;

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Batch status board</h2>
          <p className="text-sm text-muted-foreground">
            Each batch is evaluated against the newest lab result. A status only
            changes after admin authorisation.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          <strong className="font-medium text-foreground">{awaiting}</strong>{" "}
          awaiting authorisation · {approved} approved
        </p>
      </div>

      {awaiting > 0 ? (
        <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            {awaiting} batch{awaiting === 1 ? "" : "es"} differ from the
            system recommendation and need an admin decision.
          </p>
        </div>
      ) : null}

      <Table className="min-w-215">
        <colgroup>
          <col className="w-[18%]" />
          <col className="w-[12%]" />
          <col className="w-[16%]" />
          <col className="w-[16%]" />
          <col className="w-[22%]" />
          <col className="w-[16%]" />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead>Batch</TableHead>
            <TableHead>Recipe</TableHead>
            <TableHead>Newest result</TableHead>
            <TableHead>Failed criteria</TableHead>
            <TableHead>System recommendation</TableHead>
            <TableHead>Current status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <EmptyRow colSpan={6}>No batches available.</EmptyRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.batch.code}
                onClick={() => setSelected(row.batch.code)}
                className="cursor-pointer"
              >
                <TableCell>
                  <p className="font-medium">{row.batch.code}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {row.batch.stage}
                  </p>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.batch.recipeVersion}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.newest
                    ? `v${row.newest.version} · ${formatDate(row.newest.receivedAt)}`
                    : "No result"}
                </TableCell>
                <TableCell>
                  {row.evaluation ? (
                    row.evaluation.failed.length === 0 ? (
                      <span className="inline-flex items-center gap-1 text-sm text-success">
                        <CheckCircle2 className="size-4" />
                        All pass
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm text-destructive">
                        <XCircle className="size-4" />
                        {row.evaluation.failed.length} failed
                      </span>
                    )
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Pill className={statusTone[row.recommended]}>
                    {row.recommended}
                  </Pill>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Pill className={statusTone[row.current]}>
                      {row.current}
                    </Pill>
                    {row.needsReview ? (
                      <span
                        className="size-1.5 rounded-full bg-primary"
                        title="Pending authorisation"
                      />
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {selected ? (
        <BatchReview
          key={selected}
          batchCode={selected}
          onClose={() => setSelected(null)}
          onAuthorize={authorize}
          history={history.filter((entry) => entry.batchCode === selected)}
        />
      ) : null}
    </section>
  );
}

function BatchReview({
  batchCode,
  onClose,
  onAuthorize,
  history,
}: {
  batchCode: string;
  onClose: () => void;
  onAuthorize: (
    batchCode: string,
    status: QualityStatus,
    remarks: string,
  ) => void;
  history: { id: string; previous: QualityStatus; status: QualityStatus; decidedBy: string; decidedAt: string; remarks?: string }[];
}) {
  const { results } = useLabResults();
  const { thresholds, decisions } = useQuality();
  const newest = latestResult(results, batchCode);
  const evaluation = newest ? evaluateResult(newest, thresholds) : null;
  const recommended: QualityStatus = evaluation
    ? recommendStatus(evaluation.failed)
    : "Pending";
  const current =
    decisions.find((decision) => decision.batchCode === batchCode)?.status ??
    "Pending";

  const [status, setStatus] = useState<QualityStatus>(recommended);
  const [remarks, setRemarks] = useState("");

  const groups = [
    { key: "nutrient", label: "Nutrients" },
    { key: "stability", label: "Stability" },
    { key: "contaminant", label: "Contaminants" },
  ] as const;

  const blocked = !newest && status === "Approved for Supervised Testing";

  return (
    <article className="flex flex-col gap-5 rounded-xl border bg-card p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-medium">
            {batchCode} · {newest ? `result v${newest.version}` : "no lab result"}
          </h3>
          <p className="text-xs text-muted-foreground">
            Recommended: {recommended} · Current: {current}
          </p>
        </div>
        <Button type="button" variant="ghost" className="h-8" onClick={onClose}>
          Close
        </Button>
      </div>

      {evaluation ? (
        <div className="grid gap-4 md:grid-cols-3">
          {groups.map((group) => {
            const checks = evaluation.checks.filter(
              (check) => check.criterion.group === group.key,
            );
            return (
              <div key={group.key} className="rounded-lg border p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {group.label}
                </p>
                <ul className="mt-2 flex flex-col gap-1.5 text-sm">
                  {checks.map((check) => (
                    <li
                      key={check.criterion.key}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        {check.pass ? (
                          <CheckCircle2 className="size-3.5 shrink-0 text-success" />
                        ) : (
                          <XCircle className="size-3.5 shrink-0 text-destructive" />
                        )}
                        <span className="truncate text-muted-foreground">
                          {check.criterion.label}
                        </span>
                      </span>
                      <span
                        className={
                          check.pass
                            ? "tabular-nums"
                            : "font-medium text-destructive tabular-nums"
                        }
                      >
                        {check.value}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-lg bg-secondary/60 p-3 text-sm text-muted-foreground">
          The approved label stays blocked until a lab result is on file for this
          batch.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-lg bg-secondary/60 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Admin authorisation
          </p>
          <Field label="Status to set">
            <select
              className={fieldClass}
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as QualityStatus)
              }
            >
              {qualityStatuses.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Remarks" hint="Recorded in the status history">
            <Textarea
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              rows={2}
              placeholder="Basis for the decision"
            />
          </Field>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {blocked ? "Blocked: no lab result on file." : "Admin only"}
            </p>
            <Button
              type="button"
              className="h-10 gap-1"
              disabled={blocked}
              onClick={() => {
                onAuthorize(batchCode, status, remarks);
                setRemarks("");
              }}
            >
              <ShieldCheck className="size-4" />
              Authorise status
            </Button>
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Status history
          </p>
          {history.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No decisions recorded yet.
            </p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2 text-sm">
              {history.map((entry) => (
                <li key={entry.id} className="border-l-2 pl-2.5">
                  <p className="font-medium">
                    {entry.previous} → {entry.status}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.decidedBy} · {formatDate(entry.decidedAt)}
                  </p>
                  {entry.remarks ? (
                    <p className="text-xs text-muted-foreground">
                      {entry.remarks}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </article>
  );
}
