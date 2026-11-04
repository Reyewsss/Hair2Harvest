import mongoose from "mongoose";

const treatmentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    kind: {
      type: String,
      enum: ["control", "hair-free", "hair-containing"],
      required: true,
    },
  },
  { _id: false },
);

const experimentSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    crop: { type: String, required: true, trim: true },
    setup: { type: String, required: true, trim: true },
    // Must reference a batch approved for supervised testing.
    batchCode: { type: String, required: true, index: true },
    startDate: { type: String, required: true },
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
    },
    treatments: { type: [treatmentSchema], required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const growthLogSchema = new mongoose.Schema(
  {
    experiment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Experiment",
      required: true,
      index: true,
    },
    date: { type: String, required: true },
    treatmentId: { type: String, required: true },
    heightCm: { type: Number, required: true, min: 0 },
    leafCount: { type: Number, required: true, min: 0 },
    health: {
      type: String,
      enum: ["poor", "fair", "good", "excellent"],
      required: true,
    },
    photo: { type: String, trim: true },
    note: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

growthLogSchema.index({ experiment: 1, date: 1 });

const Experiment = mongoose.model("Experiment", experimentSchema);
export const GrowthLog = mongoose.model("GrowthLog", growthLogSchema);

export default Experiment;
