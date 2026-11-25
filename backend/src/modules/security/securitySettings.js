import mongoose from "mongoose";

// Every security parameter an administrator can change. `min`/`max` are enforced on save so a
// bad value can't lock everyone out. The defaults apply until a Super Admin saves something.
export const FIELDS = {
  loginMaxAttempts: { type: "int", min: 3, max: 20, default: 5 },
  loginLockoutSeconds: { type: "int", min: 10, max: 86400, default: 60 },
  passwordMinLength: { type: "int", min: 8, max: 64, default: 8 },
  passwordRequireMixedCase: { type: "bool", default: true },
  passwordRequireNumber: { type: "bool", default: true },
  passwordRequireSymbol: { type: "bool", default: false },
  otpTtlMinutes: { type: "int", min: 1, max: 60, default: 10 },
  otpMaxAttempts: { type: "int", min: 3, max: 10, default: 5 },
  otpResendSeconds: { type: "int", min: 15, max: 600, default: 60 },
  staffRequiresOtp: { type: "bool", default: false },
  sessionHours: { type: "int", min: 1, max: 72, default: 8 },
  rememberMeDays: { type: "int", min: 1, max: 90, default: 30 },
};

export const DEFAULTS = Object.fromEntries(Object.entries(FIELDS).map(([k, f]) => [k, f.default]));

const schema = new mongoose.Schema(
  {
    key: { type: String, default: "security", unique: true },
    values: { type: mongoose.Schema.Types.Mixed, default: {} },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);
const Settings = mongoose.models.SecuritySettings || mongoose.model("SecuritySettings", schema);

// Returns { values } (only known keys) or { error }.
export function validate(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { error: "Send the settings as an object." };
  const values = {};
  for (const [key, raw] of Object.entries(input)) {
    const field = FIELDS[key];
    if (!field) return { error: `Unknown setting: ${key}.` };
    if (field.type === "bool") {
      if (typeof raw !== "boolean") return { error: `${key} must be true or false.` };
    } else if (!Number.isInteger(raw) || raw < field.min || raw > field.max) {
      return { error: `${key} must be a whole number from ${field.min} to ${field.max}.` };
    }
    values[key] = raw;
  }
  return { values };
}

// Cross-field rule: a remembered session has to outlast a normal one.
const crossCheck = (v) =>
  v.rememberMeDays * 24 <= v.sessionHours ? "Remember-me must last longer than a normal session." : null;

let cache = { ...DEFAULTS };
let loadedAt = 0;
const TTL_MS = 10_000; // other server instances pick up a change within this window

/** Synchronous read of the settings currently being enforced. */
export const current = () => cache;

/** Reloads from the database when the cached copy is stale. Called on every API request. */
export async function refreshSettings(force = false) {
  if (!force && Date.now() - loadedAt < TTL_MS) return cache;
  const doc = await Settings.findOne({ key: "security" }).lean();
  cache = { ...DEFAULTS, ...(doc?.values ?? {}) };
  loadedAt = Date.now();
  return cache;
}

/** Validates and saves a partial update. Returns { before, after } or { error }. */
export async function saveSettings(patch, userId) {
  const { values, error } = validate(patch);
  if (error) return { error };
  const before = await refreshSettings(true);
  const after = { ...before, ...values };
  const conflict = crossCheck(after);
  if (conflict) return { error: conflict };

  await Settings.updateOne({ key: "security" }, { $set: { values: after, updatedBy: userId } }, { upsert: true });
  cache = after;
  loadedAt = Date.now();
  return { before, after };
}
