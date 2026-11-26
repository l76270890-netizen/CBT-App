// Offline access entitlement. The backend remains the source of truth and
// enforces expiry on every authenticated request; this cached copy only lets the
// UI decide whether offline access is still allowed when the network is gone.
// It is intentionally short-lived and never grants access beyond the server's
// subscription expiry.

const ENTITLEMENT_KEY = "examcore:offline-entitlement";

export type OfflineEntitlement = {
  /** ISO expiry from the server (subscription_expires_at). */
  expiresAt: string | null;
  /** Epoch ms when this entitlement was last refreshed from the server. */
  refreshedAt: number;
  /** True for owner accounts (permanent access). */
  owner: boolean;
};

export function storeOfflineEntitlement(input: {
  expiresAt?: string | null;
  owner?: boolean;
}): void {
  try {
    const value: OfflineEntitlement = {
      expiresAt: input.expiresAt ?? null,
      refreshedAt: Date.now(),
      owner: !!input.owner,
    };
    localStorage.setItem(ENTITLEMENT_KEY, JSON.stringify(value));
  } catch {
    // Non-fatal: offline blocking simply falls back to the last known status.
  }
}

export function readOfflineEntitlement(): OfflineEntitlement | null {
  try {
    const raw = localStorage.getItem(ENTITLEMENT_KEY);
    return raw ? (JSON.parse(raw) as OfflineEntitlement) : null;
  } catch {
    return null;
  }
}

/** True when offline access is no longer allowed (expired, non-owner). */
export function offlineAccessExpired(now: number = Date.now()): boolean {
  const entitlement = readOfflineEntitlement();
  if (!entitlement) return false;
  if (entitlement.owner) return false;
  if (!entitlement.expiresAt) return true;
  const expiry = Date.parse(entitlement.expiresAt);
  if (!Number.isFinite(expiry)) return true;
  return expiry <= now;
}