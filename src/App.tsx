import { useState } from 'react'
import Home from './pages/Home'
import Exams from './pages/Exams'
import Subjects from './pages/Subjects'
import TestConfig from './pages/TestConfig'
import Test from './pages/TestPage'
import Navbar from './components/Navbar'
import Study from './pages/Study'
import Account from './pages/Account'
import Result from './pages/Result'
import PracticeHistory from './pages/PracticeHistory'
import Review from './pages/Review'
import AdminDashboard from './pages/AdminDashboard'
import TestInstructions from './pages/TestInstructions'
import GeneralKnowledge from './pages/GeneralKnowledge'
import type { TestConfigType } from './types'

export default function App() {
  const [page, setPage] = useState('home')
  const [selectedExam, setSelectedExam] = useState<any>(null)
  const [testConfig, setTestConfig] = useState<TestConfigType>({
    examType: 'JAMB',
    examId: '',
    examTitle: '',
    subjects: [],
    totalQuestions: 0,
    year: '2024',
    duration: 120,
    mode: 'exam',
    difficulty: 'General',
    showAnswers: false,
    topic: 'All Topics'
  } as any)

  const hideNavbarPages = ['subjects', 'testConfig', 'testInstructions', 'test', 'result', 'review', 'admin', 'generalKnowledge']
  const AdminAny = AdminDashboard as any

  return (
    <div>
      {!hideNavbarPages.includes(page) && <Navbar activePage={page} setActivePage={setPage} />}
      {page === 'home' && <Home setActivePage={setPage} setSelectedExam={setSelectedExam} setTestConfig={setTestConfig} />}
      {page === 'exams' && <Exams setActivePage={setPage} setSelectedExam={setSelectedExam} setTestConfig={setTestConfig} />}
      {page === 'subjects' && <Subjects setActivePage={setPage} setTestConfig={setTestConfig} selectedExam={selectedExam} />}
      {page === 'testConfig' && <TestConfig setActivePage={setPage} testConfig={testConfig} setTestConfig={setTestConfig} selectedExam={selectedExam} />}
      {page === 'testInstructions' && <TestInstructions setActivePage={setPage} testConfig={testConfig} />}
      {page === 'test' && <Test setActivePage={setPage} testConfig={testConfig} />}
      {page === 'result' && <Result setActivePage={setPage} />}
      {page === 'review' && <Review setActivePage={setPage} />}
      {page === 'classroom' && <Study setActivePage={setPage} selectedExam={selectedExam} setTestConfig={setTestConfig} />}
      {page === 'account' && <Account setActivePage={setPage} />}
      {page === 'practiceHistory' && <PracticeHistory setActivePage={setPage} />}
      {page === 'generalKnowledge' && <GeneralKnowledge setActivePage={setPage} setTestConfig={setTestConfig} />}
      {page === 'admin' && <AdminAny setActivePage={setPage} />}
    </div>
  )
}