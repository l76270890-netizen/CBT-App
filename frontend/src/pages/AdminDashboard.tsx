import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { Activity, ArrowRight, BookOpen, Download, FileSpreadsheet, GraduationCap, ImagePlus, LayoutDashboard, Pencil, Search, Trash2, Upload, UsersRound } from "lucide-react";
import "./AdminDashboard.css";
import { apiRequest, asArray, uploadQuestionImage } from "../api";
import QuestionImage from "../components/QuestionImage";
import { csvTemplateHeaders, isSupportedQuestionImage, normalizeImageReference, parseQuestionCsv, summarizeQuestionImageMatches, type CsvQuestionRow } from "../adminQuestionCsv";
import { loadQuestionZip } from "../questionZip";

const defaultSubjects = ["Mathematics","English Language","Physics","Chemistry","Biology","Government","Economics","Literature in English","Christian Religious Studies","Geography","Agricultural Science","Commerce","Principles of Accounting","History","Business Studies","General Knowledge","Current Affairs","Computer Science"];
const defaultExamTypes = ["JAMB","WAEC","NECO","POSTUTME"];

type Exam = { id: string; title: string; examType: string; year: number; duration: number; subjects: string[]; totalQuestions?: number; examDate?: string }
type Student = { id: string; displayName?: string | null; email?: string | null; class?: string | null; accountStatus?: string | null; lastSeenAt?: string | null }
type StudentPerformance = { completedAttempts?: number | null; scoreHistory?: unknown[] | null; resultsBySubject?: unknown[] | null }
type StudentPagination = { page?: number; limit?: number; total?: number; pages?: number; totalPages?: number }
type OverviewData = { counts?: Record<string, number | null> | null; performance?: Record<string, number | null> | null; recentExamActivity?: unknown[] | null }
const maxCsvFileBytes = 5 * 1024 * 1024;
const maxQuestionZipBytes = 25 * 1024 * 1024;
const maxCsvRows = 500;
const maxQuestionImageBytes = 5 * 1024 * 1024;

