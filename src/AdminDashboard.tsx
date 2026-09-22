import { useState } from "react";
import "./AdminDashboard.css";

const examTypes = ["JAMB","WAEC","NECO","POST UTME","GENERAL"];

type QuestionItem = {
  question: string
  options: string[]
  correctAnswer: string
  explanation: string
  subject: string
}

export default function AdminDashboard({ setActivePage }: { setActivePage: (p: string) => void }) {
  const [email, setEmail] = useState("Lawrenceifeanyi0001@gmail.com");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<any>(() => {
    const s = localStorage.getItem('cbt_user');
    return s? JSON.parse(s) : null;
  });
  const [message, setMessage] = useState("");
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
      const res = await fetch('http://127.0.0.1:5000/api/admin/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.message);
      setUser(data);
      localStorage.setItem('cbt_user', JSON.stringify(data));
    } catch (err: any) { alert(err.message); }
  };

  const addSubject = () => {
    const s = customSubject.trim();
    if (!s) return;
    if (!allSubjects.includes(s)) setAllSubjects(p => [...p, s]);
    if (!selectedExamSubjects.includes(s)) setSelectedExamSubjects(p => [...p, s]);
    setCustomSubject("");
  };
  const toggleExamSubject = (subj: string) => {
    setSelectedExamSubjects(prev => prev.includes(subj)? prev.filter(x=>x!==subj) : [...prev, subj]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert("Login first");
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:5000/api/admin/create-exam', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ title: examTitle, examType, subjects: selectedExamSubjects, year, duration, questions })
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.message);
      setMessage(`✅ Saved!`);
    } catch (err: any) { alert(err.message); }
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="admin-wrap">
        <div className="admin-login-card">
          <div className="admin-logo">EXAMCORE<span>ADMIN</span></div>
          <h2>Admin Login (Flask)</h2>
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
          <div><h2>Create Exam</h2><p>{user.email}</p></div>
          <button className="admin-btn danger-sm" onClick={() => { localStorage.clear(); setUser(null); }}>Logout</button>
        </div>
        {message && <div className="admin-toast success">{message}</div>}
        <div className="admin-field"><label>Title</label><input value={examTitle} onChange={e => setExamTitle(e.target.value)} /></div>
        <div className="admin-field"><label>Subjects - type and add</label>
          <div style={{display:'flex', gap:8}}><input value={customSubject} onChange={e => setCustomSubject(e.target.value)} /><button type="button" onClick={addSubject}>Add</button></div>
          <div style={{display:'flex', gap:6, marginTop:8, flexWrap:'wrap'}}>{allSubjects.map(s=><span key={s} style={{background: selectedExamSubjects.includes(s)? '#1d4be3':'#222', padding:'6px 10px', borderRadius:12}} onClick={()=>toggleExamSubject(s)}>{s}</span>)}</div>
        </div>
        <form onSubmit={handleSave}>
          {questions.map((q,i)=><div key={i} style={{background:'#1a1a1a', padding:12, marginBottom:10, borderRadius:10}}>
            <input placeholder="Question" value={q.question} onChange={e=>{ const c=[...questions]; c[i].question=e.target.value; setQuestions(c)}} style={{width:'100%', marginBottom:8}}/>
            {q.options.map((opt,oi)=><input key={oi} placeholder={`Option ${oi+1}`} value={opt} onChange={e=>{ const c=[...questions]; c[i].options[oi]=e.target.value; setQuestions(c)}} style={{width:'48%', margin:'4px'}}/>)}
            <input placeholder="Subject for this Q" value={q.subject} onChange={e=>{ const c=[...questions]; c[i].subject=e.target.value; setQuestions(c)}} />
          </div>)}
          <button type="button" onClick={()=>setQuestions([...questions,{question:"",options:["","","",""],correctAnswer:"A",explanation:"",subject:""}])}>+ Add Q</button>
          <button type="submit" disabled={loading}>{loading? "Saving...":"Save to Flask"}</button>
        </form>
      </div>
    </div>
  );
}