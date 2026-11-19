import { apiRequest } from "../api";
import { offlineDb, type OfflineAttempt, type StudyActivity } from "./db";
import { markAttemptFailed, markAttemptSynced } from "./attempts";

let syncing = false;

async function markStudyActivity(activity: StudyActivity, status: "synced" | "failed", syncError?: string) {
  if (activity.id) await offlineDb.studyActivity.update(activity.id, { status, syncError });
}

async function syncStudyActivity(activity: StudyActivity): Promise<void> {
  await apiRequest("/api/save-result", {
    method: "POST",
    body: JSON.stringify({
      title: `${activity.subject}${activity.topic ? ` - ${activity.topic}` : ""}`,
      score: activity.score,
      total: activity.total,
      duration: activity.duration || "0m",
      status: activity.total > 0 && activity.score / activity.total >= 0.5 ? "Passed" : "Failed",
      mode: "study",
      examType: activity.examType || "GENERAL",
      clientAttemptId: activity.clientActivityId,
    }),
  });
  await markStudyActivity(activity, "synced");
}

async function syncOne(attempt: OfflineAttempt): Promise<void> {
  if (attempt.mode === "study") {
    await markAttemptSynced(attempt.clientAttemptId);
    return;
  }

  if (attempt.examId) {
    for (const subjectScore of attempt.subjectScores) {
      if (!subjectScore.subject) continue;
      await apiRequest("/api/attempts", {
        method: "POST",
        body: JSON.stringify({
          examId: attempt.examId,
          subject: subjectScore.subject,
          score: subjectScore.score,
          total: subjectScore.total,
          clientAttemptId: `${attempt.clientAttemptId}:${subjectScore.subject}`,
        }),
      });
    }
  }

  await apiRequest("/api/save-result", {
    method: "POST",
    body: JSON.stringify({
      title: attempt.examTitle || attempt.subject || "Exam",
      score: attempt.score,
      total: attempt.total,
      duration: attempt.duration || "0m",
      status: attempt.total > 0 && attempt.score / attempt.total >= 0.5 ? "Passed" : "Failed",
      mode: attempt.mode || "exam",
      examType: attempt.examType || "GENERAL",
      clientAttemptId: attempt.clientAttemptId,
    }),
  });

  await markAttemptSynced(attempt.clientAttemptId);
}

export async function syncPendingAttempts(): Promise<{ synced: number; failed: number }> {
  if (syncing || typeof navigator !== "undefined" && !navigator.onLine) return { synced: 0, failed: 0 };
  syncing = true;
  let synced = 0;
  let failed = 0;
  try {
    const rows = await offlineDb.attempts.where("status").anyOf("pending", "failed").toArray();
    for (const row of rows) {
      try {
        await syncOne(row);
        synced += 1;
      } catch (error) {
        failed += 1;
        await markAttemptFailed(row.clientAttemptId, error instanceof Error ? error.message : "Synchronization failed.");
      }
    }
    const studyRows = await offlineDb.studyActivity.where("status").anyOf("pending", "failed").toArray();
    for (const row of studyRows) {
      try {
        await syncStudyActivity(row);
        synced += 1;
      } catch (error) {
        failed += 1;
        await markStudyActivity(row, "failed", error instanceof Error ? error.message : "Synchronization failed.");
      }
    }
  } finally {
    syncing = false;
  }
  return { synced, failed };
}

export function startOfflineSync(): void {
  if (typeof window === "undefined") return;
  const run = () => { void syncPendingAttempts(); };
  window.addEventListener("online", run);
  window.setTimeout(run, 1500);
  window.setInterval(run, 60000);
}
