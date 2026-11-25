// Local dev talks to the backend directly; production builds use /api, which frontend/vercel.json proxies
// to the backend so the session cookie is first-party. VITE_API_URL overrides both.
export const API_BASE =
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:5001/api" : "/api");
const BASE = API_BASE;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// The auth provider registers this so an expired session sends the user back to the login screen.
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  onUnauthorized = handler;
};

type Options = { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown };

/* ── Read cache ──────────────────────────────────────────────────────────
 * GET responses are kept for CACHE_TTL_MS, and identical requests made at the same time share
 * one network call. Any successful change (POST/PUT/PATCH/DELETE) clears the whole cache, so
 * a list is never stale after you edit it. Sign-in/out clear it too (clearApiCache), so one
 * person's data is never shown to the next person on the same browser.
 * Never cached: /auth/* (session and activity) and /security (the settings page must be live). */
const CACHE_TTL_MS = 30_000;
const NEVER_CACHE = ["/auth/", "/security"];
const cache = new Map<string, { at: number; data: unknown }>();
const inflight = new Map<string, Promise<unknown>>();

export const clearApiCache = () => {
  cache.clear();
  inflight.clear();
};

async function request<T>(path: string, method: string, body: unknown): Promise<T> {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      credentials: "include", // sends the httpOnly session cookie
      // A FormData body sets its own multipart header; everything else is JSON.
      headers: body === undefined || isForm ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    // 401 from anything except the sign-in calls means the session ended.
    if (response.status === 401 && !path.startsWith("/auth/")) onUnauthorized?.();
    throw new ApiError(response.status, data?.message ?? "Something went wrong.");
  }
  return data as T;
}

export async function api<T>(path: string, { method, body }: Options = {}): Promise<T> {
  const verb = method ?? (body === undefined ? "GET" : "POST");

  if (verb !== "GET") {
    const result = await request<T>(path, verb, body);
    clearApiCache(); // something changed: drop every cached read
    return result;
  }

  if (NEVER_CACHE.some((p) => path.startsWith(p))) return request<T>(path, "GET", undefined);

  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data as T;

  const pending = inflight.get(path);
  if (pending) return pending as Promise<T>;

  const promise = request<T>(path, "GET", undefined)
    .then((data) => {
      cache.set(path, { at: Date.now(), data });
      return data;
    })
    .finally(() => inflight.delete(path));
  inflight.set(path, promise);
  return promise;
}

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";