import { useState } from "react";
import { RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "../../../shared/ui/button.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../shared/ui/table.tsx";
import { fieldClass } from "../../../shared/ui/form-controls.tsx";
import { useQuality } from "../store/quality-store";
import { defaultThresholds, type Criterion } from "../data/quality-data";

const groupLabels: Record<Criterion["group"], string> = {
  nutrient: "Nutrients",
  stability: "Stability",
  contaminant: "Contaminants",
};

export function ThresholdsView() {
  const { thresholds, saveThresholds } = useQuality();
  const [draft, setDraft] = useState<Criterion[]>(thresholds);
  const [saved, setSaved] = useState(false);

  const patch = (key: Criterion["key"], changes: Partial<Criterion>) =>
    setDraft((current) =>
      current.map((criterion) =>
        criterion.key === key ? { ...criterion, ...changes } : criterion,
      ),
    );

  const dirty = JSON.stringify(draft) !== JSON.stringify(thresholds);

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Quality thresholds</h2>
          <p className="text-sm text-muted-foreground">
            Every batch is scored against these limits. Changes need admin
            authorisation and apply to future evaluations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 gap-1"
            onClick={() => {
              setDraft(defaultThresholds);
              setSaved(false);
            }}
          >
            <RotateCcw className="size-4" />
            Reset to defaults
          </Button>
          <Button
            type="button"
            className="h-10 gap-1"
            disabled={!dirty}
            onClick={() => {
              saveThresholds(draft);
              setSaved(true);
            }}
          >
            <ShieldCheck className="size-4" />
            Authorise and save
          </Button>
        </div>
      </div>

      {saved && !dirty ? (
        <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
          Thresholds saved. The status board now evaluates against these limits.
        </p>
      ) : null}

      <Table className="min-w-150">
        <colgroup>
          <col className="w-[30%]" />
          <col className="w-[16%]" />
          <col className="w-[18%]" />
          <col className="w-[18%]" />
          <col className="w-[18%]" />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead>Test</TableHead>
            <TableHead>Group</TableHead>
            <TableHead>Minimum / required</TableHead>
            <TableHead>Maximum</TableHead>
            <TableHead>Failure impact</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {draft.map((criterion) => {
            const isText = Boolean(criterion.equals);
            return (
              <TableRow key={criterion.key}>
                <TableCell>
                  <p className="font-medium">{criterion.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {criterion.unit ?? "—"}
                  </p>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {groupLabels[criterion.group]}
                </TableCell>
                <TableCell>
                  {isText ? (
                    <input
                      className={fieldClass}
                      value={criterion.equals ?? ""}
                      onChange={(event) =>
                        patch(criterion.key, { equals: event.target.value })
                      }
                    />
                  ) : (
                    <input
                      type="number"
                      step="0.01"
                      className={fieldClass}
                      value={criterion.min ?? ""}
                      onChange={(event) =>
                        patch(criterion.key, {
                          min:
                            event.target.value === ""
                              ? undefined
                              : Number(event.target.value),
                        })
                      }
                    />
                  )}
                </TableCell>
                <TableCell>
                  {isText ? (
                    <span className="text-sm text-muted-foreground">—</span>
                  ) : (
                    <input
                      type="number"
                      step="0.01"
                      className={fieldClass}
                      value={criterion.max ?? ""}
                      onChange={(event) =>
                        patch(criterion.key, {
                          max:
                            event.target.value === ""
                              ? undefined
                              : Number(event.target.value),
                        })
                      }
                    />
                  )}
                </TableCell>
                <TableCell>
                  {criterion.critical ? (
                    <span className="text-sm font-medium text-destructive">
                      Rejects batch
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Holds batch
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </section>
  );
}
