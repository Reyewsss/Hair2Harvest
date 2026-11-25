// Builds the reports from real data: pickups and inventory logs from the server, and the
// machine / compost simulator (which lives in this browser). Pure functions, no fetching.
import type { SimBatch, SimSession, SimState } from "@/features/simulation/sim-store";
import type { ReportCategory } from "./data/reports-data";

export interface ReportColumn {
  key: string;
  label: string;
  align?: "right";
}
export type ReportRow = Record<string, string | number>;
export interface Report {
  columns: ReportColumn[];
  rows: ReportRow[];
  summary: { label: string; value: string }[];
  /** Shown above the table, e.g. "Simulated data from this browser". */
  note?: string;
  empty: string;
}

export interface ReportInput {
  pickups: any[]; // from /suppliers/pickups (active + past + archived)
  logs: any[]; // from /inventory
  sim: SimState;
}
export interface ReportFilters {
  from: string; // YYYY-MM-DD, inclusive ("" = no limit)
  to: string;
  shop: string; // shop name, "" = all
  batch: string; // batch id, "" = all
  search: string;
}

const SIM_NOTE = "Machine and compost data come from the test simulator saved in this browser, not from real hardware.";

const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const inRange = (day: string, f: ReportFilters) => (!f.from || day >= f.from) && (!f.to || day <= f.to);
const matches = (f: ReportFilters, ...parts: (string | number | undefined | null)[]) =>
  !f.search.trim() || parts.join(" ").toLowerCase().includes(f.search.trim().toLowerCase());
const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);
const fmt = (n: number, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : "—");
const stamp = (ms: number) => new Date(ms).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const lossPct = (b: SimBatch) => (b.initialWeight > 0 ? ((b.initialWeight - b.weight) / b.initialWeight) * 100 : 0);

/** Shop and batch choices for the filter dropdowns. */
export function filterOptions(input: ReportInput) {
  const shops = new Set<string>();
  for (const p of input.pickups) if (p.supplierId?.shopName) shops.add(p.supplierId.shopName);
  return {
    shops: [...shops].sort(),
    batches: input.sim.batches.map((b) => b.id),
  };
}

function collection(input: ReportInput, f: ReportFilters): Report {
  const rows = input.pickups
    .filter((p) => inRange(String(p.scheduledDate).slice(0, 10), f))
    .filter((p) => !f.shop || p.supplierId?.shopName === f.shop)
    .filter((p) => matches(f, p.supplierId?.shopName, p.assignedTo?.name, p.collectedBy?.name, p.status))
    .sort((a, b) => `${b.scheduledDate} ${b.scheduledTime}`.localeCompare(`${a.scheduledDate} ${a.scheduledTime}`));
  const done = rows.filter((p) => p.status === "collected" || p.status === "delivered");
  const delivered = rows.filter((p) => p.status === "delivered");
  return {
    columns: [
      { key: "date", label: "Date" },
      { key: "time", label: "Time" },
      { key: "shop", label: "Shop" },
      { key: "staff", label: "Assigned staff" },
      { key: "collectedBy", label: "Collected by" },
      { key: "status", label: "Status" },
      { key: "sacks", label: "Sacks", align: "right" },
    ],
    rows: rows.map((p) => ({
      date: String(p.scheduledDate).slice(0, 10),
      time: p.scheduledTime ?? "",
      shop: p.supplierId?.shopName ?? "[deleted shop]",
      staff: p.assignedTo?.name ?? "Unassigned",
      collectedBy: p.collectedBy?.name ?? "",
      status: p.status === "cancelled" ? "archived" : p.status,
      sacks: p.sacks ?? 0,
    })),
    summary: [
      { label: "Pickups", value: String(rows.length) },
      { label: "Collected or delivered", value: String(done.length) },
      { label: "Sacks collected", value: String(done.reduce((s, p) => s + (p.sacks ?? 0), 0)) },
      { label: "Delivered", value: String(delivered.length) },
    ],
    empty: "No pickups match these filters.",
  };
}

