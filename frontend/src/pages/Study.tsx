type Props = {
  setActivePage: (page: string) => void
  selectedExam: string
  setTestConfig: (config: any) => void
}

import { useState, useMemo, useEffect } from 'react'
import { BookOpen, Calculator, Atom, Beaker, Zap, Landmark, Search, X, ChevronRight, ArrowLeft, Feather, ShoppingBag, BarChart3, Layers, CalendarDays, Library, Download, FileText, PlayCircle, Trash2, RefreshCw, HardDrive, Bookmark, Minus, Plus, List, BookMarked } from 'lucide-react'
import { apiRequest, asArray } from '../api'
import { toAnswerIndex } from '../answerUtils'
import type { Novel, NovelProgress } from '../novelTypes'
import { getDownloadedNovels, getDownloadedNovel, saveNovelDownload, removeDownloadedNovel, getNovelBlob, saveProgressLocal, getProgressLocal, getPendingAttempts, clearPendingAttempts, estimateStorage } from '../novelStore'
import { cacheStudyMeta, loadStudyMeta, cacheStudyQuestions, loadStudyQuestions, studyQuestionCountsBySubject, studyAvailability } from '../offline/study'
import './Study.css'

type SubjectMeta = { id: string; name: string; icon: any; color: string; dept: 'ALL' | 'SCIENCE' | 'ART' | 'COMMERCIAL' }
type StudyStep = 'subjects' | 'modes' | 'topics' | 'years'
type StudySection = 'home' | 'subjects' | 'novels'
type NovelView = 'library' | 'details' | 'reader' | 'pdf' | 'downloads'

