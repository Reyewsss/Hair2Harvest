import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "./authModel.js";
import { sendFailedAttemptsEmail, sendOtpEmail } from "./mailConfig/email.js";
import { OTP_ROLES } from "./utils/permissions.js";
import { EMAIL_RE, validatePassword } from "./utils/passwordPolicy.js";
import { current } from "../security/securitySettings.js";
import { canSendOtp, checkOtp, issueOtp } from "./utils/otp.js";
import {
  clearAuthCookie,
  generateTokenAndSetCookie,
  signResetToken,
} from "./utils/generateTokenAndSetCookie.js";
import { recordAudit } from "../audit/auditController.js";

// Compared against when the email is unknown, so timing doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

const clean = (value) => String(value ?? "").trim().toLowerCase();
const PURPOSES = ["login", "reset"];

// Sends a fresh code unless one went out less than a minute ago.
async function sendCode(user, purpose) {
  if (!canSendOtp(user, purpose)) return;
  const code = await issueOtp(user, purpose);
  await sendOtpEmail({ to: user.email, name: user.name, code, purpose });
}

// ✅ Successful login — logs the event, then issues the cookie.
const finishLogin = async (req, res, user, remember) => {
  user.lastLoginAt = new Date();
  user.failedAttempts = 0;
  user.lockUntil = undefined;
  user.failedLogins = [];
  await user.save();
  generateTokenAndSetCookie(res, user, remember);

  await recordAudit({
    req,
    actor: { name: user.name, _id: user._id },
    action: "login",
    module: "auth",
    item: user.email,
    itemId: user._id.toString(),
    remarks: `Signed in as ${user.role}`,
  });

  return res.json({ user: user.toSafeJSON() });
};

// Counts a wrong password; at the limit, locks the account and emails the recent attempts.
async function registerFailure(req, res, user) {
  const maxAttempts = current().loginMaxAttempts;
  const lockoutMs = current().loginLockoutSeconds * 1000;
  const entry = { at: new Date(), ip: req.ip, userAgent: String(req.get("user-agent") ?? "").slice(0, 200) };
  const updated = await User.findByIdAndUpdate(
    user._id,
    { $inc: { failedAttempts: 1 }, $push: { failedLogins: { $each: [entry], $slice: -maxAttempts } } },
    { new: true },
  ).select("+failedLogins");

  if (updated.failedAttempts < maxAttempts) {
    const left = maxAttempts - updated.failedAttempts;
    return res.status(401).json({
      message: `Invalid email or password. ${left} attempt${left === 1 ? "" : "s"} left.`,
    });
  }

  const attempts = updated.failedLogins.map((a) => a.toObject());
  const lockUntil = new Date(Date.now() + lockoutMs);
  await User.updateOne({ _id: user._id }, { $set: { failedAttempts: 0, lockUntil, failedLogins: [] } });

  await recordAudit({
    req,
    actor: { name: user.name, _id: user._id },
    action: "account-locked",
    module: "auth",
    item: user.email,
    remarks: `Locked for ${Math.round(lockoutMs / 1000)}s after ${maxAttempts} failed attempts`,
  });
  // A mail failure must never change the login response.
  sendFailedAttemptsEmail({
    to: user.email,
    name: user.name,
    attempts,
    lockoutSeconds: Math.round(lockoutMs / 1000),
  }).catch((error) => console.error("Failed-attempts email error:", error.message));

  const retryAfter = Math.ceil(lockoutMs / 1000);
  res.set("Retry-After", String(retryAfter));
  return res.status(429).json({
    message: `Too many failed attempts. Try again in ${retryAfter} seconds.`,
    retryAfter,
  });
}

/** POST /auth/login */
export const login = async (req, res) => {
  const email = clean(req.body?.email);
  const password = req.body?.password;

  if (!EMAIL_RE.test(email) || typeof password !== "string" || !password) {
    return res.status(400).json({ message: "Enter your email and password." });
  }

  const user = await User.findOne({ email }).select("+password +otp");

  // 🔒 Locked out: don't even check the password until the lock expires.
  if (user?.lockUntil && user.lockUntil > new Date()) {
    const retryAfter = Math.ceil((user.lockUntil - Date.now()) / 1000);
    await recordAudit({
      req,
      actor: { name: user.name, _id: user._id },
      action: "login-failed",
      module: "auth",
      item: user.email,
      remarks: "Attempt while locked out",
    });
    res.set("Retry-After", String(retryAfter));
    return res.status(429).json({
      message: `Too many failed attempts. Try again in ${retryAfter} second${retryAfter === 1 ? "" : "s"}.`,
      retryAfter,
    });
  }

  const passwordOk = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);

  // ❌ Failed login — audit it (this is what makes "who tried to log in" visible)
  if (!user || !passwordOk) {
    await recordAudit({
      req,
      actor: { name: user?.name ?? email, _id: user?._id },
      action: "login-failed",
      module: "auth",
      item: email,
      remarks: user ? "Wrong password" : "Unknown email",
    });
    if (user) return registerFailure(req, res, user);
    return res.status(401).json({ message: "Invalid email or password." });
  }

  if (!user.isActive) {
    await recordAudit({
      req,
      actor: { name: user.name, _id: user._id },
      action: "login-failed",
      module: "auth",
      item: user.email,
      remarks: "Account is deactivated",
    });
    return res.status(403).json({
      message: "This account has been deactivated. Contact an administrator.",
    });
  }

  // Admins and staff need OTP — audit that the code was sent
  if (OTP_ROLES.includes(user.role) || (user.role === "staff" && current().staffRequiresOtp)) {
    await sendCode(user, "login");
    await recordAudit({
      req,
      actor: { name: user.name, _id: user._id },
      action: "login-otp-sent",
      module: "auth",
      item: user.email,
      remarks: `OTP sent for admin/staff login`,
    });
    return res.json({ otpRequired: true, email: user.email });
  }

  // Interns sign in directly
  return finishLogin(req, res, user, req.body?.rememberMe === true);
};

