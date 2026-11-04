import mongoose from "mongoose";

export const QUALITY_STATUSES = [
  "Pending",
  "On Hold",
  "Rejected",
  "Approved for Supervised Testing",
];

export const DEFAULT_CRITERIA = [
  { key: "nitrogen", label: "Nitrogen (N)", group: "nutrient", unit: "%", min: 1.0 },
  { key: "phosphorus", label: "Phosphorus (P)", group: "nutrient", unit: "%", min: 0.5 },
  { key: "potassium", label: "Potassium (K)", group: "nutrient", unit: "%", min: 0.8 },
  { key: "ph", label: "pH", group: "stability", min: 6.0, max: 8.0 },
  { key: "moisture", label: "Moisture", group: "stability", unit: "%", min: 30, max: 55 },
  { key: "maturity", label: "Maturity", group: "stability", equals: "mature" },
  { key: "cadmium", label: "Cadmium", group: "contaminant", unit: "mg/kg", max: 3, critical: true },
  { key: "lead", label: "Lead", group: "contaminant", unit: "mg/kg", max: 120, critical: true },
  { key: "arsenic", label: "Arsenic", group: "contaminant", unit: "mg/kg", max: 20, critical: true },
  { key: "mercury", label: "Mercury", group: "contaminant", unit: "mg/kg", max: 1, critical: true },
  { key: "eColi", label: "E. coli", group: "contaminant", unit: "CFU/g", max: 1000, critical: true },
  { key: "salmonella", label: "Salmonella", group: "contaminant", equals: "absent", critical: true },
];

const criterionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    group: {
      type: String,
      enum: ["nutrient", "stability", "contaminant"],
      required: true,
    },
    unit: { type: String },
    min: { type: Number },
    max: { type: Number },
    equals: { type: String },
    critical: { type: Boolean, default: false },
  },
  { _id: false },
);

const thresholdSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: "default", unique: true },
    criteria: { type: [criterionSchema], required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const decisionSchema = new mongoose.Schema(
  {
    batchCode: { type: String, required: true, unique: true, trim: true },
    status: { type: String, enum: QUALITY_STATUSES, required: true },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    decidedAt: { type: Date, default: Date.now },
    remarks: { type: String, trim: true },
  },
  { timestamps: true },
);

// Append-only: entries are never updated or deleted.
const statusHistorySchema = new mongoose.Schema(
  {
    batchCode: { type: String, required: true, index: true },
    previous: { type: String, enum: QUALITY_STATUSES, required: true },
    status: { type: String, enum: QUALITY_STATUSES, required: true },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    decidedAt: { type: Date, default: Date.now },
    remarks: { type: String, trim: true },
  },
  { timestamps: true },
);

export const QualityThreshold = mongoose.model("QualityThreshold", thresholdSchema);
export const QualityDecision = mongoose.model("QualityDecision", decisionSchema);
export const QualityStatusHistory = mongoose.model(
  "QualityStatusHistory",
  statusHistorySchema,
);
