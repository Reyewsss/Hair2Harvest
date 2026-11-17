import jwt from "jsonwebtoken";

export const COOKIE_NAME = "h2h_token";
const sessionHours = () => Number(process.env.SESSION_HOURS) || 8;

const baseCookie = () => {
  const production = process.env.NODE_ENV === "production";
  return {
    httpOnly: true, // JavaScript in the page can't read it
    secure: production,
    sameSite: process.env.COOKIE_SAMESITE || "lax",
    path: "/",
  };
};

const REMEMBER_DAYS = 30;

/**
 * Signs a session token and sets it as an httpOnly cookie.
 * remember = true  -> the cookie lasts 30 days ("Remember me").
 * remember = false -> a browser-session cookie (gone when the browser closes); the token itself lasts SESSION_HOURS.
 */
export function generateTokenAndSetCookie(res, user, remember = false) {
  const token = jwt.sign(
    { id: user.id, role: user.role, tv: user.tokenVersion, purpose: "session" },
    process.env.JWT_SECRET,
    { expiresIn: remember ? `${REMEMBER_DAYS}d` : `${sessionHours()}h` },
  );
  const options = baseCookie();
  if (remember) options.maxAge = REMEMBER_DAYS * 24 * 3600 * 1000;
  res.cookie(COOKIE_NAME, token, options);
  return token;
}

export const clearAuthCookie = (res) => res.clearCookie(COOKIE_NAME, baseCookie());

/** Short-lived token that proves the reset OTP was verified. Used once. */
export const signResetToken = (user) =>
  jwt.sign({ id: user.id, tv: user.tokenVersion, purpose: "reset" }, process.env.JWT_SECRET, { expiresIn: "10m" });