import { useState, useEffect, type ChangeEvent } from "react";
import Papa from "papaparse";
import { Activity, ArrowRight, BookOpen, Download, FileSpreadsheet, LayoutDashboard, Upload, UsersRound } from "lucide-react";
import "./AdminDashboard.css";
import { API_URL as API } from "../config";

const defaultSubjects = ["Mathematics","English","Physics","Chemistry","Biology","Government","Economics","Literature","CRS","Geography"];
const defaultExamTypes = ["JAMB","WAEC","NECO","POSTUTME"];

// CHANGE THIS TO YOUR REAL ADMIN PASSWORD
const ADMIN_PASSWORD = "admin123";

type Exam = { id: string; title: string; examType: string; year: number; duration: number; subjects: string[]; totalQuestions?: number }
type CsvQuestionRow = {
  rowNumber: number;
  subject: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  errors: string[];
  status?: "imported" | "failed";
  importError?: string;
}

const csvHeaders = ["subject", "question", "optionA", "optionB", "optionC", "optionD", "correctAnswer", "explanation"];
const normalizedCsvHeaders = csvHeaders.map(header => header.toLowerCase());
const maxCsvFileBytes = 5 * 1024 * 1024;
const maxCsvRows = 500;

export default function AdminDashboard({ setActivePage }: { setActivePage: (p:string)=>void }) {
  const [user, setUser] = useState<any>(() => {
    const s = localStorage.getItem('cbt_user');
    return s? JSON.parse(s) : null;
  });
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('admin_unlocked') === 'true';
  });
  const [email, setEmail] = useState("Lawrenceifeanyi0001@gmail.com");
  const [password, setPassword] = useState("");
  const [adminPassInput, setAdminPassInput] = useState("");
  const [adminPassError, setAdminPassError] = useState("");

  const [adminView, setAdminView] = useState<"overview"|"students"|"exams">("overview");
  const [examTab, setExamTab] = useState<"exams"|"questions">("exams");
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
  const [csvRows, setCsvRows] = useState<CsvQuestionRow[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvExamId, setCsvExamId] = useState("");
  const [csvError, setCsvError] = useState("");
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvProgress, setCsvProgress] = useState({ completed: 0, total: 0 });

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
      subjects: e.subject? e.subject.split(',').map((s:string)=>s.trim()) : [],
      totalQuestions: typeof e.totalQuestions === "number" ? e.totalQuestions : undefined
    }));
    setExams(list);
    if(list[0] &&!selectedExam){
      setSelectedExam(list[0].id);
      if(list[0].subjects[0]) setSelectedSubject(list[0].subjects[0]);
    }
  };

  useEffect(()=>{ if(user && isAdminUnlocked) fetchExams(); }, [user, isAdminUnlocked]);
  useEffect(()=>{
    const ex = exams.find(x=>x.id===selectedExam);
    if(ex && ex.subjects.length>0 &&!ex.subjects.includes(selectedSubject)){
      setSelectedSubject(ex.subjects[0]);
    }
  }, [selectedExam, exams]);

  const handleAdminUnlock = () => {
    if(adminPassInput === ADMIN_PASSWORD){
      setIsAdminUnlocked(true);
      localStorage.setItem('admin_unlocked', 'true');
      setAdminPassError("");
      setAdminPassInput("");
    } else {
      setAdminPassError("❌ Wrong admin password!");
    }
  };

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
    setAdminView("exams");
    setExamTab("exams");
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

  const downloadCsvTemplate = () => {
    const blob = new Blob([`${csvHeaders.join(",")}\n`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "exam-questions-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setCsvRows([]);
    setCsvFileName("");
    setCsvExamId("");
    setCsvError("");
    setCsvProgress({ completed: 0, total: 0 });
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setCsvError("Choose a .csv file.");
      return;
    }
    if (file.size > maxCsvFileBytes) {
      setCsvError("This file is larger than 5 MB. Split it into smaller files and try again.");
      return;
    }
    const exam = exams.find(item => item.id === selectedExam);
    if (!exam) {
      setCsvError("Select an exam before uploading the CSV.");
      return;
    }
    if (exam.subjects.length === 0) {
      setCsvError("Add subjects to this exam before importing questions.");
      return;
    }

    try {
      const contents = await file.text();
      const parseWithDelimiter = (delimiter: string) => Papa.parse<Record<string, string>>(contents, {
        header: true,
        delimiter,
        skipEmptyLines: "greedy",
        transformHeader: header => header.trim().toLowerCase().replace(/[^a-z0-9]/g, ""),
      });
      const candidates = [",", ";", "\t"].map(parseWithDelimiter);
      const scoreHeaders = (fields: string[] | undefined) =>
        normalizedCsvHeaders.filter(header => fields?.includes(header)).length;
      const results = candidates.reduce((best, candidate) =>
        scoreHeaders(candidate.meta.fields) > scoreHeaders(best.meta.fields) ? candidate : best,
      );

      const parseErrors = results.errors.filter(error => error.code !== "UndetectableDelimiter");
      if (parseErrors.length > 0) {
        setCsvError(`Could not read this CSV: ${parseErrors[0].message}`);
        return;
      }
      if (results.data.length === 0) {
        setCsvError("The CSV has no question rows yet.");
        return;
      }
      if (results.data.length > maxCsvRows) {
        setCsvError(`This file has ${results.data.length} rows. Import up to ${maxCsvRows} questions at a time.`);
        return;
      }

      const availableHeaders = results.meta.fields || [];
      const missingHeaders = csvHeaders.filter((_, index) => !availableHeaders.includes(normalizedCsvHeaders[index]));
      if (missingHeaders.length > 0) {
        if (missingHeaders.length === csvHeaders.length) {
          setCsvError("Could not find the template columns. Use the downloaded CSV template; do not rename an Excel .xlsx file to .csv.");
        } else {
          setCsvError(`Missing required columns: ${missingHeaders.join(", ")}. Download the template for the correct format.`);
        }
        return;
      }

      const subjectByNormalizedName = new Map(exam.subjects.map(subject => [subject.trim().toLowerCase().replace(/\s+/g, " "), subject]));
      const seenQuestions = new Set<string>();
      const parsedRows = results.data.map((row, index): CsvQuestionRow => {
        const rawSubject = String(row.subject ?? "").trim();
        const questionText = String(row.question ?? "").trim();
        const optionA = String(row.optiona ?? "").trim();
        const optionB = String(row.optionb ?? "").trim();
        const optionC = String(row.optionc ?? "").trim();
        const optionD = String(row.optiond ?? "").trim();
        const correctAnswer = String(row.correctanswer ?? "").trim().toUpperCase();
        const explanationText = String(row.explanation ?? "").trim();
        const errors: string[] = [];
        const subject = subjectByNormalizedName.get(rawSubject.toLowerCase().replace(/\s+/g, " "));

        if (!rawSubject) errors.push("Subject is required");
        else if (!subject) errors.push(`Subject "${rawSubject}" is not listed on this exam`);
        if (!questionText) errors.push("Question is required");
        if (!optionA || !optionB || !optionC || !optionD) errors.push("All four options are required");
        if (!["A", "B", "C", "D"].includes(correctAnswer)) errors.push("Correct answer must be A, B, C, or D");

        const questionKey = `${subject?.toLowerCase() || rawSubject.toLowerCase()}:${questionText.toLowerCase().replace(/\s+/g, " ")}`;
        if (questionKey && seenQuestions.has(questionKey)) errors.push("Duplicate question in this file");
        if (questionKey) seenQuestions.add(questionKey);

        return {
          rowNumber: index + 2,
          subject: subject || rawSubject,
          question: questionText,
          optionA,
          optionB,
          optionC,
          optionD,
          correctAnswer,
          explanation: explanationText,
          errors,
        };
      });

      setCsvFileName(file.name);
      setCsvExamId(selectedExam);
      setCsvRows(parsedRows);
    } catch {
      setCsvError("Could not read this file. Try saving it again as a CSV and re-uploading it.");
    }
  };

  const importCsvQuestions = async () => {
    if (!selectedExam || !csvExamId) {
      setCsvError("Select an exam before importing.");
      return;
    }
    if (selectedExam !== csvExamId) {
      setCsvError("The selected exam changed. Clear this preview and upload the CSV again.");
      return;
    }
    const rowsToImport = csvRows.filter(row => row.errors.length === 0 && row.status !== "imported");
    if (rowsToImport.length === 0) {
      setCsvError("There are no valid questions ready to import.");
      return;
    }

    setCsvError("");
    setCsvImporting(true);
    setCsvProgress({ completed: 0, total: rowsToImport.length });
    let imported = 0;
    let failed = 0;

    for (const [index, row] of rowsToImport.entries()) {
      try {
        const response = await fetch(`${API}/api/admin/add-question`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            examId: selectedExam,
            subject: row.subject,
            question: row.question,
            options: { A: row.optionA, B: row.optionB, C: row.optionC, D: row.optionD },
            correctAnswer: row.correctAnswer,
            explanation: row.explanation,
          }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.message || `Request failed (${response.status})`);
        imported++;
        setCsvRows(current => current.map(item => item.rowNumber === row.rowNumber ? { ...item, status: "imported", importError: undefined } : item));
      } catch (error) {
        failed++;
        const message = error instanceof Error ? error.message : "Could not import this question";
        setCsvRows(current => current.map(item => item.rowNumber === row.rowNumber ? { ...item, status: "failed", importError: message } : item));
      }
      setCsvProgress({ completed: index + 1, total: rowsToImport.length });
    }

    setCsvImporting(false);
    setMsg(`CSV import finished: ${imported} added, ${failed} failed.`);
    setTimeout(() => setMsg(""), 5000);
  };

  const subjectCount = new Set(exams.flatMap(exam => exam.subjects)).size;
  const questionCount = exams.length > 0 && exams.every(exam => typeof exam.totalQuestions === "number")
    ? exams.reduce((total, exam) => total + (exam.totalQuestions || 0), 0)
    : null;

  // STEP 1: ADMIN PASSWORD GATE - shows when user clicks admin
  if(!isAdminUnlocked){
    return (
      <div className="admin-wrap"><div className="admin-login-card" style={{border:'1px solid #f59e0b'}}>
        <div className="admin-logo"><img src="/icons/examcore-192.png" alt="ExamCore" />EXAMCORE<span>ADMIN</span></div>
        <h2>🔒 Admin Locked</h2>
        <p className="admin-sub">Enter admin password to continue</p>
        <div className="admin-field">
          <label>Admin Password</label>
          <input
            type="password"
            value={adminPassInput}
            onChange={e=>setAdminPassInput(e.target.value)}
            placeholder="Enter admin password"
            onKeyDown={e=> e.key==='Enter' && handleAdminUnlock()}
            style={{border: adminPassError? '1px solid #ef4444' : ''}}
          />
          {adminPassError && <span style={{color:'#ef4444', fontSize:12, marginTop:4, display:'block'}}>{adminPassError}</span>}
        </div>
        <button className="admin-btn primary" onClick={handleAdminUnlock}>Unlock Admin 🔓</button>
        <button className="admin-btn ghost" onClick={()=>setActivePage('home')}>← Back to Home</button>
        <p style={{fontSize:11, color:'#888', marginTop:10, textAlign:'center'}}>Default: admin123 (change in code)</p>
      </div></div>
    )
  }

  // STEP 2: Normal login if not logged in
  if(!user) return (
    <div className="admin-wrap"><div className="admin-login-card">
      <div className="admin-logo"><img src="/icons/examcore-192.png" alt="ExamCore" />EXAMCORE<span>ADMIN</span></div>
      <h2>Admin Login</h2><p className="admin-sub">Email authentication</p>
      <div className="admin-field"><label>Email</label><input value={email} onChange={e=>setEmail(e.target.value)}/></div>
      <div className="admin-field"><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="admin123"/></div>
      <button className="admin-btn primary" onClick={handleLogin}>Sign In</button>
      <button className="admin-btn ghost" onClick={()=>setActivePage('home')}>← Home</button>
      <button className="admin-btn ghost" onClick={()=>{localStorage.removeItem('admin_unlocked'); setIsAdminUnlocked(false)}} style={{marginTop:8, color:'#ef4444'}}>Lock Admin Again</button>
    </div></div>
  );

  return (
    <div className="admin-wrap"><div className="admin-panel">
      <div className="admin-header">
        <div><div className="admin-logo small"><img src="/icons/examcore-192.png" alt="ExamCore" />EXAMCORE<span>ADMIN</span></div><p>{user.email}</p></div>
        <div style={{display:"flex",gap:8}}><span className="admin-pill">{exams.length} Exams</span><button className="admin-btn danger-sm" onClick={()=>{localStorage.clear(); setUser(null); setIsAdminUnlocked(false)}}>Logout</button></div>
      </div>

      <nav className="admin-primary-nav" aria-label="Admin sections">
        <button className={adminView === "overview" ? "active" : ""} onClick={() => setAdminView("overview")}><LayoutDashboard size={16} /> Overview</button>
        <button className={adminView === "students" ? "active" : ""} onClick={() => setAdminView("students")}><UsersRound size={16} /> Students</button>
        <button className={adminView === "exams" ? "active" : ""} onClick={() => setAdminView("exams")}><BookOpen size={16} /> Exams</button>
      </nav>

      {msg && <div className="admin-toast success">{msg}</div>}

      {adminView === "overview" ? (
        <section className="admin-overview">
          <div className="admin-view-heading">
            <div><p className="admin-eyebrow">SCHOOL WORKSPACE</p><h2>Overview</h2><p>Exam activity and school performance at a glance.</p></div>
            <button className="admin-overview-action" onClick={() => setAdminView("exams")}>Manage exams <ArrowRight size={16} /></button>
          </div>
          <div className="admin-metrics-grid">
            <article className="admin-metric-card"><span>Exams</span><strong>{exams.length}</strong><small>In the exam library</small></article>
            <article className="admin-metric-card"><span>Subjects</span><strong>{subjectCount}</strong><small>Across configured exams</small></article>
            <article className="admin-metric-card"><span>Questions</span><strong>{questionCount ?? "—"}</strong><small>{questionCount === null ? "Question totals are not provided by the API" : "Across configured exams"}</small></article>
            <article className="admin-metric-card is-unavailable"><span><Activity size={15} /> Students active now</span><strong>—</strong><small>School-wide student activity is not connected</small></article>
          </div>
          <div className="admin-overview-columns">
            <section className="admin-overview-card">
              <div className="admin-section-heading"><div><h3>Exam library</h3><p>Recently configured exams</p></div><button onClick={() => setAdminView("exams")}>View all</button></div>
              {exams.length > 0 ? (
                <div className="admin-recent-exams">
                  {exams.slice(0, 5).map(exam => (
                    <div className="admin-recent-exam" key={exam.id}>
                      <div><strong>{exam.title}</strong><span>{exam.examType} · {exam.year}</span></div>
                      <small>{exam.subjects.length} subjects</small>
                    </div>
                  ))}
                </div>
              ) : <p className="admin-empty-note">No exams are available yet.</p>}
            </section>
            <section className="admin-overview-card admin-student-notice">
              <div className="admin-section-heading"><div><h3>Student performance</h3><p>School-wide student records</p></div><UsersRound size={18} /></div>
              <div className="admin-data-unavailable"><UsersRound size={22} /><p>Student roster and performance data are not available to this frontend yet.</p><button onClick={() => setAdminView("students")}>Open Students <ArrowRight size={15} /></button></div>
            </section>
          </div>
        </section>
      ) : adminView === "students" ? (
        <section className="admin-students-view">
          <div className="admin-view-heading"><div><p className="admin-eyebrow">SCHOOL WORKSPACE</p><h2>Students</h2><p>Student accounts, activity, and performance.</p></div></div>
          <div className="admin-students-empty">
            <span className="admin-empty-icon"><UsersRound size={24} /></span>
            <h3>Student data is not connected yet</h3>
            <p>The current API exposes individual user history but no school-wide student roster or online-activity endpoint. Connect those data sources to show real students here.</p>
          </div>
        </section>
      ) : (
        <>
        <div className="admin-view-heading admin-exams-heading"><div><p className="admin-eyebrow">SCHOOL WORKSPACE</p><h2>Exams</h2><p>Create exams, manage subjects, and add questions.</p></div></div>
        <div className="admin-tabs">
          <button className={examTab==="exams"?"active":""} onClick={()=>setExamTab("exams")}>📚 Exam setup</button>
          <button className={examTab==="questions"?"active":""} onClick={()=>setExamTab("questions")}>❓ Questions</button>
        </div>
      {examTab==="exams"? (
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
            <button className="admin-btn primary lg" disabled={loading} style={{flex:1}}>{loading? (editingExam?"Updating...":"Creating...") : (editingExam?"Update Exam":"Create Exam")}</button>
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
        <>
        <div className="admin-field csv-exam-field">
          <label>Select Exam *</label>
          <select value={selectedExam} onChange={e=>{setSelectedExam(e.target.value); setSelectedSubject("");}} required disabled={csvRows.length > 0 || csvImporting}>
            <option value="">-- Choose Exam --</option>
            {exams.map(ex=><option key={ex.id} value={ex.id}>{ex.title} ({ex.examType}) - {ex.subjects?.length} subjects</option>)}
          </select>
          {csvRows.length > 0 && <small>Clear the CSV preview before changing exams.</small>}
        </div>

        <section className="csv-import-panel" aria-labelledby="csv-import-title">
          <div className="csv-import-heading">
            <div>
              <h3 id="csv-import-title"><FileSpreadsheet size={18} /> Bulk import questions</h3>
              <p>Choose an exam above. Add a subject column to the CSV to route each question separately. Up to 500 rows per file.</p>
            </div>
            <button type="button" className="csv-template-btn" onClick={downloadCsvTemplate}>
              <Download size={16} /> Download template
            </button>
          </div>

          <label className="csv-upload-btn">
            <Upload size={16} /> Choose CSV file
            <input type="file" accept=".csv,text/csv" onChange={handleCsvFileChange} disabled={csvImporting} />
          </label>
          {csvFileName && <span className="csv-file-name">{csvFileName}</span>}
          {csvRows.length > 0 && (
            <button type="button" className="csv-clear-btn" onClick={() => { setCsvRows([]); setCsvFileName(""); setCsvExamId(""); setCsvError(""); setCsvProgress({ completed: 0, total: 0 }); }} disabled={csvImporting}>
              Clear file
            </button>
          )}
          {csvError && <p className="csv-error" role="alert">{csvError}</p>}

          {csvRows.length > 0 && (
            <div className="csv-preview">
              <div className="csv-preview-summary">
                <span>{csvRows.filter(row => row.errors.length === 0 && row.status !== "imported").length} ready</span>
                <span>{csvRows.filter(row => row.errors.length > 0).length} need attention</span>
                <span>{csvRows.filter(row => row.status === "imported").length} imported</span>
              </div>
              {csvImporting && <p className="csv-progress" aria-live="polite">Importing {csvProgress.completed} of {csvProgress.total} questions...</p>}
              <div className="csv-preview-table-wrap">
                <table className="csv-preview-table">
                  <thead>
                    <tr><th>Row</th><th>Subject</th><th>Question</th><th>Options</th><th>Answer</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {csvRows.slice(0, 8).map(row => {
                      const rowError = row.errors[0] || row.importError;
                      const status = row.status === "imported" ? "Imported" : rowError ? rowError : "Ready";
                      return (
                        <tr key={row.rowNumber} className={rowError ? "has-error" : row.status === "imported" ? "is-imported" : ""}>
                          <td>{row.rowNumber}</td>
                          <td>{row.subject || "—"}</td>
                          <td className="csv-question-cell">{row.question || "(empty question)"}</td>
                          <td>A: {row.optionA} · B: {row.optionB} · C: {row.optionC} · D: {row.optionD}</td>
                          <td>{row.correctAnswer || "—"}</td>
                          <td>{status}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {csvRows.length > 8 && <p className="csv-more-rows">Showing 8 of {csvRows.length} rows.</p>}
              <button
                type="button"
                className="admin-btn primary csv-import-btn"
                onClick={importCsvQuestions}
                disabled={csvImporting || loading || !csvRows.some(row => row.errors.length === 0 && row.status !== "imported")}
              >
                {csvImporting ? "Importing..." : `Import ${csvRows.filter(row => row.errors.length === 0 && row.status !== "imported").length} valid questions`}
              </button>
            </div>
          )}
        </section>

        <form onSubmit={addQuestion} className="admin-form">
          <div className="admin-row">
            <div className="admin-field" style={{flex:1}}><label>Manual question subject *</label>
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
          <button className="admin-btn primary lg" disabled={loading || csvImporting}>{loading?"Adding...":`Add to ${selectedSubject || 'Exam'}`}</button>
        </form>
        </>
      )}
        </>
      )}
    </div></div>
  );
}