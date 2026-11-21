import { API_URL } from "./config";

type SubscriptionBlockedListener = (error?: { status?: number; code?: string; message?: string }) => void;
let subscriptionBlockedListener: SubscriptionBlockedListener | null = null;

const RATE_LIMIT_MAX_ATTEMPTS = 4;
const RATE_LIMIT_MAX_DELAY_MS = 60000;
const RATE_LIMIT_MESSAGE = "The service is temporarily busy. Please try again in a moment. Your work has not been lost.";
const inFlightGetRequests = new Map<string, Promise<unknown>>();
let rateLimitedUntil = 0;

export function setSubscriptionBlockedListener(listener: SubscriptionBlockedListener | null) {
  subscriptionBlockedListener = listener;
}

export function resolveQuestionImageUrl(imageUrl: string): string {
  const value = imageUrl.trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (!API_URL) return value;
  // Older cached questions may have "/uploads//images/..." from the backend
  // path helper. Those images are served by the frontend, not the backend.
  if (/^\/?uploads\/+images\//i.test(value)) {
    return "/" + value.replace(/^\/?uploads\/+/i, "");
  }
  if (value.startsWith("/uploads/") || value.startsWith("uploads/")) {
    return `${API_URL}${value.startsWith("/") ? "" : "/"}${value}`;
  }
  if (value.startsWith("/images/") || value.startsWith("images/")) {
    return value.startsWith("/") ? value : `/${value}`;
  }
  if (value.startsWith("/")) return `${API_URL}${value}`;
  if (value.startsWith("questions/")) return `${API_URL}/uploads/${value}`;
  return `${API_URL}/${value}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(value);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return undefined;
}

function retryDelay(attempt: number, retryAfter: number | undefined): number {
  if (retryAfter !== undefined) return Math.min(retryAfter, RATE_LIMIT_MAX_DELAY_MS);
  const exponential = Math.min(RATE_LIMIT_MAX_DELAY_MS, 1000 * (2 ** attempt));
  return exponential + Math.floor(Math.random() * 500);
}

async function waitForRateLimitGate() {
  const remaining = rateLimitedUntil - Date.now();
  if (remaining > 0) await sleep(remaining);
}

async function readResponse(response: Response) {
  const responseText = await response.text();
  let body: Record<string, unknown> | null = null;
  if (responseText.trim()) {
    try { body = JSON.parse(responseText) as Record<string, unknown>; }
    catch {
      if (response.ok) throw new Error("Backend returned a non-JSON response.");
    }
  }
  return { responseText, body };
}

function makeApiError(
  message: string,
  status: number,
  code?: string,
  extra: { retryAfter?: number; providerCode?: string; friendly?: boolean } = {},
) {
  return Object.assign(new Error(message), {
    status,
    code,
    ...extra,
  });
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
  const { responseText, body } = await readResponse(response);
  if (!response.ok) {
    const message = body?.error ?? body?.message;
    throw new Error(typeof message === "string" ? message : responseText.trim() || `Image upload failed (${response.status}).`);
  }

  const imageUrl = body?.imageUrl ?? body?.image_url ?? body?.url;
  if (typeof imageUrl !== "string" || !imageUrl.trim()) {
    throw new Error("Image upload response did not include an imageUrl or url.");
  }
  return imageUrl;
}

async function performApiRequest<T>(path: string, init: RequestInit): Promise<T> {
  if (!API_URL) throw new Error("Set VITE_API_URL to the backend origin in the frontend environment.");

  const headers = new Headers(init.headers);
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (init.body && !isFormData && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  for (let attempt = 0; attempt < RATE_LIMIT_MAX_ATTEMPTS; attempt += 1) {
    await waitForRateLimitGate();
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers,
    });
    const { responseText, body } = await readResponse(response);

    if (response.ok) return body as T;

    const message = body?.error ?? body?.message;
    const code = typeof body?.code === "string" ? body.code : undefined;
    const providerCode = typeof body?.provider_code === "string" ? body.provider_code : undefined;

    if (response.status === 429 && attempt < RATE_LIMIT_MAX_ATTEMPTS - 1) {
      const retryAfter = parseRetryAfter(response.headers.get("Retry-After"));
      const delay = retryDelay(attempt, retryAfter);
      rateLimitedUntil = Math.max(rateLimitedUntil, Date.now() + delay);
      console.warn("[api] temporary rate limit", {
        path,
        attempt: attempt + 1,
        delayMs: delay,
        code,
        providerCode,
      });
      await sleep(delay);
      continue;
    }

    if (response.status === 429) {
      const retryAfter = parseRetryAfter(response.headers.get("Retry-After"));
      throw makeApiError(RATE_LIMIT_MESSAGE, response.status, code || "rate_limit_exceeded", {
        retryAfter,
        providerCode,
        friendly: true,
      });
    }

    const error = makeApiError(
      typeof message === "string" ? message : (responseText.trim() || `Request failed (${response.status})`),
      response.status,
      code,
      { providerCode },
    );

    if (response.status === 403) subscriptionBlockedListener?.(error);
    if (response.status === 404) {
      const isHtml = response.headers.get("content-type")?.includes("text/html") || responseText.trimStart().startsWith("<!doctype html");
      if (isHtml) {
        throw makeApiError(
          `Backend route not found: ${path}. Check that VITE_API_URL points to the School Admin backend and that its API routes are deployed.`,
          response.status,
          code,
        );
      }
    }
    throw error;
  }

  throw makeApiError(RATE_LIMIT_MESSAGE, 429, "rate_limit_exceeded", { friendly: true });
}

export function apiRequest<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method || "GET").toUpperCase();
  const dedupeKey = method === "GET" ? `GET:${path}` : null;
  if (dedupeKey) {
    const existing = inFlightGetRequests.get(dedupeKey);
    if (existing) return existing as Promise<T>;
  }

  const request = performApiRequest<T>(path, init);
  if (dedupeKey) {
    inFlightGetRequests.set(dedupeKey, request);
    request.then(
      () => { if (inFlightGetRequests.get(dedupeKey) === request) inFlightGetRequests.delete(dedupeKey); },
      () => { if (inFlightGetRequests.get(dedupeKey) === request) inFlightGetRequests.delete(dedupeKey); },
    );
  }
  return request;
}

export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}
