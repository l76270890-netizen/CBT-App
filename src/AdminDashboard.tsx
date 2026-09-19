import { useState } from "react";
import { auth, db } from "./firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { collection, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import "./AdminDashboard.css";

const examTypes = ["JAMB","WAEC","NECO","POST UTME","GENERAL"];

type QuestionItem = {
  question: string
  options: string[]
  correctAnswer: string
  explanation: string
  subject: string
}

type Props = { setActivePage: (page: string) => void }

export default function AdminDashboard({ setActivePage }: Props) {
  const [email, setEmail] = useState("Lawrenceifeanyi0001@gmail.com");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");

  // EMPTY START - YOU ADD YOUR OWN
  const [allSubjects, setAllSubjects] = useState<string[]>([]);
  const [selectedExamSubjects, setSelectedExamSubjects] = useState<string[]>([]);
  const [customSubject, setCustomSubject] = useState("");

  const [examTitle, setExamTitle] = useState("");
  const [examType, setExamType] = useState("JAMB");
  const [year, setYear] = useState("2024");
  const [duration, setDuration] = useState("60");

  const [questions, setQuestions] = useState<QuestionItem[]>([
    { question: "", options: ["","","",""], correctAnswer: "A", explanation: "", subject: "" }
  ]);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      setUser(res.user);
    } catch (err: any) { alert(err.message); }
  };

  // ADD SUBJECT - THIS IS HOW YOU CREATE SUBJECTS
  const addSubject = () => {
    const s = customSubject.trim();
    if (!s) return;
    if (s.length < 2) return alert("Subject too short");
    const exists = allSubjects.some(a => a.toLowerCase() === s.toLowerCase());
    if (!exists) setAllSubjects(prev => [...prev, s]);
    if (!selectedExamSubjects.some(a => a.toLowerCase() === s.toLowerCase())) {
      setSelectedExamSubjects(prev => [...prev, s]);
    }
    // auto set first question subject if empty
    setQuestions(prev => prev.map(q => q.subject? q : {...q, subject: s }));
    setCustomSubject("");
  }

  const toggleExamSubject = (subj: string) => {
    setSelectedExamSubjects(prev =>
      prev.includes(subj)? prev.filter(x => x!== subj) : [...prev, subj]
    );
  }

  const removeSubjectCompletely = (subj: string) => {
    setAllSubjects(prev => prev.filter(s => s!== subj));
    setSelectedExamSubjects(prev => prev.filter(s => s!== subj));
  }

  const updateQuestion = (i: number, field: string, value: any) => {
    setQuestions(prev => {
      const c = [...prev];
      (c[i] as any)[field] = value;
      return c;
    });
  }
  const updateOption = (qi: number, oi: number, v: string) => {
    setQuestions(prev => {
      const c = [...prev];
      c[qi].options[oi] = v;
      return c;
    });
  }
  const addNewQuestionField = () => {
    setQuestions(prev => [...prev, {
      question: "", options: ["","","",""], correctAnswer: "A", explanation: "",
      subject: selectedExamSubjects[0] || ""
    }]);
  }
  const removeQuestion = (i: number) => {
    if (questions.length === 1) return;
    setQuestions(p => p.filter((_, idx) => idx!== i));
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert("Login first");
    if (!examTitle.trim()) return alert("Enter title");
    if (selectedExamSubjects.length === 0) return alert("Add and mark at least 1 subject");
    if (questions.some(q =>!q.subject)) return alert("Select subject for each question");
    if (questions.some(q =>!q.question.trim() || q.options.some(o =>!o.trim()))) return alert("Fill all questions");

    setLoading(true);
    try {
      const examId = doc(collection(db, "exams")).id;
      await writeBatch(db).set(doc(db, "exams", examId), {
        id: examId,
        title: examTitle.trim(),
        examType,
        subjects: selectedExamSubjects, // <-- multiple subjects in one exam
        subject: selectedExamSubjects[0],
        year: Number(year),
        duration: Number(duration),
        totalQuestions: questions.length,
        createdBy: user.uid,
        createdAt: serverTimestamp()
      }).commit();

      for (let i = 0; i < questions.length; i += 400) {
        const chunk = questions.slice(i, i + 400);
        const qb = writeBatch(db);
        chunk.forEach(q => {
          qb.set(doc(collection(db, "questions")), {
            examId,
            examTitle: examTitle.trim(),
            examType,
            subject: q.subject,
            year: Number(year),
            question: q.question.trim(),
            options: { A: q.options[0].trim(), B: q.options[1].trim(), C: q.options[2].trim(), D: q.options[3].trim() },
            correctAnswer: q.correctAnswer,
            explanation: q.explanation.trim(),
            createdBy: user.uid,
            createdAt: serverTimestamp()
          });
        });
        await qb.commit();
      }

      setMessage(`✅ "${examTitle}" saved with ${selectedExamSubjects.length} subjects and ${questions.length} questions!`);
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) { alert(err.message); }
    setLoading(false);
  }

  if (!user) {
    return (
      <div className="admin-wrap">
        <div className="admin-login-card">
          <div className="admin-logo">YOURCBT<span>ADMIN</span></div>
          <h2>Admin Login</h2>
          <div className="admin-field"><label>Email</label><input value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div className="admin-field"><label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} /></div>
          <button className="admin-btn primary" onClick={handleLogin}>Sign In</button>
          <button className="admin-btn ghost" onClick={() => setActivePage('home')}>← Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-wrap">
      <div className="admin-panel">
        <div className="admin-header">
          <div><div className="admin-logo small">YOURCBT<span>ADMIN</span></div><h2>Create Exam (Multi-Subject)</h2><p>{user.email}</p></div>
          <button className="admin-btn danger-sm" onClick={() => signOut(auth).then(() => setUser(null))}>Logout</button>
        </div>

        {message && <div className="admin-toast success">{message}</div>}

        <div style={{ background: '#1a1a1a', padding: 16, borderRadius: 12, marginBottom: 16, border: '1px solid #2a2a2a' }}>
          <h3 style={{ color: '#fff', marginBottom: 12 }}>1. Exam Info</h3>
          <div className="admin-row">
            <div className="admin-field" style={{ flex: 2 }}><label>Exam Title</label><input value={examTitle} onChange={e => setExamTitle(e.target.value)} placeholder="e.g. JAMB 2024" /></div>
            <div className="admin-field"><label>Type</label><select value={examType} onChange={e => setExamType(e.target.value)}>{examTypes.map(t => <option key={t}>{t}</option>)}</select></div>
            <div className="admin-field"><label>Year</label><input type="number" value={year} onChange={e => setYear(e.target.value)} /></div>
            <div className="admin-field"><label>Duration</label><input type="number" value={duration} onChange={e => setDuration(e.target.value)} /></div>
          </div>

          <label style={{ color: '#fff', fontWeight: 700, marginTop: 16, display: 'block' }}>ADD SUBJECTS FOR THIS EXAM</label>
          <p style={{ color: '#888', fontSize: 12, margin: '4px 0 10px' }}>Type any subject and click Add. You can add many. Then MARK which ones to use.</p>

          <div style={{ display: 'flex', gap: 8 }}>
            <input value={customSubject} onChange={e => setCustomSubject(e.target.value)} placeholder="Type subject e.g. Mathematics"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubject(); } }}
              style={{ flex: 1, padding: '12px', borderRadius: 8, background: '#222', color: '#fff', border: '1px solid #333' }} />
            <button type="button" className="admin-btn primary" onClick={addSubject} style={{ padding: '0 24px' }}>+ Add Subject</button>
          </div>

          {allSubjects.length === 0? (
            <div style={{ color: '#666', marginTop: 16, padding: 12, border: '1px dashed #333', borderRadius: 8, textAlign: 'center' }}>
              No subjects yet. Add Mathematics, English, etc.
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
              {allSubjects.map(subj => {
                const active = selectedExamSubjects.includes(subj);
                return (
                  <div key={subj} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 20,
                    background: active? '#1d4be3' : '#222', color: active? '#fff' : '#aaa',
                    border: `1px solid ${active? '#1d4be3' : '#333'}`
                  }}>
                    <input type="checkbox" checked={active} onChange={() => toggleExamSubject(subj)} style={{ accentColor: '#1d4be3' }} />
                    <span onClick={() => toggleExamSubject(subj)} style={{ cursor: 'pointer' }}>{subj}</span>
                    <button onClick={() => removeSubjectCompletely(subj)} style={{ marginLeft: 4, background: 'transparent', border: 0, color: '#ff6b6b', cursor: 'pointer' }}>✕</button>
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ marginTop: 12, color: '#fff', fontSize: 13 }}>
            Selected for this exam: <b style={{ color: '#a5b4fc' }}>{selectedExamSubjects.join(', ') || 'None'}</b> ({selectedExamSubjects.length})
          </div>
        </div>

        <form onSubmit={handleSave}>
          <h3 style={{ color: '#fff', marginBottom: 12 }}>2. Questions ({questions.length})</h3>

          {selectedExamSubjects.length === 0 && <div style={{ color: '#ff9', background: '#332a00', padding: 10, borderRadius: 8, marginBottom: 12 }}>Add subjects first to assign to questions</div>}

          {questions.map((q, qi) => (
            <div key={qi} style={{ background: '#1a1a1a', padding: 16, borderRadius: 12, marginBottom: 12, border: '1px solid #2a2a2a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <strong style={{ color: '#fff' }}>Q{qi + 1}</strong>
                <button type="button" className="admin-btn danger-sm" onClick={() => removeQuestion(qi)}>Remove</button>
              </div>

              <div className="admin-row">
                <div className="admin-field" style={{ flex: 1 }}>
                  <label>Subject (choose from marked)</label>
                  <select value={q.subject} onChange={e => updateQuestion(qi, 'subject', e.target.value)} required>
                    <option value="">-- Select --</option>
                    {selectedExamSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="admin-field"><label>Correct</label>
                  <select value={q.correctAnswer} onChange={e => updateQuestion(qi, 'correctAnswer', e.target.value)}><option>A</option><option>B</option><option>C</option><option>D</option></select>
                </div>
              </div>

              <div className="admin-field"><label>Question</label><textarea value={q.question} onChange={e => updateQuestion(qi, 'question', e.target.value)} rows={2} required /></div>
              <div className="admin-options-grid">
                {["A", "B", "C", "D"].map((opt, i) => (
                  <div key={opt} className="admin-field"><label>Option {opt}</label><input value={q.options[i]} onChange={e => updateOption(qi, i, e.target.value)} required /></div>
                ))}
              </div>
              <div className="admin-field"><label>Explanation</label><input value={q.explanation} onChange={e => updateQuestion(qi, 'explanation', e.target.value)} placeholder="Optional" /></div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="admin-btn ghost" onClick={addNewQuestionField}>+ Add Question</button>
            <button type="submit" disabled={loading || selectedExamSubjects.length === 0} className="admin-btn primary lg">
              {loading? "Saving..." : `Save Exam • ${selectedExamSubjects.length} Subjects • ${questions.length} Qs`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}