const formatExamDate = (value: string) => {
  const dateOnlyParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnlyParts
    ? new Date(Number(dateOnlyParts[1]), Number(dateOnlyParts[2]) - 1, Number(dateOnlyParts[3]))
    : new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

type StudyQuestion = {
  id: number;
  examType: string;
  subject: string;
  topic: string;
  year: number;
  question: string;
  options: { A: string; B: string; C: string; D: string } | string[];
  correctAnswer?: string;
  answer?: string;
  explanation?: string;
  imageUrl?: string | null;
};

type StudyMeta = {
  examTypes: string[];
  subjectsByExamType: Record<string, string[]>;
  topicsBySubject: Record<string, string[]>;
};

function StudyManagementSection() {
  const [meta, setMeta] = useState<StudyMeta>({ examTypes: ["JAMB","WAEC","NECO","Post-UTME","CBT"], subjectsByExamType: {}, topicsBySubject: {} });
  const [questions, setQuestions] = useState<StudyQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [filterExamType, setFilterExamType] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterTopic, setFilterTopic] = useState("");
  const [filterYear, setFilterYear] = useState("");

  const [formExamType, setFormExamType] = useState("JAMB");
  const [formSubject, setFormSubject] = useState("");
  const [formTopic, setFormTopic] = useState("");
  const [formYear, setFormYear] = useState(String(new Date().getFullYear()));
  const [formQuestion, setFormQuestion] = useState("");
  const [formOptions, setFormOptions] = useState(["","","",""]);
  const [formCorrect, setFormCorrect] = useState("A");
  const [formExplanation, setFormExplanation] = useState("");
  const [formImage, setFormImage] = useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formImageError, setFormImageError] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<{row:number;question?:string;error:string}[]>([]);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{imported:number;failed:number;message?:string} | null>(null);
  const [importStatus, setImportStatus] = useState("");

  useEffect(() => { void (async () => {
    try { const m = await apiRequest<StudyMeta>("/api/admin/study/meta"); setMeta(m); if (!formSubject && m.subjectsByExamType?.[formExamType]?.[0]) setFormSubject(m.subjectsByExamType[formExamType][0]); }
    catch (e) { /* fallback defaults */ }
  })(); }, []);

  useEffect(() => {
    const subs = meta.subjectsByExamType?.[formExamType] || [];
    if (!subs.includes(formSubject)) { setFormSubject(subs[0] || ""); setFormTopic(""); }
  }, [formExamType, meta]);
  useEffect(() => {
    const topics = meta.topicsBySubject?.[formSubject] || [];
    if (!topics.includes(formTopic)) setFormTopic(topics[0] || "");
  }, [formSubject, meta]);

  const loadQuestions = async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (filterExamType) params.set("examType", filterExamType);
      if (filterSubject) params.set("subject", filterSubject);
      if (filterTopic) params.set("topic", filterTopic);
      if (filterYear) params.set("year", filterYear);
      if (search.trim()) params.set("search", search.trim());
      const res = await apiRequest<{questions?: StudyQuestion[]; total?: number}>(`/api/admin/study/questions?${params}`);
      setQuestions(asArray<StudyQuestion>((res as any)?.questions ?? res));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load study questions."); setQuestions([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { void loadQuestions(); }, [filterExamType, filterSubject, filterTopic, filterYear]);

  useEffect(() => () => { if (formImagePreview) URL.revokeObjectURL(formImagePreview); }, [formImagePreview]);

  const resetForm = () => {
    setEditingId(null); setFormQuestion(""); setFormOptions(["","","",""]); setFormCorrect("A"); setFormExplanation("");
    setFormImage(null); if (formImagePreview) URL.revokeObjectURL(formImagePreview); setFormImagePreview(""); setFormImageUrl(""); setFormImageError(""); setFormError("");
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const onImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
    if (!["image/png","image/jpeg","image/webp"].includes(file.type.toLowerCase())) { setFormImageError("Choose a PNG, JPG, JPEG, or WEBP image."); return; }
    setFormImageError(""); setFormImage(file); setFormImageUrl(""); setFormImagePreview(URL.createObjectURL(file));
  };

  const saveQuestion = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError(""); setMsg("");
    if (!formExamType || !formSubject || !formTopic) { setFormError("Select exam type, subject, and topic."); return; }
    setFormSaving(true);
    try {
      let imageUrl = formImageUrl || undefined;
      if (formImage && !formImageUrl) { imageUrl = await uploadQuestionImage(formImage); setFormImageUrl(imageUrl); }
      const payload = {
        examType: formExamType, subject: formSubject, topic: formTopic, year: Number(formYear),
        question: formQuestion, options: { A: formOptions[0], B: formOptions[1], C: formOptions[2], D: formOptions[3] },
        correctAnswer: formCorrect, explanation: formExplanation, ...(imageUrl ? { imageUrl } : {}),
      };
      if (editingId) await apiRequest(`/api/admin/study/question/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
      else await apiRequest("/api/admin/study/question", { method: "POST", body: JSON.stringify(payload) });
      setMsg(editingId ? "Study question updated." : "Study question added."); resetForm(); await loadQuestions();
      setTimeout(() => setMsg(""), 3000);
    } catch (err) { setFormError(err instanceof Error ? err.message : "Could not save question."); }
    finally { setFormSaving(false); }
  };

  const startEdit = (q: StudyQuestion) => {
    const opts = Array.isArray(q.options) ? q.options : [q.options.A,q.options.B,q.options.C,q.options.D];
    setEditingId(q.id); setFormExamType(q.examType); setFormSubject(q.subject); setFormTopic(q.topic || ""); setFormYear(String(q.year || ""));
    setFormQuestion(q.question || ""); setFormOptions([opts[0]||"",opts[1]||"",opts[2]||"",opts[3]||""]); setFormCorrect(q.correctAnswer || q.answer || "A");
    setFormExplanation(q.explanation || ""); setFormImage(null); if (formImagePreview) URL.revokeObjectURL(formImagePreview); setFormImagePreview(q.imageUrl || ""); setFormImageUrl(q.imageUrl || ""); setFormImageError(""); setFormError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteQuestion = async (id: number) => {
    if (!confirm("Delete this study question?")) return;
    try { await apiRequest(`/api/admin/study/question/${id}`, { method: "DELETE" }); setQuestions(qs => qs.filter(q => q.id !== id)); setMsg("Study question deleted."); setTimeout(()=>setMsg(""),2500); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not delete question."); }
  };

  const downloadTemplate = () => {
    const header = "examType,subject,topic,year,question,optionA,optionB,optionC,optionD,correctAnswer,explanation,imageUrl\n";
    const sample = 'JAMB,Mathematics,Algebra,2024,"Solve: 2x + 3 = 7",1,2,3,4,B,"2x=4 so x=2",""\n';
    const blob = new Blob([header + sample], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "study-questions-template.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const runImportPreview = async (file: File) => {
    setImportStatus("Validating file..."); setImportSummary(null); setImportErrors([]); setImportPreview([]);
    const fd = new FormData(); fd.append("file", file); fd.append("preview", "1");
    try {
      const res = await apiRequest<any>("/api/admin/study/import", { method: "POST", body: fd });
      setImportPreview(asArray<any>(res?.previewRows)); setImportErrors(asArray<any>(res?.errors));
      setImportStatus(res?.message || (res?.success ? "Ready to import." : "Fix errors before importing."));
    } catch (e) { setImportStatus(e instanceof Error ? e.message : "Could not validate file."); }
  };

  const onImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
    const ext = file.name.toLowerCase().split(".").pop();
    if (ext !== "csv" && ext !== "xlsx") { setImportStatus("Choose a .csv or .xlsx file."); return; }
    setImportFile(file); await runImportPreview(file);
  };

  const confirmImport = async () => {
    if (!importFile) return;
    if (importErrors.length > 0) { setImportStatus("Resolve all validation errors before importing. No questions were imported."); return; }
    if (!confirm(`Import ${importPreview.length} study question(s)?`)) return;
    setImporting(true); setImportStatus("Importing...");
    try {
      const fd = new FormData(); fd.append("file", importFile);
      const res = await apiRequest<any>("/api/admin/study/import", { method: "POST", body: fd });
      setImportSummary({ imported: Number(res?.imported||0), failed: Number(res?.failed||0), message: res?.message });
      setImportErrors(asArray<any>(res?.errors)); setImportPreview([]);
      setImportStatus(res?.message || "Import complete."); if ((res?.imported||0)>0) await loadQuestions();
      setImportFile(null);
    } catch (e) { setImportStatus(e instanceof Error ? e.message : "Import failed."); }
    finally { setImporting(false); }
  };

  const subjectOptions = meta.subjectsByExamType?.[formExamType] || [];
  const topicOptions = meta.topicsBySubject?.[formSubject] || [];
  const filterSubjects = filterExamType ? (meta.subjectsByExamType?.[filterExamType] || []) : Array.from(new Set(Object.values(meta.subjectsByExamType||{}).flat()));
  const filterTopics = filterSubject ? (meta.topicsBySubject?.[filterSubject] || []) : Array.from(new Set(Object.values(meta.topicsBySubject||{}).flat()));
  const years = Array.from({length: 20}, (_,i)=> String(new Date().getFullYear() - i));

  return (
    <section className="admin-students-view">
      <div className="admin-view-heading"><div><p className="admin-eyebrow">SCHOOL WORKSPACE</p><h2>Study Management</h2><p>Manage study questions by exam type, subject, topic, and year.</p></div></div>
      {msg && <div className="admin-toast success">{msg}</div>}
      {error && <p className="admin-error" role="alert">{error}</p>}

      <form onSubmit={saveQuestion} className="admin-form">
        <h3 style={{color:'#fff', margin:0}}>{editingId ? "Edit Study Question" : "Add Study Question"}</h3>
        <div className="admin-row">
          <div className="admin-field"><label>Exam Type *</label><select value={formExamType} onChange={e=>setFormExamType(e.target.value)} required>{(meta.examTypes||["JAMB","WAEC","NECO","Post-UTME","CBT"]).map(t=><option key={t} value={t}>{t}</option>)}</select></div>
          <div className="admin-field"><label>Subject *</label><select value={formSubject} onChange={e=>setFormSubject(e.target.value)} required><option value="">-- Subject --</option>{subjectOptions.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
          <div className="admin-field"><label>Topic *</label><select value={formTopic} onChange={e=>setFormTopic(e.target.value)} required><option value="">-- Topic --</option>{topicOptions.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
          <div className="admin-field"><label>Year *</label><input type="number" value={formYear} onChange={e=>setFormYear(e.target.value)} min={1980} max={2100} required /></div>
        </div>
        <div className="admin-field"><label>Question *</label><textarea value={formQuestion} onChange={e=>setFormQuestion(e.target.value)} rows={4} required style={{background:'#1a1a1a', color:'#fff', border:'1px solid #333'}}/></div>
        <div className="admin-field">
          <label>Question image (optional)</label>
          <div className="question-image-actions">
            <button type="button" className="csv-template-btn" onClick={()=>imageInputRef.current?.click()} disabled={formSaving}><ImagePlus size={16}/> {formImagePreview?"Replace image":"Insert Image/Diagram"}</button>
            <input ref={imageInputRef} className="question-image-input" type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" onChange={onImageChange} />
            {formImagePreview && <button type="button" className="question-image-remove" onClick={()=>{setFormImage(null); if(formImagePreview && formImagePreview.startsWith('blob:')) URL.revokeObjectURL(formImagePreview); setFormImagePreview(""); setFormImageUrl(""); setFormImageError("");}} disabled={formSaving}><Trash2 size={15}/> Remove</button>}
          </div>
          {formImageError && <p className="csv-error" role="alert">{formImageError}</p>}
          {formImagePreview && <div className="question-image-preview"><img src={formImagePreview} alt="Question preview" /></div>}
        </div>
        <div className="admin-options-grid">
          {["A","B","C","D"].map((o,i)=>(
            <div key={o} className={`admin-field option-field ${formCorrect===o?'is-correct':''}`}><label>Option {o} *</label><input value={formOptions[i]} onChange={e=>{const n=[...formOptions]; n[i]=e.target.value; setFormOptions(n)}} required style={{background:'#1a1a1a', color:'#fff'}}/></div>
          ))}
        </div>
        <div className="admin-row">
          <div className="admin-field"><label>Correct Answer *</label><select value={formCorrect} onChange={e=>setFormCorrect(e.target.value)}><option>A</option><option>B</option><option>C</option><option>D</option></select></div>
          <div className="admin-field" style={{flex:2}}><label>Explanation (optional)</label><input value={formExplanation} onChange={e=>setFormExplanation(e.target.value)} placeholder="Optional explanation" style={{background:'#1a1a1a', color:'#fff'}}/></div>
        </div>
        {formError && <p className="admin-error" role="alert">{formError}</p>}
        <div style={{display:'flex', gap:8}}>
          <button className="admin-btn primary lg" disabled={formSaving} style={{flex:1}}>{formSaving ? "Saving..." : (editingId ? "Update Question" : "Add Study Question")}</button>
          {editingId && <button type="button" className="admin-btn ghost" onClick={resetForm}>Cancel edit</button>}
        </div>
      </form>

      <section className="csv-import-panel" aria-labelledby="study-import-title" style={{marginTop:20}}>
        <div className="csv-import-heading">
          <div><h3 id="study-import-title"><FileSpreadsheet size={18}/> Import Study Questions</h3><p>Upload CSV or Excel (.xlsx). Required columns: examType, subject, topic, year, question, optionA, optionB, optionC, optionD, correctAnswer, explanation (optional), imageUrl (optional). Invalid rows are reported and nothing is imported until fixed.</p></div>
          <button type="button" className="csv-template-btn" onClick={downloadTemplate}><Download size={16}/> Download template</button>
        </div>
        <label className="csv-upload-btn"><Upload size={16}/> Choose CSV or Excel file<input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={onImportFile} disabled={importing} /></label>
        {importFile && <span className="csv-file-name">{importFile.name}</span>}
        {importStatus && <p className={importErrors.length ? "admin-error" : "csv-progress"} role={importErrors.length ? "alert" : undefined}>{importStatus}</p>}
        {importErrors.length > 0 && <div className="csv-bulk-validation" role="alert"><strong>Validation errors (fix and re-upload)</strong><ul>{importErrors.slice(0,50).map((er,i)=><li key={i}>Row {er.row}{er.question ? ` — ${er.question}` : ""}: {er.error}</li>)}{importErrors.length>50 && <li>…and {importErrors.length-50} more</li>}</ul></div>}
        {importPreview.length > 0 && <div className="csv-preview"><div className="csv-preview-summary"><span>{importPreview.length} valid question(s) previewed</span>{importErrors.length>0 && <span>{importErrors.length} error(s)</span>}</div>
          <div className="csv-preview-table-wrap"><table className="csv-preview-table"><thead><tr><th>Row</th><th>Exam</th><th>Subject</th><th>Topic</th><th>Year</th><th>Question</th><th>Answer</th></tr></thead><tbody>{importPreview.slice(0,30).map((r,i)=><tr key={i}><td>{r.row}</td><td>{r.examType}</td><td>{r.subject}</td><td>{r.topic}</td><td>{r.year}</td><td className="csv-question-cell">{r.question}</td><td>{r.correctAnswer}</td></tr>)}</tbody></table></div>
        </div>}
        {importFile && <button type="button" className="admin-btn primary csv-import-btn" onClick={confirmImport} disabled={importing || importErrors.length > 0 || importPreview.length === 0}>{importing ? "Importing..." : "Confirm Import"}</button>}
        {importSummary && <div className="admin-toast success" style={{marginTop:10}}>Import summary: {importSummary.imported} imported, {importSummary.failed} failed. {importSummary.message || ""}</div>}
      </section>

      <section className="admin-overview-card" style={{marginTop:20}}>
        <div className="admin-section-heading"><div><h3>Study Questions</h3><p>View, search, filter, edit, and delete.</p></div><button onClick={()=>void loadQuestions()} disabled={loading}>Refresh</button></div>
        <form className="admin-student-filters" onSubmit={e=>{e.preventDefault(); void loadQuestions();}} style={{marginTop:0}}>
          <input aria-label="Search study questions" placeholder="Search question text" value={search} onChange={e=>setSearch(e.target.value)} />
          <select value={filterExamType} onChange={e=>{setFilterExamType(e.target.value); setFilterSubject(""); setFilterTopic("");}}><option value="">All exam types</option>{(meta.examTypes||[]).map(t=><option key={t} value={t}>{t}</option>)}</select>
          <select value={filterSubject} onChange={e=>{setFilterSubject(e.target.value); setFilterTopic("");}}><option value="">All subjects</option>{filterSubjects.map(s=><option key={s} value={s}>{s}</option>)}</select>
          <select value={filterTopic} onChange={e=>setFilterTopic(e.target.value)}><option value="">All topics</option>{filterTopics.map(t=><option key={t} value={t}>{t}</option>)}</select>
          <select value={filterYear} onChange={e=>setFilterYear(e.target.value)}><option value="">All years</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</select>
          <button className="admin-btn primary" type="submit"><Search size={14}/> Search</button>
        </form>
        {loading ? <p className="admin-empty-note">Loading study questions...</p> : questions.length === 0 ? <p className="admin-empty-note">No study questions match these filters.</p> : (
          <div className="csv-preview-table-wrap"><table className="csv-preview-table"><thead><tr><th>Exam</th><th>Subject</th><th>Topic</th><th>Year</th><th>Question</th><th>Answer</th><th>Actions</th></tr></thead><tbody>
            {questions.map(q => {
              const ans = q.correctAnswer || q.answer || "";
              return (<tr key={q.id}>
                <td>{q.examType}</td><td>{q.subject}</td><td>{q.topic || "—"}</td><td>{q.year}</td>
                <td className="csv-question-cell">{q.question}{q.imageUrl ? <div style={{marginTop:6}}><img src={q.imageUrl} alt="" style={{maxHeight:80,maxWidth:160,objectFit:'contain',borderRadius:4}}/></div> : null}</td>
                <td>{ans}</td>
                <td><div style={{display:'flex',gap:6}}><button type="button" className="admin-btn sm" onClick={()=>startEdit(q)} aria-label="Edit"><Pencil size={14}/></button><button type="button" className="del-btn" onClick={()=>void deleteQuestion(q.id)} aria-label="Delete"><Trash2 size={14}/></button></div></td>
              </tr>);
            })}
          </tbody></table></div>
        )}
      </section>
    </section>
  );
}


type AdminNovelChapter = { id: number; title: string; content: string; position: number };
type AdminNovelQuestion = { id: number | string; question: string; options: string[] | {A:string;B:string;C:string;D:string}; answer?: number; correctAnswer?: string; explanation?: string; imageUrl?: string | null; topic?: string | null };
type AdminNovel = {
  id: number; title: string; author: string; description?: string; category: string;
  coverUrl?: string | null; pdfUrl?: string | null; pdfEnabled?: boolean; hasPdf?: boolean;
  published?: boolean; chapterCount?: number; questionCount?: number; chapters?: AdminNovelChapter[]; questions?: AdminNovelQuestion[];
};

function NovelManagementSection() {
  const [novels, setNovels] = useState<AdminNovel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState<AdminNovel | null>(null);
  const [title, setTitle] = useState(""); const [author, setAuthor] = useState(""); const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"JAMB"|"WAEC"|"NECO">("JAMB");
  const [published, setPublished] = useState(false); const [pdfEnabled, setPdfEnabled] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null); const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [removeCover, setRemoveCover] = useState(false); const [removePdf, setRemovePdf] = useState(false);
  const [saving, setSaving] = useState(false);

  const [activeNovelId, setActiveNovelId] = useState<number | null>(null);
  const [chapters, setChapters] = useState<AdminNovelChapter[]>([]);
  const [chapterTitle, setChapterTitle] = useState(""); const [chapterContent, setChapterContent] = useState(""); const [editingChapterId, setEditingChapterId] = useState<number | null>(null);
  const [chapterBusy, setChapterBusy] = useState(false);

  const [novelQuestions, setNovelQuestions] = useState<AdminNovelQuestion[]>([]);
  const [qQuestion, setQQuestion] = useState(""); const [qOptions, setQOptions] = useState(["","","",""]); const [qCorrect, setQCorrect] = useState("A");
  const [qExplanation, setQExplanation] = useState(""); const [qTopic, setQTopic] = useState(""); const [qImage, setQImage] = useState<File | null>(null); const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [qBusy, setQBusy] = useState(false);

  const loadNovels = async () => {
    setLoading(true); setError("");
    try {
      const res = await apiRequest<any>("/api/admin/novels");
      setNovels(asArray<AdminNovel>(res?.novels ?? res));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load novels."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void loadNovels(); }, []);

  const resetNovelForm = () => {
    setEditing(null); setTitle(""); setAuthor(""); setDescription(""); setCategory("JAMB"); setPublished(false); setPdfEnabled(false);
    setCoverFile(null); setPdfFile(null); setRemoveCover(false); setRemovePdf(false);
  };
  const startEditNovel = (n: AdminNovel) => {
    setEditing(n); setTitle(n.title || ""); setAuthor(n.author || ""); setDescription(n.description || "");
    setCategory((["JAMB","WAEC","NECO"].includes(String(n.category||"").toUpperCase()) ? String(n.category).toUpperCase() : "JAMB") as any);
    setPublished(Boolean(n.published)); setPdfEnabled(Boolean(n.pdfEnabled ?? n.hasPdf)); setCoverFile(null); setPdfFile(null); setRemoveCover(false); setRemovePdf(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveNovel = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setMsg("");
    if (!title.trim() || !author.trim()) { setError("Title and author are required."); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim()); fd.append("author", author.trim()); fd.append("description", description);
      fd.append("category", category); fd.append("published", String(published)); fd.append("pdfEnabled", String(pdfEnabled));
      if (removeCover) fd.append("removeCover", "true"); if (removePdf) fd.append("removePdf", "true");
      if (coverFile) fd.append("cover", coverFile); if (pdfFile) fd.append("pdf", pdfFile);
      const path = editing ? `/api/admin/novels/${editing.id}` : "/api/admin/novels";
      const res = await apiRequest<any>(path, { method: editing ? "PUT" : "POST", body: fd });
      setMsg(editing ? "Novel updated." : "Novel created."); resetNovelForm();
      await loadNovels();
      if (!editing && res?.novel?.id) { void openNovelManager(Number(res.novel.id)); }
      setTimeout(()=>setMsg(""), 3000);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save novel."); }
    finally { setSaving(false); }
  };

  const deleteNovel = async (id: number) => {
    if (!confirm("Delete this novel and all its chapters, questions, progress, and attempts? This cannot be undone.")) return;
    try {
      await apiRequest(`/api/admin/novels/${id}`, { method: "DELETE" });
      setNovels(ns => ns.filter(n => n.id !== id)); if (activeNovelId === id) { setActiveNovelId(null); setChapters([]); setNovelQuestions([]); }
      setMsg("Novel deleted."); setTimeout(()=>setMsg(""), 2500);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not delete novel."); }
  };

  const togglePublish = async (n: AdminNovel) => {
    try {
      const fd = new FormData(); fd.append("published", String(!n.published));
      await apiRequest(`/api/admin/novels/${n.id}`, { method: "PUT", body: fd });
      await loadNovels();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update publish status."); }
  };

  const openNovelManager = async (id: number) => {
    setActiveNovelId(id); setError("");
    const n = novels.find(x => x.id === id);
    if (n?.chapters) setChapters([...n.chapters].sort((a,b)=>(a.position??0)-(b.position??0)));
    try {
      const qs = await apiRequest<any>(`/api/admin/novels/${id}/questions`);
      setNovelQuestions(asArray<AdminNovelQuestion>(qs?.questions ?? qs));
      // refresh list to get chapters
      const res = await apiRequest<any>("/api/admin/novels");
      const list = asArray<AdminNovel>(res?.novels ?? res);
      setNovels(list);
      const fresh = list.find(x => x.id === id);
      setChapters([...(fresh?.chapters || [])].sort((a,b)=>(a.position??0)-(b.position??0)));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load novel details."); }
  };

  const saveChapter = async (novelId: number) => {
    if (!chapterTitle.trim()) { setError("Chapter title is required."); return; }
    setChapterBusy(true); setError("");
    try {
      if (editingChapterId) {
        await apiRequest(`/api/admin/novels/${novelId}/chapters/${editingChapterId}`, { method: "PUT", body: JSON.stringify({ title: chapterTitle.trim(), content: chapterContent }) });
      } else {
        await apiRequest(`/api/admin/novels/${novelId}/chapters`, { method: "POST", body: JSON.stringify({ title: chapterTitle.trim(), content: chapterContent }) });
      }
      setChapterTitle(""); setChapterContent(""); setEditingChapterId(null);
      await loadNovels(); await openNovelManager(novelId);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save chapter."); }
    finally { setChapterBusy(false); }
  };
  const editChapter = (ch: AdminNovelChapter) => { setEditingChapterId(ch.id); setChapterTitle(ch.title||""); setChapterContent(ch.content||""); };
  const deleteChapter = async (novelId: number, chapterId: number) => {
    if (!confirm("Delete this chapter?")) return;
    try { await apiRequest(`/api/admin/novels/${novelId}/chapters/${chapterId}`, { method: "DELETE" }); await loadNovels(); await openNovelManager(novelId); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not delete chapter."); }
  };
  const moveChapter = async (novelId: number, idx: number, dir: -1|1) => {
    const arr = [...chapters]; const j = idx + dir; if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    setChapters(arr);
    try { await apiRequest(`/api/admin/novels/${novelId}/chapters/reorder`, { method: "POST", body: JSON.stringify({ order: arr.map(c => c.id) }) }); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not reorder chapters."); await openNovelManager(novelId); }
  };

  const resetQuestionForm = () => { setEditingQuestionId(null); setQQuestion(""); setQOptions(["","","",""]); setQCorrect("A"); setQExplanation(""); setQTopic(""); setQImage(null); };
  const startEditQuestion = (q: AdminNovelQuestion) => {
    const opts = Array.isArray(q.options) ? q.options : [q.options.A,q.options.B,q.options.C,q.options.D];
    const ans = q.correctAnswer || (typeof q.answer === 'number' ? "ABCD"[q.answer] : "A") || "A";
    setEditingQuestionId(typeof q.id === 'string' ? Number(q.questionId || q.id) : q.id); setQQuestion(q.question || ""); setQOptions([opts[0]||"",opts[1]||"",opts[2]||"",opts[3]||""]); setQCorrect(ans); setQExplanation(q.explanation || ""); setQTopic((q.topic as string) || ""); setQImage(null);
  };
  const saveNovelQuestion = async (novelId: number) => {
    if (!qQuestion.trim() || qOptions.some(o => !o.trim())) { setError("Question and all options A-D are required."); return; }
    setQBusy(true); setError("");
    try {
      const fd = new FormData();
      fd.append("question", qQuestion.trim()); fd.append("correctAnswer", qCorrect); fd.append("explanation", qExplanation); fd.append("topic", qTopic);
      fd.append("options", JSON.stringify({ A: qOptions[0], B: qOptions[1], C: qOptions[2], D: qOptions[3] }));
      if (qImage) fd.append("image", qImage);
      if (editingQuestionId) await apiRequest(`/api/admin/novels/${novelId}/questions/${editingQuestionId}`, { method: "PUT", body: fd });
      else await apiRequest(`/api/admin/novels/${novelId}/questions`, { method: "POST", body: fd });
      resetQuestionForm(); await openNovelManager(novelId); await loadNovels();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save novel question."); }
    finally { setQBusy(false); }
  };
  const deleteNovelQuestion = async (novelId: number, q: AdminNovelQuestion) => {
    if (!confirm("Delete this novel question?")) return;
    const id = typeof q.id === 'string' ? Number(q.questionId || q.id) : q.id;
    try { await apiRequest(`/api/admin/novels/${novelId}/questions/${id}`, { method: "DELETE" }); await openNovelManager(novelId); await loadNovels(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not delete question."); }
  };

  const activeNovel = novels.find(n => n.id === activeNovelId) || null;

  return (
    <section className="admin-students-view">
      <div className="admin-view-heading"><div><p className="admin-eyebrow">SCHOOL WORKSPACE</p><h2>Novel Management</h2><p>Create, publish, and manage novels, chapters, PDFs, and CBT questions.</p></div></div>
      {msg && <div className="admin-toast success">{msg}</div>}
      {error && <p className="admin-error" role="alert">{error}</p>}

      <form onSubmit={saveNovel} className="admin-form">
        <h3 style={{color:'#fff', margin:0}}>{editing ? "Edit Novel" : "Add Novel"}</h3>
        <div className="admin-row">
          <div className="admin-field"><label>Title *</label><input value={title} onChange={e=>setTitle(e.target.value)} required style={{background:'#1a1a1a', color:'#fff'}}/></div>
          <div className="admin-field"><label>Author *</label><input value={author} onChange={e=>setAuthor(e.target.value)} required style={{background:'#1a1a1a', color:'#fff'}}/></div>
          <div className="admin-field"><label>Category *</label><select value={category} onChange={e=>setCategory(e.target.value as any)}><option value="JAMB">JAMB</option><option value="WAEC">WAEC</option><option value="NECO">NECO</option></select></div>
        </div>
        <div className="admin-field"><label>Description</label><textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} style={{background:'#1a1a1a', color:'#fff', border:'1px solid #333'}}/></div>
        <div className="admin-row">
          <label style={{display:'flex',alignItems:'center',gap:8,color:'#e5e7eb'}}><input type="checkbox" checked={published} onChange={e=>setPublished(e.target.checked)} /> Published</label>
          <label style={{display:'flex',alignItems:'center',gap:8,color:'#e5e7eb'}}><input type="checkbox" checked={pdfEnabled} onChange={e=>setPdfEnabled(e.target.checked)} /> Enable PDF download</label>
        </div>
        <div className="admin-row">
          <div className="admin-field"><label>Cover image</label><input type="file" accept="image/*" onChange={e=>setCoverFile(e.target.files?.[0]||null)} />{editing?.coverUrl && <label style={{fontSize:12,color:'#9ca3af'}}><input type="checkbox" checked={removeCover} onChange={e=>setRemoveCover(e.target.checked)} /> Remove existing cover</label>}</div>
          <div className="admin-field"><label>PDF file</label><input type="file" accept="application/pdf,.pdf" onChange={e=>setPdfFile(e.target.files?.[0]||null)} />{(editing?.pdfUrl || editing?.hasPdf) && <label style={{fontSize:12,color:'#9ca3af'}}><input type="checkbox" checked={removePdf} onChange={e=>setRemovePdf(e.target.checked)} /> Remove existing PDF</label>}</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="admin-btn primary lg" disabled={saving} style={{flex:1}}>{saving?"Saving...":(editing?"Update Novel":"Create Novel")}</button>
          {editing && <button type="button" className="admin-btn ghost" onClick={resetNovelForm}>Cancel edit</button>}
        </div>
      </form>

      <section className="admin-overview-card" style={{marginTop:20}}>
        <div className="admin-section-heading"><div><h3>Novels</h3><p>Manage library, publishing, chapters, and questions.</p></div><button onClick={()=>void loadNovels()} disabled={loading}>Refresh</button></div>
        {loading ? <p className="admin-empty-note">Loading novels...</p> : novels.length === 0 ? <p className="admin-empty-note">No novels yet.</p> : (
          <div className="csv-preview-table-wrap"><table className="csv-preview-table"><thead><tr><th>Title</th><th>Author</th><th>Category</th><th>Chapters</th><th>Questions</th><th>Status</th><th>Actions</th></tr></thead><tbody>
            {novels.map(n => (
              <tr key={n.id}>
                <td>{n.title}{n.coverUrl ? <div style={{fontSize:12,color:'#9ca3af'}}>Cover uploaded</div> : null}</td>
                <td>{n.author}</td><td>{n.category}</td><td>{n.chapterCount ?? (n.chapters?.length||0)}</td><td>{n.questionCount ?? (n.questions?.length||0)}</td>
                <td>{n.published ? "Published" : "Unpublished"}{(n.pdfEnabled || n.hasPdf) ? " • PDF" : ""}</td>
                <td><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  <button type="button" className="admin-btn sm" onClick={()=>startEditNovel(n)}>Edit</button>
                  <button type="button" className="admin-btn sm" onClick={()=>void togglePublish(n)}>{n.published?"Unpublish":"Publish"}</button>
                  <button type="button" className="admin-btn sm" onClick={()=>void openNovelManager(n.id)}>Manage</button>
                  <button type="button" className="del-btn" onClick={()=>void deleteNovel(n.id)}>Delete</button>
                </div></td>
              </tr>
            ))}
          </tbody></table></div>
        )}
      </section>

      {activeNovel && (
        <section className="admin-overview-card" style={{marginTop:20}}>
          <div className="admin-section-heading"><div><h3>Manage: {activeNovel.title}</h3><p>Chapters, PDF settings, and CBT questions for this novel.</p></div><button onClick={()=>{setActiveNovelId(null); setChapters([]); setNovelQuestions([]);}}>Close</button></div>
          <div className="admin-row" style={{alignItems:'flex-start'}}>
            <div style={{flex:1, minWidth:280}}>
              <h4 style={{color:'#fff'}}>Chapters</h4>
              <div className="admin-field"><label>Chapter title</label><input value={chapterTitle} onChange={e=>setChapterTitle(e.target.value)} style={{background:'#1a1a1a',color:'#fff'}}/></div>
              <div className="admin-field"><label>Chapter content</label><textarea value={chapterContent} onChange={e=>setChapterContent(e.target.value)} rows={6} style={{background:'#1a1a1a',color:'#fff',border:'1px solid #333'}}/></div>
              <div style={{display:'flex',gap:8}}><button type="button" className="admin-btn primary" onClick={()=>void saveChapter(activeNovel.id)} disabled={chapterBusy}>{chapterBusy?"Saving...":(editingChapterId?"Update Chapter":"Add Chapter")}</button>{editingChapterId && <button type="button" className="admin-btn ghost" onClick={()=>{setEditingChapterId(null);setChapterTitle("");setChapterContent("");}}>Cancel</button>}</div>
              <div style={{marginTop:12, display:'grid', gap:8}}>
                {chapters.length === 0 ? <p className="admin-empty-note">No chapters yet.</p> : chapters.map((ch, idx) => (
                  <div key={ch.id} style={{border:'1px solid #2a2a2a', borderRadius:10, padding:10, background:'#141414'}}>
                    <div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'center'}}><strong style={{color:'#fff'}}>{idx+1}. {ch.title}</strong><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                      <button type="button" className="admin-btn sm" onClick={()=>moveChapter(activeNovel.id, idx, -1)} disabled={idx===0}>↑</button>
                      <button type="button" className="admin-btn sm" onClick={()=>moveChapter(activeNovel.id, idx, 1)} disabled={idx===chapters.length-1}>↓</button>
                      <button type="button" className="admin-btn sm" onClick={()=>editChapter(ch)}>Edit</button>
                      <button type="button" className="del-btn" onClick={()=>void deleteChapter(activeNovel.id, ch.id)}>Delete</button>
                    </div></div>
                    <p style={{color:'#9ca3af', fontSize:12, marginTop:6, whiteSpace:'pre-wrap'}}>{(ch.content||"").slice(0,180)}{(ch.content||"").length>180?"…":""}</p>
                  </div>
                ))}
              </div>
            </div>
            <div style={{flex:1, minWidth:280}}>
              <h4 style={{color:'#fff'}}>CBT Questions</h4>
              <div className="admin-field"><label>Question</label><textarea value={qQuestion} onChange={e=>setQQuestion(e.target.value)} rows={3} style={{background:'#1a1a1a',color:'#fff',border:'1px solid #333'}}/></div>
              <div className="admin-options-grid">
                {["A","B","C","D"].map((o,i)=>(<div key={o} className={`admin-field option-field ${qCorrect===o?'is-correct':''}`}><label>Option {o}</label><input value={qOptions[i]} onChange={e=>{const n=[...qOptions]; n[i]=e.target.value; setQOptions(n);}} style={{background:'#1a1a1a',color:'#fff'}}/></div>))}
              </div>
              <div className="admin-row">
                <div className="admin-field"><label>Correct</label><select value={qCorrect} onChange={e=>setQCorrect(e.target.value)}><option>A</option><option>B</option><option>C</option><option>D</option></select></div>
                <div className="admin-field"><label>Topic</label><input value={qTopic} onChange={e=>setQTopic(e.target.value)} style={{background:'#1a1a1a',color:'#fff'}}/></div>
              </div>
              <div className="admin-field"><label>Explanation</label><input value={qExplanation} onChange={e=>setQExplanation(e.target.value)} style={{background:'#1a1a1a',color:'#fff'}}/></div>
              <div className="admin-field"><label>Question image (optional)</label><input type="file" accept="image/*" onChange={e=>setQImage(e.target.files?.[0]||null)} /></div>
              <div style={{display:'flex',gap:8}}><button type="button" className="admin-btn primary" onClick={()=>void saveNovelQuestion(activeNovel.id)} disabled={qBusy}>{qBusy?"Saving...":(editingQuestionId?"Update Question":"Add Question")}</button>{editingQuestionId && <button type="button" className="admin-btn ghost" onClick={resetQuestionForm}>Cancel</button>}</div>
              <div style={{marginTop:12, display:'grid', gap:8}}>
                {novelQuestions.length === 0 ? <p className="admin-empty-note">No questions yet.</p> : novelQuestions.map((q, idx) => {
                  const opts = Array.isArray(q.options) ? q.options : [q.options?.A,q.options?.B,q.options?.C,q.options?.D];
                  const ans = q.correctAnswer || (typeof q.answer === 'number' ? "ABCD"[q.answer] : "");
                  return (
                    <div key={String(q.id)} style={{border:'1px solid #2a2a2a', borderRadius:10, padding:10, background:'#141414'}}>
                      <div style={{display:'flex',justifyContent:'space-between',gap:8}}><strong style={{color:'#fff'}}>Q{idx+1}</strong><div style={{display:'flex',gap:6}}><button type="button" className="admin-btn sm" onClick={()=>startEditQuestion(q)}>Edit</button><button type="button" className="del-btn" onClick={()=>void deleteNovelQuestion(activeNovel.id, q)}>Delete</button></div></div>
                      <div style={{color:'#e5e7eb', fontSize:13, marginTop:4}}>{q.question}</div>
                      <div style={{color:'#9ca3af', fontSize:12, marginTop:4}}>A: {opts[0]} · B: {opts[1]} · C: {opts[2]} · D: {opts[3]} · Ans: {ans}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}
    </section>
  );
}

export default function AdminDashboard({ setActivePage }: { setActivePage: (p:string)=>void }) {
  const [authState, setAuthState] = useState<"checking" | "signedOut" | "denied" | "authenticated">("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [studentPagination, setStudentPagination] = useState<StudentPagination | null>(null);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [classId, setClassId] = useState("");
  const [studentPage, setStudentPage] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentPerformance, setStudentPerformance] = useState<StudentPerformance | null>(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [performanceError, setPerformanceError] = useState("");
  const [examsLoading, setExamsLoading] = useState(false);
  const [examsError, setExamsError] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);
  const [questionsError, setQuestionsError] = useState("");

  const [adminView, setAdminView] = useState<"overview"|"students"|"exams"|"study"|"novels">("overview");
  const [examTab, setExamTab] = useState<"exams"|"questions">("exams");
  const [exams, setExams] = useState<Exam[]>([]);
  const [allSubjects] = useState(defaultSubjects);

  const [eTitle, setETitle] = useState("");
  const [eType, setEType] = useState(defaultExamTypes[0]);
  const [customType, setCustomType] = useState("");
  const [showCustomType, setShowCustomType] = useState(false);
  const [eDuration, setEDuration] = useState("60");
  const [eExamDate, setEExamDate] = useState("");
  const [eSubjects, setESubjects] = useState<string[]>(["Mathematics","English"]);

  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [expandedExam, setExpandedExam] = useState<string | null>(null);
  const [newSubjectInput, setNewSubjectInput] = useState("");

  const [selectedExam, setSelectedExam] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [questionYear, setQuestionYear] = useState("");
  const [questionImage, setQuestionImage] = useState<File | null>(null);
  const [questionImagePreview, setQuestionImagePreview] = useState("");
  const [uploadedQuestionImageUrl, setUploadedQuestionImageUrl] = useState("");
  const [questionImageError, setQuestionImageError] = useState("");
  const [questionSubmitError, setQuestionSubmitError] = useState("");
  const questionImageInput = useRef<HTMLInputElement>(null);
  const [options, setOptions] = useState(["","","",""]);
  const [correct, setCorrect] = useState("A");
  const [explanation, setExplanation] = useState("");
  const [csvRows, setCsvRows] = useState<CsvQuestionRow[]>([]);
  const [csvImageFiles, setCsvImageFiles] = useState<Map<string, File>>(new Map());
  const [csvUploadFile, setCsvUploadFile] = useState<File | null>(null);
  const [csvSelectedImages, setCsvSelectedImages] = useState<File[]>([]);
  const csvImagesInput = useRef<HTMLInputElement>(null);
  const [csvImageError, setCsvImageError] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [csvExamId, setCsvExamId] = useState("");
  const [csvError, setCsvError] = useState("");
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvProgress, setCsvProgress] = useState({ completed: 0, total: 0 });
  const [bulkPreviewReady, setBulkPreviewReady] = useState(false);
  const [bulkImportResult, setBulkImportResult] = useState<Record<string, unknown> | null>(null);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchOverview = async () => {
    setOverviewLoading(true);
    setOverviewError("");
    try {
      const data = await apiRequest<OverviewData>("/api/admin/overview");
      setOverview(data && typeof data === "object" ? data : {});
      setAuthState("authenticated");
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status === 401) setAuthState("signedOut");
      else if (status === 403) { setAuthState("denied"); setAuthError(error instanceof Error ? error.message : "Access denied."); }
      else { setOverviewError(error instanceof Error ? error.message : "Could not load overview."); setAuthState("signedOut"); }
    } finally { setOverviewLoading(false); }
  };

  const fetchExams = async () => {
    setExamsLoading(true); setExamsError("");
    try {
      const payload = await apiRequest<unknown>("/api/exams");
      const raw = Array.isArray(payload) ? payload : asArray<any>((payload as any)?.exams);
      const list: Exam[] = raw.map((e:any) => {
        const examDate = e?.scheduledAt ?? e?.scheduled_at ?? e?.examDate ?? e?.exam_date ?? e?.scheduledDate ?? e?.scheduled_date;
        return {
          id: String(e?.id ?? ""), title: String(e?.title ?? "Untitled exam"),
          examType: String(e?.examType ?? ""), year: Number(e?.year) || 0,
          duration: Number(e?.duration) || 0,
          subjects: Array.isArray(e?.subjects) ? e.subjects.filter((s:unknown): s is string => typeof s === "string") : typeof e?.subject === "string" ? e.subject.split(",").map((s:string)=>s.trim()).filter(Boolean) : [],
          totalQuestions: typeof e?.totalQuestions === "number" ? e.totalQuestions : undefined,
          examDate: typeof examDate === "string" && examDate.trim() ? examDate : undefined,
        };
      }).filter((exam: Exam) => exam.id);
      setExams(list);
      if(list[0] && !selectedExam){ setSelectedExam(list[0].id); if(list[0].subjects[0]) setSelectedSubject(list[0].subjects[0]); }
    } catch (error) { setExamsError(error instanceof Error ? error.message : "Could not load exams."); setExams([]); }
    finally { setExamsLoading(false); }
  };

  useEffect(()=>{ void fetchOverview(); }, []);
  useEffect(()=>{ if(authState === "authenticated") void fetchExams(); }, [authState]);
  useEffect(()=>{
    const ex = exams.find(x=>x.id===selectedExam);
    if(ex && ex.subjects.length>0 &&!ex.subjects.includes(selectedSubject)){
      setSelectedSubject(ex.subjects[0]);
    }
  }, [selectedExam, exams]);
  useEffect(()=>{ if(authState === "authenticated" && adminView === "students") void fetchStudents(); }, [authState, adminView, studentPage]);
  useEffect(()=>{ if(authState === "authenticated" && adminView === "exams" && examTab === "questions") void fetchQuestions(); }, [authState, adminView, examTab, selectedExam, selectedSubject]);
  useEffect(() => {
    if (!questionImagePreview) return;
    return () => URL.revokeObjectURL(questionImagePreview);
  }, [questionImagePreview]);

  const handleLogin = async () => {
    setAuthError("");
    try {
      await apiRequest("/api/admin/login", { method: "POST", body: JSON.stringify({ email, password }) });
      setPassword("");
      await fetchOverview();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Login failed.");
      if ((error as { status?: number }).status === 403) setAuthState("denied");
    }
  };

  const handleLogout = async () => {
    try { await apiRequest("/api/logout", { method: "POST" }); }
    catch (error) { setAuthError(error instanceof Error ? error.message : "Could not sign out."); }
    setAuthState("signedOut"); setOverview(null); setStudents([]); setSelectedStudent(null);
  };

  const fetchStudents = async (page = studentPage, search = studentSearch, selectedClass = classId) => {
    setStudentsLoading(true); setStudentsError("");
    const query = new URLSearchParams({ search, classId: selectedClass, page: String(page), limit: "50" });
    try {
      const data = await apiRequest<{ students?: Student[]; pagination?: StudentPagination }>(`/api/admin/students?${query}`);
      setStudents(asArray<Student>(data?.students));
      setStudentPagination(data?.pagination ?? null);
      if (typeof data?.pagination?.page === "number") setStudentPage(data.pagination.page);
    } catch (error) { setStudentsError(error instanceof Error ? error.message : "Could not load students."); setStudents([]); }
    finally { setStudentsLoading(false); }
  };

  const loadStudentPerformance = async (student: Student) => {
    setSelectedStudent(student); setStudentPerformance(null); setPerformanceLoading(true); setPerformanceError("");
    try {
      const data = await apiRequest<StudentPerformance>(`/api/admin/students/${encodeURIComponent(student.id)}/performance?from=&to=`);
      setStudentPerformance(data && typeof data === "object" ? data : {});
    } catch (error) { setPerformanceError(error instanceof Error ? error.message : "Could not load student performance."); }
    finally { setPerformanceLoading(false); }
  };

  const fetchQuestions = async (examId = selectedExam, subject = selectedSubject) => {
    if (!examId || !subject) { setQuestions([]); return; }
    setQuestionsLoading(true); setQuestionsError("");
    const query = new URLSearchParams({ examId, subject });
    try {
      const payload = await apiRequest<unknown>(`/api/questions?${query}`);
      setQuestions(Array.isArray(payload) ? payload : asArray<any>((payload as any)?.questions));
    } catch (error) { setQuestionsError(error instanceof Error ? error.message : "Could not load questions."); setQuestions([]); }
    finally { setQuestionsLoading(false); }
  };
  const deleteSelectedExamQuestions = async () => {
    if (!selectedQuestionIds.length) return;
    if (!confirm(`Delete ${selectedQuestionIds.length} selected question(s)?`)) return;
    try {
      await Promise.all(selectedQuestionIds.map(id => apiRequest(`/api/admin/question/${id}`, { method: "DELETE" })));
      setQuestions(qs => qs.filter(q => !selectedQuestionIds.includes(Number(q.id))));
      setSelectedQuestionIds([]);
      setMsg("Selected questions deleted."); setTimeout(()=>setMsg(""), 2500);
      await fetchQuestions();
    } catch (error) { setQuestionsError(error instanceof Error ? error.message : "Could not delete selected questions."); }
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
    const scheduledAt = eExamDate ? `${eExamDate}T23:59:59` : null;
    setLoading(true);
    try {
      if(editingExam) {
        await apiRequest(`/api/admin/exam/${encodeURIComponent(editingExam.id)}`, { method: "PUT", body: JSON.stringify({ title:eTitle, examType:eType, duration:Number(eDuration), subjects:eSubjects, scheduledAt }) });
        setMsg(`"${eTitle}" updated!`); setEditingExam(null);
      } else {
        await apiRequest("/api/admin/create-exam", { method: "POST", body: JSON.stringify({ title:eTitle, examType:eType, duration:Number(eDuration), subjects:eSubjects, scheduledAt, questions:[] }) });
        setMsg(`"${eTitle}" created with ${eSubjects.length} subjects!`);
      }
      setETitle(""); setEExamDate(""); setESubjects(["Mathematics","English"]); await fetchExams();
      setTimeout(()=>setMsg(""),3000);
    } catch(error) { setMsg(error instanceof Error ? error.message : "Could not save exam."); }
    finally { setLoading(false); }
  };
  const startEdit = (ex: Exam) => {
    setEditingExam(ex);
    setETitle(ex.title); setEType(ex.examType);
    setEDuration(String(ex.duration || 60));
    setEExamDate(ex.examDate?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? "");
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
    try {
      await apiRequest(`/api/admin/exam/${encodeURIComponent(examId)}`, { method: "PUT", body: JSON.stringify({ subjects:[...ex.subjects, formatted] }) });
      setNewSubjectInput(""); await fetchExams();
    } catch(error) { setMsg(error instanceof Error ? error.message : "Could not add subject."); }
  };

  const removeSubjectFromExam = async (examId: string, sub: string) => {
    if(!confirm(`Remove ${sub}?`)) return;
    const ex = exams.find(x=>x.id===examId);
    if(!ex) return;
    try {
      await apiRequest(`/api/admin/exam/${encodeURIComponent(examId)}`, { method: "PUT", body: JSON.stringify({ subjects:ex.subjects.filter(s=>s!==sub) }) });
      await fetchExams();
    } catch(error) { setMsg(error instanceof Error ? error.message : "Could not remove subject."); }
  };

  const addQuestion = async (e:React.FormEvent) => {
    e.preventDefault();
    if(!selectedExam || !selectedSubject) return alert("Select exam and subject");
    const yearValue = questionYear.trim();
    if(!/^\d{4}$/.test(yearValue)) { setQuestionSubmitError("Year must be a valid four-digit year (e.g. 2000)."); return; }
    setQuestionSubmitError("");
    setLoading(true);
    try {
      let imageUrl = uploadedQuestionImageUrl;
      if (questionImage && !imageUrl) {
        imageUrl = await uploadQuestionImage(questionImage);
        setUploadedQuestionImageUrl(imageUrl);
      }
      await apiRequest("/api/admin/add-question", { method: "POST", body: JSON.stringify({
        examId: selectedExam, subject: selectedSubject, question, year: Number(yearValue),
        options: {A:options[0], B:options[1], C:options[2], D:options[3]},
        correctAnswer: correct, ...(explanation.trim() ? { explanation } : {}),
        ...(imageUrl ? { imageUrl } : {}),
      }) });
      setMsg(`Added to ${selectedSubject}!`); setQuestion(""); setQuestionYear(""); setOptions(["","","",""]); setExplanation("");
      setQuestionImage(null); setQuestionImagePreview(""); setUploadedQuestionImageUrl(""); setQuestionImageError("");
      setQuestionSubmitError("");
      if (questionImageInput.current) questionImageInput.current.value = "";
      await fetchQuestions(); setTimeout(()=>setMsg(""),3000);
    } catch(error) { setQuestionSubmitError(error instanceof Error ? error.message : "Could not add question."); }
    finally { setLoading(false); }
  };
  const handleQuestionImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg"];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setQuestionImageError("Choose a PNG, JPG, or JPEG image.");
      return;
    }

    setQuestionImageError("");
    setQuestionImage(file);
    setUploadedQuestionImageUrl("");
    setQuestionImagePreview(URL.createObjectURL(file));
  };
  const removeQuestionImage = () => {
    setQuestionImage(null);
    setQuestionImagePreview("");
    setUploadedQuestionImageUrl("");
    setQuestionImageError("");
    if (questionImageInput.current) questionImageInput.current.value = "";
  };
  const downloadCsvTemplate = () => {
    const blob = new Blob([`${csvTemplateHeaders.join(",")}\n`], { type: "text/csv;charset=utf-8" });
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
    setCsvImageFiles(new Map());
    setCsvUploadFile(null);
    setCsvSelectedImages([]);
    setCsvImageError("");
    if (csvImagesInput.current) csvImagesInput.current.value = "";
    setCsvFileName("");
    setCsvExamId("");
    setCsvError("");
    setCsvProgress({ completed: 0, total: 0 });
    setBulkPreviewReady(false);
    setBulkImportResult(null);
    if (!file) return;
    const extension = file.name.toLowerCase().split(".").pop();
    if (extension !== "csv" && extension !== "zip") {
      setCsvError("Choose a .csv or .zip file.");
      return;
    }
    const maxFileBytes = extension === "zip" ? maxQuestionZipBytes : maxCsvFileBytes;
    if (file.size > maxFileBytes) {
      if (extension === "zip") {
        setCsvError("This ZIP is larger than 25 MB. Reduce its size and try again.");
        return;
      }
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
      let parsedRows: CsvQuestionRow[];
      if (extension === "zip") {
        const zipContents = await loadQuestionZip(file, exam.subjects);
        parsedRows = zipContents.rows;
        setCsvImageFiles(zipContents.images);
      } else {
        parsedRows = parseQuestionCsv(await file.text(), exam.subjects, { allowImageReferences: true });
      }
      if (parsedRows.length > maxCsvRows) {
        setCsvError(`This file has ${parsedRows.length} rows. Import up to ${maxCsvRows} questions at a time.`);
        setCsvImageFiles(new Map());
        return;
      }

      if (extension === "csv") setCsvUploadFile(file);
      setCsvFileName(file.name);
      setCsvExamId(selectedExam);
      setCsvRows(parsedRows);
    } catch (error) {
      setCsvImageFiles(new Map());
      setCsvError(error instanceof Error ? error.message : "Could not read this file. Try saving it again as a CSV and re-uploading it.");
    }
  };

  const handleCsvImagesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    setCsvImageError("");
    setBulkPreviewReady(false);
    setBulkImportResult(null);

    const accepted: File[] = [];
    const errors: string[] = [];
    for (const file of files) {
      if (!isSupportedQuestionImage(file)) {
        errors.push(`${file.name}: choose a PNG, JPG, JPEG, or WEBP image.`);
      } else if (file.size > maxQuestionImageBytes) {
        errors.push(`${file.name}: image files must be 5 MB or smaller.`);
      } else {
        accepted.push(file);
      }
    }

    setCsvSelectedImages(current => {
      const selected = [...current];
      for (const file of accepted) {
        if (!selected.some(item => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)) {
          selected.push(file);
        }
      }
      return selected;
    });
    if (errors.length) setCsvImageError(errors.join(" "));
  };

  const removeCsvImage = (index: number) => {
    setCsvSelectedImages(current => current.filter((_, fileIndex) => fileIndex !== index));
    setBulkPreviewReady(false);
    setBulkImportResult(null);
  };

  const previewBulkImport = () => {
    setCsvError("");
    setBulkImportResult(null);
    setBulkPreviewReady(true);
  };

  const importBulkCsvQuestions = async () => {
    if (!csvUploadFile || !selectedExam || selectedExam !== csvExamId) {
      setCsvError("Select the same exam used for this CSV preview.");
      return;
    }

    const imageSummary = summarizeQuestionImageMatches(csvRows, csvSelectedImages);
    const invalidRows = csvRows.filter(row => row.errors.length > 0);
    if (invalidRows.length || imageSummary.missingImages > 0) {
      setCsvError("Resolve the CSV validation errors and match every referenced image before importing.");
      return;
    }

    setCsvError("");
    setCsvImporting(true);
    setBulkImportResult(null);
    try {
      const formData = new FormData();
      formData.append("csv", csvUploadFile, csvUploadFile.name);
      formData.append("examId", selectedExam);
      for (const image of csvSelectedImages) formData.append("images", image, image.name);

      const response = await apiRequest<unknown>("/api/admin/import-questions", {
        method: "POST",
        body: formData,
      });
      const body = response && typeof response === "object" ? response as Record<string, unknown> : {};
      if (body.success === false || typeof body.error === "string") {
        const message = body.message ?? body.error;
        throw new Error(typeof message === "string" ? message : "The bulk import was rejected by the server.");
      }
      const result = body.summary && typeof body.summary === "object"
        ? body.summary as Record<string, unknown>
        : body;
      setBulkImportResult(result);
      const message = typeof body.message === "string" ? body.message : result.message;
      const failedCount = typeof result.failed === "number" ? result.failed : 0;
      const hasValidationErrors = Array.isArray(result.validationErrors) && result.validationErrors.length > 0;
      const fallbackMessage = failedCount > 0
        ? `Import completed: ${typeof result.imported === "number" ? result.imported : "Some"} added, ${failedCount} failed.`
        : hasValidationErrors ? "Import completed with validation errors." : "Questions imported successfully.";
      setMsg(typeof message === "string" ? message : fallbackMessage);
      if (failedCount === 0 && !hasValidationErrors) {
        setCsvRows(current => current.map(row => ({ ...row, status: "imported", importError: undefined })));
      }
      await fetchQuestions();
      setTimeout(() => setMsg(""), 5000);
    } catch (error) {
      setCsvError(error instanceof Error ? error.message : "Could not import these questions.");
    } finally {
      setCsvImporting(false);
    }
  };

  const importCsvQuestions = async () => {
    if (csvUploadFile && csvSelectedImages.length > 0) {
      await importBulkCsvQuestions();
      return;
    }
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
    const uploadedImages = new Map<string, string>();

    for (const [index, row] of rowsToImport.entries()) {
      try {
        let imageUrl = row.imageUrl;
        const imageFile = row.imageUrl ? csvImageFiles.get(normalizeImageReference(row.imageUrl)) : undefined;
        if (imageFile && row.imageUrl) {
          const imageReference = normalizeImageReference(row.imageUrl);
          imageUrl = uploadedImages.get(imageReference) || await uploadQuestionImage(imageFile);
          uploadedImages.set(imageReference, imageUrl);
        }
        await apiRequest("/api/admin/add-question", {
          method: "POST",
          body: JSON.stringify({
            examId: selectedExam,
            subject: row.subject,
            year: row.year,
            question: row.question,
            options: { A: row.optionA, B: row.optionB, C: row.optionC, D: row.optionD },
            correctAnswer: row.correctAnswer,
            ...(row.explanation ? { explanation: row.explanation } : {}),
            ...(imageUrl ? { imageUrl } : {}),
          }),
        });
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
    setMsg(`Question import finished: ${imported} added, ${failed} failed.`);
    setTimeout(() => setMsg(""), 5000);
  };

  const imageMatchSummary = summarizeQuestionImageMatches(csvRows, csvSelectedImages);
  const bulkValidationErrors = [
    ...csvRows.flatMap(row => row.errors.map(error => `Row ${row.rowNumber}: ${error}`)),
    ...imageMatchSummary.missingReferences.map(reference => `No unique selected image matches "${reference}".`),
  ];
  const bulkResultValue = (key: string, fallback: number): number => {
    const value = bulkImportResult?.[key];
    return typeof value === "number" ? value : fallback;
  };

  if (authState === "checking") return <div className="admin-wrap"><div className="admin-login-card"><h2>Checking admin session...</h2></div></div>;

  if (authState === "denied") return (
    <div className="admin-wrap"><div className="admin-login-card">
      <div className="admin-logo"><img src="/icons/examcore-192.png" alt="ExamCore" />EXAMCORE<span>ADMIN</span></div>
      <h2>Access denied</h2><p className="admin-sub">{authError || "Your account does not have admin access."}</p>
      <button className="admin-btn ghost" onClick={()=>setActivePage("home")}>Back to Home</button>
    </div></div>
  );

  if (authState === "signedOut") return (
    <div className="admin-wrap"><form className="admin-login-card" onSubmit={e=>{e.preventDefault(); void handleLogin();}}>
      <div className="admin-logo"><img src="/icons/examcore-192.png" alt="ExamCore" />EXAMCORE<span>ADMIN</span></div>
      <h2>Admin Login</h2><p className="admin-sub">Sign in with your school administrator account.</p>
      {(authError || overviewError) && <p className="admin-error" role="alert">{authError || overviewError}</p>}
      <div className="admin-field"><label htmlFor="admin-email">Email</label><input id="admin-email" type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
      <div className="admin-field"><label htmlFor="admin-password">Password</label><input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required /></div>
      <button className="admin-btn primary" type="submit" disabled={!email || !password}>Sign In</button>
      <button type="button" className="admin-btn ghost" onClick={()=>setActivePage("home")}>Back to Home</button>
    </form></div>
  );
  return (
    <div className="admin-wrap"><div className="admin-panel">
      <div className="admin-header">
        <div><div className="admin-logo small"><img src="/icons/examcore-192.png" alt="ExamCore" />EXAMCORE<span>ADMIN</span></div><p>Admin session active</p></div>
        <div style={{display:"flex",gap:8}}><span className="admin-pill">{exams.length} Exams</span><button className="admin-btn danger-sm" onClick={()=>void handleLogout()}>Logout</button></div>
      </div>

      <nav className="admin-primary-nav" aria-label="Admin sections">
        <button className={adminView === "overview" ? "active" : ""} onClick={() => setAdminView("overview")}><LayoutDashboard size={16} /> Overview</button>
        <button className={adminView === "students" ? "active" : ""} onClick={() => setAdminView("students")}><UsersRound size={16} /> Students</button>
        <button className={adminView === "exams" ? "active" : ""} onClick={() => setAdminView("exams")}><BookOpen size={16} /> Exams</button>
        <button className={adminView === "study" ? "active" : ""} onClick={() => setAdminView("study")}><GraduationCap size={16} /> Study Management</button>
        <button className={adminView === "novels" ? "active" : ""} onClick={() => setAdminView("novels")}><BookOpen size={16} /> Novel Management</button>
      </nav>

      {msg && <div className="admin-toast success">{msg}</div>}

      {adminView === "overview" ? (
        <section className="admin-overview">
          <div className="admin-view-heading"><div><p className="admin-eyebrow">SCHOOL WORKSPACE</p><h2>Overview</h2><p>Exam activity and school performance at a glance.</p></div><button className="admin-overview-action" onClick={() => setAdminView("exams")}>Manage exams <ArrowRight size={16} /></button></div>
          {overviewError && <p className="admin-error" role="alert">{overviewError}</p>}
          {overviewLoading ? <p className="admin-empty-note">Loading overview...</p> : <>
            <div className="admin-metrics-grid">{Object.entries(overview?.counts ?? {}).map(([key,value])=><article className="admin-metric-card" key={key}><span>{key.replace(/([A-Z])/g," $1")}</span><strong>{value ?? "—"}</strong></article>)}{Object.keys(overview?.counts ?? {}).length===0 && <p className="admin-empty-note">No overview counts are available.</p>}</div>
            <section className="admin-overview-card"><div className="admin-section-heading"><div><h3>Performance</h3><p>School score metrics</p></div><Activity size={18} /></div>
              {Object.keys(overview?.performance ?? {}).length ? <div className="admin-metrics-grid">{Object.entries(overview?.performance ?? {}).map(([key,value])=><article className="admin-metric-card" key={key}><span>{key.replace(/([A-Z])/g," $1")}</span><strong>{value == null && key.toLowerCase().includes("score") ? "No results yet" : value ?? "—"}{typeof value === "number" && key.toLowerCase().includes("score") ? "%" : ""}</strong></article>)}</div> : <p className="admin-empty-note">No results yet.</p>}
            </section>
          </>}
          <div className="admin-overview-columns">
            <section className="admin-overview-card"><div className="admin-section-heading"><div><h3>Exam library</h3><p>Recently configured exams</p></div><button onClick={() => setAdminView("exams")}>View all</button></div>
              {examsLoading ? <p className="admin-empty-note">Loading exams...</p> : examsError ? <p className="admin-error" role="alert">{examsError}</p> : exams.length ? <div className="admin-recent-exams">{exams.slice(0,5).map(exam=><div className="admin-recent-exam" key={exam.id}><div><strong>{exam.title}</strong><span>{exam.examType}</span></div><small>{exam.subjects.length} subjects</small></div>)}</div> : <p className="admin-empty-note">No exams are available yet.</p>}
            </section>
            <section className="admin-overview-card"><div className="admin-section-heading"><div><h3>Recent exam activity</h3><p>Latest completed attempts</p></div><Activity size={18} /></div>
              {asArray<any>(overview?.recentExamActivity).length ? <div className="admin-recent-exams">{asArray<any>(overview?.recentExamActivity).map((item,index)=><div className="admin-recent-exam" key={String(item?.id ?? index)}><div><strong>{item?.studentName ?? item?.displayName ?? item?.examTitle ?? "Exam attempt"}</strong><span>{item?.subject ?? item?.examTitle ?? ""}</span></div><small>{item?.score == null || item?.total == null ? "—" : `${item.score}/${item.total}`}</small></div>)}</div> : <p className="admin-empty-note">No results yet.</p>}
            </section>
          </div>
        </section>
      ) : adminView === "students" ? (
        <section className="admin-students-view">
          <div className="admin-view-heading"><div><p className="admin-eyebrow">SCHOOL WORKSPACE</p><h2>Students</h2><p>Student accounts, activity, and performance.</p></div></div>
          <form className="admin-student-filters" onSubmit={e=>{e.preventDefault();setStudentPage(1);void fetchStudents(1,studentSearch,classId);}}><input aria-label="Search students" placeholder="Search name or email" value={studentSearch} onChange={e=>setStudentSearch(e.target.value)} /><input aria-label="Class ID" placeholder="Class ID" type="number" min="1" step="1" value={classId} onChange={e=>setClassId(e.target.value)} /><button className="admin-btn primary" type="submit">Search</button></form>
          {studentsError && <p className="admin-error" role="alert">{studentsError}</p>}
          {studentsLoading ? <p className="admin-empty-note">Loading students...</p> : students.length === 0 ? <p className="admin-empty-note">{studentSearch || classId ? "No students match these filters." : "No students are registered in this school yet."}</p> : <div className="admin-students-table-wrap"><table className="admin-students-table"><thead><tr><th>Name</th><th>Email</th><th>Class</th><th>Status</th><th>Last seen</th></tr></thead><tbody>{students.map(student=><tr key={student.id} onClick={()=>void loadStudentPerformance(student)} aria-selected={selectedStudent?.id===student.id} style={{cursor:"pointer"}}><td>{student.displayName || "—"}</td><td>{student.email || "—"}</td><td>{student.class || "—"}</td><td>{student.accountStatus || "—"}</td><td>{student.lastSeenAt ? new Date(student.lastSeenAt).toLocaleString() : "—"}</td></tr>)}</tbody></table></div>}
          {studentPagination && <div className="admin-pagination"><span>{String(studentPagination.total ?? "")}{studentPagination.total != null ? " students" : ""}</span><button className="admin-btn ghost" disabled={studentPage<=1 || studentsLoading} onClick={()=>setStudentPage(page=>Math.max(1,page-1))}>Previous</button><span>Page {studentPage}{(studentPagination.pages ?? studentPagination.totalPages) != null ? ` of ${String(studentPagination.pages ?? studentPagination.totalPages)}` : ""}</span><button className="admin-btn ghost" disabled={studentsLoading || studentPagination.pages === 0 || ((studentPagination.pages ?? studentPagination.totalPages) != null && studentPage >= Number(studentPagination.pages ?? studentPagination.totalPages))} onClick={()=>setStudentPage(page=>page+1)}>Next</button></div>}
          {selectedStudent && <section className="admin-student-performance"><div className="admin-section-heading"><div><h3>{selectedStudent.displayName || selectedStudent.email || "Student performance"}</h3><p>Performance details</p></div><button className="admin-btn ghost" onClick={()=>{setSelectedStudent(null);setStudentPerformance(null);}}>Close</button></div>
            {performanceLoading ? <p className="admin-empty-note">Loading performance...</p> : performanceError ? <p className="admin-error" role="alert">{performanceError}</p> : <><article className="admin-metric-card"><span>Completed attempts</span><strong>{studentPerformance?.completedAttempts ?? "—"}</strong></article><div className="admin-overview-columns"><section className="admin-overview-card"><h3>Score history</h3>{asArray<any>(studentPerformance?.scoreHistory).length ? asArray<any>(studentPerformance?.scoreHistory).map((item,index)=><p key={String(item?.id ?? index)}>{item?.date ?? item?.completedAt ?? ""} {item?.score == null ? "—" : item.score}{item?.total == null ? "" : ` / ${item.total}`}</p>) : <p className="admin-empty-note">No score history yet.</p>}</section><section className="admin-overview-card"><h3>Results by subject</h3>{asArray<any>(studentPerformance?.resultsBySubject).length ? asArray<any>(studentPerformance?.resultsBySubject).map((item,index)=><p key={String(item?.subject ?? index)}>{item?.subject ?? "Subject"}: {item?.averageScore ?? item?.score ?? "—"}</p>) : <p className="admin-empty-note">No subject results yet.</p>}</section></div></>}
          </section>}
        </section>
      ) : adminView === "exams" ? (
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
            <div className="admin-field"><label>Duration</label><input type="number" value={eDuration} onChange={e=>setEDuration(e.target.value)} /></div>
          </div>

          <div className="admin-field">
            <label htmlFor="exam-date">Scheduled examination date</label>
            <input id="exam-date" type="date" value={eExamDate} onChange={e=>setEExamDate(e.target.value)} />
            <small style={{color:'#8b8ba7'}}>Optional. Scheduled dates appear in the Upcoming Examinations section on Home.</small>
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
            {editingExam && <button type="button" className="admin-btn ghost" onClick={()=>{setEditingExam(null); setETitle(""); setEExamDate(""); setESubjects(["Mathematics","English"]);}}>Cancel</button>}
          </div>
        </form>

        {examsError && <p className="admin-error" role="alert">{examsError}</p>}
        {examsLoading ? <p className="admin-empty-note">Loading exams...</p> : exams.length === 0 ? <p className="admin-empty-note">No exams available.</p> : <div className="exam-list">
          {exams.map(ex=>(
            <div key={ex.id} className="exam-card" style={{flexDirection:'column', alignItems:'stretch', background:'#1a1a1a', border:'1px solid #2a2a2a'}}>
              <div style={{display:'flex', justifyContent:'space-between', width:'100%'}}>
                <div className="exam-info"><b style={{color:'#fff'}}>{ex.title}</b><div className="exam-meta"><span className="badge">{ex.examType}</span><span style={{color:'#888'}}>{ex.duration}min • {ex.subjects?.length} subjects · {ex.totalQuestions ?? "—"} questions</span>{ex.examDate && <span style={{color:'#a5b4fc'}}>Scheduled: {formatExamDate(ex.examDate)}</span>}</div></div>
                <div style={{display:'flex', gap:6}}>
                  <button className="admin-btn sm" onClick={()=>setExpandedExam(expandedExam===ex.id? null : ex.id)}>{expandedExam===ex.id? '▲' : '▼'}</button>
                  <button className="admin-btn sm" onClick={()=>startEdit(ex)}>✏️</button>
                  <button className="del-btn" onClick={async()=>{ if(confirm("Delete exam?")){ try { await apiRequest(`/api/admin/exam/${encodeURIComponent(ex.id)}`, {method:'DELETE'}); await fetchExams(); } catch(error) { setMsg(error instanceof Error ? error.message : "Could not delete exam."); } } }}>🗑️</button>
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
        </div>}
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

        <section className="admin-overview-card" aria-live="polite">
          <div className="admin-section-heading"><div><h3>Questions</h3><p>{selectedSubject || "Select a subject in the form below"}</p></div></div>
          {questionsError && <p className="admin-error" role="alert">{questionsError}</p>}
          {questionsLoading ? <p className="admin-empty-note">Loading questions...</p> : questions.length ? <div><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}><label><input type="checkbox" checked={selectedQuestionIds.length === questions.length && questions.length>0} onChange={e=>{ if(e.target.checked) setSelectedQuestionIds(questions.map(q=>Number(q.id))); else setSelectedQuestionIds([]); }} /> Select all</label><span>{selectedQuestionIds.length} selected</span>{selectedQuestionIds.length>0 && <button type="button" className="del-btn" onClick={()=>void deleteSelectedExamQuestions()}>Delete Selected</button>}</div><div className="admin-question-list">{questions.map((item,index)=><article key={String(item?.id ?? index)}><label style={{marginRight:8}}><input type="checkbox" checked={selectedQuestionIds.includes(Number(item.id))} onChange={e=>{ const id=Number(item.id); setSelectedQuestionIds(prev=> e.target.checked ? [...prev,id] : prev.filter(x=>x!==id)); }} /></label><strong>{item?.question || "Question text unavailable"}</strong>{(item?.imageUrl || item?.image_url) && <QuestionImage key={item.imageUrl || item.image_url} className="admin-question-image" imageUrl={item.imageUrl || item.image_url} /> }<small>{item?.subject || selectedSubject}{item?.topic ? ` • ${item.topic}` : ""}{item?.year != null && item?.year !== "" ? ` • ${item.year}` : ""}</small><div style={{marginTop:8}}><button type="button" className="del-btn" onClick={()=>void deleteExamQuestion(Number(item.id))}>Delete</button></div></article>)}</div></div> : <p className="admin-empty-note">No questions found for this exam and subject.</p>}
        </section>

        <section className="csv-import-panel" aria-labelledby="csv-import-title">
          <div className="csv-import-heading">
            <div>
              <h3 id="csv-import-title"><FileSpreadsheet size={18} /> Bulk import questions</h3>
              <p>Choose a CSV and optional PNG/JPG/JPEG/WEBP images, or a ZIP with one <code>questions.csv</code> and an optional <code>images/</code> folder. Reference image filenames in the <code>imageUrl</code> column. Up to 500 questions per file.</p>
            </div>
            <button type="button" className="csv-template-btn" onClick={downloadCsvTemplate}>
              <Download size={16} /> Download template
            </button>
          </div>

          <label className="csv-upload-btn">
            <Upload size={16} /> Choose CSV or ZIP file
            <input type="file" accept=".csv,.zip,text/csv,application/zip" onChange={handleCsvFileChange} disabled={csvImporting} />
          </label>
          {csvFileName && <span className="csv-file-name">{csvFileName}</span>}
          <div className="csv-images-field">
            <label htmlFor="csv-question-images">Upload Question Images (Optional)</label>
            <label className="csv-upload-btn" htmlFor="csv-question-images">
              <ImagePlus size={16} /> Choose Multiple Images
              <input
                ref={csvImagesInput}
                id="csv-question-images"
                type="file"
                accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                multiple
                onChange={handleCsvImagesChange}
                disabled={csvImporting}
              />
            </label>
            <small>PNG, JPG, JPEG, or WEBP; maximum 5 MB each. Match filenames in the CSV imageUrl column.</small>
            {csvImageError && <p className="csv-error" role="alert">{csvImageError}</p>}
            {csvSelectedImages.length > 0 && (
              <ul className="csv-image-list" aria-label="Selected question images">
                {csvSelectedImages.map((file, index) => (
                  <li key={`${file.name}-${file.size}-${file.lastModified}-${index}`}>
                    <span>{file.name}</span>
                    <button type="button" onClick={() => removeCsvImage(index)} disabled={csvImporting} aria-label={`Remove ${file.name}`}>
                      <Trash2 size={14} /> Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {csvRows.length > 0 && (
            <button type="button" className="csv-clear-btn" onClick={() => {
              setCsvRows([]);
              setCsvImageFiles(new Map());
              setCsvUploadFile(null);
              setCsvSelectedImages([]);
              if (csvImagesInput.current) csvImagesInput.current.value = "";
              setCsvFileName("");
              setCsvExamId("");
              setCsvError("");
              setCsvImageError("");
              setCsvProgress({ completed: 0, total: 0 });
              setBulkPreviewReady(false);
              setBulkImportResult(null);
            }} disabled={csvImporting}>
              Clear file
            </button>
          )}
          {csvError && <p className="csv-error" role="alert">{csvError}</p>}

          {csvRows.length > 0 && (
            <div className="csv-preview">
              {csvUploadFile && (
                <button type="button" className="admin-btn primary csv-import-btn" onClick={previewBulkImport} disabled={csvImporting}>
                  Preview Import
                </button>
              )}
              {bulkPreviewReady && csvUploadFile && (
                <>
                  <div className="csv-preview-summary bulk-preview-summary" aria-live="polite">
                    <span>Questions found: {bulkResultValue("questionsFound", csvRows.length)}</span>
                    <span>Images selected: {bulkResultValue("imagesSelected", imageMatchSummary.imagesSelected)}</span>
                    <span>Images matched: {bulkResultValue("imagesMatched", imageMatchSummary.imagesMatched)}</span>
                    <span>Missing images: {bulkResultValue("missingImages", imageMatchSummary.missingImages)}</span>
                  </div>
                  {bulkValidationErrors.length > 0 && (
                    <div className="csv-bulk-validation" role="alert">
                      <strong>Validation errors</strong>
                      <ul>{bulkValidationErrors.map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}</ul>
                    </div>
                  )}
                  {Array.isArray(bulkImportResult?.validationErrors) && bulkImportResult.validationErrors.length > 0 && (
                    <div className="csv-bulk-validation" role="alert">
                      <strong>Backend validation errors</strong>
                      <ul>{bulkImportResult.validationErrors.map((error, index) => (
                        <li key={index}>{typeof error === "string" ? error : JSON.stringify(error)}</li>
                      ))}</ul>
                    </div>
                  )}
                </>
              )}
              <div className="csv-preview-summary">
                <span>{csvRows.filter(row => row.errors.length === 0 && row.status !== "imported").length} ready</span>
                <span>{csvRows.filter(row => row.errors.length > 0).length} need attention</span>
                <span>{csvRows.filter(row => row.status === "imported").length} imported</span>
              </div>
              {csvImporting && <p className="csv-progress" aria-live="polite">{csvUploadFile && csvSelectedImages.length > 0
                ? "Uploading the CSV and selected images..."
                : `Importing ${csvProgress.completed} of ${csvProgress.total} questions...`}</p>}
              <div className="csv-preview-table-wrap">
                <table className="csv-preview-table">
                  <thead>
                    <tr><th>Row</th><th>Subject</th><th>Question</th><th>Options</th><th>Answer</th><th>Image URL</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {csvRows.map(row => {
                      const rowError = row.errors[0] || row.importError;
                      const status = row.status === "imported" ? "Imported" : rowError ? rowError : "Ready";
                      return (
                        <tr key={row.rowNumber} className={rowError ? "has-error" : row.status === "imported" ? "is-imported" : ""}>
                          <td>{row.rowNumber}</td>
                          <td>{row.subject || "—"}</td>
                          <td>{row.year || "—"}</td>
                          <td className="csv-question-cell">{row.question || "(empty question)"}</td>
                          <td>A: {row.optionA} · B: {row.optionB} · C: {row.optionC} · D: {row.optionD}</td>
                          <td>{row.correctAnswer || "—"}</td>
                          <td className="csv-question-cell">{row.imageUrl || "—"}</td>
                          <td>{status}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                className="admin-btn primary csv-import-btn"
                onClick={importCsvQuestions}
                disabled={csvImporting || loading || (csvUploadFile
                  ? !bulkPreviewReady
                    || (csvSelectedImages.length > 0 ? bulkValidationErrors.length > 0 : imageMatchSummary.missingImages > 0)
                    || !csvRows.some(row => row.errors.length === 0 && row.status !== "imported")
                  : !csvRows.some(row => row.errors.length === 0 && row.status !== "imported"))}
              >
                {csvImporting ? "Uploading and importing..." : csvUploadFile && csvSelectedImages.length > 0
                  ? "Import Questions"
                  : `Import ${csvRows.filter(row => row.errors.length === 0 && row.status !== "imported").length} valid questions`}
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
            <div className="admin-field" style={{maxWidth:180}}><label htmlFor="exam-question-year">Year *</label>
              <input id="exam-question-year" type="text" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="e.g. 2000" value={questionYear} onChange={e=>setQuestionYear(e.target.value.replace(/[^0-9]/g,'').slice(0,4))} required style={{background:'#1a1a1a', color:'#fff'}} />
            </div>
          </div>
          <div className="admin-field"><label>Question</label><textarea value={question} onChange={e=>setQuestion(e.target.value)} rows={4} required style={{background:'#1a1a1a', color:'#fff', border:'1px solid #333'}}/></div>
          {questionSubmitError && <p className="admin-error" role="alert">{questionSubmitError}</p>}
          <div className="admin-field">
            <label>Question image or diagram</label>
            <div className="question-image-actions">
              <button type="button" className="csv-template-btn" onClick={() => questionImageInput.current?.click()} disabled={loading}>
                <ImagePlus size={16} /> {questionImagePreview ? "Replace image" : "Insert Image/Diagram"}
              </button>
              <input ref={questionImageInput} className="question-image-input" type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" onChange={handleQuestionImageChange} />
              {questionImagePreview && <button type="button" className="question-image-remove" onClick={removeQuestionImage} disabled={loading}><Trash2 size={15} /> Remove</button>}
            </div>
            {questionImageError && <p className="csv-error" role="alert">{questionImageError}</p>}
            {questionImagePreview && <div className="question-image-preview"><img src={questionImagePreview} alt="Preview of the question diagram" /><span>{uploadedQuestionImageUrl ? "Uploaded and ready to save" : "Preview — image uploads when you add the question"}</span></div>}
          </div>
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
      ) : adminView === "study" ? (
        <StudyManagementSection />
      ) : (
        <NovelManagementSection />
      )}
    </div></div>
  );
}
