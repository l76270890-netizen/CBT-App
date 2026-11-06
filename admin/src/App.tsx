import AdminDashboard from './pages/AdminDashboard'

const mainAppUrl = import.meta.env.VITE_MAIN_APP_URL || 'https://cbt-app-lime.vercel.app'

export default function App() {
  return <AdminDashboard setActivePage={() => window.location.assign(mainAppUrl)} />
}
