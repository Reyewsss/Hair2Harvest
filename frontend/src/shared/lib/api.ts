/* Thin fetch wrapper. Requests go to /api and are proxied to the backend by
   Vite in development, so the session cookie is same-origin. */

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type Options = Omit<RequestInit, "body"> & { body?: unknown };

async function request<T>(path: string, options: Options = {}): Promise<T> {
  const { body, headers, ...rest } = options;

  const response = await fetch(path, {
    credentials: "include",
    ...rest,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      (data as { message?: string } | null)?.message ??
      `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body }),
};
