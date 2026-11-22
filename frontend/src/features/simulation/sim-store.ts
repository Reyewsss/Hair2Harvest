import { useSyncExternalStore } from "react";
import { STAGES, type BatchStage } from "@/features/composting/data/composting-data";

/* ── Hair2Harvest test simulator ─────────────────────────────────────────────
 * Test composters and compost batches that behave like the real process, for
 * trying the Machine and Compost pages without hardware. Runs in the browser,
 * is saved to localStorage, and never touches the backend.
 *
 * Model (simplified, per simulated second):
 * - A batch's core temperature follows the composting curve for its stage
 *   (thermophilic rise to ~62 °C early in "composting", slow fall, cooler curing).
 *   Aeration (motor running) helps; mixing cools it briefly; too dry / too wet
 *   slows the microbes.
 * - Moisture evaporates faster when hot; "Add water" raises it.
 * - The batch is measured in sacks (as taken from inventory) and composts down with
 *   microbial activity (≈25% over the composting stage).
 * - Stages advance on their own after their duration; completed batches free
 *   the machine.
 * - Safety: > 72 °C trips an overheat fault; opening the lid while the motor
 *   runs trips the interlock. Faults can also be injected for testing.
 */

export type MotorState = "stopped" | "running" | "mixing" | "fault";
export type Speed = 1 | 60 | 600 | 3600;
export const SPEEDS: { value: Speed; label: string }[] = [
  { value: 1, label: "1×" },
  { value: 60, label: "1 min/s" },
  { value: 600, label: "10 min/s" },
  { value: 3600, label: "1 hr/s" },
];

export interface SimMachine {
  id: string;
  name: string;
  motor: MotorState;
  lidOpen: boolean;
  online: boolean; // false = injected sensor dropout
  temp: number;
  rpm: number;
  powerKw: number;
  batchId: string | null;
  mixUntil: number | null;
  fault: string | null;
  sessionId: string | null;
  tempHistory: number[]; // one point per real tick, newest last
}

export interface SimLog {
  t: number;
  event: string;
  temp: number | null;
  weight: number | null; // sacks
  moisture: number | null;
}

export interface SimBatch {
  id: string;
  machineId: string | null;
  recipe: string;
  operator: string;
  /** Raw-hair sacks taken from inventory for this batch. */
  sacks?: number;
  initialWeight: number; // sacks loaded
  weight: number; // sacks remaining as it composts down
  moisture: number;
  temp: number;
  stage: BatchStage;
  stageStartedAt: number;
  createdAt: number;
  lastSampleAt: number;
  logs: SimLog[]; // newest first
}

export interface SimSession {
  id: string;
  machineId: string;
  batchId: string | null;
  operator: string;
  start: number;
  end: number | null;
  tempSum: number;
  samples: number;
}

export interface SimState {
  version: 1;
  running: boolean;
  speed: Speed;
  clock: number; // simulated epoch ms
  nextBatchNo: number;
  machines: SimMachine[];
  batches: SimBatch[];
  sessions: SimSession[]; // newest first
}

const HOUR = 3600;
const DAY = 24 * HOUR;
export const STAGE_DURATION: Record<BatchStage, number> = {
  preparation: 6 * HOUR,
  composting: 14 * DAY,
  curing: 7 * DAY,
  sampling: DAY,
  "quality review": DAY,
  completed: Infinity,
};
const AMBIENT = 28;
const OVERHEAT_C = 72;
const MIX_SECONDS = 30 * 60;
const SAMPLE_EVERY = 6 * HOUR;
const HISTORY_POINTS = 60;
const STORAGE_KEY = "h2h-sim-v2"; // v2: batches measured in sacks

const round1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const noise = (amp: number) => (Math.random() * 2 - 1) * amp;

/* ── Seed ─────────────────────────────────────────────────────────────── */

