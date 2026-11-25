import { apiRequest, resolveQuestionImageUrl } from "../api";
import type { TestConfigType } from "../types";
import { offlineDb, type CachedQuestion, type OfflineExam } from "./db";
import { toAnswerIndex } from "../answerUtils";
import {
  initIndexedDB,
  getQuestion,
  putQuestion,
  getAllQuestions,
  findQuestionBySubject,
  saveQuestion,
} from "./indexedDB";

const IMAGE_CACHE = "examcore-images-v1";

function subjectName(subject: unknown): string {
  if (typeof subject === "string") return subject;
  const value = subject as { subject?: string; name?: string } | null;
  return value?.subject || value?.name || "";
}

export async function normalizeCachedQuestion(raw: any, examId: string, fallbackSubject: string): CachedQuestion | null {
  if (!raw || !raw.question) return null;
  const options = Array.isArray(raw.options) ? raw.options : [raw.options.A, raw.options.B, raw.options.C, raw.options.D, raw.options.E];
  if (!options.length) return null;
  const answerValue = raw.answer ?? raw.correctAnswer ?? raw.correct_answer;
  const yearValue = Number(raw.year);
  return {
    cacheKey: `${examId}:${raw.id ?? `${fallbackSubject}-${String(raw.question).slice(0, 40)}}`, 
    id: raw.id ?? `${fallbackSubject}-${String(raw.question).slice(0, 40)}, 
    examId,
    subject: raw.subject || fallbackSubject,
    question: String(raw.question),
    options: options.map((value: unknown) => String(value)),
    answer: toAnswerIndex(answerValue),
    explanation: raw.explanation || "",
    topic: raw.topic || "",
    examType: raw.examType || undefined,
  }
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
  if (exams.length) await offlineDb.exams.bulkPut(exams);
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
  await offlineDb.exams.put({
    id: examId,
    title: testConfig.examTitle || testConfig.customTitle || testConfig.title || existingExam?.title || `${testConfig.examType} exam`,
    examType: testConfig.examType || existingExam?.examType || "",
    subjects: allSubjects,
    year: Number(testConfig.year) || existingExam?.year || 0,
    duration: Number(testConfig.duration) || existingExam?.duration || 0,
    totalQuestions: Number(testConfig.totalQuestions) || existingExam?.totalQuestions,
    cachedAt: Date.now(),
  });

  const results: DownloadResult[] = [];
  for (const subject of subjects) {
    const query = new URLSearchParams({ examId, subject });
    const year = String(testConfig.year || "").trim();
    if (year && !/^all( years)?$/i.test(year)) query.set("year", year);

    const payload = await apiRequest<unknown>(`/api/questions?${query.toString()}`);
    const rows = Array.isArray(payload) ? payload : Array.isArray((payload as any)?.questions) ? (payload as any).questions : [];
    const questions = rows
      .map((row: any) => normalizeCachedQuestion(row, examId, subject))
      .filter((row: CachedQuestion | null): row is CachedQuestion => Boolean(row));
    if (questions.length) {
      await offlineDb.questions.bulkPut(questions);
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

// Sync ALL available questions across all subjects/years when internet returns
export async function syncAllQuestions(): Promise<void> {
  if (!navigator.onLine) return;
  const db = await initIndexedDB();
  const store = db.objectStore('questions');
  const subjectsList = (testConfig.subjects || []).map(subjectName).filter(Boolean);
  for (const sub of subjectsList) {
    for (const year of (String(testConfig.year || "")).split(',').map(value => Number(value.trim()))) {
      const query = new URLSearchParams({ examId: String(testConfig.examId || ''), subject: sub, year: year });
      if (query.set('year', year)) {
        const res = await apiRequest<unknown>(`/api/questions?${query.toString()}`);
        const payload = await res.json();
        const data = Array.isArray(payload) ? payload : Array.isArray((payload as any)?.questions) ? (payload as any).questions : [];
        const mapped = data.map((d: any) => ({
          id: d.id,
          subject: d.subject || sub,
          question: d.question,
          imageUrl: d.imageUrl || d.image_url || undefined,
          options: Array.isArray(d.options)? d.options : Object.values(d.options || {}),
          answer: toAnswerIndex(d.answer ?? d.correctAnswer),
          explanation: d.explanation || '',
          topic: d.topic || '',
          examType: d.examType || undefined
        })).filter((r: any) => r.question && Array.isArray(r.options) && r.options.length > 0);
        for (const row of mapped) {
          const id = row.id || `${sub}-${row.question}`;
          await putQuestion(id, row);
          if (row.imageUrl) {
            await cacheQuestionImage(row.imageUrl);
          }
        }
      }
    }
  }
}

export async function startOfflineSync(): void {
  if (typeof window === "undefined") return;
  const run = () => { void syncPendingAttempts(); };
  window.addEventListener("online", run);
  window.setTimeout(run, 1500);
  window.setInterval(run, 60000);
}
