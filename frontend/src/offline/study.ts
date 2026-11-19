import { offlineDb, type StudyActivity, type StudyQuestion } from "./db";
import { cacheQuestionImage } from "./questions";

function normalizeStudyQuestion(raw: any, examType: string, subject: string): StudyQuestion | null {
  if (!raw || !raw.question) return null;
  const options = Array.isArray(raw.options)
    ? raw.options
    : [raw.options?.A, raw.options?.B, raw.options?.C, raw.options?.D];
  if (options.length < 4 || options.some((option: unknown) => typeof option !== "string")) return null;
  const answer = typeof raw.answer === "number"
    ? raw.answer
    : Math.max(0, ["A", "B", "C", "D"].indexOf(String(raw.correctAnswer || raw.answer || "A").toUpperCase()));
  const year = Number(raw.year);
  return {
    cacheKey: `${examType}:${raw.id ?? `${subject}-${String(raw.question).slice(0, 40)}`}`,
    id: raw.id ?? `${subject}-${String(raw.question).slice(0, 40)}`,
    examType,
    subject: raw.subject || subject,
    topic: raw.topic || "",
    year: Number.isFinite(year) ? year : undefined,
    question: String(raw.question),
    options: options.map((option: string) => String(option)),
    answer,
    explanation: raw.explanation || "",
    imageUrl: raw.imageUrl || raw.image_url || undefined,
    cachedAt: Date.now(),
  };
}

export async function cacheStudyMeta(examType: string, data: any): Promise<void> {
  const topicsBySubject = data?.topicsBySubject && typeof data.topicsBySubject === "object" ? data.topicsBySubject : {};
  const availability = data?.availability && typeof data.availability === "object" ? data.availability : {};
  await offlineDb.studyMeta.put({ examType, topicsBySubject, availability, cachedAt: Date.now() });
}

export async function loadStudyMeta(examType: string) {
  return offlineDb.studyMeta.get(examType);
}

export async function cacheStudyQuestions(examType: string, subject: string, rows: any[]): Promise<StudyQuestion[]> {
  const questions = rows
    .map((row) => normalizeStudyQuestion(row, examType, subject))
    .filter((row): row is StudyQuestion => Boolean(row));
  if (questions.length) await offlineDb.studyQuestions.bulkPut(questions);
  for (const question of questions) {
    if (question.imageUrl) await cacheQuestionImage(question.imageUrl);
  }
  return questions;
}

export async function loadStudyQuestions(examType: string, subject: string, topic?: string, year?: string): Promise<StudyQuestion[]> {
  const rows = await offlineDb.studyQuestions.where("examType").equals(examType).toArray();
  const filtered = rows.filter((row) =>
    row.subject.toLowerCase() === subject.toLowerCase() &&
    (!topic || row.topic.toLowerCase() === topic.toLowerCase()) &&
    (!year || /^all$/i.test(year) || row.year === Number(year))
  );
  return filtered.sort((a, b) => (b.year || 0) - (a.year || 0));
}

export async function queueStudyActivity(activity: Omit<StudyActivity, "id" | "status" | "createdAt">): Promise<void> {
  const existing = await offlineDb.studyActivity.where("clientActivityId").equals(activity.clientActivityId).first();
  if (existing) return;
  await offlineDb.studyActivity.put({ ...activity, status: "pending", createdAt: Date.now() });
}

export async function pendingStudyActivityCount(): Promise<number> {
  return offlineDb.studyActivity.where("status").anyOf("pending", "failed").count();
}
