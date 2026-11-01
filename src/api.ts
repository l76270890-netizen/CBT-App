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

  const responseText = await response.text();
  let body: Record<string, unknown> | null = null;
  if (responseText.trim()) {
    try { body = JSON.parse(responseText) as Record<string, unknown>; }
    catch {
      if (response.ok) throw new Error(`Backend returned a non-JSON response: ${responseText.slice(0, 180)}`);
    }
  }
  if (!response.ok) {
    const message = body?.error ?? body?.message;
    const isHtml = response.headers.get("content-type")?.includes("text/html") || responseText.trimStart().startsWith("<!doctype html");
    const fallbackMessage = response.status === 404 && isHtml
      ? `Backend route not found: ${path}. Check that VITE_API_URL points to the School Admin backend and that its API routes are deployed.`
      : responseText.trim() || `Request failed (${response.status})`;
    throw Object.assign(new Error(typeof message === "string" ? message : fallbackMessage), {
      status: response.status,
    });
  }
  return body as T;
}

export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}
