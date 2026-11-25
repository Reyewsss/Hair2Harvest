import { useEffect, useRef, useState, type ReactNode } from "react";
import { Cpu, Droplets, Globe, Server, Waves, Zap } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { showResult } from "@/shared/ui/result-modal";
import { cn } from "@/lib/utils";
import {
  STAGE_DURATION,
  sim,
  type SimBatch,
  type SimMachine,
} from "@/features/simulation/sim-store";

/**
 * A 2D model of the IoT hardware behind a compost machine: an ESP32 reads the NPK,
 * temperature and moisture sensors, posts the readings to the backend over Wi-Fi, and the
 * website sends commands back that switch the relay for the water pump and mixer motor.
 * Everything is driven by the machine simulation; no real hardware is involved.
 */

type PartId = "npk" | "temp" | "moist" | "esp32" | "cloud" | "web" | "relay" | "pump" | "motor";

const PUMP_MS = 3000; // real time the pump runs per watering
const AUTO_BELOW = 50; // auto irrigation switches on below this moisture %
const AUTO_COOLDOWN_MS = 8000;

const PARTS: Record<PartId, { name: string; part: string; link: string; role: string }> = {
  npk: {
    name: "NPK soil sensor",
    part: "RS485 7-in-1 probe (with MAX485 converter)",
    link: "Modbus RTU over RS485 → UART2 (GPIO16 RX / GPIO17 TX)",
    role: "Measures nitrogen, phosphorus and potassium in the pile (mg/kg) to show how far the hair has broken down.",
  },
  temp: {
    name: "Temperature probe",
    part: "DS18B20 waterproof probe + 4.7 kΩ pull-up",
    link: "1-Wire → GPIO4",
    role: "Reads the core temperature. 55–65 °C is the target; above 72 °C the ESP32 trips the overheat cut-off.",
  },
  moist: {
    name: "Moisture sensor",
    part: "Capacitive soil moisture sensor v1.2",
    link: "Analog → GPIO34 (ADC1)",
    role: "Reads how wet the compost is. Below 50% the pump can water the pile automatically.",
  },
  esp32: {
    name: "ESP32 controller",
    part: "ESP32-WROOM-32 DevKit (dual-core, Wi-Fi)",
    link: "Wi-Fi 2.4 GHz → HTTPS to the Hair2Harvest API",
    role: "Reads every sensor, packs them into JSON, posts them every few seconds, and polls for commands such as ‘pump on’.",
  },
  cloud: {
    name: "Backend API",
    part: "Express + MongoDB on Vercel",
    link: "POST /api/iot/telemetry · GET /api/iot/commands",
    role: "Stores each reading against the batch, checks the safety limits, and queues commands sent from the website.",
  },
  web: {
    name: "Hair2Harvest website",
    part: "Machine & Compost pages (this dashboard)",
    link: "Fetches readings from the API",
    role: "Shows live readings and charts. Buttons like ‘Run pump’ create a command for the ESP32.",
  },
  relay: {
    name: "2-channel relay",
    part: "5 V relay module, opto-isolated",
    link: "IN1 ← GPIO26 (pump) · IN2 ← GPIO27 (motor)",
    role: "Lets the 3.3 V ESP32 switch the 12 V pump and the mixer motor safely.",
  },
  pump: {
    name: "Water pump",
    part: "12 V DC diaphragm pump",
    link: "Relay channel 1 · 12 V supply",
    role: "Sprays water into the drum when the compost is too dry (+5% moisture per run).",
  },
  motor: {
    name: "Mixer motor",
    part: "Geared DC motor (drum aeration)",
    link: "Relay channel 2",
    role: "Turns the drum to aerate the pile. Started and stopped from the Controls panel.",
  },
};

const STEPS = [
  { icon: <Waves className="size-4" />, title: "Sense", text: "Sensors measure NPK, temperature and moisture." },
  { icon: <Cpu className="size-4" />, title: "Read", text: "The ESP32 reads them over RS485, 1-Wire and ADC." },
  { icon: <Server className="size-4" />, title: "Send", text: "It posts a JSON reading to the API over Wi-Fi." },
  { icon: <Globe className="size-4" />, title: "Show", text: "The website displays it and sends commands back." },
  { icon: <Zap className="size-4" />, title: "Act", text: "The ESP32 switches the relay: pump or motor runs." },
];

const TOTAL_SECONDS = Object.values(STAGE_DURATION)
  .filter(Number.isFinite)
  .reduce((a, b) => a + b, 0);

/** Simulated NPK (mg/kg): nitrogen is released as the hair keratin breaks down. */
function npkFor(batch: SimBatch | null, clock: number) {
  if (!batch) return null;
  const p = Math.min(1, Math.max(0, (clock - batch.createdAt) / (TOTAL_SECONDS * 1000)));
  const wobble = (k: number) => Math.sin(clock / 600_000 + k) * 1.5;
  return {
    n: Math.round(95 + 120 * p + wobble(1)),
    p: Math.round(18 + 22 * p + wobble(2)),
    k: Math.round(55 + 45 * p + wobble(3)),
  };
}

