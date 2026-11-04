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
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      index: true,
    },
    scheduledFor: { type: Date, required: true, index: true },
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

pickupSchema.index({ shop: 1, scheduledFor: -1 });

const Pickup = mongoose.model("Pickup", pickupSchema);

export default Pickup;
