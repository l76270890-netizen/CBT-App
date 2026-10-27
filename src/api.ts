import { API_URL } from "./config";

export async function apiRequest<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new Error("Set VITE_API_URL to the backend origin in the frontend environment.");

  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  const body = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) {
    const message = body?.error ?? body?.message;
    throw Object.assign(new Error(typeof message === "string" ? message : `Request failed (${response.status})`), {
      status: response.status,
    });
  }
  return body as T;
}

export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}
