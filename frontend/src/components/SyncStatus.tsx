import { useEffect, useState } from "react";
import { CloudDownload, CloudOff, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { subscribeSyncProgress, getSyncProgress, type SyncProgress } from "../offline/questions";

// Small, non-intrusive banner that reports automatic offline preparation.
// It only appears while syncing, on completion, or on error, and can be
// dismissed. It never blocks the UI.
export default function SyncStatus() {
  const [progress, setProgress] = useState<SyncProgress>(() => getSyncProgress());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
    return subscribeSyncProgress((next) => setProgress(next));
  }, []);

  useEffect(() => {
    if (progress.phase === "ready" || progress.phase === "error") {
      const timer = window.setTimeout(() => setDismissed(true), 8000);
      return () => window.clearTimeout(timer);
    }
  }, [progress.phase, progress.updatedAt]);

  if (dismissed || progress.phase === "idle") return null;

  const palette =
    progress.phase === "error"
      ? { color: "var(--danger, #ef4444)", Icon: AlertTriangle }
      : progress.phase === "ready"
        ? { color: "var(--success, #22c55e)", Icon: CheckCircle2 }
        : { color: "var(--text-secondary, #8f9091)", Icon: CloudDownload };

  const { Icon } = palette;

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={() => setDismissed(true)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        margin: "8px 14px 0",
        borderRadius: 10,
        border: "1px solid var(--border, #2a3242)",
        background: "var(--bg-raised, #111827)",
        color: palette.color,
        fontSize: 12,
        cursor: "pointer",
      }}
    >
      {progress.phase === "syncing" ? <Loader2 size={15} className="spin" /> : <Icon size={15} />}
      <span style={{ flex: 1 }}>
        {progress.message || (progress.phase === "syncing" ? "Preparing offline questions…" : "")}
        {progress.phase === "syncing" && progress.total > 0
          ? ` (${progress.stored}/${progress.total})`
          : ""}
      </span>
      {progress.phase === "error" && <CloudOff size={14} />}
    </div>
  );
}