function equipment(input: ReportInput, f: ReportFilters): Report {
  const rows: SimSession[] = input.sim.sessions
    .filter((s) => inRange(dayOf(s.start), f))
    .filter((s) => !f.batch || s.batchId === f.batch)
    .filter((s) => matches(f, s.machineId, s.batchId, s.operator));
  const hours = (s: SimSession) => ((s.end ?? input.sim.clock) - s.start) / 3_600_000;
  return {
    columns: [
      { key: "session", label: "Session" },
      { key: "machine", label: "Machine" },
      { key: "batch", label: "Batch" },
      { key: "start", label: "Start" },
      { key: "end", label: "End" },
      { key: "hours", label: "Run time (h)", align: "right" },
      { key: "avgTemp", label: "Avg temp (°C)", align: "right" },
      { key: "operator", label: "Operator" },
    ],
    rows: rows.map((s) => ({
      session: s.id,
      machine: s.machineId,
      batch: s.batchId ?? "",
      start: stamp(s.start),
      end: s.end ? stamp(s.end) : "Running",
      hours: fmt(hours(s), 1),
      avgTemp: fmt(s.tempSum / Math.max(1, s.samples), 1),
      operator: s.operator,
    })),
    summary: [
      { label: "Sessions", value: String(rows.length) },
      { label: "Total run time", value: `${fmt(rows.reduce((t, s) => t + hours(s), 0), 1)} h` },
      { label: "Avg core temp", value: `${fmt(avg(rows.map((s) => s.tempSum / Math.max(1, s.samples))), 1)} °C` },
      { label: "Machines used", value: String(new Set(rows.map((s) => s.machineId)).size) },
    ],
    note: SIM_NOTE,
    empty: "No machine sessions in this range.",
  };
}

const batchesIn = (input: ReportInput, f: ReportFilters) =>
  input.sim.batches
    .filter((b) => inRange(dayOf(b.createdAt), f))
    .filter((b) => !f.batch || b.id === f.batch)
    .filter((b) => matches(f, b.id, b.machineId, b.recipe, b.stage, b.operator));

function batch(input: ReportInput, f: ReportFilters): Report {
  const rows = batchesIn(input, f);
  const done = rows.filter((b) => b.stage === "completed");
  return {
    columns: [
      { key: "batch", label: "Batch" },
      { key: "machine", label: "Machine" },
      { key: "recipe", label: "Recipe" },
      { key: "started", label: "Started" },
      { key: "stage", label: "Stage" },
      { key: "initial", label: "Loaded (kg)", align: "right" },
      { key: "current", label: "Now (kg)", align: "right" },
      { key: "loss", label: "Weight loss (%)", align: "right" },
      { key: "moisture", label: "Moisture (%)", align: "right" },
      { key: "n", label: "N (%)", align: "right" },
      { key: "p", label: "P (%)", align: "right" },
      { key: "k", label: "K (%)", align: "right" },
    ],
    rows: rows.map((b) => ({
      batch: b.id,
      machine: b.machineId ?? "released",
      recipe: b.recipe,
      started: stamp(b.createdAt),
      stage: b.stage,
      initial: fmt(b.initialWeight, 1),
      current: fmt(b.weight, 1),
      loss: fmt(lossPct(b), 1),
      moisture: fmt(b.moisture, 1),
      n: fmt(b.n, 2),
      p: fmt(b.p, 2),
      k: fmt(b.k, 2),
    })),
    summary: [
      { label: "Batches", value: String(rows.length) },
      { label: "Completed", value: String(done.length) },
      { label: "Raw hair loaded", value: `${fmt(rows.reduce((t, b) => t + b.initialWeight, 0), 1)} kg` },
      { label: "Avg weight loss", value: `${fmt(avg(rows.map(lossPct)), 1)}%` },
    ],
    note: SIM_NOTE,
    empty: "No batches in this range.",
  };
}

