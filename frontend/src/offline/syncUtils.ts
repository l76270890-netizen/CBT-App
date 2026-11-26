// Pure, dependency-free helpers for the offline question synchroniser.
// Kept separate from Dexie so they can be unit-tested in Node.

export type SyncState = {
  /** ISO timestamp of the last successful sync (incremental watermark). */
  since?: string;
  /** Total questions the server reported at last sync. */
  total?: number;
  /** Questions stored locally at last successful verification. */
  stored?: number;
  /** Epoch ms of the last successful sync. */
  syncedAt?: number;
};

/** Split an array into fixed-size batches for IndexedDB bulk writes. */
export function chunk<T>(items: T[], size: number): T[][] {
  const safeSize = Math.max(1, Math.floor(size) || 1);
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += safeSize) {
    out.push(items.slice(i, i + safeSize));
  }
  return out;
}

/**
 * Return the cacheKeys of locally stored questions whose ids are NOT present in
 * the server manifest (i.e. deleted server-side). Comparison is numeric when
 * possible so "12" and 12 match.
 */
export function removedCacheKeys(
  local: { cacheKey: string; id: string | number }[],
  serverIds: Set<number>,
): string[] {
  const removed: string[] = [];
  for (const row of local) {
    const numeric = Number(row.id);
    const present = Number.isFinite(numeric) && serverIds.has(numeric);
    if (!present) removed.push(row.cacheKey);
  }
  return removed;
}

/** True when an error is a browser storage-quota / persistence failure. */
export function isQuotaError(error: unknown): boolean {
  const e = error as { name?: string; message?: string; code?: number } | null;
  if (!e) return false;
  if (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED") return true;
  if (typeof e.code === "number" && (e.code === 22 || e.code === 1014)) return true;
  const msg = (e.message || "").toLowerCase();
  return msg.includes("quota") || msg.includes("storage") || msg.includes("disk");
}

/** Normalise a server id / local id to a number for set membership. */
export function toNumericId(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}