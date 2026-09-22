import { useEffect, useState } from 'react'

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
import LandingMobile from './pages/LandingMobile'
import Login from './pages/Login'
import Register from './pages/Register'
import type { TestConfigType } from './types'
import { AuthProvider } from './context/AuthContext'

export default function App() {
  const [page, setPage] = useState('landing')
  const [checkingAuth, setCheckingAuth] = useState(true)
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

  // CHECK FLASK LOGIN FROM localStorage
  useEffect(() => {
    const saved = localStorage.getItem('cbt_user')
    if (saved) {
      // if user exists and on landing/login/register, go home
      if (['landing', 'login', 'register'].includes(page)) {
        setPage('home')
      }
    } else {
      // no user - if on protected page, force to landing
      if (!['landing', 'login', 'register'].includes(page)) {
        setPage('landing')
      }
    }
    setCheckingAuth(false)
  }, [])

  const hideNavbarPages = ['landing', 'login', 'register', 'subjects', 'testConfig', 'testInstructions', 'test', 'result', 'review', 'admin', 'generalKnowledge']
  const AdminAny = AdminDashboard as any

  if (checkingAuth) {
    return (
      <div style={{ minHeight: '100vh', background: '#121212', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, background: '#1d4be3', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontWeight: 900 }}>E</div>
          Loading...
        </div>
      </div>
    )
  }

  return (
    <AuthProvider>
      <div style={{ background: '#121212', minHeight: '100vh' }}>
        {!hideNavbarPages.includes(page) && <Navbar activePage={page} setActivePage={setPage} />}

        {page === 'landing' && <LandingMobile setActivePage={setPage} />}
        {page === 'login' && <Login setActivePage={setPage} />}
        {page === 'register' && <Register setActivePage={setPage} />}

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
    </AuthProvider>
  )
}