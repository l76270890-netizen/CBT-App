import { useState, useEffect, useMemo } from 'react'
import { BookOpen, Funnel, Search, X } from 'lucide-react'
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import './Exams.css'

type Props = { 
  setActivePage: (page: string) => void; 
  setSelectedExam: (exam: any) => void;
  setTestConfig: (c: any) => void;
}

type ExamData = {
  id: string
  title: string
  examType: string
  subject?: string // old exams have single
  subjects?: string[] // new exams have multiple
  year: number
  duration: number
  totalQuestions?: number
}

export default function Exams({ setActivePage, setSelectedExam, setTestConfig }: Props) {
  const [exams, setExams] = useState<ExamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const q = query(collection(db, "exams"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ExamData));
        setExams(data);
      } catch (err) {
        console.error("Failed to fetch exams", err);
      }
      setLoading(false);
    };
    fetchExams();
  }, []);

  const filteredExams = useMemo(() => {
    const clean = searchQuery.toLowerCase().trim();
    if (!clean) return exams;
    return exams.filter((exam) => {
      const allSub = exam.subjects?.join(",") || exam.subject || "";
      return (
        exam.title.toLowerCase().includes(clean) ||
        exam.examType.toLowerCase().includes(clean) ||
        allSub.toLowerCase().includes(clean)
      );
    });
  }, [exams, searchQuery]);

  // SAME LOGIC AS Home.tsx
  const handleExamClick = (exam: ExamData) => {
    setSelectedExam(exam.examType);

    const subjStr = (exam.subjects?.join(",") || exam.subject || "").toLowerCase();

    if (exam.examType.toLowerCase().includes('general') || subjStr.includes('general')) {
      setTestConfig((prev: any) => ({
       ...prev,
        examType: exam.examType,
        subjects: exam.subjects || [exam.subject],
        totalQuestions: exam.totalQuestions || 20,
        year: String(exam.year),
        duration: exam.duration,
        customExamId: exam.id
      }))
      setActivePage('generalKnowledge')
      return
    }

    setTestConfig((prev: any) => ({
     ...prev,
      examType: exam.examType,
      year: String(exam.year),
      duration: exam.duration,
      customExamId: exam.id,
      customTitle: exam.title,
      examId: exam.id,
      examTitle: exam.title,
      subjects: exam.subjects || (exam.subject ? [exam.subject] : []),
      totalQuestions: exam.totalQuestions
    }))

    setActivePage('subjects')
  }

  if (loading) {
    return (
      <div className="exams-container">
        <div className="exams-header">
          <h1>Available Exams</h1>
          <p>Loading exams from Firebase...</p>
        </div>
        <div style={{ padding: 20, color: '#888' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div className="exams-container">
      <div className="exams-header">
        <h1>Available Exams</h1>
        <p>Choose an examination to start practicing</p>
      </div>

      <div className="exam-header">
        <h1 className="exam-title">Hello, <span>Champ</span></h1>
        <p className="exam-subtitle">Pick exam and practice</p>
      </div>

      <div className="search-bar">
        <div className="search-wrapper">
          <Search className="search-icon" size={18} />
          <input 
            type="text" 
            placeholder="Search JAMB, WAEC, NECO..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-box"
          />
          {searchQuery ? (
            <button className="clear-search-btn" onClick={() => setSearchQuery("")}>
              <X size={16} />
            </button>
          ) : (
            <Funnel className='funnel-icon' size={18} />
          )}
        </div>
      </div>

      <div className="exams-grid">
        {filteredExams.length > 0 ? (
          filteredExams.map(exam => (
            <div 
              key={exam.id}
              className="exam-card"  
              onClick={() => handleExamClick(exam)}
              role="button"
              tabIndex={0}
            >
              <div className="exam-icon-wrap"><BookOpen size={22} /></div>
              <div className="exam-details">
                <h4>{exam.title}</h4>
                <p>{exam.examType} • {exam.subject || exam.subjects?.join(', ')} • {exam.year}</p>
                <p style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{exam.totalQuestions || 0} Qs • {exam.duration}min</p>
              </div>
              <span className="chevron">›</span>
            </div>
          ))
        ) : (
          <div className="no-results">
            {exams.length === 0 ? (
              <p>No exams yet. Create one in Admin.</p>
            ) : (
              <p>No exam found for "<b>{searchQuery}</b>"</p>
            )}
          </div>
        )}
      </div>

      <div className="exam-tip">
        💡 <b>{exams.length} Exams</b> available
      </div>
    </div>
  )
}