import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { ROLES } from "./utils/permissions.js";

const otpSchema = new mongoose.Schema(
  {
    hash: String,
    purpose: { type: String, enum: ["login", "reset"] },
    expiresAt: Date,
    attempts: { type: Number, default: 0 },
    sentAt: Date,
  },
  { _id: false },
);

const failedLoginSchema = new mongoose.Schema(
  { at: Date, ip: String, userAgent: String },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    // Derived: kept so existing readers (audit logs, populate, etc.) keep working.
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    // Optional PH mobile number; used to text a staff member their pickup assignments.
    phone: { type: String, trim: true },
    // Optional second address for pickup / collection reminders (falls back to the login email).
    notifyEmail: { type: String, lowercase: true, trim: true },
    // Optional staff ID (private file reference; never sent to the browser as-is).
    idDocument: { type: String },
    role: { type: String, enum: ROLES, default: "staff", required: true },
    isActive: { type: Boolean, default: true },
    // Raised on password reset, role change or deactivation to sign the user out everywhere.
    tokenVersion: { type: Number, default: 0 },
    otp: { type: otpSchema, select: false },
    lastLoginAt: Date,
    // Login lockout: failed password attempts since the last success/lockout.
    failedAttempts: { type: Number, default: 0 },
    lockUntil: Date,
    failedLogins: { type: [failedLoginSchema], select: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Keep `name` in sync with the two split fields. Also backfills the split
// fields for legacy documents that only have `name`.
userSchema.pre("validate", function () {
  if (this.firstName && this.lastName) {
    this.name = `${this.firstName} ${this.lastName}`.trim();
  } else if (this.name) {
    const [first, ...rest] = String(this.name).trim().split(/\s+/);
    if (!this.firstName) this.firstName = first || "";
    if (!this.lastName) this.lastName = rest.join(" ");
    this.name = `${this.firstName} ${this.lastName}`.trim();
  }
});

userSchema.pre("save", async function () {
  if (this.isModified("password")) this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(String(plain), this.password);
};

userSchema.methods.toSafeJSON = function () {
  return {
    id: this.id,
    firstName: this.firstName,
    lastName: this.lastName,
    name: this.name,
    email: this.email,
    phone: this.phone ?? "",
    notifyEmail: this.notifyEmail ?? "",
    hasIdDocument: Boolean(this.idDocument),
    role: this.role,
    isActive: this.isActive,
    lastLoginAt: this.lastLoginAt ?? null,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.models.User || mongoose.model("User", userSchema);