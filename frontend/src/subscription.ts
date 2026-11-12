// Subscription expiry rules shared by the status context, the countdown banner
// and the blocked screen. The backend is the source of truth: it enforces the
// expiry on every authenticated request and returns 403 once the subscription
// has lapsed. These helpers only decide what the UI should show.

export const RENEWAL_WARNING_MS = 5 * 60 * 60 * 1000

export type SubscriptionStatus = {
  active: boolean
  expired: boolean
  plan: string | null
  expiresAt: string | null
  /** Milliseconds left until expiry (0 once expired). */
  remainingMs: number
  /** True while the subscription is active and has 5 hours or less left. */
  expiringSoon: boolean
}

export type SubscriptionStatusPayload = {
  active?: unknown
  expired?: unknown
  plan?: unknown
  subscription_plan?: unknown
  expiresAt?: unknown
  expires_at?: unknown
  subscription_expires_at?: unknown
  remainingMs?: unknown
  remaining_ms?: unknown
  remainingSeconds?: unknown
  remaining_seconds?: unknown
  secondsRemaining?: unknown
  seconds_remaining?: unknown
  serverTime?: unknown
  server_time?: unknown
  now?: unknown
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}

const toTimestamp = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

const toPlan = (value: unknown): string | null => (
  typeof value === 'string' && value.trim() ? value.trim() : null
)

export function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

export function formatExpiryDate(iso: string | null): string {
  if (!iso) return ''
  const timestamp = Date.parse(iso)
  if (!Number.isFinite(timestamp)) return ''
  return new Date(timestamp).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Normalises whatever the status endpoint returns into a single shape.
 * Accepts either an absolute expiry (`expires_at`) or a relative countdown
 * (`remaining_seconds` / `remaining_ms`), and anchors relative values to the
 * server clock when the payload includes one so client clock drift does not
 * shift the countdown.
 */
export function parseSubscriptionStatus(
  payload: unknown,
  now: number = Date.now(),
): SubscriptionStatus | null {
  if (!payload || typeof payload !== 'object') return null
  const data = payload as SubscriptionStatusPayload

  const serverNow = toTimestamp(data.serverTime) ?? toTimestamp(data.server_time) ?? toTimestamp(data.now)
  const anchor = serverNow ?? now

  const expiresAtRaw = data.expiresAt ?? data.expires_at ?? data.subscription_expires_at
  const expiresAtMs = toTimestamp(expiresAtRaw)

  let remainingMs: number | null = null
  const remainingMsValue = toNumber(data.remainingMs) ?? toNumber(data.remaining_ms)
  const remainingSecondsValue = toNumber(data.remainingSeconds)
    ?? toNumber(data.remaining_seconds)
    ?? toNumber(data.secondsRemaining)
    ?? toNumber(data.seconds_remaining)

  if (remainingMsValue !== null) remainingMs = remainingMsValue
  else if (remainingSecondsValue !== null) remainingMs = remainingSecondsValue * 1000
  else if (expiresAtMs !== null) remainingMs = expiresAtMs - anchor

  const explicitActive = typeof data.active === 'boolean' ? data.active : null
  const explicitExpired = typeof data.expired === 'boolean' ? data.expired : null

  if (remainingMs === null && explicitActive === null && explicitExpired === null) return null

  const expired = explicitExpired ?? (remainingMs !== null ? remainingMs <= 0 : explicitActive === false)
  const active = !expired && (explicitActive ?? true)
  const safeRemaining = expired ? 0 : Math.max(0, remainingMs ?? 0)

  return {
    active,
    expired,
    plan: toPlan(data.plan) ?? toPlan(data.subscription_plan),
    expiresAt: expiresAtMs !== null ? new Date(expiresAtMs).toISOString() : null,
    remainingMs: safeRemaining,
    expiringSoon: active && safeRemaining > 0 && safeRemaining <= RENEWAL_WARNING_MS,
  }
}

/** Recomputes the countdown locally between status polls. */
export function tickSubscriptionStatus(status: SubscriptionStatus, elapsedMs: number): SubscriptionStatus {
  if (!status.active) return status
  const remainingMs = Math.max(0, status.remainingMs - Math.max(0, elapsedMs))
  const expired = remainingMs <= 0
  return {
    ...status,
    active: !expired,
    expired,
    remainingMs,
    expiringSoon: !expired && remainingMs <= RENEWAL_WARNING_MS,
  }
}

/** True when an API error is the backend's "subscription expired" 403. */
export function isSubscriptionBlockedError(error: unknown): boolean {
  return (error as { status?: number } | null)?.status === 403
}
