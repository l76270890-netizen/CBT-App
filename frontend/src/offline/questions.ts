import { apiRequest, resolveQuestionImageUrl } from "../api";
import type { TestConfigType } from "../types";
import { offlineDb, toCloneable, type CachedQuestion, type OfflineExam } from "./db";
import { toAnswerIndex } from "../answerUtils";
import {
  initIndexedDB,
  getQuestion,
  putQuestion,
  getAllQuestions,
  findQuestionBySubject,
  saveQuestion,
} from "./indexedDB";
import { chunk, removedCacheKeys, isQuotaError, type SyncState } from "./syncUtils";

// Must match the image cache name used by public/sw.js so the service worker can
// serve question diagrams offline. The old value ("examcore-images-v1") was never
// read by the service worker, so cached images were not available offline.
const IMAGE_CACHE = "examcore-images-v2";
const SYNC_STATE_KEY = "examcore:sync:state";
const SYNC_PROGRESS_EVENT = "examcore:sync-progress";
const BATCH_SIZE = 200;

export type SyncPhase = "idle" | "syncing" | "ready" | "error";

export type SyncProgress = {
  phase: SyncPhase;
  total: number;
  stored: number;
  images: number;
  message: string;
  updatedAt: number;
};

let currentProgress: SyncProgress = {
  phase: "idle",
  total: 0,
  stored: 0,
  images: 0,
  message: "",
  updatedAt: 0,
};
const progressListeners = new Set<(progress: SyncProgress) => void>();
let syncing = false;

export function getSyncProgress(): SyncProgress {
  return currentProgress;
}

export function subscribeSyncProgress(
  listener: (progress: SyncProgress) => void,
): () => void {
  progressListeners.add(listener);
  listener(currentProgress);
  return () => {
    progressListeners.delete(listener);
  };
}

function emit(patch: Partial<SyncProgress>) {
  currentProgress = { ...currentProgress, ...patch, updatedAt: Date.now() };
  for (const listener of progressListeners) {
    try {
      listener(currentProgress);
    } catch {
      // A broken listener must not stop the sync.
    }
  }
  if (typeof window !== "undefined" && typeof CustomEvent !== "undefined") {
    window.dispatchEvent(new CustomEvent(SYNC_PROGRESS_EVENT, { detail: currentProgress }));
  }
}

function loadSyncState(): SyncState {
  try {
    const raw = localStorage.getItem(SYNC_STATE_KEY);
    return raw ? (JSON.parse(raw) as SyncState) : {};
  } catch {
    return {};
  }
}

function saveSyncState(patch: Partial<SyncState>) {
  try {
    localStorage.setItem(SYNC_STATE_KEY, JSON.stringify({ ...loadSyncState(), ...patch }));
  } catch {
    // localStorage may be unavailable (private mode); sync still works per-session.
  }
}

function subjectName(subject: unknown): string {
  if (typeof subject === "string") return subject;
  const value = subject as { subject?: string; name?: string } | null;
  return value?.subject || value?.name || "";
}

export async function normalizeCachedQuestion(raw: any, examId: string, fallbackSubject: string): Promise<CachedQuestion | null> {
  if (!raw || !raw.question) return null;
  const options = Array.isArray(raw.options) ? raw.options : [raw.options.A, raw.options.B, raw.options.C, raw.options.D, raw.options.E];
  if (!options.length) return null;
  const answerValue = raw.answer ?? raw.correctAnswer ?? raw.correct_answer;
  const yearValue = Number(raw.year);
  return {
    cacheKey: examId + ":" + (raw.id ?? (fallbackSubject + "-" + String(raw.question).slice(0, 40))),
    id: raw.id ?? (fallbackSubject + "-" + String(raw.question).slice(0, 40)),
    examId: examId,
    subject: raw.subject || fallbackSubject,
    question: String(raw.question),
    options: options.map((value: unknown) => String(value)),
    answer: toAnswerIndex(answerValue),
    explanation: raw.explanation || "",
    topic: raw.topic || "",
    year: Number.isFinite(yearValue) ? yearValue : undefined,
    examType: raw.examType || undefined,
    imageUrl: raw.image_url || raw.imageUrl || undefined,
    cachedAt: Date.now(),
  };
}

/** Map a raw /api/sync/questions row into a CachedQuestion. */
export function mapSyncRow(raw: any): CachedQuestion | null {
  if (!raw || !raw.question) return null;
  const examId = String(raw.examId ?? "");
  const options = Array.isArray(raw.options)
    ? raw.options
    : [raw.options?.A, raw.options?.B, raw.options?.C, raw.options?.D, raw.options?.E].filter(
        (value): value is string => typeof value === "string" && value.trim() !== "",
      );
  if (!options.length) return null;
  const yearValue = Number(raw.year);
  const id = raw.id ?? `${examId}:${String(raw.question).slice(0, 40)}`;
  return {
    cacheKey: `${examId}:${id}`,
    id,
    examId,
    subject: raw.subject || "",
    question: String(raw.question),
    options: options.map((value: unknown) => String(value)),
    answer: toAnswerIndex(raw.answer ?? raw.correctAnswer),
    explanation: raw.explanation || "",
    topic: raw.topic || "",
    year: Number.isFinite(yearValue) ? yearValue : undefined,
    examType: raw.examType || undefined,
    imageUrl: raw.image_url || raw.imageUrl || undefined,
    cachedAt: Date.now(),
  };
}

