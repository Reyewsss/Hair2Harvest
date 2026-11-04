import { useMemo, useState } from "react";
import { Download, FileText, FlaskConical, ImageIcon, Search } from "lucide-react";
import { Button } from "../../../shared/ui/button.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../shared/ui/table.tsx";
import { FilterDropdown, Pill, fieldClass } from "../../../shared/ui/form-controls.tsx";
import { exportCsv } from "../../../shared/lib/export-csv.ts";
import { EmptyRow } from "../../inventory/components/inventory-shared";
import { formatDate } from "../../inventory/data/inventory-data";
import { batchOptions } from "../../../shared/data/batches";
import {
  labNameOptions,
  maturityOptions,
  type LabResult,
} from "../data/lab-results-data";
import { useLabResults } from "../store/lab-results-store";

const csvColumns: { key: keyof LabResult & string; label: string }[] = [
  { key: "id", label: "Result ID" },
  { key: "batchCode", label: "Batch" },
  { key: "version", label: "Version" },
  { key: "labName", label: "Laboratory" },
  { key: "method", label: "Method" },
  { key: "sampledAt", label: "Sampled" },
  { key: "receivedAt", label: "Received" },
  { key: "notes", label: "Notes" },
];

export function ResultsView() {
  const { results } = useLabResults();
  const [query, setQuery] = useState("");
  const [batch, setBatch] = useState<string>("all");
  const [lab, setLab] = useState<string>("all");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return results
      .filter((result) => {
        const matchesQuery =
          !needle ||
          [result.id, result.batchCode, result.labName, result.method]
            .join(" ")
            .toLowerCase()
            .includes(needle);
        const matchesBatch = batch === "all" || result.batchCode === batch;
        const matchesLab = lab === "all" || result.labName === lab;
        return matchesQuery && matchesBatch && matchesLab;
      })
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  }, [results, query, batch, lab]);

  const active = results.find((result) => result.id === selected);

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search batch, lab, method or result ID"
            className={`${fieldClass} pl-9`}
            aria-label="Search lab results"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterDropdown
            value={batch}
            options={[{ value: "all", label: "All batches" }, ...batchOptions]}
            onChange={setBatch}
            icon={FlaskConical}
          />
          <FilterDropdown
            value={lab}
            options={[{ value: "all", label: "All laboratories" }, ...labNameOptions]}
            onChange={setLab}
          />
          <Button
            type="button"
            variant="secondary"
            className="h-10 gap-1 px-3"
            onClick={() => exportCsv("lab-results", filtered, csvColumns)}
          >
            <Download className="size-4" />
            Export
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        <strong className="font-medium text-foreground">{filtered.length}</strong>{" "}
        of {results.length} results
      </p>

      <Table className="min-w-215">
        <colgroup>
          <col className="w-[18%]" />
          <col className="w-[8%]" />
          <col className="w-[22%]" />
          <col className="w-[16%]" />
          <col className="w-[14%]" />
          <col className="w-[14%]" />
          <col className="w-[8%]" />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead>Batch</TableHead>
            <TableHead>Ver.</TableHead>
            <TableHead>Laboratory</TableHead>
            <TableHead>N–P–K</TableHead>
            <TableHead>pH</TableHead>
            <TableHead>Sampled</TableHead>
            <TableHead>Report</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <EmptyRow colSpan={7}>No results match these filters.</EmptyRow>
          ) : (
            filtered.map((result) => (
              <TableRow
                key={result.id}
                onClick={() => setSelected(result.id)}
                className="cursor-pointer"
              >
                <TableCell>
                  <p className="font-medium">{result.batchCode}</p>
                  <p className="text-xs text-muted-foreground">{result.id}</p>
                </TableCell>
                <TableCell>
                  <Pill
                    className={
                      result.version > 1
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-secondary-foreground"
                    }
                  >
                    v{result.version}
                  </Pill>
                </TableCell>
                <TableCell>
                  <p className="truncate">{result.labName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {result.method}
                  </p>
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {result.values.nitrogen.toFixed(2)} /{" "}
                  {result.values.phosphorus.toFixed(2)} /{" "}
                  {result.values.potassium.toFixed(2)}
                </TableCell>
                <TableCell className="tabular-nums">
                  {result.values.ph.toFixed(1)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(result.sampledAt)}
                </TableCell>
                <TableCell>
                  {result.attachment ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      {result.attachment.kind === "pdf" ? (
                        <FileText className="size-3.5" />
                      ) : (
                        <ImageIcon className="size-3.5" />
                      )}
                      {result.attachment.sizeKb} KB
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {active ? (
        <ResultDetail
          result={active}
          history={results
            .filter((result) => result.batchCode === active.batchCode)
            .sort((a, b) => b.version - a.version)}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </section>
  );
}

function ResultDetail({
  result,
  history,
  onClose,
}: {
  result: LabResult;
  history: LabResult[];
  onClose: () => void;
}) {
  const values = result.values;

  return (
    <article className="flex flex-col gap-5 rounded-xl border bg-card p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-medium">
            {result.batchCode} · version {result.version}
          </h3>
          <p className="text-xs text-muted-foreground">
            {result.labName} · sampled {formatDate(result.sampledAt)} · received{" "}
            {formatDate(result.receivedAt)} · entered by {result.enteredBy}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="h-8"
          onClick={onClose}
        >
          Close
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ValueGroup
          title="Nutrients"
          rows={[
            ["Nitrogen (N)", `${values.nitrogen.toFixed(2)} %`],
            ["Phosphorus (P)", `${values.phosphorus.toFixed(2)} %`],
            ["Potassium (K)", `${values.potassium.toFixed(2)} %`],
          ]}
        />
        <ValueGroup
          title="Stability"
          rows={[
            ["pH", values.ph.toFixed(1)],
            ["Moisture", `${values.moisture} %`],
            [
              "Maturity",
              maturityOptions.find((option) => option.value === values.maturity)
                ?.label ?? values.maturity,
            ],
          ]}
        />
        <ValueGroup
          title="Contaminants"
          rows={[
            ["Cadmium", `${values.cadmium} mg/kg`],
            ["Lead", `${values.lead} mg/kg`],
            ["Arsenic", `${values.arsenic} mg/kg`],
            ["Mercury", `${values.mercury} mg/kg`],
            ["E. coli", `${values.eColi} CFU/g`],
            ["Salmonella", values.salmonella],
          ]}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-secondary/60 p-3 text-sm">
          <p className="text-xs text-muted-foreground">Test method</p>
          <p className="mt-1">{result.method}</p>
          {result.notes ? (
            <>
              <p className="mt-3 text-xs text-muted-foreground">Notes</p>
              <p className="mt-1">{result.notes}</p>
            </>
          ) : null}
        </div>

        <div className="rounded-lg bg-secondary/60 p-3 text-sm">
          <p className="text-xs text-muted-foreground">Attached report</p>
          {result.attachment ? (
            <p className="mt-1 flex items-center gap-2">
              {result.attachment.kind === "pdf" ? (
                <FileText className="size-4" />
              ) : (
                <ImageIcon className="size-4" />
              )}
              {result.attachment.name}
              <span className="text-xs text-muted-foreground">
                ({result.attachment.sizeKb} KB)
              </span>
            </p>
          ) : (
            <p className="mt-1 text-muted-foreground">No file uploaded.</p>
          )}

          <p className="mt-3 text-xs text-muted-foreground">
            Version history for {result.batchCode}
          </p>
          <ul className="mt-1 flex flex-col gap-1">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span>
                  v{entry.version} · {entry.id} · {formatDate(entry.receivedAt)}
                </span>
                <span className="text-muted-foreground">{entry.labName}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

function ValueGroup({
  title,
  rows,
}: {
  title: string;
  rows: [string, string][];
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <dl className="mt-2 flex flex-col gap-1.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
