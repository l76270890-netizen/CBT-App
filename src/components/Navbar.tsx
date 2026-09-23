import { useState, useEffect, useMemo } from 'react'
import { Home, FileText, BookOpen, History, User, LogOut, Settings, Bell, Menu, X, ChevronRight, Edit2, CheckCheck, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'
import { API_URL } from '../config'

type Notif = { id: string; title: string; message: string; time: string; read: boolean; type: 'success'|'info'|'warning' }

export default function Navbar({ activePage, setActivePage }: any) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [notifications, setNotifications] = useState<Notif[]>([])
  const [historyCount, setHistoryCount] = useState(0)
  const { user, logout } = useAuth()

  useEffect(() => {
    if(!user?.user_id) return
    fetch(`${API_URL}/api/history/${user.user_id}`)
 .then(r=>r.json()).then(data=> {
      const onlyExams = data.filter((h:any)=>h.mode!=='study')
      setHistoryCount(onlyExams.length)
      const saved = localStorage.getItem(`notifs_${user.user_id}`)
      if(!saved && onlyExams.length>0){
        const last = onlyExams[0]
        const autoNotif: Notif = {
          id: Date.now().toString(),
          title: last.status==='Passed'? '🎉 You Passed!' : '📝 Test Completed',
          message: `You scored ${last.score}/${last.total} in ${last.title}`,
          time: new Date().toISOString(),
          read: false,
          type: last.status==='Passed'? 'success' : 'info'
        }
        setNotifications([autoNotif])
      }
   }).catch(()=>{})
  }, [user])

  useEffect(() => {
    if(!user?.user_id) return
    const saved = localStorage.getItem(`notifs_${user.user_id}`)
    if(saved){
      try{ setNotifications(JSON.parse(saved)) }catch{}
    } else {
      const welcome: Notif[] = [{
        id: 'welcome',
        title: 'Welcome to EXAMCORE',
        message: 'Start your first exam to see results here. Study mode will not notify.',
        time: new Date().toISOString(),
        read: false,
        type: 'info'
      }]
      setNotifications(welcome)
    }
  }, [user?.user_id])

  useEffect(() => {
    if(!user?.user_id) return
    localStorage.setItem(`notifs_${user.user_id}`, JSON.stringify(notifications))
  }, [notifications, user?.user_id])

  useEffect(() => {
    const handleNewResult = () => {
      const lastResult = localStorage.getItem('lastTestResult')
      if(!lastResult) return
      try{
        const res = JSON.parse(lastResult)
        if(res.mode==='study') return
        const newNotif: Notif = {
          id: res.id.toString(),
          title: res.status==='Passed'? `🎉 Passed ${res.subject}` : `📚 Exam Finished`,
          message: `Score: ${res.score}/${res.total} • ${res.duration} • ${res.status}`,
          time: new Date().toISOString(),
          read: false,
          type: res.status==='Passed'? 'success' : 'warning'
        }
        setNotifications(prev=>{
          if(prev.find(n=>n.id===newNotif.id)) return prev
          return [newNotif,...prev].slice(0,20)
        })
      }catch{}
    }
    window.addEventListener('storage', handleNewResult)
    const interval = setInterval(handleNewResult, 2000)
    return ()=>{ window.removeEventListener('storage', handleNewResult); clearInterval(interval)}
  }, [])

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, mobileLabel: 'Home' },
    { id: 'exams', label: 'Exams', icon: FileText, mobileLabel: 'Exams' },
    { id: 'classroom', label: 'Study', icon: BookOpen, mobileLabel: 'Study' },
    { id: 'practiceHistory', label: 'History', icon: History, mobileLabel: 'History' },
    { id: 'account', label: 'Account', icon: User, mobileLabel: 'Account' },
  ]
  const extraItems = [
    { id: 'admin', label: 'Admin Dashboard', icon: Settings },
    { id: 'logout', label: 'Log out', icon: LogOut, danger: true },
  ]

  // === FIXED PERMANENT AVATAR URL ===
  const avatarUrl = useMemo(() => {
    const img = user?.profile_image
    if (!img) return `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || user?.email || 'User')}&background=1d4be3&color=fff&bold=true`
    if (img.startsWith('http')) return img
    if (img.startsWith('/uploads')) return `${API_URL}${img}`
    if (img.startsWith('avatars/') || img.startsWith('questions/')) return `${API_URL}/uploads/${img}`
    return `${API_URL}/uploads/avatars/${img}`
  }, [user?.profile_image, user?.username, user?.email])

  const unreadCount = useMemo(() => notifications.filter(n =>!n.read).length, [notifications])

  const handleNavClick = async (id: string) => {
    if (id === 'logout') {
      if (confirm("Logout?")) { logout(); setActivePage('landing') }
      return
    }
    setActivePage(id); setMenuOpen(false); setShowNotif(false)
  }

  const markAllRead = () => setNotifications(prev=> prev.map(n=>({...n, read:true})))
  const clearNotifs = () => { if(!confirm("Clear all notifications?")) return; setNotifications([]) }
  const markOneRead = (id:string) => setNotifications(prev=> prev.map(n=> n.id===id? {...n, read:true}: n))

  return (
    <>
      <header className="navbar">
        <div className="navbar-container">
          <button className="hamburger" onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
          <div className="home-logo-box">E</div><span className='span'>EXAMCORE</span>
          <nav className="nav-links">
            {navItems.map(item => { const Icon = item.icon; return <button key={item.id} className={`nav-link ${activePage === item.id? 'active' : ''}`} onClick={() => handleNavClick(item.id)}><Icon size={18} /> {item.label}</button> })}
          </nav>
          <div className="navbar-right">
            {user && (
              <div className="navbar-user">
                <img src={avatarUrl} alt="avatar" />
                <div className="navbar-user-info">
                  <span className="navbar-user-name">{user.username}</span>
                  <span className="navbar-user-email">{user.email}</span>
                </div>
              </div>
            )}
            <div style={{position:'relative'}}>
              <button className="bell-btn" onClick={() => setShowNotif(!showNotif)}><Bell size={20} />{unreadCount>0 && <span className="bell-dot">{unreadCount>9? '9+': unreadCount}</span>}</button>
              {showNotif && (
                <div className="notif-dropdown" style={{position:'absolute', right:0, top:'45px', width:'360px', maxWidth:'90vw', background:'#111827', color:'#f9fafb', borderRadius:'16px', boxShadow:'0 20px 60px rgba(0,0,0,0.15)', border:'1px solid #e5e7eb', zIndex:100, overflow:'hidden'}}>
                  <div style={{padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #f3f4f6'}}>
                    <h4 style={{margin:0, fontSize:14, fontWeight:700}}>Notifications {unreadCount>0 && `(${unreadCount})`}</h4>
                    <div style={{display:'flex', gap:8}}>
                      <button onClick={markAllRead} style={{border:'none', background:'#f3f4f6', padding:'6px 10px', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer'}}><CheckCheck size={12}/> Read</button>
                      <button onClick={clearNotifs} style={{border:'none', background:'#fef2f2', color:'#dc2626', padding:'6px 10px', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer'}}><Trash2 size={12}/> Clear</button>
                    </div>
                  </div>
                  <div style={{maxHeight:'380px', overflowY:'auto'}}>
                    {notifications.length===0? (
                      <div style={{padding:'30px', textAlign:'center', color:'#9ca3af'}}>
                        <Bell size={24} style={{margin:'0 auto 8px', display:'block', opacity:0.5}}/>
                        <p style={{fontSize:13}}>No notifications yet</p>
                        <p style={{fontSize:11}}>Exam results will appear here. Study mode is hidden.</p>
                      </div>
                    ) : notifications.map(n=>(
                      <div key={n.id} onClick={()=>markOneRead(n.id)} style={{padding:'12px 16px', borderBottom:'1px solid #f9fafb', cursor:'pointer', background: n.read? '#fff' : '#f8fafc', display:'flex', gap:12}}>
                        <div style={{width:32, height:32, borderRadius:'50%', background: n.type==='success'? '#dcfce7' : n.type==='warning'? '#fef3c7' : '#dbeafe', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0}}>
                          {n.type==='success'? '🎉' : n.type==='warning'? '⚠️' : '📢'}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13, fontWeight: n.read? 500 : 700, color:'#111827'}}>{n.title}</div>
                          <div style={{fontSize:12, color:'#6b7280', marginTop:2}}>{n.message}</div>
                          <div style={{fontSize:10, color:'#9ca3af', marginTop:4}}>{new Date(n.time).toLocaleString()}</div>
                        </div>
                        {!n.read && <div style={{width:8, height:8, borderRadius:'50%', background:'#3b82f6', marginTop:6}}></div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      {showNotif && <div style={{position:'fixed', inset:0, zIndex:90}} onClick={()=>setShowNotif(false)}></div>}
      <div className={`sidebar-overlay ${menuOpen? 'show' : ''}`} onClick={() => setMenuOpen(false)}></div>
      <aside className={`sidebar ${menuOpen? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="profile-section">
            <div className="avatar"><img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /></div>
            <div className="profile-text">
              <h3>{user?.username || 'User'}</h3>
              <span style={{ fontSize: 12, opacity: 0.7, wordBreak:'break-all' }}>{user?.email || 'Not logged in'}</span>
              <span>Free Plan • {historyCount} Exams • {unreadCount} new</span>
            </div>
            <button className="edit-profile" onClick={() => handleNavClick('account')}><Edit2 size={12} /> Edit</button>
          </div>
          <button className="close-btn" onClick={() => setMenuOpen(false)}><X size={20} /></button>
        </div>
        <nav className="sidebar-links">
          {navItems.map(item => { const Icon = item.icon; return <button key={item.id} className={`sidebar-link ${activePage === item.id? 'active' : ''}`} onClick={() => handleNavClick(item.id)}><span className="sidebar-icon"><Icon size={18} /></span>{item.label}<ChevronRight size={16} className="chevron" /></button> })}
          <div className="sidebar-divider"></div>
          {extraItems.map(item => { const Icon = item.icon; return <button key={item.id} className={`sidebar-link ${item.danger? 'danger' : 'muted'}`} onClick={() => handleNavClick(item.id)}><span className="sidebar-icon"><Icon size={18} /></span>{item.label}</button> })}
        </nav>
        <div className="sidebar-footer">EXAMCORE v1.0 • {user?.email} • {historyCount} Tests 🇳🇬</div>
      </aside>
      <nav className="bottom-nav">
        {navItems.map(item => { const Icon = item.icon; return <button key={item.id} className={`nav-item ${activePage === item.id? 'active' : ''}`} onClick={() => handleNavClick(item.id)}><span className="nav-icon-wrap"><Icon size={22} /></span><span className="nav-label">{item.mobileLabel}</span></button> })}
      </nav>
    </>
  )
}