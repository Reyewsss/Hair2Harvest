// features/machine/components/machine-content.tsx
import { useState } from "react";
import {
  AlertTriangle,
  Play,
  RotateCcw,
  ShieldAlert,
  Square,
  Thermometer,
  Activity,
  Download,
  X,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import {
  useMachineTelemetry,
  initialSessionLogs,
} from "../data/machine-data.tsx";

export function MachineContent() {
  const { temperature, motorState, setMotorState, health } =
    useMachineTelemetry();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "start" | "stop" | "mix" | null
  >(null);

  const openConfirmation = (action: "start" | "stop" | "mix") => {
    setPendingAction(action);
    setIsModalOpen(true);
  };

  const handleConfirmAction = () => {
    if (pendingAction === "start") setMotorState("running");
    if (pendingAction === "stop") setMotorState("stopped");
    if (pendingAction === "mix") {
      setMotorState("running");
      // In a real app, you'd send a specific "Mix Cycle" command via WebSocket
    }
    setIsModalOpen(false);
    setPendingAction(null);
  };

  const getHealthColor = () => {
    if (health === "critical") return "text-destructive";
    if (health === "warning") return "text-amber-500";
    return "text-success";
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-8 pb-10 md:px-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">
            Machine Control: Composter A-1
          </h1>
          <p className="text-lg text-muted-foreground">
            Live telemetry and authorized session management.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className={`flex items-center gap-1 ${getHealthColor()}`}>
            <Activity className="size-4" /> System: {health.toUpperCase()}
          </span>
        </div>
      </div>

      {/* ALERTS BANNER */}
      {health === "critical" && (
        <div className="flex items-center gap-3 rounded-lg bg-destructive/10 p-4 text-destructive border border-destructive/20 animate-pulse">
          <AlertTriangle className="size-5" />
          <div>
            <p className="font-semibold">Overheating Alert</p>
            <p className="text-sm">
              Temperature exceeded safe limits. Motor automatically shut off by
              local hardware.
            </p>
          </div>
        </div>
      )}

      {/* DASHBOARD CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Temperature Card */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-muted-foreground">
              Core Temp
            </p>
            <Thermometer className="size-4 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p
              className={`text-3xl font-bold ${temperature > 55 ? "text-destructive" : ""}`}
            >
              {temperature}°C
            </p>
            <p className="text-xs text-muted-foreground">Live from sensor</p>
          </div>
        </div>

        {/* Motor State Card */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-muted-foreground">
              Motor State
            </p>
            <RotateCcw
              className={`size-4 ${motorState === "running" ? "animate-spin text-primary" : ""}`}
            />
          </div>
          <div className="space-y-1">
            <p
              className={`text-3xl font-bold capitalize ${motorState === "running" ? "text-primary" : ""}`}
            >
              {motorState}
            </p>
            <p className="text-xs text-muted-foreground">Interlock: Engaged</p>
          </div>
        </div>

        {/* Hardware Status */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-muted-foreground">
              Lid Status
            </p>
            <ShieldAlert className="size-4 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-success">Closed</p>
            <p className="text-xs text-muted-foreground">Safety lock active</p>
          </div>
        </div>

        {/* Connection Status */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-muted-foreground">
              Controller
            </p>
            <Activity className="size-4 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-primary">Online</p>
            <p className="text-xs text-muted-foreground">WebSocket Connected</p>
          </div>
        </div>
      </div>

      {/* CONTROL PANEL
      <div className="rounded-xl border bg-card p-6 flex flex-col gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-medium">Authorized Controls</h2>
          <p className="text-sm text-muted-foreground">
            Actions require confirmation. Emergency stops must be executed
            physically at the machine.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => openConfirmation("start")}
            disabled={motorState === "running"}
            className="gap-2 bg-success hover:bg-success/90 text-success-foreground"
          >
            <Play className="size-4" /> Start Motor
          </Button>

          <Button
            onClick={() => openConfirmation("stop")}
            disabled={motorState === "stopped"}
            variant="destructive"
            className="gap-2"
          >
            <Square className="size-4" /> Stop Motor
          </Button>

          <Button
            onClick={() => openConfirmation("mix")}
            variant="secondary"
            className="gap-2"
          >
            <RotateCcw className="size-4" /> Run Mixing Cycle
          </Button>
        </div>
      </div> */}

      {/* SESSION LOGS */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-medium">Session History</h2>
            <p className="text-sm text-muted-foreground">
              Log of all machine operations.
            </p>
          </div>
          <Button variant="outline" className="gap-2">
            <Download className="size-4" /> Export CSV
          </Button>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session ID</TableHead>
                <TableHead>Batch ID</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Avg Temp</TableHead>
                <TableHead>Operator</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialSessionLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.id}</TableCell>
                  <TableCell>{log.batchId}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {log.startTime}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {log.endTime || "Active"}
                  </TableCell>
                  <TableCell>{log.duration}</TableCell>
                  <TableCell>{log.avgTemp}°C</TableCell>
                  <TableCell>{log.operator}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* 👇 CUSTOM MODAL OVERLAY 👇 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Confirm Machine Action</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to send the{" "}
              <strong className="text-foreground">{pendingAction}</strong>{" "}
              command to Composter A-1? This will be logged under your operator
              ID.
            </p>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmAction}>
                Confirm {pendingAction}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
