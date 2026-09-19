import { useState, useEffect } from "react";
// @ts-ignore: no declaration file for ../firebase (it's a JS module)
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, signOut, User } from "firebase/auth";
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, doc, deleteDoc } from "firebase/firestore";
import "./AdminDashboard.css";

const defaultSubjects = ["Mathematics","English","Physics","Chemistry","Biology","Government","Economics","Literature","CRS","Geography"];
const defaultExamTypes = ["JAMB","WAEC","NECO","POSTUTME"];

type Exam = { id: string; title: string; subject: string; examType: string; year: number; duration: number; }

export default function AdminDashboard({ setActivePage }: { setActivePage: (p:string)=>void }) {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("Lawrenceifeanyi0001@gmail.com");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<"exams"|"questions">("exams");
  const [exams, setExams] = useState<Exam[]>([]);
  const [examTypes, setExamTypes] = useState<string[]>(defaultExamTypes);
  const [subjects, setSubjects] = useState<string[]>(defaultSubjects);
  const [selectedExam, setSelectedExam] = useState("");

  const [eTitle, setETitle] = useState("");
  const [eSubject, setESubject] = useState(defaultSubjects[0]);
  const [eType, setEType] = useState(defaultExamTypes[0]);
  const [customType, setCustomType] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [showCustomType, setShowCustomType] = useState(false);
  const [showCustomSubject, setShowCustomSubject] = useState(false);
  const [eYear, setEYear] = useState("2024");
  const [eDuration, setEDuration] = useState("60");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["","","",""]);
  const [correct, setCorrect] = useState("A");
  const [explanation, setExplanation] = useState("");

  const fetchExams = async () => {
    const q = query(collection(db, "exams"), orderBy("createdAt","desc"));
    const snap = await getDocs(q);
    const list = snap.docs.map(d=>({ id: d.id,...d.data() } as Exam));
    setExams(list);
    const typesFromDb = [...new Set(list.map(e=>e.examType))];
    const subsFromDb = [...new Set(list.map(e=>e.subject))];
    setExamTypes([...new Set([...defaultExamTypes,...typesFromDb])]);
    setSubjects([...new Set([...defaultSubjects,...subsFromDb])]);
    if(list[0] &&!selectedExam) setSelectedExam(list[0].id);
  };

  useEffect(()=>{ if(user) fetchExams(); }, [user]);

  const handleLogin = async () => {
    try { const r = await signInWithEmailAndPassword(auth, email, password); setUser(r.user); }
    catch(e:any){ alert(e.message); }
  };

  const addCustomType = () => {
    if(!customType.trim()) return;
    const t = customType.trim().toUpperCase();
    if(!examTypes.includes(t)) setExamTypes([...examTypes, t]);
    setEType(t); setCustomType(""); setShowCustomType(false);
  };
  const addCustomSubject = () => {
    if(!customSubject.trim()) return;
    const s = customSubject.trim();
    const formatted = s.charAt(0).toUpperCase() + s.slice(1);
    if(!subjects.includes(formatted)) setSubjects([...subjects, formatted]);
    setESubject(formatted); setCustomSubject(""); setShowCustomSubject(false);
  };

  const addExam = async (e:React.FormEvent) => {
    e.preventDefault();
    if(!eTitle.trim()) return alert("Enter Exam Title");
    setLoading(true);
    try{
      await addDoc(collection(db,"exams"), {
        title: eTitle.trim(), subject: eSubject, examType: eType,
        year: Number(eYear), duration: Number(eDuration),
        createdBy: user?.uid, createdAt: serverTimestamp()
      });
      setMsg(`✅ "${eTitle}" created!`); setETitle(""); fetchExams();
      setTimeout(()=>setMsg(""),3000);
    }catch(err:any){ alert(err.message); }
    setLoading(false);
  };

  const addQuestion = async (e:React.FormEvent) => {
    e.preventDefault();
    if(!selectedExam) return alert("Select exam");
    setLoading(true);
    try{
      const ex = exams.find(x=>x.id===selectedExam);
      await addDoc(collection(db,"questions"), {
        examId: selectedExam, title: ex?.title, subject: ex?.subject, examType: ex?.examType, year: ex?.year,
        question, options: { A:options[0], B:options[1], C:options[2], D:options[3] },
        correctAnswer: correct, explanation, createdAt: serverTimestamp()
      });
      setMsg("✅ Question added!"); setQuestion(""); setOptions(["","","",""]); setExplanation("");
      setTimeout(()=>setMsg(""),3000);
    }catch(err:any){ alert(err.message); }
    setLoading(false);
  };

  if(!user) return (
    <div className="admin-wrap"><div className="admin-login-card">
      <div className="admin-logo">YOURCBT<span>ADMIN</span></div>
      <h2>Admin Login</h2><p className="admin-sub">Manage exams & questions</p>
      <div className="admin-field"><label>Email</label><input value={email} onChange={e=>setEmail(e.target.value)}/></div>
      <div className="admin-field"><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)}/></div>
      <button className="admin-btn primary" onClick={handleLogin}>Sign In</button>
      <button className="admin-btn ghost" onClick={()=>setActivePage('home')}>← Home</button>
    </div></div>
  );

  return (
    <div className="admin-wrap"><div className="admin-panel">
      <div className="admin-header">
        <div><div className="admin-logo small">YOURCBT<span>ADMIN</span></div><p>{user.email}</p></div>
        <div style={{display:"flex",gap:8}}><span className="admin-pill">{exams.length} Exams</span><button className="admin-btn danger-sm" onClick={()=>signOut(auth).then(()=>setUser(null))}>Logout</button></div>
      </div>

      <div className="admin-tabs">
        <button className={tab==="exams"?"active":""} onClick={()=>setTab("exams")}>📚 Exams</button>
        <button className={tab==="questions"?"active":""} onClick={()=>setTab("questions")}>❓ Questions</button>
      </div>

      {msg && <div className="admin-toast success">{msg}</div>}

      {tab==="exams"? (
        <>
        <form onSubmit={addExam} className="admin-form">
          <div className="admin-field">
            <label>Exam Title *</label>
            <input value={eTitle} onChange={e=>setETitle(e.target.value)} placeholder="e.g JAMB 2025 Full Mock, My Custom CBT" required className="big-input"/>
          </div>
          <div className="admin-row">
            <div className="admin-field">
              <label>Exam Type *</label>
              <div className="flex-input">
                <select value={eType} onChange={e=>setEType(e.target.value)}><option value="">Select Type</option>{examTypes.map(t=><option key={t} value={t}>{t}</option>)}</select>
                <button type="button" className="admin-btn icon-btn" onClick={()=>setShowCustomType(!showCustomType)}>+</button>
              </div>
              {showCustomType && (
                <div className="custom-box"><input value={customType} onChange={e=>setCustomType(e.target.value)} placeholder="e.g JAMB, ICAN, CUSTOM"/><button type="button" className="admin-btn primary sm" onClick={addCustomType}>Add</button></div>
              )}
            </div>

            <div className="admin-field">
              <label>Subject *</label>
              <div className="flex-input">
                <select value={eSubject} onChange={e=>setESubject(e.target.value)}>{subjects.map(s=><option key={s} value={s}>{s}</option>)}</select>
                <button type="button" className="admin-btn icon-btn" onClick={()=>setShowCustomSubject(!showCustomSubject)}>+</button>
              </div>
              {showCustomSubject && (
                <div className="custom-box"><input value={customSubject} onChange={e=>setCustomSubject(e.target.value)} placeholder="e.g Marketing, Data Science"/><button type="button" className="admin-btn primary sm" onClick={addCustomSubject}>Add</button></div>
              )}
            </div>
          </div>

          <div className="admin-row">
            <div className="admin-field"><label>Year</label><input type="number" value={eYear} onChange={e=>setEYear(e.target.value)} /></div>
            <div className="admin-field"><label>Duration (mins)</label><input type="number" value={eDuration} onChange={e=>setEDuration(e.target.value)} /></div>
          </div>
          <button className="admin-btn primary lg" disabled={loading}>{loading?"Creating...":"Create Exam"}</button>
        </form>

        <div className="exam-list">
          {exams.map(ex=>(
            <div key={ex.id} className="exam-card">
              <div className="exam-info"><b>{ex.title}</b><div className="exam-meta"><span className="badge">{ex.examType}</span><span className="badge2">{ex.subject}</span><span>{ex.year} • {ex.duration}min</span></div></div>
              <button className="del-btn" onClick={async()=>{ if(confirm("Delete?")){ await deleteDoc(doc(db,"exams",ex.id)); fetchExams(); } }}>🗑️</button>
            </div>
          ))}
          {exams.length===0 && <p className="empty-text">No exams yet. Create your first exam above.</p>}
        </div>
        </>
      ): (
        <form onSubmit={addQuestion} className="admin-form">
          <div className="admin-field"><label>Select Exam *</label>
            <select value={selectedExam} onChange={e=>setSelectedExam(e.target.value)} required>
              <option value="">-- Choose Exam --</option>
              {exams.map(ex=><option key={ex.id} value={ex.id}>{ex.title} ({ex.examType} - {ex.subject})</option>)}
            </select>
          </div>
          <div className="admin-field"><label>Question</label><textarea value={question} onChange={e=>setQuestion(e.target.value)} rows={4} required/></div>
          <div className="admin-options-grid">
            {["A","B","C","D"].map((o,i)=>(
              <div key={o} className={`admin-field option-field ${correct===o?'is-correct':''}`}>
                <label>Option {o}</label><input value={options[i]} onChange={e=>{const n=[...options]; n[i]=e.target.value; setOptions(n)}} required />
              </div>
            ))}
          </div>
          <div className="admin-row">
            <div className="admin-field"><label>Correct</label><select value={correct} onChange={e=>setCorrect(e.target.value)}><option>A</option><option>B</option><option>C</option><option>D</option></select></div>
            <div className="admin-field" style={{flex:2}}><label>Explanation</label><input value={explanation} onChange={e=>setExplanation(e.target.value)} placeholder="Optional"/></div>
          </div>
          <button className="admin-btn primary lg" disabled={loading}>{loading?"Adding...":"Add to Exam"}</button>
        </form>
      )}
    </div></div>
  );
}