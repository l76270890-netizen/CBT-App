type Props = { 
  setActivePage: (page: string) => void; 
  setSelectedExam: (exam: string) => void 
}

import { useState } from 'react'
import { BookOpen, Funnel, Search, X } from 'lucide-react'
import './Exams.css'

export default function Exams({ setActivePage, setSelectedExam }: Props) {
  const exams = [
    { id: 'JAMB', title: 'JAMB UTME', desc: '360 Questions • 4 Subjects', icon: <BookOpen size={22} /> },
    { id: 'POST UTME', title: 'POST UTME', desc: '100 Questions • School Based', icon: <BookOpen size={22} /> },
    { id: 'WAEC', title: 'WAEC', desc: 'Objective + Theory • SSCE', icon: <BookOpen size={22} /> },
    { id: 'NECO', title: 'NECO', desc: 'Objective + Theory • SSCE', icon: <BookOpen size={22} /> },
  ]

  const [searchQuery, setSearchQuery] = useState("");

  // FIXED: Use filtered list
  const filteredExams = exams.filter((exam) => {
    const cleanQuery = searchQuery.toLowerCase().trim();
    return (
      exam.title.toLowerCase().includes(cleanQuery) ||
      exam.id.toLowerCase().includes(cleanQuery) ||
      exam.desc.toLowerCase().includes(cleanQuery)
    );
  });

  const handleClick = (id: string) => {
    setSelectedExam(id)
    setActivePage('subjects')
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

      {/* FIXED SEARCH BAR - ONE ONLY */}
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

      {/* FIXED GRID - NOW USES filteredExams */}
      <div className="exams-grid">
        {filteredExams.length > 0 ? (
          filteredExams.map(exam => (
            <div 
              key={exam.id}
              className="exam-card"  
              onClick={() => handleClick(exam.id)}
              role="button"
              tabIndex={0}
            >
              <div className="exam-icon-wrap">{exam.icon}</div>
              <div className="exam-details">
                <h4>{exam.title}</h4>
                <p>{exam.desc}</p>
              </div>
              <span className="chevron">›</span>
            </div>
          ))
        ) : (
          <div className="no-results">
            <p>No exam found for "<b>{searchQuery}</b>"</p>
          </div>
        )}
      </div>

      <div className="exam-tip">
        💡 <b>Pro Tip:</b> Click any exam name to start test. Click card to start exam
      </div>
    </div>
  )
}