export async function cacheQuestionImage(imageUrl?: string): Promise<void> {
  if (!imageUrl || typeof caches === "undefined") return;
  const url = resolveQuestionImageUrl(imageUrl);
  try {
    const cache = await caches.open(IMAGE_CACHE);
    if (await cache.match(url)) return;
    const response = await fetch(url);
    if (response && (response.ok || response.type === "opaque")) {
      await cache.put(url, response.clone());
    }
  } catch {
    // A failed image must not block the downloadable question pack.
  }
}

export type DownloadResult = {
  subject: string;
  questions: number;
  images: number;
};

export async function saveCachedExams(exams: OfflineExam[]): Promise<void> {
  if (exams.length) await offlineDb.exams.bulkPut(toCloneable(exams));
}

export async function loadCachedExams(): Promise<OfflineExam[]> {
  return offlineDb.exams.orderBy("cachedAt").reverse().toArray();
}

export async function loadCachedSubjectAvailability(examId: string): Promise<{ subject: string; questions: number; years: string; required: boolean; questionsByYear: Record<string, number> }[]> {
  const rows = await offlineDb.questions.where("examId").equals(examId).toArray();
  const grouped = new Map<string, Record<string, number>>();
  for (const row of rows) {
    if (!row.question) continue;
    const byYear = grouped.get(row.subject) || {};
    if (row.year) byYear[String(row.year)] = (byYear[String(row.year)] || 0) + 1;
    grouped.set(row.subject, byYear);
  }
  return Array.from(grouped.entries()).map(([subject, questionsByYear]) => {
    const years = Object.entries(questionsByYear).sort((a, b) => Number(b[0]) - Number(a[0]));
    return {
      subject,
      questions: years.reduce((sum, [, count]) => sum + Number(count), 0),
      years: years.map(([year]) => year).join(", ") || "No questions yet",
      required: /^(use of )?english( language)?$/i.test(subject.trim()),
      questionsByYear,
    };
  });
}

export async function downloadQuestionsForTest(testConfig: TestConfigType): Promise<DownloadResult[]> {
  const examId = String(testConfig.examId || testConfig.customExamId || "").trim();
  if (!examId) throw new Error("Choose an exam before downloading questions.");
  const subjects = (testConfig.subjects || []).map(subjectName).filter(Boolean);
  if (!subjects.length) throw new Error("Choose at least one subject before downloading questions.");

  const existingExam = await offlineDb.exams.get(examId).catch(() => undefined);
  const allSubjects = Array.from(new Set([...(existingExam?.subjects || []), ...subjects]));
  await offlineDb.exams.put(toCloneable({
    id: examId,
    title: testConfig.examTitle || testConfig.customTitle || testConfig.title || existingExam?.title || `${testConfig.examType} exam`,
    examType: testConfig.examType || existingExam?.examType || "",
    subjects: allSubjects,
    year: Number(testConfig.year) || existingExam?.year || 0,
    duration: Number(testConfig.duration) || existingExam?.duration || 0,
    totalQuestions: Number(testConfig.totalQuestions) || existingExam?.totalQuestions,
    cachedAt: Date.now(),
  }));

  const results: DownloadResult[] = [];
  for (const subject of subjects) {
    const query = new URLSearchParams({ examId, subject });
    const year = String(testConfig.year || "").trim();
    if (year && !/^all( years)?$/i.test(year)) query.set("year", year);

    const payload = await apiRequest<unknown>(`/api/questions?${query.toString()}`);
    const rows = Array.isArray(payload) ? payload : Array.isArray((payload as any)?.questions) ? (payload as any).questions : [];
    const questions = (await Promise.all(
      rows.map((row: any) => normalizeCachedQuestion(row, examId, subject)),
    )).filter((row: CachedQuestion | null): row is CachedQuestion => Boolean(row));
    if (questions.length) {
      await offlineDb.questions.bulkPut(toCloneable(questions));
    }

    let images = 0;
    for (const question of questions) {
      if (question.imageUrl) {
        await cacheQuestionImage(question.imageUrl);
        images += 1;
      }
    }
    results.push({ subject, questions: questions.length, images });
  }
  return results;
}

export async function loadCachedQuestions(examId: string, subjects: string[], year: string): Promise<CachedQuestion[]> {
  if (!examId || !subjects.length) return [];
  const all = await offlineDb.questions.where("examId").equals(examId).toArray();
  const subjectSet = new Set(subjects.map(value => value.toLowerCase()));
  const years = String(year || "")
    .split(",")
    .map(value => Number(value.trim()))
    .filter(value => Number.isFinite(value));
  return all.filter(question =>
    subjectSet.has(question.subject.toLowerCase()) &&
    (!years.length || (question.year !== undefined && years.includes(question.year)))
  );
}

