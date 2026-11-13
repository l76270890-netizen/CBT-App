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
import PaymentReceived from './pages/PaymentReceived'
import DemoExperience from './pages/DemoExperience'
import Renew from './pages/Renew'
import SubscriptionExpired from './pages/SubscriptionExpired'
import SubscriptionBanner from './components/SubscriptionBanner'
import type { TestConfigType } from './types'
import { AuthProvider } from './context/AuthContext'
import { SubscriptionProvider, useSubscription } from './context/SubscriptionContext'
import './App.css'

export default function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <AppShell />
      </SubscriptionProvider>
    </AuthProvider>
  )
}

function AppShell() {
  const isAdminApp = import.meta.env.VITE_APP_MODE === 'admin'
  const [page, setPage] = useState(() => {
    if (isAdminApp) return 'admin'
    return window.location.pathname.replace(/\/+$/, '') === '/payment-received' ? 'paymentReceived' : 'landing'
  })
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
    if (isAdminApp) {
      setCheckingAuth(false)
      return
    }
    const saved = localStorage.getItem('cbt_user')
    if (saved) {
      // if user exists and on landing/login/register, go home
      if (['landing', 'login', 'register'].includes(page)) {
        setPage('home')
      }
    } else {
      // no user - if on protected page, force to landing
      if (!['landing', 'login', 'register', 'activation', 'paymentReceived', 'demo'].includes(page)) {
        setPage('landing')
      }
    }
    setCheckingAuth(false)
  }, [isAdminApp])

  const { blocked, clearBlocked } = useSubscription()

  // A successful renewal/activation restores access without a reload.
  useEffect(() => {
    if (!isAdminApp && page === 'home') clearBlocked()
  }, [page, clearBlocked, isAdminApp])

  const navigateTo = (p: string) => {
    if (isAdminApp && (p === 'home' || p === 'landing')) {
      setPage('admin')
      return
    }
    setPage(p)
  }

  const hideNavbarPages = ['landing', 'login', 'register', 'payment', 'paymentReceived', 'activation', 'renew', 'subscriptionExpired', 'subjects', 'testConfig', 'testInstructions', 'test', 'result', 'review', 'admin', 'generalKnowledge']
  const AdminAny = AdminDashboard as any

  // The backend answers 403 once the subscription lapses. Until it is renewed,
  // every signed-in page is replaced by the blocked screen.
  const isPublicPage = ['landing', 'login', 'register', 'payment', 'paymentReceived', 'activation', 'demo', 'admin'].includes(page)
  const showBlocked = !isAdminApp && blocked && !isPublicPage && page !== 'renew' && page !== 'subscriptionExpired'
  const effectivePage = showBlocked ? 'subscriptionExpired' : page
  const showNavbar = !isAdminApp && !hideNavbarPages.includes(effectivePage)

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
    <div className={`app-shell${showNavbar ? ' app-shell-workspace' : ''}`} style={{ background: '#121212', minHeight: '100vh' }}>
      {showNavbar && (
        <Navbar
          activePage={page === 'demo' ? demoSection : page}
          setActivePage={navigateTo}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          searchQuery={homeSearchQuery}
          setSearchQuery={setHomeSearchQuery}
          demoMode={page === 'demo'}
          onDemoNavigate={setDemoSection}
        />
      )}

      <main className={`app-main${showNavbar ? ' app-main-sidebar' : ''}${['testConfig', 'testInstructions'].includes(page) ? ' app-main-setup' : ''}${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
        {showNavbar && <SubscriptionBanner onRenew={() => navigateTo('renew')} />}
        {effectivePage === 'subscriptionExpired' && <SubscriptionExpired setActivePage={navigateTo} />}
        {effectivePage === 'renew' && <Renew setActivePage={navigateTo} />}
        {!showBlocked && (
          <>
            {page === 'landing' && <LandingMobile setActivePage={navigateTo} />}
          {page === 'login' && <Login setActivePage={navigateTo} />}
          {['register', 'payment'].includes(page) && (
            <Register
              setActivePage={navigateTo}
              onContinueToPayment={details => { setCheckoutDetails(details); navigateTo('payment') }}
              hidden={page === 'payment'}
            />
          )}
          {page === 'payment' && checkoutDetails && <Payment details={checkoutDetails} setActivePage={navigateTo} />}
          {page === 'activation' && <Activation setActivePage={navigateTo} />}
          {page === 'paymentReceived' && <PaymentReceived setActivePage={navigateTo} />}
          {page === 'demo' && <DemoExperience setActivePage={navigateTo} section={demoSection} setSection={setDemoSection} searchQuery={homeSearchQuery} setSearchQuery={setHomeSearchQuery} />}

          {page === 'home' && <Home setActivePage={navigateTo} setSelectedExam={setSelectedExam} setTestConfig={setTestConfig} searchQuery={homeSearchQuery} setSearchQuery={setHomeSearchQuery} />}
          {page === 'exams' && <Exams setActivePage={navigateTo} setSelectedExam={setSelectedExam} setTestConfig={setTestConfig} />}
          {page === 'subjects' && <Subjects setActivePage={navigateTo} setTestConfig={setTestConfig} selectedExam={selectedExam} selectedExamId={testConfig.examId || testConfig.customExamId} configuredSubjects={testConfig.subjects} />}
          {page === 'testConfig' && <TestConfig setActivePage={navigateTo} testConfig={testConfig} setTestConfig={setTestConfig} selectedExam={selectedExam} />}
          {page === 'testInstructions' && <TestInstructions setActivePage={navigateTo} testConfig={testConfig} />}
          {page === 'test' && <Test setActivePage={navigateTo} testConfig={testConfig} />}
          {page === 'result' && <Result setActivePage={navigateTo} />}
          {page === 'review' && <Review setActivePage={navigateTo} />}
          {page === 'classroom' && <Study setActivePage={navigateTo} selectedExam={selectedExam} setTestConfig={setTestConfig} />}
          {page === 'account' && <Account setActivePage={navigateTo} />}
          {page === 'practiceHistory' && <PracticeHistory setActivePage={navigateTo} />}
          {page === 'generalKnowledge' && <GeneralKnowledge setActivePage={navigateTo} setTestConfig={setTestConfig} examId={testConfig.examId || testConfig.customExamId} />}
            {page === 'admin' && <AdminAny setActivePage={navigateTo} />}
          </>
        )}
      </main>
    </div>
  )
}