export function IotDiagram({
  machine: m,
  batch,
  running,
  clock,
  readOnly = false,
}: {
  machine: SimMachine;
  batch: SimBatch | null;
  running: boolean;
  clock: number;
  /** Staff can watch the diagram but can't run the pump or turn on auto irrigation. */
  readOnly?: boolean;
}) {
  const [selected, setSelected] = useState<PartId>("esp32");
  const [pumpOn, setPumpOn] = useState(false);
  const [auto, setAuto] = useState(false);
  const [step, setStep] = useState(0);
  const lastAuto = useRef(0);
  const pumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const online = m.online;
  const live = running && online;
  const motorOn = m.motor === "running" || m.motor === "mixing";
  const moisture = batch?.moisture ?? null;
  const npk = npkFor(batch, clock);
  const rssi = -58 + Math.round(Math.sin(clock / 90_000) * 4);

  useEffect(() => () => {
    if (pumpTimer.current) clearTimeout(pumpTimer.current);
  }, []);

  // Walk through the five steps while data is flowing.
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setStep((x) => (x + 1) % STEPS.length), 1400);
    return () => clearInterval(id);
  }, [live]);

  const runPump = (reason: "manual" | "auto") => {
    if (readOnly || !batch || pumpOn || !online) return;
    sim.addWater(batch.id, 5);
    setPumpOn(true);
    setSelected("pump");
    if (pumpTimer.current) clearTimeout(pumpTimer.current);
    pumpTimer.current = setTimeout(() => setPumpOn(false), PUMP_MS);
    if (reason === "manual") showResult({ type: "success", title: "Pump ran: +5% moisture" });
  };

  // Auto irrigation: the ESP32 waters the pile when it gets too dry.
  useEffect(() => {
    if (readOnly || !auto || !live || moisture === null || moisture >= AUTO_BELOW || pumpOn) return;
    if (Date.now() - lastAuto.current < AUTO_COOLDOWN_MS) return;
    lastAuto.current = Date.now();
    runPump("auto");
  });

  const payload = {
    deviceId: `ESP32-${m.id}`,
    batchId: batch?.id ?? null,
    temp_c: online ? m.temp : null,
    moisture_pct: online ? moisture : null,
    npk_mg_kg: online ? npk : null,
    relay: { pump: pumpOn ? "on" : "off", motor: motorOn ? "on" : "off" },
    rssi_dbm: online ? rssi : null,
    ts: new Date(clock).toISOString(),
  };

  const info = PARTS[selected];
  const part = (id: PartId) => ({
    onClick: () => setSelected(id),
    className: "cursor-pointer outline-none",
    role: "button",
    tabIndex: 0,
    "aria-label": PARTS[id].name,
    onKeyDown: (e: React.KeyboardEvent) => (e.key === "Enter" || e.key === " ") && setSelected(id),
  });
  // Signal wires fade and dash when the sensor link drops.
  const signal = online ? "" : "opacity-35 [stroke-dasharray:6_6]";

  return (
    <section className="flex flex-col gap-5 rounded-xl border bg-card p-5 animate-in fade-in">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 font-medium">
            <Cpu className="size-4" /> IoT wiring: how {m.id} talks to the website
          </h2>
          <p className="text-sm text-muted-foreground">
            Simulated ESP32 setup. Click a part to see how it is connected. Values come from the test machine.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-secondary px-3 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={auto && !readOnly}
              disabled={readOnly}
              onChange={(e) => setAuto(e.target.checked)}
            />
            Auto irrigation (&lt; {AUTO_BELOW}%)
          </label>
          <Button
            type="button"
            className="h-10 gap-2"
            disabled={readOnly || !batch || pumpOn || !online}
            title={readOnly ? "View only" : !batch ? "Load a batch first" : !online ? "Sensor offline" : undefined}
            onClick={() => runPump("manual")}
          >
            <Droplets className="size-4" />
            {pumpOn ? "Pumping…" : "Run pump"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 2xl:grid-cols-[1fr_19rem]">
        {/* ── Diagram ───────────────────────────────────────────── */}
        <div className="overflow-x-auto rounded-lg bg-background/40">
          <svg viewBox="0 0 1080 620" className="block w-full min-w-200" role="img" aria-label="ESP32 wiring diagram">
            <defs>
              <linearGradient id="iot-silver" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#f1f3f5" />
                <stop offset="0.55" stopColor="#c4c9cf" />
                <stop offset="1" stopColor="#9aa1a9" />
              </linearGradient>
              <linearGradient id="iot-steel" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#8b939c" />
                <stop offset="0.45" stopColor="#eef1f4" />
                <stop offset="1" stopColor="#7c858f" />
              </linearGradient>
              <linearGradient id="iot-motor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#e2e5e9" />
                <stop offset="0.5" stopColor="#a7aeb6" />
                <stop offset="1" stopColor="#6b737c" />
              </linearGradient>
              <linearGradient id="iot-relay" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#4f8df5" />
                <stop offset="1" stopColor="#1f5fd1" />
              </linearGradient>

              {/* Signal paths (packets travel along these) */}
              <path id="w-moist" d="M300 212 C 390 212, 380 295, 465 295" />
              <path id="w-relay1" d="M465 400 C 400 400, 400 375, 334 375" />
              <path id="w-relay2" d="M465 421 C 405 421, 400 390, 334 390" />
              <path id="w-npk" d="M842 336 C 815 336, 815 407, 790 407 L 690 407 C 662 407, 660 421, 635 421" />
              <path id="w-temp" d="M790 540 C 720 540, 700 442, 635 442" />
              <path id="w-up" d="M540 174 C 540 146, 510 136, 510 112" />
              <path id="w-cmd-esp" d="M590 112 C 590 136, 565 150, 565 174" />
              <path id="w-web" d="M640 52 L720 52" />
              <path id="w-cmd-web" d="M720 88 L640 88" />
            </defs>

            {/* Selection outline */}
            <rect
              x={BOX[selected].x}
              y={BOX[selected].y}
              width={BOX[selected].w}
              height={BOX[selected].h}
              rx={14}
              className="fill-primary/5 stroke-primary stroke-2 [stroke-dasharray:6_5] transition-all duration-300"
            />

            {/* ── Jumper wires ─────────────────────────────────── */}
            <g className="fill-none stroke-3 [stroke-linecap:round]">
              {/* Moisture sensor: VCC → VIN, GND → GND, AOUT → D34 */}
              <path d="M300 188 C 420 188, 380 526, 465 526" stroke={WIRE.red} />
              <path d="M300 200 C 410 200, 372 505, 465 505" stroke={WIRE.gnd} />
              <use href="#w-moist" stroke={WIRE.yellow} className={signal} />
              {/* Relay: VCC, GND, IN1 ← D26, IN2 ← D27 */}
              <path d="M334 360 C 400 360, 400 526, 465 526" stroke={WIRE.red} />
              <path d="M334 405 C 395 405, 400 505, 465 505" stroke={WIRE.gnd} />
              <use href="#w-relay1" stroke={WIRE.orange} className={signal} />
              <use href="#w-relay2" stroke={WIRE.blue} className={signal} />
              {/* Relay → pump and motor (12 V side) */}
              <path d="M155 448 C 155 492, 102 488, 102 528" stroke={WIRE.red} />
              <path d="M175 448 C 175 496, 122 494, 122 528" stroke={WIRE.gnd} />
              <path d="M235 448 C 235 490, 255 490, 255 528" stroke={WIRE.red} />
              <path d="M255 448 C 255 486, 275 492, 275 528" stroke={WIRE.gnd} />
              {/* MAX485 ↔ ESP32 (TX2/RX2) and probe cable (A/B) */}
              <path d="M635 400 C 660 400, 665 395, 690 395" stroke={WIRE.teal} className={signal} />
              <use href="#w-npk" stroke={WIRE.green} className={signal} />
              <path d="M790 395 C 818 395, 818 326, 842 326" stroke={WIRE.yellow} className={signal} />
              {/* DS18B20: data → D4, 3V3, GND */}
              <use href="#w-temp" stroke={WIRE.purple} className={signal} />
              <path d="M635 526 C 690 526, 700 532, 790 532" stroke={WIRE.red} />
              <path d="M635 505 C 690 505, 705 548, 790 548" stroke={WIRE.gnd} />
              {/* Cloud links */}
              <use href="#w-up" className={cn("[stroke-dasharray:3_7]", online ? "stroke-primary" : "stroke-destructive")} />
              <use href="#w-cmd-esp" className="stroke-amber-500 [stroke-dasharray:3_7]" />
              <use href="#w-web" className="stroke-primary/70" />
              <use href="#w-cmd-web" className="stroke-amber-500/70" />
            </g>

            {/* ── Packets ──────────────────────────────────────── */}
            {live ? (
              <>
                <Packet path="w-moist" dur="2s" />
                <Packet path="w-npk" dur="2.6s" begin="-0.4s" />
                <Packet path="w-temp" dur="2.2s" begin="-0.8s" />
                <Packet path="w-up" dur="1.4s" begin="-0.2s" />
                <Packet path="w-web" dur="1.1s" begin="-0.7s" />
              </>
            ) : null}
            {pumpOn || (live && motorOn) ? (
              <>
                <Packet path="w-cmd-web" dur="1.1s" tone="cmd" />
                <Packet path="w-cmd-esp" dur="1.4s" begin="-0.3s" tone="cmd" />
                {pumpOn ? <Packet path="w-relay1" dur="1.2s" begin="-0.6s" tone="cmd" /> : null}
                {live && motorOn ? <Packet path="w-relay2" dur="1.2s" begin="-0.9s" tone="cmd" /> : null}
              </>
            ) : null}

            {/* ── Backend API (server rack) ────────────────────── */}
            <g {...part("cloud")}>
              <rect x={400} y={20} width={240} height={92} rx={12} className="fill-card stroke-border" />
              {[0, 1, 2].map((i) => (
                <g key={i}>
                  <rect x={414} y={32 + i * 24} width={58} height={18} rx={3} fill="#1f2937" stroke="#374151" />
                  <circle cx={424} cy={41 + i * 24} r={2.5} fill={live ? "#4ade80" : "#6b7280"}>
                    {live ? <animate attributeName="opacity" values="1;0.2;1" dur={`${0.8 + i * 0.3}s`} repeatCount="indefinite" /> : null}
                  </circle>
                  <rect x={432} y={39 + i * 24} width={32} height={4} rx={1} fill="#4b5563" />
                </g>
              ))}
              <text x={486} y={46} className="fill-foreground text-[14px] font-medium">Backend API</text>
              <text x={486} y={64} className="fill-muted-foreground font-mono text-[10.5px]">POST /api/iot/telemetry</text>
              <text x={486} y={82} className="fill-muted-foreground font-mono text-[10.5px]">GET  /api/iot/commands</text>
              <text x={486} y={100} className="fill-muted-foreground text-[10.5px]">{batch ? `→ batch ${batch.id}` : "no batch loaded"}</text>
            </g>

            {/* ── Website (browser window) ─────────────────────── */}
            <g {...part("web")}>
              <rect x={720} y={14} width={340} height={110} rx={12} className="fill-card stroke-border" />
              <path d="M720 26 a12 12 0 0 1 12 -12 h316 a12 12 0 0 1 12 12 v12 h-340 z" className="fill-secondary" />
              {["#ef4444", "#f59e0b", "#22c55e"].map((c, i) => (
                <circle key={c} cx={736 + i * 13} cy={26} r={4} fill={c} />
              ))}
              <rect x={782} y={19} width={200} height={14} rx={7} className="fill-background" />
              <text x={792} y={30} className="fill-muted-foreground font-mono text-[9.5px]">hair2harvest · /machine</text>
              <text x={736} y={62} className="fill-foreground text-[14px] font-medium">Hair2Harvest website</text>
              <text x={736} y={82} className="fill-muted-foreground text-[11px]">
                {online ? `Live: ${m.temp.toFixed(1)} °C · ${moisture !== null ? `${moisture.toFixed(0)}%` : "no batch"}` : "Device offline"}
              </text>
              <text x={736} y={104} className={cn("text-[11px] font-medium", pumpOn || motorOn ? "fill-amber-500" : "fill-muted-foreground")}>
                {pumpOn ? "▶ Command sent: pump ON" : motorOn ? "▶ Command sent: motor ON" : "Watching live readings"}
              </text>
            </g>

            {/* ── ESP32 DevKit ─────────────────────────────────── */}
            <g {...part("esp32")}>
              {/* Wi-Fi waves from the antenna */}
              {[8, 15, 22].map((r, i) => (
                <path
                  key={r}
                  d={`M${550 - r * 0.71} ${168 - r * 0.71} A${r} ${r} 0 0 1 ${550 + r * 0.71} ${168 - r * 0.71}`}
                  className={cn("fill-none stroke-2 [stroke-linecap:round]", online ? "stroke-primary" : "stroke-destructive/60")}
                >
                  {live ? <animate attributeName="opacity" values="0.15;1;0.15" dur="1.5s" begin={`${i * 0.25}s`} repeatCount="indefinite" /> : null}
                </path>
              ))}
              {/* PCB */}
              <rect x={455} y={172} width={190} height={400} rx={10} fill="#16191d" stroke="#2b3036" strokeWidth={2} />
              {[[463, 180], [637, 180], [463, 564], [637, 564]].map(([cx, cy]) => (
                <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={3.5} fill="#0b0d10" stroke="#3a4048" />
              ))}
              {/* WROOM module: antenna PCB + metal shield */}
              <rect x={495} y={178} width={110} height={154} rx={4} fill="#0f2238" stroke="#1d3a5c" />
              <path
                d="M505 186 h90 v8 h-82 v8 h82 v8 h-90"
                fill="none"
                stroke="#d4a72c"
                strokeWidth={2.2}
                strokeLinejoin="round"
              />
              <rect x={500} y={218} width={100} height={110} rx={3} fill="url(#iot-silver)" stroke="#8a9199" />
              <text x={550} y={252} textAnchor="middle" fill="#3b4148" className="font-mono text-[10px] font-bold">ESP32-WROOM-32</text>
              <text x={550} y={268} textAnchor="middle" fill="#4b525a" className="font-mono text-[8.5px]">Wi-Fi · BT · 240 MHz</text>
              <rect x={526} y={282} width={48} height={30} rx={2} fill="none" stroke="#8a9199" strokeDasharray="2 2" />
              <text x={550} y={301} textAnchor="middle" fill="#59616a" className="font-mono text-[8px]">FCC · CE</text>

              {/* Pin headers + silkscreen labels */}
              <rect x={459} y={222} width={12} height={314} rx={2} fill="#050607" />
              <rect x={629} y={222} width={12} height={314} rx={2} fill="#050607" />
              {LEFT_PINS.map((label, i) => (
                <g key={`l-${label}-${i}`}>
                  <rect x={462} y={pinY(i) - 3} width={6} height={6} fill={USED_PINS.has(label) ? "#fbbf24" : "#b8962e"} />
                  <text x={476} y={pinY(i) + 3} fill={USED_PINS.has(label) ? "#fde68a" : "#cfd4da"} className={cn("font-mono text-[8.5px]", USED_PINS.has(label) && "font-bold")}>
                    {label}
                  </text>
                </g>
              ))}
              {RIGHT_PINS.map((label, i) => (
                <g key={`r-${label}-${i}`}>
                  <rect x={632} y={pinY(i) - 3} width={6} height={6} fill={USED_PINS.has(label) ? "#fbbf24" : "#b8962e"} />
                  <text x={624} y={pinY(i) + 3} textAnchor="end" fill={USED_PINS.has(label) ? "#fde68a" : "#cfd4da"} className={cn("font-mono text-[8.5px]", USED_PINS.has(label) && "font-bold")}>
                    {label}
                  </text>
                </g>
              ))}

              {/* Regulator, USB-UART chip, LEDs, buttons, micro-USB */}
              <rect x={506} y={350} width={22} height={16} rx={1.5} fill="#0b0b0c" stroke="#2f3338" />
              <rect x={510} y={344} width={14} height={6} fill="#9aa1a9" />
              <text x={517} y={378} textAnchor="middle" fill="#9aa1a9" className="font-mono text-[6.5px]">AMS1117</text>
              <rect x={556} y={348} width={30} height={30} rx={2} fill="#0b0b0c" stroke="#2f3338" />
              {[0, 1, 2, 3, 4].map((i) => (
                <g key={i}>
                  <rect x={552} y={352 + i * 5.5} width={4} height={2} fill="#9aa1a9" />
                  <rect x={586} y={352 + i * 5.5} width={4} height={2} fill="#9aa1a9" />
                </g>
              ))}
              <text x={571} y={366} textAnchor="middle" fill="#6b7280" className="font-mono text-[6px]">CP2102</text>
              <circle cx={513} cy={404} r={4} fill="#ef4444" />
              <text x={523} y={407} fill="#cfd4da" className="font-mono text-[7.5px]">PWR</text>
              <circle cx={575} cy={404} r={4} fill={live ? "#3b82f6" : "#1e3a5f"}>
                {live ? <animate attributeName="opacity" values="1;0.15;1" dur="0.9s" repeatCount="indefinite" /> : null}
              </circle>
              <text x={585} y={407} fill="#cfd4da" className="font-mono text-[7.5px]">TX</text>
              <text x={550} y={440} textAnchor="middle" fill="#e5e7eb" className="font-mono text-[11px] font-bold tracking-wider">ESP32 DEVKIT</text>
              <text x={550} y={456} textAnchor="middle" fill={live ? "#4ade80" : online ? "#fbbf24" : "#f87171"} className="font-mono text-[9px]">
                {live ? `● sending · ${rssi} dBm` : online ? "● paused" : "● sensor offline"}
              </text>
              {[[502, "EN"], [580, "BOOT"]].map(([x, label]) => (
                <g key={label}>
                  <rect x={Number(x)} y={538} width={18} height={18} rx={3} fill="#d1d5db" stroke="#6b7280" />
                  <circle cx={Number(x) + 9} cy={547} r={5} fill="#111827" />
                  <text x={Number(x) + 9} y={566} textAnchor="middle" fill="#cfd4da" className="font-mono text-[7px]">{label}</text>
                </g>
              ))}
              <rect x={530} y={556} width={40} height={22} rx={3} fill="url(#iot-silver)" stroke="#6b7280" />
              <rect x={538} y={563} width={24} height={7} rx={2} fill="#4b5563" />
            </g>

            {/* ── Capacitive moisture sensor ───────────────────── */}
            <g {...part("moist")}>
              <polygon points="62,200 92,178 300,178 300,222 92,222" fill="#141414" stroke="#2f2f2f" strokeWidth={1.5} />
              <line x1={175} y1={180} x2={175} y2={220} stroke="#e5e7eb" strokeDasharray="3 3" opacity={0.6} />
              <text x={104} y={196} fill="#e5e7eb" className="font-mono text-[8px]">Capacitive Soil</text>
              <text x={104} y={208} fill="#e5e7eb" className="font-mono text-[8px]">Moisture v1.2</text>
              <rect x={240} y={190} width={22} height={20} rx={1.5} fill="#050505" stroke="#3a3a3a" />
              <text x={251} y={203} textAnchor="middle" fill="#6b7280" className="font-mono text-[5.5px]">555</text>
              {[188, 200, 212].map((y, i) => (
                <rect key={y} x={292} y={y - 3} width={10} height={6} fill={["#ef4444", "#64748b", "#eab308"][i]} />
              ))}
              <Readout x={62} y={232} w={168} label="SOIL" value={online && moisture !== null ? `${moisture.toFixed(1)} %` : "-- %"} tone={moisture !== null && moisture < AUTO_BELOW ? "warn" : "ok"} />
            </g>

            {/* ── 2-channel relay module ───────────────────────── */}
            <g {...part("relay")}>
              <rect x={110} y={320} width={230} height={134} rx={6} fill="#1d4f91" stroke="#163d70" strokeWidth={1.5} />
              {[0, 1].map((i) => (
                <g key={i}>
                  <rect x={130 + i * 80} y={332} width={70} height={62} rx={3} fill="url(#iot-relay)" stroke="#173f8a" />
                  <text x={165 + i * 80} y={356} textAnchor="middle" fill="#e0ecff" className="font-mono text-[7px]">SRD-05VDC</text>
                  <text x={165 + i * 80} y={368} textAnchor="middle" fill="#e0ecff" className="font-mono text-[7px]">-SL-C</text>
                  <text x={165 + i * 80} y={384} textAnchor="middle" fill="#e0ecff" className="font-mono text-[6.5px]">10A 250VAC</text>
                  {/* Status LED */}
                  <circle cx={165 + i * 80} cy={410} r={4.5} fill={(i === 0 ? pumpOn : motorOn) ? "#ef4444" : "#3f1d1d"} />
                  <text x={175 + i * 80} y={413} fill="#cfe0ff" className="font-mono text-[7.5px]">{i === 0 ? "CH1" : "CH2"}</text>
                  {/* Screw terminals NO · COM · NC */}
                  {[0, 1, 2].map((t) => (
                    <g key={t}>
                      <rect x={140 + i * 80 + t * 17} y={428} width={16} height={20} fill="#2f9e44" stroke="#22783a" />
                      <circle cx={148 + i * 80 + t * 17} cy={438} r={4} fill="#c9ced4" stroke="#7b838c" />
                      <line x1={145 + i * 80 + t * 17} y1={438} x2={151 + i * 80 + t * 17} y2={438} stroke="#5b636c" strokeWidth={1.2} />
                    </g>
                  ))}
                </g>
              ))}
              {["VCC", "IN1", "IN2", "GND"].map((label, i) => (
                <g key={label}>
                  <rect x={330} y={357 + i * 15} width={10} height={6} fill="#d4a72c" />
                  <text x={326} y={363 + i * 15} textAnchor="end" fill="#e0ecff" className="font-mono text-[7.5px]">{label}</text>
                </g>
              ))}
            </g>

            {/* ── Water pump ───────────────────────────────────── */}
            <g {...part("pump")}>
              <rect x={78} y={514} width={12} height={16} rx={2} fill="#d1d5db" />
              <rect x={136} y={514} width={12} height={16} rx={2} fill="#d1d5db" />
              <rect x={58} y={528} width={112} height={50} rx={12} fill="#1b1b1b" stroke={pumpOn ? "#38bdf8" : "#3a3a3a"} strokeWidth={2} />
              <text x={114} y={549} textAnchor="middle" fill="#e5e7eb" className="font-mono text-[9px] font-bold">12V PUMP</text>
              <text x={114} y={564} textAnchor="middle" fill={pumpOn ? "#38bdf8" : "#9ca3af"} className="font-mono text-[8px]">{pumpOn ? "SPRAYING" : "OFF"}</text>
              {pumpOn
                ? [0, 1, 2, 3].map((i) => (
                    <circle key={i} r={3} fill="#38bdf8">
                      <animate attributeName="cx" values="142;176" dur="0.9s" begin={`-${i * 0.22}s`} repeatCount="indefinite" />
                      <animate attributeName="cy" values="510;498;540" dur="0.9s" begin={`-${i * 0.22}s`} repeatCount="indefinite" />
                      <animate attributeName="opacity" values="1;1;0" dur="0.9s" begin={`-${i * 0.22}s`} repeatCount="indefinite" />
                    </circle>
                  ))
                : null}
            </g>

            {/* ── Mixer motor ──────────────────────────────────── */}
            <g {...part("motor")}>
              <rect x={222} y={528} width={98} height={60} rx={12} fill="url(#iot-motor)" stroke={motorOn ? "#22c55e" : "#6b7280"} strokeWidth={2} />
              <rect x={312} y={534} width={12} height={48} rx={4} fill="#4b5563" />
              <rect x={324} y={554} width={22} height={8} rx={2} fill="url(#iot-steel)" />
              <text x={268} y={556} textAnchor="middle" fill="#1f2937" className="font-mono text-[9px] font-bold">DC MOTOR</text>
              <text x={268} y={572} textAnchor="middle" fill={motorOn ? "#15803d" : "#374151"} className="font-mono text-[8px] font-bold">
                {motorOn ? `${m.rpm} RPM` : "STOPPED"}
              </text>
              <g transform="translate(362 558)">
                <g>
                  <circle r={17} fill="#374151" stroke="#9ca3af" strokeWidth={2} />
                  {[0, 90, 180, 270].map((a) => (
                    <rect key={a} x={-2.5} y={-15} width={5} height={13} rx={2} fill="#d1d5db" transform={`rotate(${a})`} />
                  ))}
                  <circle r={3.5} fill="#e5e7eb" />
                  {motorOn && running ? (
                    <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur={m.motor === "mixing" ? "0.5s" : "1.4s"} repeatCount="indefinite" />
                  ) : null}
                </g>
              </g>
            </g>

            {/* ── NPK probe + MAX485 ───────────────────────────── */}
            <g {...part("npk")}>
              {/* MAX485 RS485 converter */}
              <rect x={690} y={378} width={100} height={46} rx={4} fill="#1d4f91" stroke="#163d70" />
              <rect x={722} y={388} width={36} height={26} rx={2} fill="#0b0b0c" />
              {[0, 1, 2, 3].map((i) => (
                <g key={i}>
                  <rect x={725 + i * 8} y={385} width={3} height={4} fill="#9aa1a9" />
                  <rect x={725 + i * 8} y={413} width={3} height={4} fill="#9aa1a9" />
                </g>
              ))}
              <text x={740} y={404} textAnchor="middle" fill="#9ca3af" className="font-mono text-[6.5px]">MAX485</text>
              <text x={740} y={437} textAnchor="middle" className="fill-muted-foreground font-mono text-[8px]">RS485 ⇄ UART</text>
              {/* Probe housing + prongs */}
              <rect x={842} y={300} width={200} height={62} rx={10} fill="#141414" stroke="#2f2f2f" strokeWidth={1.5} />
              <text x={942} y={326} textAnchor="middle" fill="#e5e7eb" className="font-mono text-[11px] font-bold">NPK SENSOR</text>
              <text x={942} y={344} textAnchor="middle" fill="#9ca3af" className="font-mono text-[8px]">RS485 · Modbus RTU</text>
              {[882, 936, 990].map((x) => (
                <path key={x} d={`M${x} 362 h12 v92 l-6 16 l-6 -16 z`} fill="url(#iot-steel)" stroke="#6b737c" strokeWidth={0.8} />
              ))}
              <Readout x={850} y={482} w={190} label="NPK" value={online && npk ? `N${npk.n} P${npk.p} K${npk.k}` : "-- -- --"} />
            </g>

            {/* ── DS18B20 temperature probe ────────────────────── */}
            <g {...part("temp")}>
              {/* 4.7 kΩ pull-up between data and 3V3 */}
              <line x1={700} y1={472} x2={700} y2={466} stroke="#9ca3af" strokeWidth={1.5} />
              <line x1={700} y1={506} x2={700} y2={512} stroke="#9ca3af" strokeWidth={1.5} />
              <rect x={694} y={472} width={12} height={34} rx={5} fill="#e8d9b5" stroke="#b9a678" />
              {["#facc15", "#7c3aed", "#ef4444", "#d4a72c"].map((c, i) => (
                <rect key={c} x={694} y={477 + i * 7} width={12} height={3} fill={c} />
              ))}
              <text x={712} y={493} className="fill-muted-foreground font-mono text-[8px]">4.7kΩ</text>
              {/* Heat-shrink junction, cable, stainless tip */}
              <rect x={790} y={526} width={30} height={28} rx={5} fill="#111" stroke="#2f2f2f" />
              <path d="M820 540 C 845 540, 850 540, 880 540" stroke="#111" strokeWidth={8} strokeLinecap="round" fill="none" />
              <rect x={880} y={529} width={110} height={22} rx={11} fill="url(#iot-steel)" stroke="#6b737c" />
              <text x={935} y={544} textAnchor="middle" fill="#374151" className="font-mono text-[8px] font-bold">DS18B20</text>
              <Readout
                x={850}
                y={566}
                w={190}
                label="TEMP"
                value={`${m.temp.toFixed(1)} °C`}
                tone={m.temp > 72 ? "bad" : m.temp > 65 ? "warn" : "ok"}
              />
            </g>

            {/* ── Protocol tags ────────────────────────────────── */}
            <WireLabel x={385} y={244} text="ADC · D34" />
            <WireLabel x={396} y={462} text="D26 / D27 → IN1 / IN2" />
            <WireLabel x={740} y={366} text="UART2 · RX2/TX2" />
            <WireLabel x={738} y={456} text="1-Wire · D4" />
            <WireLabel x={612} y={142} text={online ? "Wi-Fi · HTTPS" : "No signal"} tone={online ? "default" : "bad"} />
            <WireLabel x={140} y={500} text="12 V" />
          </svg>
        </div>

        {/* ── Side panel ───────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <div className="rounded-lg bg-secondary/60 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Selected part</p>
            <p className="mt-1 font-medium">{info.name}</p>
            <dl className="mt-3 space-y-2 text-sm">
              <Detail label="Hardware">{info.part}</Detail>
              <Detail label="Connection">{info.link}</Detail>
              <Detail label="Job">{info.role}</Detail>
            </dl>
          </div>
          <div className="rounded-lg bg-secondary/60 p-4">
            <p className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Latest payload
              <span className={cn("normal-case tracking-normal", live ? "text-success" : "text-muted-foreground")}>
                {live ? "● live" : online ? "paused" : "offline"}
              </span>
            </p>
            <pre className="mt-2 max-h-60 overflow-auto text-[11px] leading-relaxed text-muted-foreground">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      {/* ── How it works ─────────────────────────────────────── */}
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((x, i) => (
          <li
            key={x.title}
            className={cn(
              "flex gap-2 rounded-lg border p-3 text-sm transition-colors",
              live && i === step ? "border-primary bg-primary/10" : "bg-background/40",
            )}
          >
            <span className={cn("mt-0.5", live && i === step ? "text-primary" : "text-muted-foreground")}>{x.icon}</span>
            <span>
              <span className="font-medium">
                {i + 1}. {x.title}
              </span>
              <span className="block text-xs text-muted-foreground">{x.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ── Board layout ────────────────────────────────────────────── */

// ESP32 DevKit V1 (30-pin) header order, top to bottom.
const LEFT_PINS = ["EN", "VP", "VN", "D34", "D35", "D32", "D33", "D25", "D26", "D27", "D14", "D12", "D13", "GND", "VIN"];
const RIGHT_PINS = ["D23", "D22", "TX0", "RX0", "D21", "D19", "D18", "D5", "TX2", "RX2", "D4", "D2", "D15", "GND", "3V3"];
const USED_PINS = new Set(["D34", "D26", "D27", "TX2", "RX2", "D4", "GND", "VIN", "3V3"]);
const pinY = (i: number) => 232 + i * 21;

// Jumper-wire colours (fixed, like real wires).
const WIRE = {
  red: "#ef4444",
  gnd: "#64748b",
  yellow: "#eab308",
  orange: "#f97316",
  blue: "#3b82f6",
  green: "#22c55e",
  teal: "#14b8a6",
  purple: "#a855f7",
};

// Outline drawn around the selected part.
const BOX: Record<PartId, { x: number; y: number; w: number; h: number }> = {
  npk: { x: 682, y: 292, w: 368, h: 222 },
  temp: { x: 686, y: 460, w: 362, h: 140 },
  moist: { x: 52, y: 170, w: 258, h: 102 },
  esp32: { x: 446, y: 138, w: 208, h: 448 },
  cloud: { x: 394, y: 14, w: 252, h: 104 },
  web: { x: 714, y: 8, w: 352, h: 122 },
  relay: { x: 102, y: 312, w: 246, h: 150 },
  pump: { x: 50, y: 492, w: 136, h: 94 },
  motor: { x: 214, y: 520, w: 172, h: 76 },
};

/* ── SVG helpers ─────────────────────────────────────────────── */

const readoutTone = { ok: "#4ade80", warn: "#fbbf24", bad: "#f87171" } as const;

/** Small LCD-style readout under a sensor. */
function Readout({
  x,
  y,
  w,
  label,
  value,
  tone = "ok",
}: {
  x: number;
  y: number;
  w: number;
  label: string;
  value: string;
  tone?: keyof typeof readoutTone;
}) {
  return (
    <g className="pointer-events-none">
      <rect x={x} y={y} width={w} height={28} rx={6} fill="#0b1220" stroke="#1f2a3a" />
      <text x={x + 10} y={y + 18} fill="#64748b" className="font-mono text-[9px]">{label}</text>
      <text x={x + w - 10} y={y + 19} textAnchor="end" fill={readoutTone[tone]} className="font-mono text-[13px] font-bold tabular-nums">
        {value}
      </text>
    </g>
  );
}

function WireLabel({ x, y, text, tone = "default" }: { x: number; y: number; text: string; tone?: "default" | "bad" }) {
  const w = text.length * 6 + 16;
  return (
    <g className="pointer-events-none">
      <rect x={x - w / 2} y={y - 12} width={w} height={18} rx={9} className="fill-card stroke-border" />
      <text x={x} y={y + 1} textAnchor="middle" className={cn("text-[10px]", tone === "bad" ? "fill-destructive" : "fill-muted-foreground")}>
        {text}
      </text>
    </g>
  );
}

function Packet({ path, dur, begin = "0s", tone = "data" }: { path: string; dur: string; begin?: string; tone?: "data" | "cmd" }) {
  return (
    <circle r={5} className={tone === "cmd" ? "fill-amber-500" : "fill-primary"}>
      <animateMotion dur={dur} begin={begin} repeatCount="indefinite">
        <mpath href={`#${path}`} />
      </animateMotion>
    </circle>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