async function fetchSyncManifest(): Promise<{ ids: number[]; total: number; serverTime: string }> {
  const payload = await apiRequest<any>("/api/sync/manifest");
  const ids = Array.isArray(payload?.ids) ? payload.ids.map((id: unknown) => Number(id)).filter(Number.isFinite) : [];
  return {
    ids,
    total: typeof payload?.total === "number" ? payload.total : ids.length,
    serverTime: typeof payload?.serverTime === "string" ? payload.serverTime : new Date().toISOString(),
  };
}

async function fetchSyncQuestions(since?: string): Promise<any[]> {
  const query = new URLSearchParams();
  if (since) query.set("since", since);
  const payload = await apiRequest<any>(`/api/sync/questions?${query.toString()}`);
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.questions) ? payload.questions : [];
}

async function deleteRemovedQuestions(serverIds: Set<number>): Promise<number> {
  const local = await offlineDb.questions.toArray();
  const removed = removedCacheKeys(local, serverIds);
  if (removed.length) {
    await offlineDb.questions.bulkDelete(removed);
  }
  return removed.length;
}

async function storeInBatches(rows: CachedQuestion[]): Promise<void> {
  for (const batch of chunk(rows, BATCH_SIZE)) {
    await offlineDb.questions.bulkPut(toCloneable(batch));
  }
}

async function cacheImages(rows: CachedQuestion[], onProgress?: (count: number) => void): Promise<number> {
  let images = 0;
  for (const row of rows) {
    if (row.imageUrl) {
      await cacheQuestionImage(row.imageUrl);
      images += 1;
      if (onProgress && images % 25 === 0) onProgress(images);
    }
  }
  return images;
}

async function checkStorageAvailable(): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return;
  try {
    const { usage, quota } = await navigator.storage.estimate();
    if (typeof quota === "number" && typeof usage === "number" && quota > 0 && usage / quota > 0.95) {
      throw new Error("Device storage is almost full. Free some space and try syncing again.");
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("storage is almost full")) throw error;
    // estimate() is best-effort; ignore other failures.
  }
}

/**
 * Synchronise the entire examination question bank for the signed-in student.
 *
 * - First run (no watermark): downloads every exam question.
 * - Later runs: downloads only questions changed since the last success.
 * - Deletions are detected by diffing the server manifest against local ids.
 * - Writes are batched and idempotent; existing data is never cleared, so an
 *   interrupted sync resumes from the last watermark without data loss.
 * - The local count is verified against the manifest before reporting "ready".
 */
export async function syncAllQuestions(_config?: TestConfigType): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  if (syncing) return;
  syncing = true;
  try {
    emit({ phase: "syncing", message: "Preparing offline question bank…" });
    await checkStorageAvailable();

    const manifest = await fetchSyncManifest();
    const serverIds = new Set<number>(manifest.ids);
    emit({ phase: "syncing", total: manifest.total, message: "Checking for new and updated questions…" });

    const state = loadSyncState();
    const rawRows = await fetchSyncQuestions(state.since);
    const mapped = rawRows
      .map((row) => mapSyncRow(row))
      .filter((row): row is CachedQuestion => Boolean(row));

    emit({ phase: "syncing", total: manifest.total, message: `Saving ${mapped.length} question(s)…` });
    await deleteRemovedQuestions(serverIds);
    await storeInBatches(mapped);

    emit({ phase: "syncing", total: manifest.total, stored: mapped.length, message: "Saving question diagrams…" });
    const images = await cacheImages(mapped);

    // Verify: local count must match the server manifest before we claim ready.
    const localCount = await offlineDb.questions.count();
    const verified = localCount >= manifest.total;
    saveSyncState({
      since: manifest.serverTime,
      total: manifest.total,
      stored: localCount,
      syncedAt: Date.now(),
    });

    if (verified) {
      emit({
        phase: "ready",
        total: manifest.total,
        stored: localCount,
        images,
        message: `Offline ready: ${localCount} question(s) and ${images} diagram(s) saved.`,
      });
    } else {
      emit({
        phase: "syncing",
        total: manifest.total,
        stored: localCount,
        images,
        message: `Saved ${localCount} of ${manifest.total} questions. Will retry to complete.`,
      });
    }
  } catch (error) {
    const message = isQuotaError(error)
      ? "Device storage is full. Free some space and reconnect to finish syncing."
      : error instanceof Error
        ? error.message
        : "Could not synchronise questions. Your saved questions are safe.";
    emit({ phase: "error", message });
  } finally {
    syncing = false;
  }
}

/**
 * Kept for backward compatibility. Previously this referenced an undefined
 * symbol; it now performs the real background sync (questions + pending
 * attempts are handled by their own modules).
 */
export async function startOfflineSync(): Promise<void> {
  if (typeof window === "undefined") return;
  const run = () => {
    void syncAllQuestions();
  };
  window.addEventListener("online", run);
  window.setTimeout(run, 1500);
}

// Re-export the raw IndexedDB helpers so existing imports keep working.
export { initIndexedDB, getQuestion, putQuestion, getAllQuestions, findQuestionBySubject, saveQuestion };