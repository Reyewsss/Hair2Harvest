// features/machine/data/machine-data.ts
import { useEffect, useState } from "react";

export type MotorState = "running" | "stopped" | "fault" | "overheating";
export type MachineHealth = "optimal" | "warning" | "critical";

export type SessionLog = {
  id: string;
  startTime: string;
  endTime: string | null;
  duration: string;
  operator: string;
  batchId: string;
  avgTemp: number;
};

export const initialSessionLogs: SessionLog[] = [
  {
    id: "SES-001",
    startTime: "2026-10-26 08:00 AM",
    endTime: "2026-10-26 10:30 AM",
    duration: "2h 30m",
    operator: "Vansh Patel",
    batchId: "CMP-2026-001",
    avgTemp: 48.5,
  },
  {
    id: "SES-002",
    startTime: "2026-10-25 01:00 PM",
    endTime: "2026-10-25 03:15 PM",
    duration: "2h 15m",
    operator: "Jane Doe",
    batchId: "CMP-2026-002",
    avgTemp: 52.1,
  },
];

// Hook to simulate live WebSocket data from the Microcontroller
export function useMachineTelemetry() {
  const [temperature, setTemperature] = useState(45.2);
  const [motorState, setMotorState] = useState<MotorState>("stopped");
  const [health, setHealth] = useState<MachineHealth>("optimal");

  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate temperature fluctuation
      setTemperature((prev) => {
        const newTemp = prev + (Math.random() * 2 - 1);
        if (newTemp > 60) {
          setMotorState("overheating");
          setHealth("critical");
          return 60;
        }
        if (newTemp > 55) setHealth("warning");
        else setHealth("optimal");
        return Number(newTemp.toFixed(1));
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return { temperature, motorState, setMotorState, health };
}
