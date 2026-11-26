import { offlineDb, toCloneable, type CachedQuestion, type OfflineAttempt } from "./db";

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
  year?: number;
  totalQuestions?: number;
};

function toCachedQuestion(question: AttemptQuestion, examId: string): CachedQuestion {
  return {
    cacheKey: `${examId}:${question.id ?? question.question.slice(0, 40)}`,
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
  await offlineDb.attempts.put(toCloneable(record));
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

export async function saveExamResult(_result: LocalResult): Promise<void> {
  // Intentionally does NOT write to the `exams` store.
  //
  // The `exams` store holds downloaded-exam metadata (the permanent offline
  // question bank). Writing a result here with a timestamp id polluted the exam
  // list: offline, the JAMB/CBT cards resolve an exam with
  // examsFromDb.find(examTypeMatches(...)) and picked the newest (fake) entry,
  // whose id has no cached questions — so the downloaded questions appeared to
  // vanish after submitting.
  //
  // Results are persisted separately: saveOfflineAttempt() writes the attempt
  // (answers + score + question snapshot) to the `attempts` store, and
  // TestPage stores `lastTestResult` in localStorage. Nothing here touches the
  // downloaded question bank.
}

export async function saveDraft(key: string, answers: (number | null)[], questions: AttemptQuestion[], current: number, timeLeft: number): Promise<void> {
  const answerMap: Record<string, number | null> = {};
  questions.forEach((question, index) => { answerMap[String(question.id)] = answers[index] ?? null; });
  await offlineDb.drafts.put(toCloneable({ key, answers: answerMap, current, timeLeft, updatedAt: Date.now() }));
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