function lab(input: ReportInput, f: ReportFilters): Report {
  const rows = batchesIn(input, { ...f, search: "" })
    .flatMap((b) => b.logs.map((l) => ({ b, l })))
    .filter(({ l }) => inRange(dayOf(l.t), f))
    .filter(({ b, l }) => matches(f, b.id, l.event))
    .sort((x, y) => y.l.t - x.l.t);
  const moisture = rows.map(({ l }) => l.moisture).filter((m): m is number => typeof m === "number");
  const verdict = (m: number | null) => (m === null ? "" : m < 40 ? "Too dry" : m > 70 ? "Too wet" : "OK");
  return {
    columns: [
      { key: "batch", label: "Batch" },
      { key: "time", label: "Sim time" },
      { key: "event", label: "Event" },
      { key: "temp", label: "Temp (°C)", align: "right" },
      { key: "moisture", label: "Moisture (%)", align: "right" },
      { key: "verdict", label: "Moisture check" },
      { key: "weight", label: "Weight (kg)", align: "right" },
      { key: "n", label: "N (%)", align: "right" },
      { key: "p", label: "P (%)", align: "right" },
      { key: "k", label: "K (%)", align: "right" },
    ],
    rows: rows.map(({ b, l }) => ({
      batch: b.id,
      time: stamp(l.t),
      event: l.event,
      temp: l.temp === null ? "" : fmt(l.temp, 1),
      moisture: l.moisture === null ? "" : fmt(l.moisture, 1),
      verdict: verdict(l.moisture),
      weight: l.weight === null ? "" : fmt(l.weight, 1),
      n: l.n == null ? "" : fmt(l.n, 2),
      p: l.p == null ? "" : fmt(l.p, 2),
      k: l.k == null ? "" : fmt(l.k, 2),
    })),
    summary: [
      { label: "Readings", value: String(rows.length) },
      { label: "Avg moisture", value: `${fmt(avg(moisture), 1)}%` },
      { label: "Too dry or too wet", value: String(moisture.filter((m) => m < 40 || m > 70).length) },
      { label: "Batches covered", value: String(new Set(rows.map(({ b }) => b.id)).size) },
    ],
    note: SIM_NOTE,
    empty: "No readings in this range.",
  };
}

function experiment(input: ReportInput, f: ReportFilters): Report {
  const groups = new Map<string, SimBatch[]>();
  for (const b of batchesIn(input, f)) groups.set(b.recipe, [...(groups.get(b.recipe) ?? []), b]);
  const rows = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([recipe, list]) => ({
    recipe,
    batches: list.length,
    completed: list.filter((b) => b.stage === "completed").length,
    loss: fmt(avg(list.map(lossPct)), 1),
    peak: fmt(Math.max(...list.flatMap((b) => b.logs.map((l) => l.temp ?? 0)), 0), 1),
    moisture: fmt(avg(list.map((b) => b.moisture)), 1),
    n: fmt(avg(list.map((b) => b.n)), 2),
    p: fmt(avg(list.map((b) => b.p)), 2),
    k: fmt(avg(list.map((b) => b.k)), 2),
  }));
  return {
    columns: [
      { key: "recipe", label: "Recipe version" },
      { key: "batches", label: "Batches", align: "right" },
      { key: "completed", label: "Completed", align: "right" },
      { key: "loss", label: "Avg weight loss (%)", align: "right" },
      { key: "peak", label: "Peak temp (°C)", align: "right" },
      { key: "moisture", label: "Avg moisture (%)", align: "right" },
      { key: "n", label: "Avg N (%)", align: "right" },
      { key: "p", label: "Avg P (%)", align: "right" },
      { key: "k", label: "Avg K (%)", align: "right" },
    ],
    rows,
    summary: [
      { label: "Recipes tested", value: String(rows.length) },
      { label: "Batches", value: String(rows.reduce((t, r) => t + r.batches, 0)) },
      { label: "Completed", value: String(rows.reduce((t, r) => t + r.completed, 0)) },
    ],
    note: `${SIM_NOTE} Each row compares one recipe version across its batches.`,
    empty: "No batches to compare in this range.",
  };
}

