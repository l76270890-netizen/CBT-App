import { API_URL } from "./config";

// The backend enforces subscription expiry on every authenticated request and
// answers 403 once it lapses. The subscription context registers a listener
// here so any 403 can immediately block the UI, not just the status poll.
type SubscriptionBlockedListener = () => void;
let subscriptionBlockedListener: SubscriptionBlockedListener | null = null;

export function setSubscriptionBlockedListener(listener: SubscriptionBlockedListener | null) {
  subscriptionBlockedListener = listener;
}

export function resolveQuestionImageUrl(imageUrl: string): string {
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  if (!API_URL) return imageUrl;
  if (imageUrl.startsWith("/")) return `${API_URL}${imageUrl}`;
  if (imageUrl.startsWith("questions/")) return `${API_URL}/uploads/${imageUrl}`;
  return `${API_URL}/${imageUrl}`;
}

export async function uploadQuestionImage(file: File): Promise<string> {
  if (!API_URL) throw new Error("Set VITE_API_URL to the backend origin in the frontend environment.");

  const formData = new FormData();
  formData.append("image", file);
  const response = await fetch(`${API_URL}/api/admin/upload-question-image`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  const responseText = await response.text();
  let body: Record<string, unknown> | null = null;
  if (responseText.trim()) {
    try { body = JSON.parse(responseText) as Record<string, unknown>; }
    catch {
      if (response.ok) throw new Error("Image upload endpoint returned a non-JSON response.");
    }
  }
  if (!response.ok) {
    const message = body?.error ?? body?.message;
    throw new Error(typeof message === "string" ? message : responseText.trim() || `Image upload failed (${response.status}).`);
  }

  const imageUrl = body?.imageUrl ?? body?.url;
  if (typeof imageUrl !== "string" || !imageUrl.trim()) {
    throw new Error("Image upload response did not include an imageUrl or url.");
  }
  return imageUrl;
}

export async function apiRequest<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new Error("Set VITE_API_URL to the backend origin in the frontend environment.");

  const headers = new Headers(init.headers);
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (init.body && !isFormData && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
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
    if (response.status === 403) subscriptionBlockedListener?.();
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
