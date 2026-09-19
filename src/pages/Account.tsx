import { useState, useEffect } from 'react'
import { onAuthStateChanged, updateProfile, signOut } from 'firebase/auth'
import { doc, getDoc, updateDoc, collection, query, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { User, Download, Settings, HelpCircle, Info, ChevronRight, Crown, LogOut, Edit3, Camera } from 'lucide-react'
import './Account.css'

type Props = {
  setActivePage: (page: string) => void
}

export default function Account({ setActivePage }: Props) {
  const [fbUser, setFbUser] = useState<any>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [photoURL, setPhotoURL] = useState('')
  const [practiced, setPracticed] = useState(0)
  const [uploading, setUploading] = useState(false)
  const subscription = 'Free Plan'

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFbUser(user)
        setEmail(user.email || '')
        try {
          const snap = await getDoc(doc(db, 'users', user.uid))
          const data = snap.data()
          setName(user.displayName || data?.name || 'User')
          setPhotoURL(user.photoURL || data?.photoURL || '')
        } catch {
          setName(user.displayName || 'User')
          setPhotoURL(user.photoURL || '')
        }

        const q = query(collection(db, `users/${user.uid}/history`))
        const unsubCount = onSnapshot(q, (snap) => {
          setPracticed(snap.size)
        })
        return () => unsubCount()

      } else {
        setActivePage('landing')
      }
    })
    return () => unsub()
  }, [])

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !fbUser) return
    if (file.size > 700 * 1024) return alert("Image must be <700KB (Firebase limit)")

    setUploading(true)
    try {
      // Convert to Base64 - NO STORAGE NEEDED
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      await updateProfile(fbUser, { photoURL: base64 })
      await updateDoc(doc(db, 'users', fbUser.uid), { photoURL: base64 })
      setPhotoURL(base64)
    } catch (err: any) {
      alert("Upload failed: " + err.message)
    }
    setUploading(false)
  }

  const handleEditName = async () => {
    const n = prompt("Enter new name", name)
    if (!n || !fbUser) return
    try {
      await updateProfile(fbUser, { displayName: n })
      await updateDoc(doc(db, 'users', fbUser.uid), { name: n })
      setName(n)
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleLogout = async () => {
    if (confirm("Logout?")) {
      await signOut(auth)
      setActivePage('landing')
    }
  }

  const menuItems = [
    { id: 'profile', label: 'Edit Profile', icon: User, desc: 'Update your name & photo', action: handleEditName },
    { id: 'download', label: 'Downloaded Subjects', icon: Download, desc: `${practiced} offline tests saved`, action: () => setActivePage('practiceHistory') },
    { id: 'settings', label: 'Settings', icon: Settings, desc: 'Theme, notifications', action: () => alert('Settings coming soon') },
    { id: 'help', label: 'Help & Support', icon: HelpCircle, desc: 'Chat with us on WhatsApp', action: () => window.open('https://wa.me/2340000000000', '_blank') },
    { id: 'about', label: 'About Us', icon: Info, desc: 'Version 1.0.0 • YOURCBT', action: () => alert('YOURCBT v1 - Built for Nigerian students 🇳🇬') },
  ]

  return (
    <div className="account-page">
      <div className="account-header">
        <h1>Account</h1>
        <button className="edit-btn" onClick={handleEditName}><Edit3 size={16}/> Edit</button>
      </div>

      <div className="profile-card">
        <div className="profile-avatar" style={{ position: 'relative', padding: 0, overflow: 'hidden', width: 70, height: 70 }}>
          {photoURL? (
            <img src={photoURL} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
          ) : (
            <span style={{ fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: '#1d4be3', color: '#fff', borderRadius: '50%' }}>{name.charAt(0).toUpperCase()}</span>
          )}
          <label htmlFor="avatarUpload" style={{ position: 'absolute', bottom: -2, right: -2, background: '#1d4be3', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid #121212' }}><Camera size={14} color="#fff" /></label>
          <input id="avatarUpload" type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
        </div>

        <div className="profile-info">
          <h2>{name} {uploading && <span style={{ fontSize: 12, color: '#1d4be3' }}>(uploading...)</span>}</h2>
          <p>{email}</p>
          <div className="badge-row">
            <span className="subscription-badge">{subscription}</span>
            <span className="stat-mini">{practiced} Tests</span>
          </div>
        </div>
      </div>

      <div className="account-menu">
        {menuItems.map(item => {
          const Icon = item.icon
          return (
            <button key={item.id} className="menu-row" onClick={item.action}>
              <div className="menu-left"><div className="menu-icon-wrap"><Icon size={18}/></div><div><div className="menu-label">{item.label}</div><div className="menu-desc">{item.desc}</div></div></div>
              <ChevronRight size={18} className="menu-chevron" />
            </button>
          )
        })}
      </div>

      <div className="upgrade-card">
        <div className="upgrade-left"><div className="crown-icon"><Crown size={20}/></div><div><h3>Upgrade to Pro</h3><p>Unlock all questions + offline + no ads</p></div></div>
        <button className="btn-upgrade" onClick={() => alert('Pro coming soon - ₦2000/year')}>UPGRADE</button>
      </div>

      <button className="btn-logout" onClick={handleLogout}><LogOut size={16}/> Logout</button>
      <p className="footer-text">Made with ❤️ for Nigerian Students</p>
    </div>
  )
}