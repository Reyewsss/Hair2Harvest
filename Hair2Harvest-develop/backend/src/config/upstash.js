import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

export const upstashConfigured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

const redis = upstashConfigured ? Redis.fromEnv() : null;

const create = (requests, window, prefix) =>
  redis ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(requests, window), prefix }) : null;

// General API traffic, per IP.
export const apiLimiter = create(100, "1 m", "h2h:api");
// Login, OTP and password-reset endpoints, per IP + email. Much stricter.
export const authLimiter = create(8, "1 m", "h2h:auth");