function seed(): SimState {
  const now = Date.now();
  const ms = (s: number) => s * 1000;
  // TEST-001: three days into composting on SIM-01, motor running.
  const started = now - ms(3 * DAY + STAGE_DURATION.preparation);
  const batch: SimBatch = {
    id: "TEST-001",
    machineId: "SIM-01",
    recipe: "v1.2",
    operator: "Simulator",
    sacks: 12,
    initialWeight: 12,
    weight: 11.2,
    moisture: 56,
    temp: 58.5,
    stage: "composting",
    stageStartedAt: now - ms(3 * DAY),
    createdAt: started,
    lastSampleAt: now,
    logs: [
      { t: now - ms(3 * DAY), event: "Stage → composting", temp: 33.1, weight: 12, moisture: 60 },
      { t: started, event: "Batch created (test)", temp: AMBIENT, weight: 12, moisture: 60 },
    ],
  };
  return {
    version: 1,
    running: true,
    speed: 600,
    clock: now,
    nextBatchNo: 2,
    machines: [
      {
        id: "SIM-01",
        name: "Test Composter SIM-01",
        motor: "running",
        lidOpen: false,
        online: true,
        temp: 58.5,
        rpm: 12,
        powerKw: 0.75,
        batchId: "TEST-001",
        mixUntil: null,
        fault: null,
        sessionId: "SES-T001",
        tempHistory: [],
      },
      {
        id: "SIM-02",
        name: "Test Composter SIM-02",
        motor: "stopped",
        lidOpen: false,
        online: true,
        temp: AMBIENT,
        rpm: 0,
        powerKw: 0.05,
        batchId: null,
        mixUntil: null,
        fault: null,
        sessionId: null,
        tempHistory: [],
      },
    ],
    batches: [batch],
    sessions: [
      { id: "SES-T001", machineId: "SIM-01", batchId: "TEST-001", operator: "Simulator", start: now - ms(2 * HOUR), end: null, tempSum: 58.5, samples: 1 },
    ],
  };
}

/* ── Store plumbing ───────────────────────────────────────────────────── */

function load(): SimState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SimState;
      if (parsed?.version === 1) return parsed;
    }
  } catch {
    /* private mode or corrupt data: start fresh */
  }
  return seed();
}

let state: SimState = load();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function commit(next: SimState) {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage full / blocked: keep running in memory */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // The clock starts with the first viewer and keeps running while the app is open,
  // so batches keep progressing when you switch pages.
  if (!timer) timer = setInterval(() => state.running && commit(tick(state, state.speed)), 1000);
  return () => listeners.delete(listener);
}

/** Current state outside React (tests, exports). */
export const getSimState = () => state;

export function useSimulation() {
  return useSyncExternalStore(subscribe, () => state);
}

/* ── Physics ──────────────────────────────────────────────────────────── */

function targetTemp(b: SimBatch, m: SimMachine | undefined, clock: number) {
  const elapsed = (clock - b.stageStartedAt) / 1000;
  const p = clamp(elapsed / STAGE_DURATION[b.stage], 0, 1);
  let t: number;
  switch (b.stage) {
    case "preparation":
      t = 30;
      break;
    case "composting":
      t = p < 0.25 ? 32 + 30 * (p / 0.25) : 62 - 17 * ((p - 0.25) / 0.75);
      break;
    case "curing":
      t = 45 - 10 * p;
      break;
    default:
      t = AMBIENT + 2;
  }
  const active = b.stage === "composting" || b.stage === "curing";
  if (active && m) {
    if (m.motor === "running") t += 3; // aeration feeds the microbes
    if (m.motor === "mixing") t -= 6; // turning releases heat
    if (m.motor === "stopped" || m.motor === "fault") t -= 4; // starved of oxygen
  }
  // Too dry or too wet: microbes slow down, pile cools toward ambient.
  if (b.moisture < 40 || b.moisture > 70) t = t - (t - AMBIENT) * 0.4;
  return t;
}

