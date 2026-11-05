import { apiLimiter, authLimiter, upstashConfigured } from "../config/upstash.js";

let warned = false;

const build = (limiter, keyOf) => async (req, res, next) => {
  if (!limiter) {
    if (!warned) {
      console.warn("Upstash is not configured: rate limiting is OFF. Set UPSTASH_* before deploying.");
      warned = true;
    }
    return next();
  }
  try {
    const { success } = await limiter.limit(keyOf(req));
    if (!success) return res.status(429).json({ message: "Too many requests. Please wait a minute and try again." });
  } catch (error) {
    // If Upstash is unreachable, let the request through rather than locking everyone out.
    console.error("Rate limiter error:", error.message);
  }
  next();
};

export const rateLimit = build(apiLimiter, (req) => req.ip);

// Keyed by IP and the email in the body, so one attacker can't hammer one account.
export const authRateLimit = build(authLimiter, (req) => `${req.ip}:${String(req.body?.email ?? "").toLowerCase()}`);

export { upstashConfigured };