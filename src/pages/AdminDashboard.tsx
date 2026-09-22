import { useState, useEffect } from "react";
import "./AdminDashboard.css";
import { API_URL as API } from "../config"; // <-- FIXED, uses your live link

const defaultSubjects = ["Mathematics","English","Physics","Chemistry","Biology","Government","Economics","Literature","CRS","Geography"];
const defaultExamTypes = ["JAMB","WAEC","NECO","POSTUTME"];

type Exam = { id: string; title: string; examType: string; year: number; duration: number; subjects: string[] }

export default function AdminDashboard({ setActivePage }: { setActivePage: (p:string)=>void }) {
  const [user, setUser] = useState<any>(() => {
    const s = localStorage.getItem('cbt_user');
    return s? JSON.parse(s) : null;
  });
  const [email, setEmail] = useState("Lawrenceifeanyi0001@gmail.com");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<"exams"|"questions">("exams");
  const [exams, setExams] = useState<Exam[]>([]);
  const [examTypes] = useState<string[]>(defaultExamTypes);
  const [allSubjects] = useState(defaultSubjects);

  const [eTitle, setETitle] = useState("");
  const [eType, setEType] = useState(defaultExamTypes[0]);
  const [customType, setCustomType] = useState("");
  const [showCustomType, setShowCustomType] = useState(false);
  const [eYear, setEYear] = useState("2024");
  const [eDuration, setEDuration] = useState("60");
  const [eSubjects, setESubjects] = useState<string[]>(["Mathematics","English"]);

  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [expandedExam, setExpandedExam] = useState<string | null>(null);
  const [newSubjectInput, setNewSubjectInput] = useState("");

  const [selectedExam, setSelectedExam] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["","","",""]);
  const [correct, setCorrect] = useState("A");
  const [explanation, setExplanation] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchExams = async () => {
    const res = await fetch(`${API}/api/exams`);
    const data = await res.json();
    const list: Exam[] = data.map((e:any) => ({
      id: String(e.id),
      title: e.title,
      examType: e.examType,
      year: e.year,
      duration: e.duration,
      subjects: e.subject? e.subject.split(',').map((s:string)=>s.trim()) : []
    }));
    setExams(list);
    if(list[0] &&!selectedExam){
      setSelectedExam(list[0].id);
      if(list[0].subjects[0]) setSelectedSubject(list[0].subjects[0]);
    }
  };

  useEffect(()=>{ if(user) fetchExams(); }, [user]);
  useEffect(()=>{
    const ex = exams.find(x=>x.id===selectedExam);
    if(ex && ex.subjects.length>0 &&!ex.subjects.includes(selectedSubject)){
      setSelectedSubject(ex.subjects[0]);
    }
  }, [selectedExam, exams]);

  const handleLogin = async () => {
    try{
      const res = await fetch(`${API}/api/admin/login`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({email, password})
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.message);
      setUser(data);
      localStorage.setItem('cbt_user', JSON.stringify(data));
    }catch(e:any){ alert(e.message); }
  };

  const toggleSubjectInNewExam = (sub: string) => {
    setESubjects(prev => prev.includes(sub)? prev.filter(s=>s!==sub) : [...prev, sub]);
  };

  const addCustomType = () => {
    if(!customType.trim()) return;
    const t = customType.trim().toUpperCase();
    setCustomType(""); setShowCustomType(false);
    setEType(t);
  };

  const saveExam = async (e:React.FormEvent) => {
    e.preventDefault();
    if(!eTitle.trim()) return alert("Enter Exam Title");
    if(eSubjects.length===0) return alert("Select at least 1 subject");
    setLoading(true);
    try{
      if(editingExam){
        const res = await fetch(`${API}/api/admin/exam/${editingExam.id}`, {
          method:'PUT', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({title:eTitle, examType:eType, year:Number(eYear), duration:Number(eDuration), subjects:eSubjects})
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.message);
        setMsg(`✅ "${eTitle}" updated!`);
        setEditingExam(null);
      } else {
        const res = await fetch(`${API}/api/admin/create-exam`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({title:eTitle, examType:eType, year:eYear, duration:eDuration, subjects:eSubjects, questions:[]})
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.message);
        setMsg(`✅ "${eTitle}" created with ${eSubjects.length} subjects!`);
      }
      setETitle(""); setESubjects(["Mathematics","English"]); fetchExams();
      setTimeout(()=>setMsg(""),3000);
    }catch(err:any){ alert(err.message); }
    setLoading(false);
  };

  const startEdit = (ex: Exam) => {
    setEditingExam(ex);
    setETitle(ex.title); setEType(ex.examType);
    setEYear(String(ex.year)); setEDuration(String(ex.duration));
    setESubjects(ex.subjects);
    setTab("exams");
    window.scrollTo({top:0, behavior:'smooth'});
  };

  const addSubjectToExistingExam = async (examId: string) => {
    if(!newSubjectInput.trim()) return;
    const ex = exams.find(x=>x.id===examId);
    if(!ex) return;
    const formatted = newSubjectInput.trim().charAt(0).toUpperCase() + newSubjectInput.trim().slice(1);
    if(ex.subjects.includes(formatted)) return alert("Already added");
    const newSubs = [...ex.subjects, formatted];
    await fetch(`${API}/api/admin/exam/${examId}`, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({subjects:newSubs})
    });
    setNewSubjectInput(""); fetchExams();
  };

  const removeSubjectFromExam = async (examId: string, sub: string) => {
    if(!confirm(`Remove ${sub}?`)) return;
    const ex = exams.find(x=>x.id===examId);
    if(!ex) return;
    const newSubs = ex.subjects.filter(s=>s!==sub);
    await fetch(`${API}/api/admin/exam/${examId}`, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({subjects:newSubs})
    });
    fetchExams();
  };

  const addQuestion = async (e:React.FormEvent) => {
    e.preventDefault();
    if(!selectedExam ||!selectedSubject) return alert("Select exam and subject");
    setLoading(true);
    try{
      const res = await fetch(`${API}/api/admin/add-question`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          examId: selectedExam,
          subject: selectedSubject,
          question,
          options: {A:options[0], B:options[1], C:options[2], D:options[3]},
          correctAnswer: correct,
          explanation
        })
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.message);
      setMsg(`✅ Added to ${selectedSubject}!`);
      setQuestion(""); setOptions(["","","",""]); setExplanation("");
      setTimeout(()=>setMsg(""),3000);
    }catch(err:any){ alert(err.message); }
    setLoading(false);
  };

  if(!user) return (
    <div className="admin-wrap"><div className="admin-login-card">
      <div className="admin-logo">EXAMCORE<span>ADMIN</span></div>
      <h2>Admin Login - Flask</h2><p className="admin-sub">Email auth • No Firebase</p>
      <div className="admin-field"><label>Email</label><input value={email} onChange={e=>setEmail(e.target.value)}/></div>
      <div className="admin-field"><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="admin123"/></div>
      <button className="admin-btn primary" onClick={handleLogin}>Sign In to Flask</button>
      <button className="admin-btn ghost" onClick={()=>setActivePage('home')}>← Home</button>
    </div></div>
  );

  return (
    <div className="admin-wrap"><div className="admin-panel">
      <div className="admin-header">
        <div><div className="admin-logo small">EXAMCORE<span>ADMIN</span></div><p>{user.email}</p></div>
        <div style={{display:"flex",gap:8}}><span className="admin-pill">{exams.length} Exams Flask</span><button className="admin-btn danger-sm" onClick={()=>{localStorage.clear(); setUser(null);}}>Logout</button></div>
      </div>

      <div className="admin-tabs">
        <button className={tab==="exams"?"active":""} onClick={()=>setTab("exams")}>📚 Exams</button>
        <button className={tab==="questions"?"active":""} onClick={()=>setTab("questions")}>❓ Questions</button>
      </div>

      {msg && <div className="admin-toast success">{msg}</div>}

      {tab==="exams"? (
        <>
        <form onSubmit={saveExam} className="admin-form">
          <div className="admin-field">
            <label>Exam Title * {editingExam && <span style={{color:'#f59e0b'}}> (Editing)</span>}</label>
            <input value={eTitle} onChange={e=>setETitle(e.target.value)} placeholder="e.g JAMB 2025 Full Mock" required className="big-input"/>
          </div>
          <div className="admin-row">
            <div className="admin-field">
              <label>Exam Type *</label>
              <div className="flex-input">
                <select value={eType} onChange={e=>setEType(e.target.value)}>{defaultExamTypes.map(t=><option key={t} value={t}>{t}</option>)}<option value={eType}>{eType}</option></select>
                <button type="button" className="admin-btn icon-btn" onClick={()=>setShowCustomType(!showCustomType)}>+</button>
              </div>
              {showCustomType && (
                <div className="custom-box"><input value={customType} onChange={e=>setCustomType(e.target.value)} placeholder="e.g CUSTOM"/><button type="button" className="admin-btn primary sm" onClick={addCustomType}>Add</button></div>
              )}
            </div>
            <div className="admin-field"><label>Year</label><input type="number" value={eYear} onChange={e=>setEYear(e.target.value)} /></div>
            <div className="admin-field"><label>Duration</label><input type="number" value={eDuration} onChange={e=>setEDuration(e.target.value)} /></div>
          </div>

          <div className="admin-field">
            <label>Subjects in this Exam * ({eSubjects.length})</label>
            <div style={{display:'flex', flexWrap:'wrap', gap:6, padding:'10px', border:'1px solid #333', borderRadius:8, maxHeight:140, overflowY:'auto', background:'#1a1a1a'}}>
              {allSubjects.map(s=>(
                <label key={s} style={{display:'flex', alignItems:'center', gap:4, background: eSubjects.includes(s)? '#1d4be3':'#2a2a2a', color:'#fff', padding:'4px 10px', borderRadius:20, fontSize:13, cursor:'pointer'}}>
                  <input type="checkbox" checked={eSubjects.includes(s)} onChange={()=>toggleSubjectInNewExam(s)} style={{display:'none'}}/> {s}
                </label>
              ))}
            </div>
          </div>

          <div style={{display:'flex', gap:8}}>
            <button className="admin-btn primary lg" disabled={loading} style={{flex:1}}>{loading? (editingExam?"Updating...":"Creating...") : (editingExam?"Update Exam":"Create Exam in Flask")}</button>
            {editingExam && <button type="button" className="admin-btn ghost" onClick={()=>{setEditingExam(null); setETitle(""); setESubjects(["Mathematics","English"]);}}>Cancel</button>}
          </div>
        </form>

        <div className="exam-list">
          {exams.map(ex=>(
            <div key={ex.id} className="exam-card" style={{flexDirection:'column', alignItems:'stretch', background:'#1a1a1a', border:'1px solid #2a2a2a'}}>
              <div style={{display:'flex', justifyContent:'space-between', width:'100%'}}>
                <div className="exam-info"><b style={{color:'#fff'}}>{ex.title}</b><div className="exam-meta"><span className="badge">{ex.examType}</span><span style={{color:'#888'}}>{ex.year} • {ex.duration}min • {ex.subjects?.length} subjects</span></div></div>
                <div style={{display:'flex', gap:6}}>
                  <button className="admin-btn sm" onClick={()=>setExpandedExam(expandedExam===ex.id? null : ex.id)}>{expandedExam===ex.id? '▲' : '▼'}</button>
                  <button className="admin-btn sm" onClick={()=>startEdit(ex)}>✏️</button>
                  <button className="del-btn" onClick={async()=>{ if(confirm("Delete exam?")){ await fetch(`${API}/api/admin/exam/${ex.id}`, {method:'DELETE'}); fetchExams(); } }}>🗑️</button>
                </div>
              </div>
              {expandedExam===ex.id && (
                <div style={{marginTop:12, borderTop:'1px solid #333', paddingTop:10}}>
                  <div style={{display:'flex', flexWrap:'wrap', gap:6, marginBottom:10}}>
                    {ex.subjects?.map((s:string)=>(
                      <span key={s} className="badge2" style={{display:'flex', alignItems:'center', gap:4, background:'#2a2a2a', color:'#fff', padding:'4px 8px', borderRadius:12}}>{s} <span style={{cursor:'pointer'}} onClick={()=>removeSubjectFromExam(ex.id, s)}>×</span></span>
                    ))}
                  </div>
                  <div className="flex-input">
                    <input value={newSubjectInput} onChange={e=>setNewSubjectInput(e.target.value)} placeholder="Add subject e.g Biology" style={{flex:1, background:'#222', color:'#fff', border:'1px solid #333'}}/>
                    <button type="button" className="admin-btn primary sm" onClick={()=>addSubjectToExistingExam(ex.id)}>Add</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        </>
      ): (
        <form onSubmit={addQuestion} className="admin-form">
          <div className="admin-row">
            <div className="admin-field" style={{flex:2}}><label>Select Exam *</label>
              <select value={selectedExam} onChange={e=>setSelectedExam(e.target.value)} required>
                <option value="">-- Choose Exam --</option>
                {exams.map(ex=><option key={ex.id} value={ex.id}>{ex.title} ({ex.examType}) - {ex.subjects?.length} subjects</option>)}
              </select>
            </div>
            <div className="admin-field" style={{flex:1}}><label>Subject *</label>
              <select value={selectedSubject} onChange={e=>setSelectedSubject(e.target.value)} required>
                <option value="">-- Subject --</option>
                {exams.find(x=>x.id===selectedExam)?.subjects?.map((s:string)=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="admin-field"><label>Question</label><textarea value={question} onChange={e=>setQuestion(e.target.value)} rows={4} required style={{background:'#1a1a1a', color:'#fff', border:'1px solid #333'}}/></div>
          <div className="admin-options-grid">
            {["A","B","C","D"].map((o,i)=>(
              <div key={o} className={`admin-field option-field ${correct===o?'is-correct':''}`}>
                <label>Option {o}</label><input value={options[i]} onChange={e=>{const n=[...options]; n[i]=e.target.value; setOptions(n)}} required style={{background:'#1a1a1a', color:'#fff'}}/>
              </div>
            ))}
          </div>
          <div className="admin-row">
            <div className="admin-field"><label>Correct</label><select value={correct} onChange={e=>setCorrect(e.target.value)}><option>A</option><option>B</option><option>C</option><option>D</option></select></div>
            <div className="admin-field" style={{flex:2}}><label>Explanation</label><input value={explanation} onChange={e=>setExplanation(e.target.value)} placeholder="Optional" style={{background:'#1a1a1a', color:'#fff'}}/></div>
          </div>
          <button className="admin-btn primary lg" disabled={loading}>{loading?"Adding to Flask...":`Add to ${selectedSubject || 'Exam'}`}</button>
        </form>
      )}
    </div></div>
  );
}