/** POST /auth/verify-otp */
export const verifyOtp = async (req, res) => {
  const email = clean(req.body?.email);
  const { code, purpose } = req.body ?? {};

  if (!PURPOSES.includes(purpose) || !/^\d{6}$/.test(String(code ?? ""))) {
    return res.status(400).json({ message: "Enter the 6-digit code." });
  }

  const user = await User.findOne({ email }).select("+otp");
  const valid = user?.isActive && (await checkOtp(user, code, purpose));

  if (!valid) {
    await recordAudit({
      req,
      actor: { name: user?.name ?? email, _id: user?._id },
      action: "otp-failed",
      module: "auth",
      item: email,
      remarks: `Invalid or expired ${purpose} code`,
    });
    return res.status(400).json({ message: "That code is invalid or has expired." });
  }

  if (purpose === "login") {
    return finishLogin(req, res, user, req.body?.rememberMe === true);
  }
  return res.json({ resetToken: signResetToken(user) });
};

/** POST /auth/resend-otp */
export const resendOtp = async (req, res) => {
  const email = clean(req.body?.email);
  const purpose = req.body?.purpose;
  if (PURPOSES.includes(purpose)) {
    const user = await User.findOne({ email }).select("+otp");
    if (user?.isActive && user.otp?.purpose === purpose) {
      await sendCode(user, purpose);
      await recordAudit({
        req,
        actor: { name: user.name, _id: user._id },
        action: "otp-resent",
        module: "auth",
        item: user.email,
        remarks: `Resent ${purpose} OTP`,
      });
    }
  }
  res.json({ message: "If a code was requested, a new one is on its way." });
};

/** POST /auth/forgot-password */
export const forgotPassword = async (req, res) => {
  const email = clean(req.body?.email);
  if (EMAIL_RE.test(email)) {
    const user = await User.findOne({ email }).select("+otp");
    if (user?.isActive) {
      await sendCode(user, "reset");
      await recordAudit({
        req,
        actor: { name: user.name, _id: user._id },
        action: "password-reset-requested",
        module: "auth",
        item: user.email,
        remarks: "Password reset OTP requested",
      });
    }
  }
  res.json({ message: "If that email belongs to an account, a code has been sent." });
};

/** POST /auth/reset-password — this is where the password actually changes */
export const resetPassword = async (req, res) => {
  const { resetToken, newPassword } = req.body ?? {};
  const problem = validatePassword(newPassword);
  if (problem) return res.status(400).json({ message: problem });

  let payload;
  try {
    payload = jwt.verify(String(resetToken), process.env.JWT_SECRET);
  } catch {
    return res.status(400).json({ message: "This reset link has expired. Start again." });
  }
  if (payload.purpose !== "reset") {
    return res.status(400).json({ message: "This reset link has expired. Start again." });
  }

  const user = await User.findById(payload.id).select("+otp");
  if (!user || !user.isActive || user.tokenVersion !== payload.tv) {
    return res.status(400).json({ message: "This reset link has expired. Start again." });
  }

  user.password = newPassword;
  user.tokenVersion += 1; // signs out everywhere, single-use token
  user.otp = undefined;
  await user.save();

  // ✅ Audit the password change
  await recordAudit({
    req,
    actor: { name: user.name, _id: user._id },
    action: "password-reset",
    module: "auth",
    item: user.email,
    itemId: user._id.toString(),
    remarks: "Password changed via reset link",
  });

  res.json({ message: "Password updated. You can sign in now." });
};

export const logout = async (req, res) => {
  if (req.user) {
    await recordAudit({
      req,
      action: "logout",
      module: "auth",
      item: req.user.email,
      itemId: req.user._id.toString(),
      remarks: "Signed out",
    });
  }
  clearAuthCookie(res);
  res.json({ message: "Signed out." });
};

/** GET /auth/me */
export const me = (req, res) => res.json({ user: req.user.toSafeJSON() });