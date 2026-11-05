import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "./authModel.js";
import { sendOtpEmail } from "./mailConfig/email.js";
import { OTP_ROLES } from "./utils/permissions.js";
import { EMAIL_RE, validatePassword } from "./utils/passwordPolicy.js";
import { canSendOtp, checkOtp, issueOtp } from "./utils/otp.js";
import { clearAuthCookie, generateTokenAndSetCookie, signResetToken } from "./utils/generateTokenAndSetCookie.js";

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

const finishLogin = async (res, user, remember) => {
  user.lastLoginAt = new Date();
  await user.save();
  generateTokenAndSetCookie(res, user, remember);
  return res.json({ user: user.toSafeJSON() });
};

/** POST /auth/login. Admin and staff get a code by email; interns are signed in directly. */
export const login = async (req, res) => {
  const email = clean(req.body?.email);
  const password = req.body?.password;
  if (!EMAIL_RE.test(email) || typeof password !== "string" || !password) {
    return res.status(400).json({ message: "Enter your email and password." });
  }

  const user = await User.findOne({ email }).select("+password +otp");
  const passwordOk = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
  if (!user || !passwordOk) return res.status(401).json({ message: "Invalid email or password." });
  if (!user.isActive) return res.status(403).json({ message: "This account has been deactivated. Contact an administrator." });

  if (OTP_ROLES.includes(user.role)) {
    await sendCode(user, "login");
    return res.json({ otpRequired: true, email: user.email });
  }
  return finishLogin(res, user, req.body?.rememberMe === true);
};

/** POST /auth/verify-otp  { email, code, purpose }. Finishes a login, or unlocks a password reset. */
export const verifyOtp = async (req, res) => {
  const email = clean(req.body?.email);
  const { code, purpose } = req.body ?? {};
  if (!PURPOSES.includes(purpose) || !/^\d{6}$/.test(String(code ?? ""))) {
    return res.status(400).json({ message: "Enter the 6-digit code." });
  }

  const user = await User.findOne({ email }).select("+otp");
  const valid = user?.isActive && (await checkOtp(user, code, purpose));
  if (!valid) return res.status(400).json({ message: "That code is invalid or has expired." });

  if (purpose === "login") return finishLogin(res, user, req.body?.rememberMe === true);
  return res.json({ resetToken: signResetToken(user) });
};

/** POST /auth/resend-otp  { email, purpose }. Always answers the same, so emails can't be probed. */
export const resendOtp = async (req, res) => {
  const email = clean(req.body?.email);
  const purpose = req.body?.purpose;
  if (PURPOSES.includes(purpose)) {
    const user = await User.findOne({ email }).select("+otp");
    // Only resend while a code of that kind is already pending (login: after a correct password).
    if (user?.isActive && user.otp?.purpose === purpose) await sendCode(user, purpose);
  }
  res.json({ message: "If a code was requested, a new one is on its way." });
};

/** POST /auth/forgot-password  { email }. */
export const forgotPassword = async (req, res) => {
  const email = clean(req.body?.email);
  if (EMAIL_RE.test(email)) {
    const user = await User.findOne({ email }).select("+otp");
    if (user?.isActive) await sendCode(user, "reset");
  }
  res.json({ message: "If that email belongs to an account, a code has been sent." });
};

/** POST /auth/reset-password  { resetToken, newPassword }. */
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
  if (payload.purpose !== "reset") return res.status(400).json({ message: "This reset link has expired. Start again." });

  const user = await User.findById(payload.id).select("+otp");
  if (!user || !user.isActive || user.tokenVersion !== payload.tv) {
    return res.status(400).json({ message: "This reset link has expired. Start again." });
  }

  user.password = newPassword;
  user.tokenVersion += 1; // signs the user out everywhere and makes this token single-use
  user.otp = undefined;
  await user.save();
  res.json({ message: "Password updated. You can sign in now." });
};

export const logout = (_req, res) => {
  clearAuthCookie(res);
  res.json({ message: "Signed out." });
};

/** GET /auth/me. Lets the frontend restore the session on page load. */
export const me = (req, res) => res.json({ user: req.user.toSafeJSON() });