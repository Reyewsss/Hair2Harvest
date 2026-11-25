import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Audit from "../audit/auditModel.js";
import { recordAudit } from "../audit/auditController.js";
import { current } from "../security/securitySettings.js";
import { validatePassword } from "./utils/passwordPolicy.js";
import { COOKIE_NAME, generateTokenAndSetCookie } from "./utils/generateTokenAndSetCookie.js";

// Self-service endpoints for the signed-in user (req.user comes from verifyToken).
// Role, email and active status are deliberately not editable here; admins manage those.

const cleanName = (value) => String(value ?? "").trim().replace(/\s+/g, " ");

/** PATCH /auth/profile  { firstName, lastName } */
export const updateProfile = async (req, res) => {
  const firstName = cleanName(req.body?.firstName);
  const lastName = cleanName(req.body?.lastName);
  if (!firstName) return res.status(400).json({ message: "Enter a first name." });
  if (!lastName) return res.status(400).json({ message: "Enter a last name." });
  if (firstName.length > 50 || lastName.length > 50) {
    return res.status(400).json({ message: "Names must be 50 characters or fewer." });
  }

  const user = req.user;
  const before = user.name;
  user.firstName = firstName;
  user.lastName = lastName; // `name` is re-derived in the model's pre-validate hook
  await user.save();

  if (before !== user.name) {
    await recordAudit({
      req,
      action: "profile-update",
      module: "auth",
      item: user.email,
      itemId: user._id.toString(),
      remarks: `Name changed from "${before}" to "${user.name}"`,
    });
  }
  res.json({ user: user.toSafeJSON() });
};

// A remember-me token lives for days; a normal one for SESSION_HOURS. Keep whichever the user chose.
function sessionWasRemembered(req) {
  try {
    const { iat, exp } = jwt.decode(req.cookies?.[COOKIE_NAME]) ?? {};
    const sessionSeconds = current().sessionHours * 3600;
    return Boolean(iat && exp && exp - iat > sessionSeconds);
  } catch {
    return false;
  }
}

/** POST /auth/change-password  { currentPassword, newPassword } */
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (typeof currentPassword !== "string" || !currentPassword) {
    return res.status(400).json({ message: "Enter your current password." });
  }
  const problem = validatePassword(newPassword);
  if (problem) return res.status(400).json({ message: problem });
  if (newPassword === currentPassword) {
    return res.status(400).json({ message: "Choose a password you aren't already using." });
  }

  const user = await req.user.constructor.findById(req.user._id).select("+password");
  if (!(await bcrypt.compare(currentPassword, user.password))) {
    return res.status(400).json({ message: "Your current password is incorrect." });
  }

  user.password = newPassword;
  user.tokenVersion += 1; // signs out every other device...
  await user.save();
  generateTokenAndSetCookie(res, user, sessionWasRemembered(req)); // ...but keeps this one signed in

  await recordAudit({
    req,
    action: "password-change",
    module: "auth",
    item: user.email,
    itemId: user._id.toString(),
    remarks: "Password changed from profile; other sessions signed out",
  });
  res.json({ message: "Password updated." });
};

/** GET /auth/activity — the signed-in user's 10 most recent audit entries. */
export const myActivity = async (req, res) => {
  const entries = await Audit.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .select("action module item remarks createdAt")
    .lean();
  res.json({ entries });
};
