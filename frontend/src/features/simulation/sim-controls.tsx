import { FlaskConical, FastForward, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { confirm } from "@/shared/ui/modal";
import { showResult } from "@/shared/ui/result-modal";
import { cn } from "@/lib/utils";
import { useCan } from "@/features/auth/access";
import { SPEEDS, formatSimTime, sim, useSimulation } from "./sim-store";

/** Simulation banner + clock controls, shared by the Machine and Compost pages. */
export function SimControls() {
  const s = useSimulation();
  const canControl = useCan("monitoring:control");

  // Staff watch the simulation but can't change it.
  if (!canControl) {
    return (
      <section className="flex items-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FlaskConical className="size-4.5" />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold">
            Simulation mode
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.7rem] font-medium",
                s.running ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground",
              )}
            >
              <span className={cn("size-1.5 rounded-full bg-current", s.running && "animate-pulse")} />
              {s.running ? "Running" : "Paused"}
            </span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[0.7rem] font-medium text-muted-foreground">View only</span>
          </p>
          <p className="text-xs text-muted-foreground">
            You can monitor the machines and batches. Starting, stopping and simulating is for admins and operators. Sim time:{" "}
            <span className="font-medium text-foreground tabular-nums">{formatSimTime(s.clock)}</span>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FlaskConical className="size-4.5" />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold">
            Simulation mode
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.7rem] font-medium",
                s.running ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground",
              )}
            >
              <span className={cn("size-1.5 rounded-full bg-current", s.running && "animate-pulse")} />
              {s.running ? "Running" : "Paused"}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            Test machines and batches only, saved in this browser. Sim time:{" "}
            <span className="font-medium text-foreground tabular-nums">{formatSimTime(s.clock)}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={s.running ? "secondary" : "default"}
          className="h-9 gap-1.5 px-3"
          onClick={() => (s.running ? sim.pause() : sim.play())}
        >
          {s.running ? <Pause className="size-4" /> : <Play className="size-4" />}
          {s.running ? "Pause" : "Play"}
        </Button>

        <div className="flex rounded-lg bg-secondary p-0.5" role="radiogroup" aria-label="Simulation speed">
          {SPEEDS.map((sp) => (
            <button
              key={sp.value}
              type="button"
              role="radio"
              aria-checked={s.speed === sp.value}
              onClick={() => sim.setSpeed(sp.value)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                s.speed === sp.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {sp.label}
            </button>
          ))}
        </div>

        <Button type="button" variant="outline" className="h-9 gap-1.5 px-3" onClick={() => sim.skip(3600)}>
          <FastForward className="size-4" /> +1 h
        </Button>
        <Button type="button" variant="outline" className="h-9 gap-1.5 px-3" onClick={() => sim.skip(86400)}>
          <FastForward className="size-4" /> +1 day
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-9 gap-1.5 px-3"
          onClick={() =>
            confirm({
              title: "Reset the simulation?",
              description: "All test machines, batches and sessions go back to the starting scenario.",
              confirmLabel: "Reset",
              cancelLabel: "Cancel",
              variant: "destructive",
              onConfirm: () => {
                sim.reset();
                showResult({ type: "info", title: "Simulation reset" });
              },
            })
          }
        >
          <RotateCcw className="size-4" /> Reset
        </Button>
      </div>
    </section>
  );
}
