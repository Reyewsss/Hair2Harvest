// features/composting/components/composting-content.tsx
import { useState } from "react";
import {
  Plus,
  Activity,
  Scale,
  Droplets,
  History,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/shared/ui/button.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table.tsx";

import {
  STAGES,
  initialBatches,
  mockRawHairInventory,
  mockRecipeVersions,
} from "../data/composting-data";

import type { CompostBatch } from "../data/composting-data";

export function CompostingContent() {
  const [batches, setBatches] = useState<CompostBatch[]>(initialBatches);
  const [hairInventory, setHairInventory] = useState(mockRawHairInventory);
  const [isCreating, setIsCreating] = useState(false);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(
    initialBatches.length > 0 ? initialBatches[0].id : null,
  );

  // Form State
  const [formData, setFormData] = useState({
    recipe: mockRecipeVersions[0],
    hairAmount: 100,
    machine: "Composter A-1",
  });

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.hairAmount > hairInventory) {
      alert("Not enough raw hair in inventory!");
      return;
    }

    const newBatch: CompostBatch = {
      id: `CMP-2026-${String(batches.length + 1).padStart(3, "0")}`, // Made ID generation safer
      recipeVersion: formData.recipe.split(" ")[0],
      operator: "Current User",
      machine: formData.machine,
      initialWeight: formData.hairAmount,
      currentWeight: formData.hairAmount,
      currentMoisture: 50,
      stage: "preparation",
      createdAt: new Date().toISOString().split("T")[0],
    };

    setBatches([newBatch, ...batches]);
    setHairInventory((prev) => prev - formData.hairAmount);
    setActiveBatchId(newBatch.id);
    setIsCreating(false);
  };

  const activeBatch =
    batches.find((b) => b.id === activeBatchId) || batches[0] || null;

  const currentStageIndex = activeBatch
    ? STAGES.indexOf(activeBatch.stage)
    : -1;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-8 pb-10 md:px-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Composting Operations</h1>
          <p className="text-lg text-muted-foreground">
            Manage recipes, track batch life-cycles, and log environmental data.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-muted-foreground">
              Raw Hair Inventory
            </p>
            <p className="text-xl font-semibold">{hairInventory} kg</p>
          </div>
          <Button onClick={() => setIsCreating(!isCreating)} className="gap-2">
            <Plus className="size-4" /> New Batch
          </Button>
        </div>
      </div>

      {/* CREATE BATCH FORM */}
      {isCreating && (
        <section className="rounded-xl border bg-card p-6 shadow-sm animate-in fade-in slide-in-from-top-4">
          <h2 className="text-lg font-medium mb-4">Initialize New Batch</h2>
          <form
            onSubmit={handleCreateBatch}
            className="grid gap-4 sm:grid-cols-3"
          >
            <div>
              <label className="block text-sm font-medium mb-1">
                Recipe Version
              </label>
              <select
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                value={formData.recipe}
                onChange={(e) =>
                  setFormData({ ...formData, recipe: e.target.value })
                }
              >
                {mockRecipeVersions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Hair Material (kg)
              </label>
              <input
                type="number"
                required
                min="1"
                max={hairInventory}
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                value={formData.hairAmount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    hairAmount: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Assign Machine
              </label>
              <select
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                value={formData.machine}
                onChange={(e) =>
                  setFormData({ ...formData, machine: e.target.value })
                }
              >
                <option>Composter A-1</option>
                <option>Composter B-2</option>
              </select>
            </div>
            <div className="sm:col-span-3 flex justify-end gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreating(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Start Batch & Deduct Inventory</Button>
            </div>
          </form>
        </section>
      )}

      {/* ACTIVE BATCH TRACKER */}
      {activeBatch ? (
        <section className="rounded-xl border bg-card p-6 flex flex-col gap-8">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-xl font-semibold">
                Active Batch: {activeBatch.id}
              </h2>
              <p className="text-sm text-muted-foreground">
                Operator: {activeBatch.operator} | Machine:{" "}
                {activeBatch.machine}
              </p>
            </div>
            <div className="flex gap-6 text-right">
              <div>
                <p className="text-xs text-muted-foreground">Current Weight</p>
                <p className="font-semibold flex items-center gap-1 justify-end">
                  <Scale className="size-3" /> {activeBatch.currentWeight} kg
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Moisture</p>
                <p className="font-semibold flex items-center gap-1 justify-end">
                  <Droplets className="size-3" /> {activeBatch.currentMoisture}%
                </p>
              </div>
            </div>
          </div>

          {/* STAGE TIMELINE */}
          <div className="relative flex justify-between">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-secondary -z-10 -translate-y-1/2 rounded-full" />
            <div
              className="absolute top-1/2 left-0 h-1 bg-primary -z-10 -translate-y-1/2 rounded-full transition-all duration-500"
              style={{
                width: `${(currentStageIndex / (STAGES.length - 1)) * 100}%`,
              }}
            />
            {STAGES.map((stage, idx) => {
              const isCompleted = idx <= currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              return (
                <div
                  key={stage}
                  className="flex flex-col items-center gap-2 bg-card px-2"
                >
                  <div
                    className={`size-6 rounded-full border-2 flex items-center justify-center ${
                      isCompleted
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-background border-muted text-muted-foreground"
                    } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}
                  >
                    {isCompleted && <CheckCircle2 className="size-4" />}
                  </div>
                  <span
                    className={`text-xs font-medium capitalize ${isCurrent ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {stage}
                  </span>
                </div>
              );
            })}
          </div>

          {/* LOGS TABLE */}
          <div>
            <h3 className="text-md font-medium mb-3 flex items-center gap-2">
              <Activity className="size-4" /> Environmental Logs
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Temp (°C)</TableHead>
                  <TableHead>Weight (kg)</TableHead>
                  <TableHead>Moisture (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Today, 08:00 AM</TableCell>
                  <TableCell className="font-medium">
                    Mixing / Turning
                  </TableCell>
                  <TableCell>45.2</TableCell>
                  <TableCell>{activeBatch.currentWeight}</TableCell>
                  <TableCell>{activeBatch.currentMoisture}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Yesterday, 04:00 PM</TableCell>
                  <TableCell className="text-muted-foreground">
                    Temperature Log
                  </TableCell>
                  <TableCell>52.1</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </section>
      ) : (
        <div className="text-center py-12 text-muted-foreground border rounded-xl border-dashed">
          No active batches found. Create a new batch to get started.
        </div>
      )}

      {/* BATCH COMPARISON & HISTORY */}
      <section className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
          <History className="size-5" /> Batch History
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch ID</TableHead>
              <TableHead>Recipe</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Initial Weight</TableHead>
              <TableHead>Current Stage</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.map((batch) => (
              <TableRow
                key={batch.id}
                className={batch.id === activeBatchId ? "bg-muted/50" : ""}
              >
                <TableCell className="font-medium">{batch.id}</TableCell>
                <TableCell>{batch.recipeVersion}</TableCell>
                <TableCell>{batch.createdAt}</TableCell>
                <TableCell>{batch.initialWeight} kg</TableCell>
                <TableCell>
                  <span className="inline-flex capitalize items-center rounded-xl bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
                    {batch.stage}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveBatchId(batch.id)}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
