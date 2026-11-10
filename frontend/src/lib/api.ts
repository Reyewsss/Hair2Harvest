const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5001/api";

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

type Options = { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown };

export async function api<T>(path: string, { method, body }: Options = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method: method ?? (body === undefined ? "GET" : "POST"),
      credentials: "include", // sends the httpOnly session cookie
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
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

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";