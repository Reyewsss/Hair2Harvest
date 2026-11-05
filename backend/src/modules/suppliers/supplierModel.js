import mongoose from "mongoose";

const operatingHoursSchema = new mongoose.Schema(
  {
    days: { type: String, required: true, default: "Mon–Sat" },
    open: { type: String, required: true, default: "09:00" },
    close: { type: String, required: true, default: "20:00" },
  },
  { _id: false },
);

const supplierSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    shopCode: { type: String, required: true, unique: true, trim: true },
    shopName: { type: String, required: true, trim: true },
    owner: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    barangay: { type: String, required: true, trim: true, index: true },
    address: { type: String, required: true, trim: true },
    operatingHours: { type: operatingHoursSchema, required: true },
    pickupFrequency: {
      type: String,
      enum: ["weekly", "biweekly", "monthly"],
      default: "weekly",
    },
    weeklyVolumeKg: { type: Number, min: 0, default: 0 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    // 👇 REMOVED `required: true` so it can be null for candidates
    consentDocument: { type: String },
    hasConsent: { type: Boolean, default: false },

    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    remarks: { type: String, trim: true },
  },
  { timestamps: true },
);

supplierSchema.index({ barangay: 1, status: 1 });

const Supplier = mongoose.model("Supplier", supplierSchema);

export default Supplier;