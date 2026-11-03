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
import Payment from './pages/Payment'
import type { CheckoutDetails } from './pages/Register'
import Activation from './pages/Activation'
import DemoExperience from './pages/DemoExperience'
import type { TestConfigType } from './types'
import { AuthProvider } from './context/AuthContext'
import './App.css'

export default function App() {
  const [page, setPage] = useState('landing')
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [homeSearchQuery, setHomeSearchQuery] = useState('')
  const [demoSection, setDemoSection] = useState('home')
  const [checkoutDetails, setCheckoutDetails] = useState<CheckoutDetails | null>(null)
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
  })

  // CHECK LOGIN FROM localStorage
  useEffect(() => {
    const saved = localStorage.getItem('cbt_user')
    if (saved) {
      // if user exists and on landing/login/register, go home
      if (['landing', 'login', 'register'].includes(page)) {
        setPage('home')
      }
    } else {
      // no user - if on protected page, force to landing
      if (!['landing', 'login', 'register', 'activation', 'demo'].includes(page)) {
        setPage('landing')
      }
    }
    setCheckingAuth(false)
  }, [])

  const hideNavbarPages = ['landing', 'login', 'register', 'payment', 'activation', 'subjects', 'testConfig', 'testInstructions', 'test', 'result', 'review', 'admin', 'generalKnowledge']
  const AdminAny = AdminDashboard as any

  if (checkingAuth) {
    return (
      <div style={{ minHeight: '100vh', background: '#121212', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/icons/examcore-192.png" alt="ExamCore" style={{ width: 40, height: 40, objectFit: 'contain', margin: '0 auto 12px' }} />
          Loading...
        </div>
      </div>
    )
  }

  return (
    <AuthProvider>
      <div className={`app-shell${!hideNavbarPages.includes(page) ? ' app-shell-workspace' : ''}`} style={{ background: '#121212', minHeight: '100vh' }}>
        {!hideNavbarPages.includes(page) && (
          <Navbar
            activePage={page === 'demo' ? demoSection : page}
            setActivePage={setPage}
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
            searchQuery={homeSearchQuery}
            setSearchQuery={setHomeSearchQuery}
            demoMode={page === 'demo'}
            onDemoNavigate={setDemoSection}
          />
        )}

        <main className={`app-main${!hideNavbarPages.includes(page) ? ' app-main-sidebar' : ''}${['testConfig', 'testInstructions'].includes(page) ? ' app-main-setup' : ''}${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
          {page === 'landing' && <LandingMobile setActivePage={setPage} />}
          {page === 'login' && <Login setActivePage={setPage} />}
          {['register', 'payment'].includes(page) && (
            <Register
              setActivePage={setPage}
              onContinueToPayment={details => { setCheckoutDetails(details); setPage('payment') }}
              hidden={page === 'payment'}
            />
          )}
          {page === 'payment' && checkoutDetails && <Payment details={checkoutDetails} setActivePage={setPage} />}
          {page === 'activation' && <Activation setActivePage={setPage} />}
          {page === 'demo' && <DemoExperience setActivePage={setPage} section={demoSection} setSection={setDemoSection} searchQuery={homeSearchQuery} setSearchQuery={setHomeSearchQuery} />}

          {page === 'home' && <Home setActivePage={setPage} setSelectedExam={setSelectedExam} setTestConfig={setTestConfig} searchQuery={homeSearchQuery} setSearchQuery={setHomeSearchQuery} />}
          {page === 'exams' && <Exams setActivePage={setPage} setSelectedExam={setSelectedExam} setTestConfig={setTestConfig} />}
          {page === 'subjects' && <Subjects setActivePage={setPage} setTestConfig={setTestConfig} selectedExam={selectedExam} selectedExamId={testConfig.examId || testConfig.customExamId} configuredSubjects={testConfig.subjects} />}
          {page === 'testConfig' && <TestConfig setActivePage={setPage} testConfig={testConfig} setTestConfig={setTestConfig} selectedExam={selectedExam} />}
          {page === 'testInstructions' && <TestInstructions setActivePage={setPage} testConfig={testConfig} />}
          {page === 'test' && <Test setActivePage={setPage} testConfig={testConfig} />}
          {page === 'result' && <Result setActivePage={setPage} />}
          {page === 'review' && <Review setActivePage={setPage} />}
          {page === 'classroom' && <Study setActivePage={setPage} selectedExam={selectedExam} setTestConfig={setTestConfig} />}
          {page === 'account' && <Account setActivePage={setPage} />}
          {page === 'practiceHistory' && <PracticeHistory setActivePage={setPage} />}
          {page === 'generalKnowledge' && <GeneralKnowledge setActivePage={setPage} setTestConfig={setTestConfig} examId={testConfig.examId || testConfig.customExamId} />}
          {page === 'admin' && <AdminAny setActivePage={setPage} />}
        </main>
      </div>
    </AuthProvider>
  )
}
