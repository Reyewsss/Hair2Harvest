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

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: "intern", required: true },
    isActive: { type: Boolean, default: true },
    // Raised on password reset, role change or deactivation to sign the user out everywhere.
    tokenVersion: { type: Number, default: 0 },
    otp: { type: otpSchema, select: false },
    lastLoginAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

userSchema.pre("save", async function () {
  if (this.isModified("password")) this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(String(plain), this.password);
};

userSchema.methods.toSafeJSON = function () {
  return {
    id: this.id,
    name: this.name,
    email: this.email,
    role: this.role,
    isActive: this.isActive,
    lastLoginAt: this.lastLoginAt ?? null,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.models.User || mongoose.model("User", userSchema);