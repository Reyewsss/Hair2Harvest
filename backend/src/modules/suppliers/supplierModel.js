import mongoose from "mongoose";

const operatingHoursSchema = new mongoose.Schema(
  {
    days: { type: String, required: true, default: "Mon–Sat" },
    open: { type: String, required: true, default: "09:00" },
    close: { type: String, required: true, default: "20:00" },
  },
  { _id: false },
);

const consentSchema = new mongoose.Schema(
  {
    agreed: { type: Boolean, required: true },
    agreedBy: { type: String, required: true },
    agreedAt: { type: Date, required: true },
    version: { type: String, required: true },
    document: { type: String },
  },
  { _id: false },
);

const supplierSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    shopCode: { type: String, required: true, unique: true, trim: true },

    // ─── Identity ──────────────────────────────────────────────────────
    shopName: { type: String, required: true, trim: true },
    
    // 👇 Split names
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    
    // Keep `owner` for backward compatibility (it will be set by combining first + last)
    owner: { type: String, required: true, trim: true },
    
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },

    // ─── Location ─────────────────────────────────────────────────────
    barangay: { type: String, required: true, trim: true, index: true },
    street: { type: String, trim: true },
    unit: { type: String, trim: true },
    lat: { type: Number },
    lng: { type: Number },
    // true when no real location was found and the pin is the barangay centre
    pinApproximate: { type: Boolean, default: false },

    // ─── Operations ────────────────────────────────────────────────────
    operatingHours: { type: operatingHoursSchema, required: true },
    pickupFrequency: {
      type: String,
      enum: ["weekly", "biweekly", "monthly"],
      default: "weekly",
    },
    weeklyVolumeKg: { type: Number, min: 0, default: 0 },

    // ─── Verification & consent ────────────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    registrationSource: {
      type: String,
      enum: ["admin", "self", "web"],
      required: true,
    },
    consent: { type: consentSchema, required: true },

    // ─── Review metadata ───────────────────────────────────────────────
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    remarks: { type: String, trim: true },
    lastReminder: {
      at: { type: String },
      message: { type: String },
    },
  },
  { timestamps: true },
);

// Pre-save hook to keep `owner` in sync with firstName + lastName
supplierSchema.pre("save", function () {
  if (this.isModified("firstName") || this.isModified("lastName")) {
    this.owner = `${this.firstName} ${this.lastName}`.trim();
  }
});

supplierSchema.index({ status: 1, createdAt: -1 });

const Supplier = mongoose.model("Supplier", supplierSchema);

export default Supplier;