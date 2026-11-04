import mongoose from "mongoose";

const valuesSchema = new mongoose.Schema(
  {
    nitrogen: { type: Number, required: true, min: 0 },
    phosphorus: { type: Number, required: true, min: 0 },
    potassium: { type: Number, required: true, min: 0 },
    ph: { type: Number, required: true, min: 0, max: 14 },
    moisture: { type: Number, required: true, min: 0, max: 100 },
    maturity: {
      type: String,
      enum: ["immature", "semi-mature", "mature"],
      required: true,
    },
    cadmium: { type: Number, required: true, min: 0 },
    lead: { type: Number, required: true, min: 0 },
    arsenic: { type: Number, required: true, min: 0 },
    mercury: { type: Number, required: true, min: 0 },
    eColi: { type: Number, required: true, min: 0 },
    salmonella: {
      type: String,
      enum: ["absent", "present"],
      required: true,
    },
  },
  { _id: false },
);

const attachmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    kind: { type: String, enum: ["pdf", "image"], required: true },
    sizeKb: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
);

const labResultSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    batchCode: { type: String, required: true, trim: true, index: true },
    version: { type: Number, required: true, min: 1 },
    labName: { type: String, required: true, trim: true },
    method: { type: String, required: true, trim: true },
    sampledAt: { type: String, required: true },
    receivedAt: { type: String, required: true, index: true },
    values: { type: valuesSchema, required: true },
    attachment: { type: attachmentSchema },
    notes: { type: String, trim: true },
    enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// A batch can only have one result per version.
labResultSchema.index({ batchCode: 1, version: 1 }, { unique: true });

const LabResult = mongoose.model("LabResult", labResultSchema);

export default LabResult;