function stepBatch(b: SimBatch, m: SimMachine | undefined, clock: number, h: number): SimBatch {
  if (b.stage === "completed") return b;
  const k = 1 - Math.exp(-h / HOUR);
  const temp = b.temp + (targetTemp(b, m, clock) - b.temp) * k;
  const mixing = m?.motor === "mixing";
  // % moisture lost per hour: ~0.5%/day cool, ~2.7%/day at 58 °C, more while turning.
  const evap = (0.02 + Math.max(0, temp - 35) * 0.004 + (mixing ? 0.2 : 0)) * (h / HOUR);
  const activity = clamp((temp - 30) / 30, 0, 1);
  const weight = Math.max(b.initialWeight * 0.55, b.weight - b.initialWeight * 0.0008 * activity * (h / HOUR));
  return { ...b, temp, moisture: clamp(b.moisture - evap, 15, 85), weight };
}

function addLog(b: SimBatch, event: string, clock: number): SimBatch {
  const log: SimLog = { t: clock, event, temp: round1(b.temp), weight: round1(b.weight), moisture: round1(b.moisture) };
  return { ...b, logs: [log, ...b.logs].slice(0, 60) };
}

function closeSession(s: SimState, m: SimMachine): SimState {
  if (!m.sessionId) return s;
  return {
    ...s,
    sessions: s.sessions.map((x) => (x.id === m.sessionId ? { ...x, end: s.clock } : x)),
  };
}

/** Advance the world by `seconds` of simulated time (in ≤60 s sub-steps). */
function tick(prev: SimState, seconds: number): SimState {
  let s: SimState = { ...prev, machines: prev.machines.map((m) => ({ ...m })), batches: [...prev.batches] };
  let remaining = seconds;
  while (remaining > 0) {
    const h = Math.min(60, remaining);
    remaining -= h;
    s.clock += h * 1000;

    s.batches = s.batches.map((b) => {
      const m = s.machines.find((x) => x.id === b.machineId);
      let next = stepBatch(b, m, s.clock, h);
      // Stage progression
      const elapsed = (s.clock - next.stageStartedAt) / 1000;
      if (next.stage !== "completed" && elapsed >= STAGE_DURATION[next.stage]) {
        const stage = STAGES[STAGES.indexOf(next.stage) + 1];
        next = addLog({ ...next, stage, stageStartedAt: s.clock }, `Stage → ${stage}`, s.clock);
      }
      // Periodic sensor reading
      if (next.stage !== "completed" && s.clock - next.lastSampleAt >= SAMPLE_EVERY * 1000) {
        next = addLog({ ...next, lastSampleAt: s.clock }, "Sensor reading", s.clock);
      }
      return next;
    });

    for (const m of s.machines) {
      const batch = s.batches.find((b) => b.id === m.batchId);
      // Completed batch: release the machine.
      if (batch && batch.stage === "completed") {
        s = closeSession(s, m);
        Object.assign(m, { batchId: null, motor: m.motor === "fault" ? "fault" : "stopped", sessionId: null, mixUntil: null });
        s.batches = s.batches.map((b) => (b.id === batch.id ? { ...b, machineId: null } : b));
      }
      if (m.motor === "mixing" && m.mixUntil !== null && s.clock >= m.mixUntil) {
        m.motor = "running";
        m.mixUntil = null;
      }
      // Machine reads the batch core temperature, or drifts to ambient when empty.
      const live = s.batches.find((b) => b.id === m.batchId);
      if (m.online) {
        const empty = AMBIENT + (m.motor === "running" || m.motor === "mixing" ? 2 : 0);
        m.temp = live ? live.temp : m.temp + (empty - m.temp) * (1 - Math.exp(-h / HOUR));
      }
      // Safety interlocks
      if (m.temp > OVERHEAT_C && m.motor !== "fault") {
        s = closeSession(s, m);
        Object.assign(m, { motor: "fault", fault: `Overheat: core above ${OVERHEAT_C} °C`, sessionId: null, mixUntil: null });
      }
      if (m.lidOpen && (m.motor === "running" || m.motor === "mixing")) {
        s = closeSession(s, m);
        Object.assign(m, { motor: "fault", fault: "Interlock: lid opened while motor running", sessionId: null, mixUntil: null });
      }
      m.rpm = m.motor === "running" ? 12 : m.motor === "mixing" ? 30 : 0;
      m.powerKw = m.motor === "running" ? 0.75 : m.motor === "mixing" ? 1.5 : 0.05;
    }

    // Session temperature averages
    s.sessions = s.sessions.map((x) => {
      if (x.end !== null) return x;
      const m = s.machines.find((mm) => mm.id === x.machineId);
      return m ? { ...x, tempSum: x.tempSum + m.temp, samples: x.samples + 1 } : x;
    });
  }

  // One chart point per real tick, with a little sensor noise.
  for (const m of s.machines) {
    const reading = m.online ? round1(m.temp + noise(0.15)) : m.tempHistory.at(-1) ?? m.temp;
    m.tempHistory = [...m.tempHistory, reading].slice(-HISTORY_POINTS);
    m.temp = round1(m.temp);
  }
  s.batches = s.batches.map((b) => ({ ...b, temp: round1(b.temp), weight: round1(b.weight), moisture: round1(b.moisture) }));
  return s;
}

