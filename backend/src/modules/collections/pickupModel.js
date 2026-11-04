import mongoose from "mongoose";

export const PICKUP_STAGES = [
  "scheduled",
  "collected",
  "inspected",
  "weighed",
  "delivered",
];

const pickupSchema = new mongoose.Schema(
  {
    // Human-readable identifier shown in the UI (P-0001).
    code: { type: String, required: true, unique: true, trim: true },
    // Business key of the supplier (S-01, S-02, ...) shared across modules.
    supplierCode: { type: String, required: true, trim: true, index: true },
    // Calendar date and time as strings so the UI and API agree without time zones.
    date: { type: String, required: true, index: true },
    time: { type: String, default: "10:00" },
    recurrence: {
      type: String,
      enum: ["none", "weekly", "biweekly", "monthly"],
      default: "none",
    },
    stage: {
      type: String,
      enum: PICKUP_STAGES,
      default: "scheduled",
      index: true,
    },
    estimatedWeightKg: { type: Number, min: 0, default: 0 },
    weightKg: { type: Number, min: 0 },
    // Links the delivered hair to a composting batch owned by the batch module.
    batchCode: { type: String, trim: true, index: true },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

pickupSchema.index({ supplierCode: 1, date: -1 });

const Pickup = mongoose.model("Pickup", pickupSchema);

export default Pickup;