function traceability(input: ReportInput, f: ReportFilters): Report {
  const b = input.sim.batches.find((x) => x.id === f.batch) ?? input.sim.batches[0];
  if (!b) {
    return { columns: [], rows: [], summary: [], note: SIM_NOTE, empty: "There are no batches to trace yet." };
  }
  const intake = input.logs
    .filter((l) => l.type === "processed" && l.batchId === b.id)
    .map((l) => ({ at: new Date(`${String(l.date).slice(0, 10)}T00:00:00`).getTime(), what: `Raw hair taken from inventory: ${l.sacks} sack${l.sacks === 1 ? "" : "s"}`, detail: l.note ?? "" }));
  const events = [...b.logs]
    .sort((x, y) => x.t - y.t)
    .map((l) => ({
      at: l.t,
      what: l.event,
      detail: [
        l.temp != null ? `${fmt(l.temp, 1)} °C` : "",
        l.moisture != null ? `${fmt(l.moisture, 1)}% moisture` : "",
        l.weight != null ? `${fmt(l.weight, 1)} kg` : "",
        l.n != null ? `NPK ${fmt(l.n, 2)}-${fmt(l.p ?? 0, 2)}-${fmt(l.k ?? 0, 2)}` : "",
      ]
        .filter(Boolean)
        .join(" · "),
    }));
  const steps = [...intake, ...events].sort((x, y) => x.at - y.at);
  return {
    columns: [
      { key: "step", label: "#", align: "right" },
      { key: "when", label: "When" },
      { key: "what", label: "What happened" },
      { key: "detail", label: "Readings" },
    ],
    rows: steps
      .filter((s) => matches(f, s.what, s.detail))
      .map((s, i) => ({ step: i + 1, when: stamp(s.at), what: s.what, detail: s.detail })),
    summary: [
      { label: "Batch", value: b.id },
      { label: "Machine", value: b.machineId ?? "released" },
      { label: "Recipe / operator", value: `${b.recipe} · ${b.operator}` },
      { label: "Stage", value: b.stage },
      { label: "Loaded to now", value: `${fmt(b.initialWeight, 1)} → ${fmt(b.weight, 1)} kg` },
      { label: "NPK now (%)", value: `${fmt(b.n, 2)} · ${fmt(b.p, 2)} · ${fmt(b.k, 2)}` },
    ],
    note: `${SIM_NOTE} Pick a batch above to trace it from the inventory sacks to its current stage.`,
    empty: "No events recorded for this batch.",
  };
}

export function buildReport(category: ReportCategory, input: ReportInput, f: ReportFilters): Report {
  switch (category) {
    case "collection":
      return collection(input, f);
    case "equipment":
      return equipment(input, f);
    case "batch":
      return batch(input, f);
    case "lab":
      return lab(input, f);
    case "experiment":
      return experiment(input, f);
    default:
      return traceability(input, f);
  }
}

/* ── Export ─────────────────────────────────────────────────────────── */

const csvCell = (v: string | number) => {
  const text = String(v ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** CSV with a BOM so Excel reads the accents and degree signs correctly. */
export function toCsv(report: Report) {
  const lines = [report.columns.map((c) => csvCell(c.label)).join(",")];
  for (const row of report.rows) lines.push(report.columns.map((c) => csvCell(row[c.key] ?? "")).join(","));
  return "﻿" + lines.join("\r\n");
}

export function downloadCsv(name: string, report: Report) {
  const url = URL.createObjectURL(new Blob([toCsv(report)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const esc = (v: string | number) =>
  String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Opens a clean printable page and the print dialog ("Save as PDF" there). Returns false if the popup was blocked. */
export function printReport(title: string, subtitle: string, report: Report) {
  const w = window.open("", "_blank");
  if (!w) return false;
  const head = report.columns.map((c) => `<th style="text-align:${c.align ?? "left"}">${esc(c.label)}</th>`).join("");
  const body = report.rows
    .map((r) => `<tr>${report.columns.map((c) => `<td style="text-align:${c.align ?? "left"}">${esc(r[c.key] ?? "")}</td>`).join("")}</tr>`)
    .join("");
  const summary = report.summary.map((s) => `<div><b>${esc(s.value)}</b><br><small>${esc(s.label)}</small></div>`).join("");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    body{font-family:Arial,Helvetica,sans-serif;color:#222;margin:24px}
    h1{margin:0 0 4px;font-size:20px} p{margin:0 0 12px;color:#666;font-size:12px}
    .sum{display:flex;gap:24px;margin:12px 0 16px;flex-wrap:wrap} .sum div{font-size:14px} .sum small{color:#666;font-size:11px}
    table{border-collapse:collapse;width:100%;font-size:11px} th,td{border:1px solid #ccc;padding:4px 6px} th{background:#f2f2f2}
    @media print{body{margin:8mm}}
  </style></head><body><h1>${esc(title)}</h1><p>${esc(subtitle)}</p><div class="sum">${summary}</div>${
    report.note ? `<p>${esc(report.note)}</p>` : ""
  }<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`);
  w.document.close();
  w.focus();
  w.print();
  return true;
}
