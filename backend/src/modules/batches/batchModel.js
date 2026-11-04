import mongoose from "mongoose";

/* Read-only reference data for the DOMER modules. The Batch & Composting
   module owns batch creation, recipes and machine telemetry. */

export const BATCH_STAGES = [
  "preparation",
  "composting",
  "curing",
  "sampling",
  "quality review",
  "completed",
];

const batchSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    recipeVersion: { type: String, required: true, trim: true },
    operator: { type: String, required: true, trim: true },
    machine: { type: String, required: true, trim: true },
    startedAt: { type: String, required: true },
    stage: { type: String, enum: BATCH_STAGES, default: "preparation" },
    // Suppliers whose hair went into this batch.
    supplierCodes: { type: [String], default: [] },
  },
  { timestamps: true },
);

const Batch = mongoose.model("Batch", batchSchema);

export default Batch;
