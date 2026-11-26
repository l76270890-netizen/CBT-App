import Dexie, { type Table } from "dexie";

export type CachedQuestion = {
  cacheKey: string;
  id: string | number;
  examId: string;
  subject: string;
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
  imageUrl?: string;
  year?: number;
  topic?: string;
  examType?: string;
  cachedAt: number;
};

export type OfflineAttempt = {
  id?: number;
  clientAttemptId: string;
  examId: string;
  examTitle: string;
  subject: string;
  subjects: string[];
  score: number;
  total: number;
  duration: string;
  mode: string;
  examType: string;
  answers: (number | null)[];
  questions: CachedQuestion[];
  subjectScores: { subject: string; score: number; total: number }[];
  completedAt: string;
  status: "pending" | "synced" | "failed";
  syncError?: string;
  createdAt: number;
};

export type OfflineDraft = {
  key: string;
  answers: Record<string, number | null>;
  current: number;
  timeLeft: number;
  updatedAt: number;
};

export type OfflineExam = {
  id: string;
  title: string;
  examType: string;
  subjects: string[];
  year: number;
  duration: number;
  totalQuestions?: number;
  scheduledAt?: string;
  cachedAt: number;
};

export type StudyQuestion = {
  cacheKey: string;
  id: string | number;
  examType: string;
  subject: string;
  topic: string;
  year?: number;
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
  imageUrl?: string;
  cachedAt: number;
};

export type StudyMetaCache = {
  examType: string;
  topicsBySubject: Record<string, string[]>;
  availability: Record<string, unknown>;
  cachedAt: number;
};

export type StudyActivity = {
  id?: number;
  clientActivityId: string;
  examType: string;
  subject: string;
  topic?: string;
  year?: string;
  score: number;
  total: number;
  duration: string;
  completedAt: string;
  status: "pending" | "synced" | "failed";
  syncError?: string;
  createdAt: number;
};

class ExamCoreOfflineDb extends Dexie {
  questions!: Table<CachedQuestion, string>;
  attempts!: Table<OfflineAttempt, number>;
  drafts!: Table<OfflineDraft, string>;
  exams!: Table<OfflineExam, string>;
  studyMeta!: Table<StudyMetaCache, string>;
  studyQuestions!: Table<StudyQuestion, string>;
  studyActivity!: Table<StudyActivity, number>;

  constructor() {
    super("examcore-offline");
    // Dexie requires every version to declare the COMPLETE schema for that
    // version. Stores omitted from a version are DELETED on upgrade (verified in
    // dexie's deleteRemovedTables). The previous non-cumulative declarations
    // wiped questions/attempts/drafts/exams, which is why saved questions
    // disappeared. Each version below is cumulative; v5 re-declares everything
    // so existing installs recover the missing stores without data loss.
    this.version(1).stores({
      questions: "&cacheKey, examId, subject, year, cachedAt",
      attempts: "++id, &clientAttemptId, examId, status, createdAt",
    });
    this.version(2).stores({
      questions: "&cacheKey, examId, subject, year, cachedAt",
      attempts: "++id, &clientAttemptId, examId, status, createdAt",
      drafts: "&key, updatedAt",
    });
    this.version(3).stores({
      questions: "&cacheKey, examId, subject, year, cachedAt",
      attempts: "++id, &clientAttemptId, examId, status, createdAt",
      drafts: "&key, updatedAt",
      exams: "&id, examType, cachedAt",
    });
    this.version(4).stores({
      questions: "&cacheKey, examId, subject, year, cachedAt",
      attempts: "++id, &clientAttemptId, examId, status, createdAt",
      drafts: "&key, updatedAt",
      exams: "&id, examType, cachedAt",
      studyMeta: "&examType, cachedAt",
      studyQuestions: "&cacheKey, examType, subject, topic, year, cachedAt",
      studyActivity: "++id, &clientActivityId, examType, subject, status, createdAt",
    });
    this.version(5).stores({
      questions: "&cacheKey, examId, subject, year, cachedAt",
      attempts: "++id, &clientAttemptId, examId, status, createdAt",
      drafts: "&key, updatedAt",
      exams: "&id, examType, cachedAt",
      studyMeta: "&examType, cachedAt",
      studyQuestions: "&cacheKey, examType, subject, topic, year, cachedAt",
      studyActivity: "++id, &clientActivityId, examType, subject, status, createdAt",
    });
  }
}

export const offlineDb = new ExamCoreOfflineDb();

// IndexedDB uses the structured clone algorithm, which cannot clone Promises.
// Some async callers can accidentally leave a Promise inside a record; strip
// those values (and functions) before writing so one bad field cannot break the
// whole offline cache.
export function toCloneable<T>(value: T): T {
  if (value instanceof Promise) return undefined as unknown as T;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(item => toCloneable(item)) as unknown as T;
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (nested instanceof Promise || typeof nested === "function") continue;
      output[key] = toCloneable(nested);
    }
    return output as T;
  }
  return value;
}
