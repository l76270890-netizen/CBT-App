import { offlineDb, type CachedQuestion, type OfflineAttempt } from "./db";

export type AttemptQuestion = {
  id: string | number;
  subject: string;
  question: string;
  imageUrl?: string;
  options: string[];
  answer: number;
  explanation?: string;
  topic?: string;
};

export type LocalResult = {
  id: number;
  clientAttemptId?: string;
  examId?: string;
  examTitle?: string;
  title?: string;
  subject: string;
  subjects?: string[];
  score: number;
  total: number;
  duration: string;
  mode: string;
  examType: string;
  answers: (number | null)[];
  questions: AttemptQuestion[];
  status: string;
  date: string;
};

function toCachedQuestion(question: AttemptQuestion, examId: string): CachedQuestion {
  return {
    cacheKey: `${examId}:${question.id}`,
    id: question.id,
    examId,
    subject: question.subject,
    question: question.question,
    options: question.options,
    answer: question.answer,
    explanation: question.explanation,
    imageUrl: question.imageUrl,
    topic: question.topic,
    cachedAt: Date.now(),
  };
}

export function buildSubjectScores(answers: (number | null)[], questions: AttemptQuestion[]) {
  const bySubject = new Map<string, { score: number; total: number }>();
  questions.forEach((question, index) => {
    const current = bySubject.get(question.subject) || { score: 0, total: 0 };
    current.total += 1;
    if (answers[index] === question.answer) current.score += 1;
    bySubject.set(question.subject, current);
  });
  return Array.from(bySubject.entries()).map(([subject, values]) => ({ subject, ...values }));
}

export async function saveOfflineAttempt(result: LocalResult): Promise<string> {
  const clientAttemptId = result.clientAttemptId || `cbt-${result.id}`;
  const examId = String(result.examId || "");
  const subjectScores = buildSubjectScores(result.answers, result.questions);
  const record: OfflineAttempt = {
    clientAttemptId,
    examId,
    examTitle: result.examTitle || result.title || result.subject || "Exam",
    subject: result.subject,
    subjects: result.subjects || Array.from(new Set(result.questions.map(question => question.subject))),
    score: result.score,
    total: result.total,
    duration: result.duration,
    mode: result.mode,
    examType: result.examType,
    answers: result.answers,
    questions: result.questions.map(question => toCachedQuestion(question, examId)),
    subjectScores,
    completedAt: result.date,
    status: "pending",
    createdAt: Date.now(),
  };

  const existing = await offlineDb.attempts.where("clientAttemptId").equals(clientAttemptId).first();
  if (existing?.id) record.id = existing.id;
  await offlineDb.attempts.put(record);
  return clientAttemptId;
}

export async function markAttemptSynced(clientAttemptId: string): Promise<void> {
  const row = await offlineDb.attempts.where("clientAttemptId").equals(clientAttemptId).first();
  if (row?.id) await offlineDb.attempts.update(row.id, { status: "synced", syncError: undefined });
}

export async function markAttemptFailed(clientAttemptId: string, message: string): Promise<void> {
  const row = await offlineDb.attempts.where("clientAttemptId").equals(clientAttemptId).first();
  if (row?.id) await offlineDb.attempts.update(row.id, { status: "failed", syncError: message });
}

export async function saveExamResult(result: LocalResult): Promise<void> {
  const clientAttemptId = result.clientAttemptId || `cbt-${result.id}`;
  const examId = String(result.examId || "");
  await offlineDb.exams.bulkPut({
    id: result.id,
    title: result.examTitle || result.title || result.subject || "Exam",
    examType: result.examType,
    subjects: result.subjects || [],
    year: result.year || 0,
    duration: result.duration || "0m",
    totalQuestions: result.total,
    scheduledAt: result.date,
    cachedAt: Date.now()
  });
}

export async function saveDraft(key: string, answers: (number | null)[], questions: AttemptQuestion[], current: number, timeLeft: number): Promise<void> {
  const answerMap: Record<string, number | null> = {};
  questions.forEach((question, index) => { answerMap[String(question.id)] = answers[index] ?? null; });
  await offlineDb.drafts.put({ key, answers: answerMap, current, timeLeft, updatedAt: Date.now() });
}

export async function loadDraft(key: string) {
  return offlineDb.drafts.get(key);
}

export async function clearDraft(key: string): Promise<void> {
  await offlineDb.drafts.delete(key);
}

export async function pendingAttemptCount(): Promise<number> {
  return offlineDb.attempts.where("status").anyOf("pending", "failed").count();
}