/* ── Actions ──────────────────────────────────────────────────────────── */

function updateMachine(id: string, fn: (m: SimMachine, s: SimState) => SimState | void) {
  const s: SimState = { ...state, machines: state.machines.map((m) => ({ ...m })), batches: [...state.batches] };
  const m = s.machines.find((x) => x.id === id);
  if (!m) return;
  commit(fn(m, s) ?? s);
}

function logToBatch(s: SimState, batchId: string | null, event: string): SimState {
  if (!batchId) return s;
  return { ...s, batches: s.batches.map((b) => (b.id === batchId ? addLog(b, event, s.clock) : b)) };
}

export const sim = {
  play: () => commit({ ...state, running: true }),
  pause: () => commit({ ...state, running: false }),
  setSpeed: (speed: Speed) => commit({ ...state, speed }),
  /** Jump ahead, e.g. a day, to see stage changes quickly. */
  skip: (seconds: number) => commit(tick(state, seconds)),
  reset: () => commit(seed()),

  startMotor: (id: string, operator: string) =>
    updateMachine(id, (m, s) => {
      if (m.motor === "running" || m.motor === "mixing" || m.fault || m.lidOpen) return;
      const session: SimSession = {
        id: `SES-${String(s.sessions.length + 1).padStart(4, "0")}`,
        machineId: m.id,
        batchId: m.batchId,
        operator,
        start: s.clock,
        end: null,
        tempSum: m.temp,
        samples: 1,
      };
      Object.assign(m, { motor: "running", sessionId: session.id, rpm: 12, powerKw: 0.75 });
      return logToBatch({ ...s, sessions: [session, ...s.sessions] }, m.batchId, `Motor started by ${operator}`);
    }),

  stopMotor: (id: string, operator: string) =>
    updateMachine(id, (m, s) => {
      if (m.motor !== "running" && m.motor !== "mixing") return;
      const next = closeSession(s, m);
      Object.assign(m, { motor: "stopped", sessionId: null, mixUntil: null, rpm: 0, powerKw: 0.05 });
      return logToBatch(next, m.batchId, `Motor stopped by ${operator}`);
    }),

  mix: (id: string, operator: string) =>
    updateMachine(id, (m, s) => {
      if (m.fault || m.lidOpen) return;
      let next = s;
      if (!m.sessionId) {
        const session: SimSession = {
          id: `SES-${String(s.sessions.length + 1).padStart(4, "0")}`,
          machineId: m.id, batchId: m.batchId, operator, start: s.clock, end: null, tempSum: m.temp, samples: 1,
        };
        next = { ...s, sessions: [session, ...s.sessions] };
        m.sessionId = session.id;
      }
      Object.assign(m, { motor: "mixing", mixUntil: s.clock + MIX_SECONDS * 1000, rpm: 30, powerKw: 1.5 });
      return logToBatch(next, m.batchId, "Mixing / Turning (30 min)");
    }),

  setLid: (id: string, open: boolean) =>
    updateMachine(id, (m, s) => {
      m.lidOpen = open;
      return logToBatch(s, m.batchId, open ? "Lid opened" : "Lid closed");
    }),

  injectFault: (id: string, kind: "overheat" | "lid" | "sensor") =>
    updateMachine(id, (m, s) => {
      if (kind === "overheat") {
        m.temp = OVERHEAT_C + 4;
        const batches = s.batches.map((b) => (b.id === m.batchId ? { ...b, temp: OVERHEAT_C + 4 } : b));
        return { ...s, batches };
      }
      if (kind === "lid") {
        m.lidOpen = true; // the next tick trips the interlock if the motor is running
        return;
      }
      m.online = false; // sensor dropout: readings freeze, page shows Offline
    }),

  resetFault: (id: string) =>
    updateMachine(id, (m) => {
      Object.assign(m, { fault: null, online: true, motor: m.motor === "fault" ? "stopped" : m.motor });
    }),

  /** The ID the next test batch will get (so inventory can be tagged before it starts). */
  nextBatchId: () => `TEST-${String(state.nextBatchNo).padStart(3, "0")}`,

  /** True when the machine can take a new batch. */
  machineFree: (machineId: string) => {
    const m = state.machines.find((x) => x.id === machineId);
    return !!m && !m.batchId;
  },

  /** Starts a test batch from `sacks` of raw hair. The caller deducts
   *  the sacks from inventory first; see composting-content.tsx. */
  createBatch: (input: { machineId: string; sacks: number; recipe: string; operator: string }) => {
    const m = state.machines.find((x) => x.id === input.machineId);
    if (!m || m.batchId) throw new Error("That test machine already has a batch.");
    if (!Number.isInteger(input.sacks) || input.sacks < 1) throw new Error("Enter at least 1 sack.");
    const id = sim.nextBatchId();
    const batch: SimBatch = {
      id,
      machineId: m.id,
      recipe: input.recipe,
      operator: input.operator,
      sacks: input.sacks,
      initialWeight: input.sacks,
      weight: input.sacks,
      moisture: 60,
      temp: AMBIENT,
      stage: "preparation",
      stageStartedAt: state.clock,
      createdAt: state.clock,
      lastSampleAt: state.clock,
      logs: [
        {
          t: state.clock,
          event: `Batch created by ${input.operator}: ${input.sacks} sack${input.sacks === 1 ? "" : "s"} from inventory`,
          temp: AMBIENT,
          weight: input.sacks,
          moisture: 60,
        },
      ],
    };
    commit({
      ...state,
      nextBatchNo: state.nextBatchNo + 1,
      batches: [batch, ...state.batches],
      machines: state.machines.map((x) => (x.id === m.id ? { ...x, batchId: id } : x)),
    });
    return id;
  },

  addWater: (batchId: string, pct = 5) =>
    commit({
      ...state,
      batches: state.batches.map((b) =>
        b.id === batchId ? addLog({ ...b, moisture: clamp(b.moisture + pct, 0, 85) }, `Water added (+${pct}%)`, state.clock) : b,
      ),
    }),

  /** Testing shortcut: move a batch to its next stage now. */
  advanceStage: (batchId: string) =>
    commit({
      ...state,
      batches: state.batches.map((b) => {
        if (b.id !== batchId || b.stage === "completed") return b;
        const stage = STAGES[STAGES.indexOf(b.stage) + 1];
        return addLog({ ...b, stage, stageStartedAt: state.clock }, `Stage → ${stage} (manual)`, state.clock);
      }),
    }),

};

/* ── Display helpers ──────────────────────────────────────────────────── */

export const formatSimTime = (ms: number) =>
  new Date(ms).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function formatDuration(ms: number) {
  const mins = Math.max(0, Math.round(ms / 60000));
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}

/** 0–1 progress through the batch's current stage. */
export function stageProgress(b: SimBatch, clock: number) {
  const d = STAGE_DURATION[b.stage];
  return Number.isFinite(d) ? clamp((clock - b.stageStartedAt) / 1000 / d, 0, 1) : 1;
}
