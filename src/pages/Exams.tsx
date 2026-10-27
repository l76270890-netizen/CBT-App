import { useState, useEffect, useMemo } from 'react'
import { BookOpen, Search, X } from 'lucide-react'
import './Exams.css'
import { apiRequest, asArray } from '../api'

export default function Exams({ setActivePage, setSelectedExam, setTestConfig }: any) {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadExams = async () => {
      try {
        const payload = await apiRequest<unknown>("/api/exams");
        setExams(Array.isArray(payload) ? payload : asArray<any>((payload as any)?.exams));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load exams.");
        setExams([]);
      } finally { setLoading(false); }
    };
    void loadExams();
  }, []);

  const filteredExams = useMemo(() => {
    if(!searchQuery) return exams
    const clean = searchQuery.toLowerCase()
    return exams.filter((exam: any) => exam.title.toLowerCase().includes(clean) || exam.examType.toLowerCase().includes(clean))
  }, [exams, searchQuery]);

  const handleExamClick = (exam: any) => {
    setSelectedExam(exam.examType);
    setTestConfig((prev: any) => ({...prev, examType: exam.examType, year: String(exam.year), duration: exam.duration, customExamId: exam.id, customTitle: exam.title, examId: exam.id, examTitle: exam.title, subjects: Array.isArray(exam.subjects) ? exam.subjects : (typeof exam.subject === 'string' ? exam.subject.split(',').map((s:string)=>s.trim()).filter(Boolean) : []), totalQuestions: exam.totalQuestions}))
    setActivePage('subjects')
  }

  if (loading) return <div className="exams-container"><p style={{padding:20}}>Loading exams...</p></div>

  return (
    <div className="exams-container">
      <div className="exams-header"><h1>Available Exams</h1><p>Choose an exam to practice</p></div>
      {error && <p role="alert" style={{color:'#fca5a5',padding:'0 20px'}}>{error}</p>}
      <div className="search-bar"><div className="search-wrapper"><Search className="search-icon" size={18} /><input type="text" placeholder="Search JAMB, WAEC..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input-box" />{searchQuery && <button className="clear-search-btn" onClick={() => setSearchQuery("")}><X size={16} /></button>}</div></div>
      <div className="exams-grid">{filteredExams.map(exam => (<div key={exam.id} className="exam-card" onClick={() => handleExamClick(exam)}><div className="exam-icon-wrap"><BookOpen size={22} /></div><div className="exam-details"><h4>{exam.title}</h4><p>{exam.examType} • {(Array.isArray(exam.subjects) ? exam.subjects : typeof exam.subject === 'string' ? exam.subject.split(',') : []).join(', ')} • {exam.year}</p><p style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{exam.totalQuestions ?? '—'} Qs • {exam.duration}min</p></div><span className="chevron">›</span></div>))}</div>
       <div className="study-tip">
        💡 <b>How it works:</b> Click Exams name = start full exam. Click arrow = view subjects breakdown.
      </div>
    </div>
    
  )
}
