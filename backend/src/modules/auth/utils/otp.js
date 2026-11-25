import crypto from "node:crypto";
import { current } from "../../security/securitySettings.js";

// Code lifetime, wrong-guess limit and resend gap come from the admin security settings.

// Codes are stored as an HMAC, never in plain text.
const digest = (userId, code) =>
  crypto.createHmac("sha256", process.env.OTP_SECRET).update(`${userId}:${code}`).digest("hex");

export const generateCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

/** Creates a new code for the user (replacing any older one) and returns it to be emailed. */
export async function issueOtp(user, purpose) {
  const code = generateCode();
  user.otp = {
    hash: digest(user.id, code),
    purpose,
    expiresAt: new Date(Date.now() + current().otpTtlMinutes * 60_000),
    attempts: 0,
    sentAt: new Date(),
  };
  await user.save();
  return code;
}

/** False when a code of this purpose was sent less than a minute ago. */
export const canSendOtp = (user, purpose) =>
  !user.otp?.sentAt ||
  user.otp.purpose !== purpose ||
  Date.now() - new Date(user.otp.sentAt).getTime() >= current().otpResendSeconds * 1000;

/** Checks a submitted code. A correct code is consumed, so it works only once. */
export async function checkOtp(user, code, purpose) {
  const otp = user.otp;
  if (!otp?.hash || otp.purpose !== purpose) return false;
  if (new Date(otp.expiresAt) < new Date() || otp.attempts >= current().otpMaxAttempts) return false;

  const expected = Buffer.from(otp.hash, "hex");
  const actual = Buffer.from(digest(user.id, String(code)), "hex");
  const ok = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);

  if (!ok) {
    user.otp.attempts += 1;
    await user.save();
    return false;
  }
  user.otp = undefined;
  await user.save();
  return true;
}