export default function Study({ setActivePage, selectedExam, setTestConfig }: Props) {
  // Section/cards
  const [studySection, setStudySection] = useState<StudySection>('home')
  // Subjects (existing, preserved)
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [step, setStep] = useState<StudyStep>('subjects')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeDept, setActiveDept] = useState<'ALL' | 'SCIENCE' | 'ART' | 'COMMERCIAL'>('ALL')
  const [catalog, setCatalog] = useState<{ topicsBySubject: Record<string,string[]>; availability: any }>({ topicsBySubject: {}, availability: {} })
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [offlineCounts, setOfflineCounts] = useState<Record<string, number>>({})
  const [offlineAvailability, setOfflineAvailability] = useState<Record<string, Record<string, Record<string, number>>>>({})
  const [downloadingSubject, setDownloadingSubject] = useState<string | null>(null)
  // Novels
  const [novelView, setNovelView] = useState<NovelView>('library')
  const [novels, setNovels] = useState<Novel[]>([])
  const [novelsLoading, setNovelsLoading] = useState(false)
  const [novelsError, setNovelsError] = useState('')
  const [novelSearch, setNovelSearch] = useState('')
  const [novelCategory, setNovelCategory] = useState<'ALL'|'JAMB'|'WAEC'|'NECO'>('ALL')
  const [selectedNovel, setSelectedNovel] = useState<Novel | null>(null)
  const [downloadedNovels, setDownloadedNovels] = useState<Novel[]>([])
  const [downloadState, setDownloadState] = useState<Record<number, {status:string; percent:number; error?:string}>>({})
  const [readerNovel, setReaderNovel] = useState<Novel | null>(null)
  const [readerChapterIndex, setReaderChapterIndex] = useState(0)
  const [readerFont, setReaderFont] = useState(16)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [storageInfo, setStorageInfo] = useState({ usage: 0, quota: 0 })

  const examType = (selectedExam || 'JAMB').toString()

  const refreshOfflineData = async () => {
    try {
      const [counts, availability] = await Promise.all([
        studyQuestionCountsBySubject(examType),
        studyAvailability(examType),
      ])
      setOfflineCounts(counts)
      setOfflineAvailability(availability)
    } catch {}
  }

  useEffect(() => { void refreshOfflineData() }, [examType])

  useEffect(() => {
    let cancelled = false
    if (studySection !== 'subjects') return
    setCatalogLoading(true)
    ;(async () => {
      try {
        const data = await apiRequest<any>(`/api/study/meta?examType=${encodeURIComponent(examType)}`)
        if (cancelled) return
        const nextCatalog = {
          topicsBySubject: data?.topicsBySubject && typeof data.topicsBySubject === 'object' ? data.topicsBySubject : {},
          availability: data?.availability && typeof data.availability === 'object' ? data.availability : {},
        }
        setCatalog(nextCatalog)
        await cacheStudyMeta(examType, data)
        setCatalogError('')
      } catch (e) {
        if (cancelled) return
        try {
          const cached = await loadStudyMeta(examType)
          if (cached) {
            setCatalog({ topicsBySubject: cached.topicsBySubject, availability: cached.availability })
            setCatalogError('')
            return
          }
        } catch {}
        if (!navigator.onLine) {
          try {
            const counts = await studyQuestionCountsBySubject(examType)
            if (Object.keys(counts).length) {
              setCatalogError('')
              return
            }
          } catch {}
          setCatalogError('Offline mode: connect once to download study questions.')
          return
        }
        setCatalogError(e instanceof Error ? e.message : 'Could not load study catalog.')
      } finally {
        if (!cancelled) setCatalogLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [examType, studySection])

  const subjects: SubjectMeta[] = [
    { id: 'english', name: 'English Language', icon: BookOpen, color: '#3B82F6', dept: 'ALL' },
    { id: 'math', name: 'Mathematics', icon: Calculator, color: '#10B981', dept: 'SCIENCE' },
    { id: 'biology', name: 'Biology', icon: Atom, color: '#8B5CF6', dept: 'SCIENCE' },
    { id: 'chemistry', name: 'Chemistry', icon: Beaker, color: '#F59E0B', dept: 'SCIENCE' },
    { id: 'physics', name: 'Physics', icon: Zap, color: '#EF4444', dept: 'SCIENCE' },
    { id: 'govt', name: 'Government', icon: Landmark, color: '#6366F1', dept: 'ART' },
    { id: 'literature', name: 'Literature in English', icon: Feather, color: '#EC4899', dept: 'ART' },
    { id: 'crk', name: 'Christian Religious Studies', icon: BookOpen, color: '#7C3AED', dept: 'ART' },
    { id: 'economics', name: 'Economics', icon: BarChart3, color: '#059669', dept: 'COMMERCIAL' },
    { id: 'commerce', name: 'Commerce', icon: ShoppingBag, color: '#0891B2', dept: 'COMMERCIAL' },
    { id: 'accounting', name: 'Principles of Accounting', icon: Calculator, color: '#0F766E', dept: 'COMMERCIAL' },
    { id: 'geography', name: 'Geography', icon: Landmark, color: '#2563EB', dept: 'ART' },
    { id: 'computer', name: 'Computer Science', icon: BookOpen, color: '#14B8A6', dept: 'SCIENCE' },
  ]
  const fallbackTopics: Record<string,string[]> = {
    'English Language': ['Lexis & Structure', 'Oral English', 'Comprehension', 'Summary'],
    'Mathematics': ['Algebra', 'Trigonometry', 'Probability', 'Calculus', 'Geometry', 'Statistics'],
    'Biology': ['Cell Biology', 'Genetics', 'Ecology', 'Human Anatomy'],
    'Chemistry': ['Atomic Structure', 'Organic Chemistry', 'Acids & Bases', 'Mole Concept'],
    'Physics': ['Mechanics', 'Electricity', 'Waves', 'Modern Physics'],
    'Agricultural Science': ['Crop Production', 'Animal Husbandry', 'Soil Science', 'Farm Management'],
    'Government': ['Constitution', 'Political Parties', 'Elections', 'International Relations'],
    'Literature in English': ['African Prose', 'Non-African Prose', 'Poetry', 'Drama'],
    'Christian Religious Studies': ['Old Testament', 'New Testament', 'Themes', 'Life of Jesus'],
    'History': ['Pre-Colonial', 'Colonial Era', 'Independence', 'World History'],
    'Economics': ['Micro Economics', 'Macro Economics', 'Demand & Supply', 'Market Structure'],
    'Commerce': ['Trade', 'Business Organization', 'Finance', 'Marketing'],
    'Principles of Accounting': ['Double Entry', 'Trial Balance', 'Final Accounts', 'Partnership'],
    'Business Studies': ['Office Practice', 'Business Law', 'Management', 'Entrepreneurship'],
    'Geography': ['Physical Geography', 'Human Geography', 'Map Reading'],
    'General Knowledge': ['Current Affairs', 'Science & Technology', 'Civics'],
    'Current Affairs': ['National Affairs', 'International Affairs', 'Education'],
    'Computer Science': ['Computer Fundamentals', 'Programming Basics', 'Networking', 'Data Processing'],
  }

  const topicsFor = (subjectName: string) => {
    const fromMeta = catalog.topicsBySubject?.[subjectName]
    if (Array.isArray(fromMeta) && fromMeta.length) return fromMeta
    return fallbackTopics[subjectName] || []
  }
  const availBySubject = (subjectName: string) => {
    const server = ((catalog.availability?.[examType] || {})[subjectName] || {}) as Record<string, Record<string, number>>
    const cached = offlineAvailability[subjectName] || {}
    const merged: Record<string, Record<string, number>> = { ...cached }
    for (const [topic, years] of Object.entries(server)) {
      merged[topic] = { ...(merged[topic] || {}), ...(years || {}) }
    }
    return merged
  }
  const availableTopicsFor = (subjectName: string) => {
    const bySubj = availBySubject(subjectName)
    const configured = topicsFor(subjectName)
    const seen = new Set<string>()
    const out: { name: string; count: number }[] = []
    for (const t of configured) {
      const years = bySubj?.[t] || {}
      let c = 0
      for (const y of Object.keys(years)) c += Number(years[y]) || 0
      if (c > 0) { out.push({ name: t, count: c }); seen.add(t) }
    }
    for (const t of Object.keys(bySubj)) {
      if (seen.has(t)) continue
      const years = bySubj?.[t] || {}
      let c = 0
      for (const y of Object.keys(years)) c += Number(years[y]) || 0
      if (c > 0) out.push({ name: t, count: c })
    }
    return out
  }
  const availableYearsFor = (subjectName: string) => {
    const bySubj = availBySubject(subjectName)
    const yearMap = new Map<string, number>()
    for (const t of Object.keys(bySubj)) {
      const years = bySubj?.[t] || {}
      for (const y of Object.keys(years)) {
        const c = Number(years[y]) || 0
        if (c > 0) yearMap.set(String(y), (yearMap.get(String(y)) || 0) + c)
      }
    }
    return Array.from(yearMap.entries()).map(([year, count]) => ({ year, count })).sort((a, b) => Number(b.year) - Number(a.year))
  }
  const countForSubject = (subjectName: string) => {
    const bySubj = availBySubject(subjectName)
    let total = 0
    for (const t of Object.keys(bySubj)) {
      const years = bySubj?.[t] || {}
      for (const y of Object.keys(years)) total += Number(years[y]) || 0
    }
    return total
  }
  const filteredSubjects = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    let list = subjects
    if (activeDept !== 'ALL') list = list.filter(s => s.dept === activeDept || s.dept === 'ALL')
    if (!q) return list
    return list.filter(s => s.name.toLowerCase().includes(q) || s.id.includes(q))
  }, [searchQuery, activeDept])

  const launchStudy = async (subjectName: string, opts: { topic?: string; year?: string }) => {
    const key = opts.topic ? `topic:${opts.topic}` : `year:${opts.year || 'all'}`
    setActionLoading(key)
    try {
      const params = new URLSearchParams({ examType, subject: subjectName })
      if (opts.topic) params.set('topics', opts.topic)
      if (opts.year) params.set('year', opts.year)
      let rows: any[] = []
      if (navigator.onLine) {
        try {
          rows = asArray<any>(await apiRequest<any[]>(`/api/study/questions?${params.toString()}`))
          await cacheStudyQuestions(examType, subjectName, rows)
          await refreshOfflineData()
        } catch (error) {
          console.warn('Could not refresh study questions; using saved copies.', error)
        }
      }
      let questions = rows.map((d: any, i: number) => ({
        id: d.id ?? `sq-${i}`,
        subject: d.subject || subjectName,
        topic: d.topic || opts.topic || '',
        year: d.year,
        question: d.question,
        imageUrl: d.imageUrl || d.image_url || undefined,
        options: Array.isArray(d.options) ? d.options : [d.options?.A, d.options?.B, d.options?.C, d.options?.D],
        answer: toAnswerIndex(d.answer ?? d.correctAnswer),
        explanation: d.explanation || '',
      })).filter((q: any) => q.question && Array.isArray(q.options) && q.options.length === 4)
      if (!questions.length) {
        const cached = await loadStudyQuestions(examType, subjectName, opts.topic, opts.year)
        questions = cached.map(question => ({
          id: question.id,
          subject: question.subject,
          topic: question.topic,
          year: question.year,
          question: question.question,
          imageUrl: question.imageUrl,
          options: question.options,
          answer: question.answer,
          explanation: question.explanation || '',
        }))
      }
      if (!questions.length) {
        alert(opts.topic ? `No study questions found for ${subjectName} • ${opts.topic} (${examType}). Download it while online first.` : `No study questions found for ${subjectName} • ${opts.year} (${examType}). Download it while online first.`)
        return
      }
      localStorage.setItem('current_questions', JSON.stringify(questions))
      setTestConfig({
        examType, subjects: [subjectName], totalQuestions: questions.length, year: opts.year || 'All',
        duration: subjectName.toLowerCase().includes('english') ? 60 : 40,
        ...(opts.topic ? { topic: opts.topic } : {}), mode: 'practice', difficulty: 'Normal', showAnswers: true, fromStudy: true,
      })
      setActivePage('test')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not load study questions.')
    } finally { setActionLoading(null) }
  }

  const downloadStudySubject = async (subjectName: string) => {
    if (!navigator.onLine) {
      alert('Connect to the internet to download study questions.')
      return
    }
    setDownloadingSubject(subjectName)
    try {
      const params = new URLSearchParams({ examType, subject: subjectName, all: '1' })
      const rows = asArray<any>(await apiRequest<any[]>(`/api/study/questions?${params.toString()}`))
      const cached = await cacheStudyQuestions(examType, subjectName, rows)
      await refreshOfflineData()
      if (cached.length) {
        alert(`Saved ${cached.length} ${subjectName} question${cached.length === 1 ? '' : 's'} for offline study.`)
      } else {
        alert(`No ${subjectName} study questions were available to download.`)
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not download study questions.')
    } finally {
      setDownloadingSubject(null)
    }
  }

  const openSubject = (subjectId: string) => { setSelectedSubject(subjectId); setStep('modes') }
  const backFromSubjectFlow = () => {
    if (step === 'topics' || step === 'years') setStep('modes')
    else { setSelectedSubject(null); setStep('subjects'); setStudySection('home') }
  }

  // ---- Novels ----
  const refreshDownloaded = async () => {
    try { setDownloadedNovels(await getDownloadedNovels()); setStorageInfo(await estimateStorage()) } catch {}
  }
  const syncPending = async () => {
    try {
      const pending = await getPendingAttempts()
      if (!pending.length) return
      await apiRequest<any>('/api/novels/attempts/sync', { method: 'POST', body: JSON.stringify({ attempts: pending }) })
      await clearPendingAttempts(pending.map(p => p.clientAttemptId))
    } catch {}
  }
  const loadNovels = async () => {
    setNovelsLoading(true)
    try {
      await refreshDownloaded(); await syncPending()
      if (!navigator.onLine) {
        setNovels([])
        setNovelsError('You are offline. Downloaded novels are available below.')
      } else {
        const data = await apiRequest<any>('/api/novels')
        setNovels(asArray<any>(data?.novels ?? data))
        setNovelsError('')
      }
    } catch (e) {
      setNovels([])
      setNovelsError(e instanceof Error ? e.message : 'Could not load novels from server.')
      await refreshDownloaded()
    } finally { setNovelsLoading(false) }
  }
  useEffect(() => { if (studySection === 'novels') void loadNovels() }, [studySection])
  useEffect(() => {
    const on = () => { if (studySection === 'novels') void syncPending() }
    window.addEventListener('online', on)
    return () => window.removeEventListener('online', on)
  }, [studySection])

  const downloadedIds = useMemo(() => new Set(downloadedNovels.map(n => n.id)), [downloadedNovels])
  const downloadStatusFor = (id: number) => downloadState[id]?.status || (downloadedIds.has(id) ? 'downloaded' : 'not_downloaded')
  const mergedNovels: Novel[] = useMemo(() => {
    const map = new Map<number, Novel>()
    for (const n of novels) map.set(n.id, { ...n })
    for (const d of downloadedNovels) map.set(d.id, { ...(map.get(d.id) || {}), ...d, downloadStatus: 'downloaded' } as any)
    return Array.from(map.values())
  }, [novels, downloadedNovels])
  const filteredNovels = useMemo(() => {
    const q = novelSearch.toLowerCase().trim()
    return mergedNovels.filter(n => {
      if (novelCategory !== 'ALL' && String(n.category || '').toUpperCase() !== novelCategory) return false
      if (!q) return true
      return (n.title || '').toLowerCase().includes(q) || (n.author || '').toLowerCase().includes(q)
    })
  }, [mergedNovels, novelSearch, novelCategory])

  const openNovelDetails = async (id: number) => {
    setNovelView('details')
    const local = await getDownloadedNovel(id).catch(() => null)
    if (local) {
      const prog = await getProgressLocal(id).catch(() => null)
      setSelectedNovel(prog ? ({ ...local, progress: { ...(local.progress || {}), ...prog } } as any) : local)
    }
    if (!navigator.onLine) return
    try {
      const detail = await apiRequest<any>(`/api/novels/${id}`)
      const lp = await getProgressLocal(id).catch(() => null)
      if (lp) detail.progress = { ...(detail.progress || {}), ...lp }
      setSelectedNovel(detail)
    } catch (e) {
      if (!local) {
        setNovelsError(e instanceof Error ? e.message : 'Could not load novel details.')
        setNovelView('library')
      }
    }
  }

  const downloadNovel = async (novel: Novel) => {
    if (downloadState[novel.id]?.status === 'downloading') return
    setDownloadState(s => ({ ...s, [novel.id]: { status: 'downloading', percent: 5 } }))
    try {
      const detail = await apiRequest<any>(`/api/novels/${novel.id}`)
      setDownloadState(s => ({ ...s, [novel.id]: { status: 'downloading', percent: 25 } }))
      const qs = await apiRequest<any>(`/api/novels/${novel.id}/questions`).catch(() => ({ questions: [] }))
      detail.questions = asArray(qs?.questions ?? qs)
      setDownloadState(s => ({ ...s, [novel.id]: { status: 'downloading', percent: 45 } }))
      let pdfBlob: Blob | null = null
      if (detail.pdfEnabled && detail.pdfUrl) {
        const res = await fetch(detail.pdfUrl, { credentials: 'include' }).catch(() => null)
        if (res && res.ok) pdfBlob = await res.blob()
      }
      setDownloadState(s => ({ ...s, [novel.id]: { status: 'downloading', percent: 70 } }))
      let coverBlob: Blob | null = null
      if (detail.coverUrl) { try { const r = await fetch(detail.coverUrl); if (r.ok) coverBlob = await r.blob() } catch {} }
      if (!Array.isArray(detail.chapters)) throw new Error('Downloaded content is incomplete (missing chapters).')
      setDownloadState(s => ({ ...s, [novel.id]: { status: 'downloading', percent: 90 } }))
      await saveNovelDownload(detail, pdfBlob, coverBlob)
      await saveProgressLocal(novel.id, detail.progress || { completedChapters: [], bookmarks: [], readingPosition: 0, chapterId: null })
      setDownloadState(s => ({ ...s, [novel.id]: { status: 'downloaded', percent: 100 } }))
      await refreshDownloaded()
      if (selectedNovel?.id === novel.id) setSelectedNovel(detail)
    } catch (e) {
      setDownloadState(s => ({ ...s, [novel.id]: { status: 'failed', percent: 0, error: e instanceof Error ? e.message : 'Download failed' } }))
    }
  }

  const removeLocalNovel = async (id: number) => {
    if (!confirm('Remove this downloaded novel from this device? The server copy will not be deleted.')) return
    await removeDownloadedNovel(id)
    setDownloadState(s => { const n = { ...s }; delete n[id]; return n })
    await refreshDownloaded()
  }

  const openReader = async (novel: Novel, continueReading = false) => {
    const local = await getDownloadedNovel(novel.id)
    if (!local) { alert('Download this novel for offline reading first.'); return }
    const prog = await getProgressLocal(novel.id)
    let idx = 0
    if (continueReading && prog?.chapterId && Array.isArray(local.chapters)) {
      const found = local.chapters.findIndex(c => c.id === prog.chapterId)
      if (found >= 0) idx = found
    }
    setReaderNovel({ ...local, progress: prog || local.progress })
    setReaderChapterIndex(idx)
    setNovelView('reader')
  }

  const persistReadingProgress = async (novel: Novel, chapterId: number, chapterIndex: number, completed = false) => {
    const prev = (await getProgressLocal(novel.id)) || (novel.progress || {})
    const completedSet = new Set<number>((prev.completedChapters || []) as number[])
    if (completed && chapterId) completedSet.add(chapterId)
    const total = Math.max(1, (novel.chapters || []).length)
    const progress: NovelProgress = {
      ...prev, chapterId, readingPosition: chapterIndex, completedChapters: Array.from(completedSet),
      bookmarks: prev.bookmarks || [], percent: Math.round((completedSet.size / total) * 100), lastReadAt: new Date().toISOString(),
    }
    await saveProgressLocal(novel.id, progress)
    try { await apiRequest(`/api/novels/${novel.id}/progress`, { method: 'POST', body: JSON.stringify(progress) }) } catch {}
    setReaderNovel(n => n ? { ...n, progress } : n)
  }

  const openPdfReader = async (novel: Novel) => {
    const blob = await getNovelBlob('pdfs', novel.id)
    if (!blob) { alert('Download the PDF for offline reading first (if available and permitted).'); return }
    if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    setPdfUrl(URL.createObjectURL(blob))
    setSelectedNovel(novel)
    setNovelView('pdf')
  }

  const startNovelPractice = async (novel: Novel) => {
    let qs = novel.questions || []
    if (!qs.length) { const local = await getDownloadedNovel(novel.id); qs = local?.questions || [] }
    if (!qs.length && navigator.onLine) {
      try { const r = await apiRequest<any>(`/api/novels/${novel.id}/questions`); qs = asArray(r?.questions ?? r) } catch {}
    }
    if (!qs.length) { alert('No novel practice questions are available for this novel yet.'); return }
    const mapped = qs.map((q: any, i: number) => ({
      id: q.id ?? `nq-${novel.id}-${i}`, subject: novel.title, question: q.question, imageUrl: q.imageUrl,
      options: Array.isArray(q.options) ? q.options : [q.options?.A, q.options?.B, q.options?.C, q.options?.D],
      answer: toAnswerIndex(q.answer ?? q.correctAnswer),
      explanation: q.explanation || '', topic: q.topic || 'Novel',
    })).filter((q: any) => q.question && Array.isArray(q.options) && q.options.length === 4)
    localStorage.setItem('current_questions', JSON.stringify(mapped))
    localStorage.setItem('current_novel_practice', JSON.stringify({ novelId: novel.id, novelTitle: novel.title }))
    setTestConfig({ examType: 'NOVEL', subjects: [novel.title], totalQuestions: mapped.length, year: 'All', duration: 30, mode: 'practice', difficulty: 'Normal', showAnswers: true, fromStudy: true, topic: novel.title } as any)
    setActivePage('test')
  }

  const formatSize = (bytes?: number | null) => {
    if (bytes == null) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // ---- HOME: Subjects & Novels cards ----
  if (studySection === 'home') {
    return (
      <div className="study-page">
        <div className="study-header">
          <h1>Study {examType}</h1>
          <p>Choose a subject, then study by topic or by year</p>
        </div>
        <div className="study-home-cards" role="group" aria-label="Study sections">
          <button type="button" className="study-home-card selected" onClick={() => setStudySection('subjects')}>
            <div className="study-home-card-icon"><BookOpen size={28} /></div>
            <div className="study-home-card-title">Subjects</div>
            <div className="study-home-card-desc">Study by subject, topic or year</div>
          </button>
          <button type="button" className="study-home-card" onClick={() => setStudySection('novels')}>
            <div className="study-home-card-icon"><Library size={28} /></div>
            <div className="study-home-card-title">Novels</div>
            <div className="study-home-card-desc">Download and read novels offline</div>
          </button>
        </div>
      </div>
    )
  }

  // ---- NOVELS ----
  if (studySection === 'novels') {
    if (novelView === 'reader' && readerNovel) {
      const chapters = readerNovel.chapters || []
      const ch = chapters[readerChapterIndex]
      return (
        <div className="study-page">
          <div className="study-header topic-header">
            <button className="back-btn" onClick={() => { if (ch) void persistReadingProgress(readerNovel, ch.id, readerChapterIndex, true); setNovelView('details') }}><ArrowLeft size={18} /> Back</button>
            <div className="topic-header-main"><div><h1>{readerNovel.title}</h1><p>{ch ? ch.title : 'No chapters'}</p></div></div>
          </div>
          {chapters.length === 0 ? <div className="no-result">No chapters available for this novel.</div> : (
            <div className="novel-reader-layout">
              <aside className="novel-chapter-list">
                <div className="novel-chapter-list-title"><List size={14}/> Chapters</div>
                {chapters.map((c, i) => (
                  <button key={c.id} type="button" className={`novel-chapter-item ${i === readerChapterIndex ? 'active' : ''}`} onClick={() => { setReaderChapterIndex(i); void persistReadingProgress(readerNovel, c.id, i, false) }}>{c.title}</button>
                ))}
              </aside>
              <article className="novel-reader-content">
                <div className="novel-reader-controls">
                  <button type="button" onClick={() => setReaderFont(f => Math.max(13, f - 2))} aria-label="Decrease font"><Minus size={16}/></button>
                  <span>Font</span>
                  <button type="button" onClick={() => setReaderFont(f => Math.min(28, f + 2))} aria-label="Increase font"><Plus size={16}/></button>
                  <button type="button" onClick={async () => { const prog = (await getProgressLocal(readerNovel.id)) || { bookmarks: [] as any[] }; const bms = Array.isArray(prog.bookmarks) ? [...prog.bookmarks] : []; bms.push({ chapterId: ch?.id, chapterIndex: readerChapterIndex, at: Date.now() }); await saveProgressLocal(readerNovel.id, { ...prog, bookmarks: bms }); alert('Bookmark saved.') }}><Bookmark size={16}/> Bookmark</button>
                </div>
                <div className="novel-reader-text" style={{ fontSize: readerFont, lineHeight: 1.7 }}>
                  <h2>{ch?.title}</h2>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{ch?.content || 'No content.'}</div>
                </div>
                <div className="novel-reader-nav">
                  <button className="nav-btn" disabled={readerChapterIndex === 0} onClick={() => { const i = readerChapterIndex - 1; setReaderChapterIndex(i); const nc = chapters[i]; if (nc) void persistReadingProgress(readerNovel, nc.id, i, false) }}>← Previous</button>
                  <button className="nav-btn primary" disabled={readerChapterIndex >= chapters.length - 1} onClick={() => { if (ch) void persistReadingProgress(readerNovel, ch.id, readerChapterIndex, true); const i = readerChapterIndex + 1; if (i < chapters.length) { setReaderChapterIndex(i); const nc = chapters[i]; if (nc) void persistReadingProgress(readerNovel, nc.id, i, false) } }}>Next →</button>
                </div>
              </article>
            </div>
          )}
        </div>
      )
    }

    if (novelView === 'pdf' && selectedNovel) {
      return (
        <div className="study-page">
          <div className="study-header topic-header">
            <button className="back-btn" onClick={() => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); setPdfUrl(null); setNovelView('details') }}><ArrowLeft size={18}/> Back</button>
            <div className="topic-header-main"><div><h1>{selectedNovel.title}</h1><p>Offline PDF</p></div></div>
          </div>
          {pdfUrl ? (
            <div className="novel-pdf-wrap">
              <iframe title="Novel PDF" src={pdfUrl} className="novel-pdf-frame" />
              <div className="novel-pdf-note">Opened from your offline download. Use PDF viewer controls to zoom and navigate pages.</div>
            </div>
          ) : <div className="no-result">PDF not available offline.</div>}
        </div>
      )
    }

    if (novelView === 'details' && selectedNovel) {
      const st = downloadStatusFor(selectedNovel.id)
      const prog = selectedNovel.progress?.percent || 0
      return (
        <div className="study-page">
          <div className="study-header topic-header">
            <button className="back-btn" onClick={() => setNovelView('library')}><ArrowLeft size={18}/> Back</button>
            <div className="topic-header-main"><div><h1>{selectedNovel.title}</h1><p>{selectedNovel.author} • {selectedNovel.category}</p></div></div>
          </div>
          <div className="novel-details-card">
            <div className="novel-details-top">
              {selectedNovel.coverUrl ? <img src={selectedNovel.coverUrl} alt="" className="novel-cover-lg"/> : <div className="novel-cover-lg placeholder"><BookOpen size={36}/></div>}
              <div className="novel-details-meta">
                <p className="novel-desc">{selectedNovel.description || 'No description provided.'}</p>
                <div className="novel-meta-row"><span>{selectedNovel.chapterCount || (selectedNovel.chapters?.length || 0)} chapters</span><span>{formatSize(selectedNovel.downloadSize)}</span><span>{selectedNovel.category}</span></div>
                <div className="novel-meta-row"><span>Status: {st === 'downloaded' ? 'Offline Ready' : st === 'downloading' ? `Downloading ${downloadState[selectedNovel.id]?.percent || 0}%` : st === 'failed' ? 'Download failed' : 'Not downloaded'}</span><span>Reading: {prog}%</span></div>
                {st === 'downloading' && <div className="novel-progress-bar"><div style={{ width: `${downloadState[selectedNovel.id]?.percent || 0}%` }} /></div>}
                {st === 'failed' && <div className="admin-error" role="alert">{downloadState[selectedNovel.id]?.error || 'Download failed.'} <button className="study-inline-retry" onClick={() => void downloadNovel(selectedNovel)}>Retry</button></div>}
              </div>
            </div>
            <div className="novel-actions-grid">
              <button className="start-test-btn primary" onClick={() => void downloadNovel(selectedNovel)} disabled={st === 'downloading'}><Download size={16}/> {st === 'downloaded' ? 'Re-download / Update' : 'Download for Offline Reading'}</button>
              <button className="start-test-btn" onClick={() => void openReader(selectedNovel, false)}><BookMarked size={16}/> Read Novel</button>
              <button className="start-test-btn" onClick={() => void openPdfReader(selectedNovel)} disabled={!selectedNovel.pdfEnabled && !selectedNovel.hasPdf}><FileText size={16}/> Open PDF</button>
              <button className="start-test-btn" onClick={() => void startNovelPractice(selectedNovel)}><PlayCircle size={16}/> Practise Novel Questions</button>
              {prog > 0 && <button className="start-test-btn" onClick={() => void openReader(selectedNovel, true)}>Continue Reading</button>}
              {st === 'downloaded' && <button className="del-btn" style={{ padding: '10px 14px' }} onClick={() => void removeLocalNovel(selectedNovel.id)}><Trash2 size={16}/> Remove Download</button>}
            </div>
          </div>
        </div>
      )
    }

    if (novelView === 'downloads') {
      return (
        <div className="study-page">
          <div className="study-header topic-header">
            <button className="back-btn" onClick={() => setNovelView('library')}><ArrowLeft size={18}/> Back</button>
            <div className="topic-header-main"><div><h1>My Downloads</h1><p>Access saved novels offline</p></div></div>
          </div>
          <div className="novel-storage"><HardDrive size={16}/> Storage used: {formatSize(storageInfo.usage)} {storageInfo.quota ? `of ${formatSize(storageInfo.quota)}` : ''}</div>
          {downloadedNovels.length === 0 ? <div className="no-result">No downloaded novels yet.</div> : (
            <div className="novel-list">
              {downloadedNovels.map(n => (
                <div key={n.id} className="novel-card">
                  {n.coverUrl ? <img src={n.coverUrl} alt="" className="novel-cover"/> : <div className="novel-cover placeholder"><BookOpen size={20}/></div>}
                  <div className="novel-card-body">
                    <h4 className="subject-name">{n.title}</h4>
                    <div className="subject-meta">{n.author} • {formatSize(n.downloadSize)} • {n.progress?.percent || 0}% completed • <span style={{ color: '#16a34a', fontWeight: 700 }}>Offline Ready</span></div>
                    <div className="novel-card-actions">
                      <button className="study-inline-retry" onClick={() => void openReader(n, true)}>Continue Reading</button>
                      <button className="study-inline-retry" onClick={() => void openPdfReader(n)} disabled={!n.pdfEnabled && !n.hasPdf}>Open PDF</button>
                      <button className="study-inline-retry" onClick={() => void startNovelPractice(n)}>Practise</button>
                      <button className="study-inline-retry" onClick={() => void removeLocalNovel(n.id)}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    // Novel Library
    return (
      <div className="study-page">
        <div className="study-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}><button className="back-btn" onClick={() => setStudySection('home')}><ArrowLeft size={18}/> Back</button></div>
          <h1>Novel Library</h1>
          <p>Choose a novel to start reading.</p>
        </div>
        <div className="study-home-cards" role="group" aria-label="Study sections" style={{ marginBottom: 16 }}>
          <button type="button" className="study-home-card" onClick={() => setStudySection('subjects')}><div className="study-home-card-icon"><BookOpen size={24} /></div><div className="study-home-card-title">Subjects</div><div className="study-home-card-desc">Study by subject, topic or year</div></button>
          <button type="button" className="study-home-card selected" onClick={() => setStudySection('novels')}><div className="study-home-card-icon"><Library size={24} /></div><div className="study-home-card-title">Novels</div><div className="study-home-card-desc">Download and read novels offline</div></button>
        </div>
        <div className="novel-library-tools">
          <div className="search-wrapper" style={{ flex: 1 }}>
            <Search size={18} className="search-icon" />
            <input placeholder="Search novels or authors..." value={novelSearch} onChange={e => setNovelSearch(e.target.value)} />
            {novelSearch && <button onClick={() => setNovelSearch('')}><X size={16}/></button>}
          </div>
          <button className="study-inline-retry" onClick={() => setNovelView('downloads')}><HardDrive size={14}/> My Downloads ({downloadedNovels.length})</button>
          <button className="study-inline-retry" onClick={() => void loadNovels()}><RefreshCw size={14}/> Refresh</button>
        </div>
        <div className="dept-tabs" style={{ display: 'flex', gap: 8, margin: '12px 0', overflowX: 'auto' }}>
          {(['ALL','JAMB','WAEC','NECO'] as const).map(t => (
            <button key={t} onClick={() => setNovelCategory(t)} style={{ padding: '8px 16px', borderRadius: 20, border: '1px solid var(--border, #e5e7eb)', background: novelCategory === t ? 'var(--primary, #111827)' : 'var(--bg-card, #fff)', color: novelCategory === t ? '#fff' : 'var(--text-main, #374151)', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>{t}</button>
          ))}
        </div>
        {novelsError && <p className="admin-error" role="alert">{novelsError} — downloaded novels remain available below.</p>}
        {novelsLoading && <div className="study-loading">Loading novels...</div>}
        {!novelsLoading && filteredNovels.length === 0 ? <div className="no-result">No novels available{novelCategory !== 'ALL' ? ` for ${novelCategory}` : ''}.</div> : (
          <div className="novel-list">
            {filteredNovels.map(n => {
              const st = downloadStatusFor(n.id); const ds = downloadState[n.id]
              return (
                <div key={n.id} className="novel-card">
                  {n.coverUrl ? <img src={n.coverUrl} alt="" className="novel-cover"/> : <div className="novel-cover placeholder"><BookOpen size={20}/></div>}
                  <div className="novel-card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                      <div>
                        <h4 className="subject-name">{n.title}</h4>
                        <div className="subject-meta">{n.author} • {n.category} • {n.chapterCount ?? (n.chapters?.length || 0)} chapters • {formatSize(n.downloadSize)}</div>
                      </div>
                      <span className={`novel-status ${st}`}>{st === 'downloaded' ? 'Offline Ready' : st === 'downloading' ? `${ds?.percent || 0}%` : st === 'failed' ? 'Failed' : 'Not downloaded'}</span>
                    </div>
                    {n.description && <p className="novel-desc small">{n.description}</p>}
                    {st === 'downloading' && <div className="novel-progress-bar"><div style={{ width: `${ds?.percent || 0}%` }} /></div>}
                    {st === 'failed' && <div className="admin-error" role="alert" style={{ margin: '6px 0' }}>{ds?.error || 'Download failed.'}</div>}
                    <div className="novel-card-actions">
                      <button className="study-inline-retry" onClick={() => void openNovelDetails(n.id)}>Details</button>
                      {st !== 'downloaded' && <button className="study-inline-retry" onClick={() => void downloadNovel(n)} disabled={st === 'downloading'}><Download size={14}/> {st === 'failed' ? 'Retry' : 'Download'}</button>}
                      {st === 'downloaded' && <>
                        <button className="study-inline-retry" onClick={async () => { const local = await getDownloadedNovel(n.id); if (local) void openReader(local, false); else void openNovelDetails(n.id) }}>Read</button>
                        <button className="study-inline-retry" onClick={async () => { const local = await getDownloadedNovel(n.id) || n; void openPdfReader(local as any) }} disabled={!n.pdfEnabled && !n.hasPdf}>Open PDF</button>
                        <button className="study-inline-retry" onClick={() => void startNovelPractice(n)}>Practise</button>
                        <button className="study-inline-retry" onClick={() => void removeLocalNovel(n.id)}>Remove</button>
                      </>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div className="study-tip">Downloaded novels, chapters, permitted PDFs, and practice questions are saved on this device for offline use. Progress saves locally and syncs when you are online.</div>
      </div>
    )
  }

  // ---- SUBJECTS (existing, preserved) ----
  if (selectedSubject) {
    const subject = subjects.find(s => s.id === selectedSubject) || subjects[0]
    const Icon = subject.icon
    const topicItems = availableTopicsFor(subject.name)
    const yearItems = availableYearsFor(subject.name)
    const total = countForSubject(subject.name)
    const offlineCount = offlineCounts[subject.name] || 0

    if (step === 'modes') {
      return (
        <div className="study-page">
          <div className="study-header topic-header">
            <button className="back-btn" onClick={backFromSubjectFlow}><ArrowLeft size={18} /> Back</button>
            <div className="topic-header-main">
              <div className="subject-icon large" style={{background: `${subject.color}20`, color: subject.color}}><Icon size={24} /></div>
              <div><h1>{subject.name}</h1><p>{examType} • {topicItems.length} Topics • {yearItems.length} Years • {total} Questions</p></div>
            </div>
          </div>
          <div className="study-offline-panel">
            <div className="study-offline-copy">
              <div className="study-mode-icon" style={{background: `${subject.color}20`, color: subject.color}}><Download size={20} /></div>
              <div>
                <div className="study-mode-title">{offlineCount ? `${offlineCount} question${offlineCount === 1 ? '' : 's'} saved offline` : 'Not saved for offline yet'}</div>
                <div className="study-mode-desc">{navigator.onLine ? 'Download this subject once to study without internet.' : 'Offline mode: only saved questions are available.'}</div>
              </div>
            </div>
            <button type="button" className="study-inline-retry" onClick={() => void downloadStudySubject(subject.name)} disabled={!navigator.onLine || downloadingSubject === subject.name}>
              {downloadingSubject === subject.name ? 'Downloading...' : offlineCount ? 'Update offline copy' : 'Download for offline'}
            </button>
          </div>
          {catalogError && <p className="admin-error" role="alert" style={{marginBottom:12}}>{catalogError} <button type="button" className="study-inline-retry" onClick={() => window.location.reload()}>Retry</button></p>}
          {catalogLoading ? <div className="study-loading">Loading study options...</div> : (
            <div className="study-mode-grid">
              <button type="button" className="study-mode-card" onClick={() => setStep('topics')} disabled={topicItems.length === 0}>
                <div className="study-mode-icon" style={{background: `${subject.color}20`, color: subject.color}}><Layers size={22} /></div>
                <div className="study-mode-body"><div className="study-mode-title">Study by Topic</div><div className="study-mode-desc">{topicItems.length ? `${topicItems.length} topic${topicItems.length===1?'':'s'} available for ${subject.name}.` : 'No topics with questions available yet.'}</div></div>
                <ChevronRight size={18} className="topic-chevron" />
              </button>
              <button type="button" className="study-mode-card" onClick={() => setStep('years')} disabled={yearItems.length === 0}>
                <div className="study-mode-icon" style={{background: `${subject.color}20`, color: subject.color}}><CalendarDays size={22} /></div>
                <div className="study-mode-body"><div className="study-mode-title">Study by Year</div><div className="study-mode-desc">{yearItems.length ? `${yearItems.length} year${yearItems.length===1?'':'s'} available for ${subject.name}.` : 'No years with questions available yet.'}</div></div>
                <ChevronRight size={18} className="topic-chevron" />
              </button>
            </div>
          )}
          {!catalogLoading && topicItems.length === 0 && yearItems.length === 0 && <div className="no-result">No study questions available yet for {subject.name} ({examType}).</div>}
        </div>
      )
    }

    if (step === 'years') {
      return (
        <div className="study-page">
          <div className="study-header topic-header">
            <button className="back-btn" onClick={backFromSubjectFlow}><ArrowLeft size={18} /> Back</button>
            <div className="topic-header-main">
              <div className="subject-icon large" style={{background: `${subject.color}20`, color: subject.color}}><Icon size={24} /></div>
              <div><h1>{subject.name} — Years</h1><p>{examType} • Select a year to practice questions from that year</p></div>
            </div>
          </div>
      {!navigator.onLine && <p className="study-offline-note">Offline mode — showing saved study material.</p>}
      {catalogError && <p className="admin-error" role="alert" style={{marginBottom:12}}>{catalogError}</p>}
          {catalogLoading ? <div className="study-loading">Loading years...</div> : yearItems.length === 0 ? (<div className="no-result">No years available for {subject.name} ({examType}) yet.</div>) : (
            <div className="topic-list">
              {yearItems.map(item => (
                <button type="button" key={item.year} className="topic-card" onClick={() => void launchStudy(subject.name, { year: item.year })} disabled={actionLoading !== null}>
                  <div className="topic-left"><div className="topic-dot" style={{background: subject.color}}></div><div><div className="topic-title">{item.year}</div><div className="topic-meta">{item.count} Question{item.count===1?'':'s'} • {examType}</div></div></div>
                  <span className="topic-chevron">{actionLoading === `year:${item.year}` ? '…' : <ChevronRight size={18} />}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )
    }

    // topics
    return (
      <div className="study-page">
        <div className="study-header topic-header">
          <button className="back-btn" onClick={backFromSubjectFlow}><ArrowLeft size={18} /> Back</button>
          <div className="topic-header-main">
            <div className="subject-icon large" style={{background: `${subject.color}20`, color: subject.color}}><Icon size={24} /></div>
            <div><h1>{subject.name} — Topics</h1><p>{examType} • Select a topic to practice</p></div>
          </div>
        </div>
        {catalogError && <p className="admin-error" role="alert" style={{marginBottom:12}}>{catalogError}</p>}
        {catalogLoading ? <div className="study-loading">Loading topics...</div> : topicItems.length === 0 ? (<div className="no-result">No topics available for {subject.name} ({examType}) yet.</div>) : (
          <div className="topic-list">
            {topicItems.map(item => (
              <button type="button" key={item.name} className="topic-card" onClick={() => void launchStudy(subject.name, { topic: item.name })} disabled={actionLoading !== null}>
                <div className="topic-left"><div className="topic-dot" style={{background: subject.color}}></div><div><div className="topic-title">{item.name}</div><div className="topic-meta">{item.count} Question{item.count===1?'':'s'} • {examType}</div></div></div>
                <span className="topic-chevron">{actionLoading === `topic:${item.name}` ? '…' : <ChevronRight size={18} />}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Subjects root view (with cards below heading/description)
  return (
    <div className="study-page">
      <div className="study-header">
        <h1>Study {examType}</h1>
        <p>Choose a subject, then study by topic or by year</p>
      </div>

      <div className="study-home-cards" role="group" aria-label="Study sections">
        <button type="button" className="study-home-card selected" onClick={() => setStudySection('subjects')}>
          <div className="study-home-card-icon"><BookOpen size={28} /></div>
          <div className="study-home-card-title">Subjects</div>
          <div className="study-home-card-desc">Study by subject, topic or year</div>
        </button>
        <button type="button" className="study-home-card" onClick={() => setStudySection('novels')}>
          <div className="study-home-card-icon"><Library size={28} /></div>
          <div className="study-home-card-title">Novels</div>
          <div className="study-home-card-desc">Download and read novels offline</div>
        </button>
      </div>

      <div className="dept-tabs" style={{display:'flex', gap:8, margin:'12px 0', overflowX:'auto'}}>
        {[{id:'ALL', label:'All'},{id:'SCIENCE', label:'Science'},{id:'ART', label:'Art'},{id:'COMMERCIAL', label:'Commercial'}].map(t => (
          <button key={t.id} onClick={()=>setActiveDept(t.id as any)} style={{ padding:'8px 16px', borderRadius:20, border:'1px solid var(--border, #e5e7eb)', background: activeDept===t.id? 'var(--primary, #111827)' : 'var(--bg-card, #fff)', color: activeDept===t.id? '#fff' : 'var(--text-main, #374151)', fontWeight:600, fontSize:13, whiteSpace:'nowrap' }}>{t.label}</button>
        ))}
      </div>

      <div className="study-search">
        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input placeholder="Search subject..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          {searchQuery && <button onClick={() => setSearchQuery('')}><X size={16}/></button>}
        </div>
      </div>

      {catalogError && <p className="admin-error" role="alert" style={{marginBottom:12}}>{catalogError}</p>}
      {catalogLoading && <div className="study-loading">Loading subjects and available questions...</div>}

      <div className="subject-grid1">
        {filteredSubjects.map(subject => {
          const Icon = subject.icon
          const tcount = availableTopicsFor(subject.name).length
          const ycount = availableYearsFor(subject.name).length
          const qcount = countForSubject(subject.name)
          return (
            <button type="button" key={subject.id} className="subject-card1 study-subject-button" onClick={() => openSubject(subject.id)}>
              <div className="subject-left">
                <div className="subject-icon" style={{background: `${subject.color}18`, color: subject.color}}><Icon size={20} /></div>
                <div className="subject-info">
                  <h4 className="subject-name">{subject.name}</h4>
                  <div className="subject-meta">{subject.dept} • {tcount} Topics • {ycount} Years • {qcount}Q{offlineCounts[subject.name] ? ` • ${offlineCounts[subject.name]} offline` : ''}</div>
                </div>
              </div>
              <span className="subject-action"><ChevronRight size={20} /></span>
            </button>
          )
        })}
      </div>

      {filteredSubjects.length === 0 && (<div className="no-result">No subject found for "{searchQuery}" in {activeDept}</div>)}

      <div className="study-tip">
        💡 <b>How it works:</b> Choose a subject, then pick <b>Study by Topic</b> or <b>Study by Year</b>. Questions come from Study Management and match your selection.
      </div>
    </div>
  )
}
