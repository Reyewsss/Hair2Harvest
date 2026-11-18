import mongoose from "mongoose";

const weightLogSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    type: { type: String, enum: ["in", "rejected", "processed"], required: true },
     sacks: { type: Number, min: 0, default: 0 },
    shopId: { type: String }, // e.g., "S-01"
    pickupId: { type: String }, // e.g., "PICK-2026-001"
    batchId: { type: String },
    reason: { type: String },
    note: { type: String },
    photoUrl: { type: String }, // Proof of collection
  },
  { timestamps: true }
);

export const WeightLog = mongoose.models.WeightLog || mongoose.model("WeightLog", weightLogSchema);