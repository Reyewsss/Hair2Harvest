import jwt from "jsonwebtoken";
import { current } from "../../security/securitySettings.js";

export const COOKIE_NAME = "h2h_token";
const sessionHours = () => current().sessionHours;

const baseCookie = () => {
  const production = process.env.NODE_ENV === "production";
  const sameSite = process.env.COOKIE_SAMESITE || "lax";
  return {
    httpOnly: true, // JavaScript in the page can't read it
    secure: production || sameSite === "none", // browsers reject SameSite=None without Secure
    sameSite,
    path: "/",
  };
};

const rememberDays = () => current().rememberMeDays;

/**
 * Signs a session token and sets it as an httpOnly cookie.
 * remember = true  -> the cookie lasts 30 days ("Remember me").
 * remember = false -> a browser-session cookie (gone when the browser closes); the token itself lasts the "session hours" security setting.
 */
export function generateTokenAndSetCookie(res, user, remember = false) {
  const token = jwt.sign(
    { id: user.id, role: user.role, tv: user.tokenVersion, purpose: "session" },
    process.env.JWT_SECRET,
    { expiresIn: remember ? `${rememberDays()}d` : `${sessionHours()}h` },
  );
  const options = baseCookie();
  if (remember) options.maxAge = rememberDays() * 24 * 3600 * 1000;
  res.cookie(COOKIE_NAME, token, options);
  return token;
}

export const clearAuthCookie = (res) => res.clearCookie(COOKIE_NAME, baseCookie());

/** Short-lived token that proves the reset OTP was verified. Used once. */
export const signResetToken = (user) =>
  jwt.sign({ id: user.id, tv: user.tokenVersion, purpose: "reset" }, process.env.JWT_SECRET, { expiresIn: "10m" });