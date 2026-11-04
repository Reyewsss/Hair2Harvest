import mongoose from "mongoose";

export const REJECT_REASONS = [
  "chemicals",
  "contaminated",
  "too-short",
  "mixed-waste",
  "wet",
  "other",
];

const weightLogSchema = new mongoose.Schema(
  {
    // Human-readable identifier shown in the UI (L-0001 / R-0001).
    code: { type: String, required: true, unique: true, trim: true },
    supplierCode: { type: String, required: true, trim: true, index: true },
    pickupCode: { type: String, trim: true },
    date: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["in", "rejected", "processed"],
      required: true,
      index: true,
    },
    weightKg: { type: Number, required: true, min: 0 },
    batchCode: { type: String, trim: true, index: true },
    // Only set for rejected material.
    reason: { type: String, enum: REJECT_REASONS },
    note: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

weightLogSchema.index({ date: -1, type: 1 });

const WeightLog = mongoose.model("WeightLog", weightLogSchema);

export default WeightLog;
