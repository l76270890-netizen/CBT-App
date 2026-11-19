import { useEffect, useState } from "react";
import { Cloud, CloudOff, WifiOff } from "lucide-react";
import { pendingAttemptCount } from "../offline/attempts";
import { pendingStudyActivityCount } from "../offline/study";

export default function OfflineStatus() {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    const updatePending = () => { void Promise.all([pendingAttemptCount(), pendingStudyActivityCount()]).then(([attempts, study]) => setPending(attempts + study)).catch(() => {}); };
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    window.addEventListener("online", updatePending);
    updatePending();
    const timer = window.setInterval(updatePending, 15000);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      window.removeEventListener("online", updatePending);
      window.clearInterval(timer);
    };
  }, []);

  if (online && pending === 0) return <span title="Online" style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,color:'var(--text-secondary, #8f9091)'}}><Cloud size={14}/> Online</span>;

  return (
    <span title={online ? `${pending} pending result(s)` : 'Offline mode'} style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,color:online ? 'var(--warning, #f59e0b)' : 'var(--danger, #ef4444)'}}>
      {online ? <Cloud size={14}/> : <WifiOff size={14}/>}
      {online ? `${pending} pending` : 'Offline'}
      {!online && pending > 0 ? <><CloudOff size={12}/> {pending}</> : null}
    </span>
  );
}
