import { createContext, useContext, useState } from 'react'
import { API_URL as API } from '../config'

const AuthContext = createContext<any>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('cbt_user')
      return saved? JSON.parse(saved) : null
    } catch { return null }
  })
  const [loading, setLoading] = useState(false)

  const login = async (email: string, password: string) => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Login failed")
      localStorage.setItem('cbt_user', JSON.stringify(data))
      setUser(data)
      return { success: true, data }
    } catch (err: any) {
      return { success: false, message: err.message }
    } finally {
      setLoading(false)
    }
  }

  const register = async (name: string, email: string, password: string) => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Register failed")
      localStorage.setItem('cbt_user', JSON.stringify(data))
      setUser(data)
      return { success: true, data }
    } catch (err: any) {
      return { success: false, message: err.message }
    } finally {
      setLoading(false)
    }
  }

  const setUserData = (data: any) => {
    localStorage.setItem('cbt_user', JSON.stringify(data))
    setUser(data)
  }

  const logout = () => {
    localStorage.removeItem('cbt_user')
    localStorage.removeItem('token')
    setUser(null)
  }

  const updateUser = async (newUsername: string) => {
    if (!user?.user_id) return
    try {
      await fetch(`${API}/api/update-user/${user.user_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername })
      })
      const updated = {...user, username: newUsername }
      localStorage.setItem('cbt_user', JSON.stringify(updated))
      setUser(updated)
    } catch {}
  }

  // FIXED: Update avatar - permanent + returns full URL correctly
  const updateAvatar = async (file: File) => {
    if (!user?.user_id) return { success: false, message: "Not logged in" }
    try {
      const form = new FormData()
      form.append('avatar', file)
      
      const res = await fetch(`${API}/api/user/upload-avatar/${user.user_id}`, {
        method: 'POST',
        body: form
      })

      // IMPORTANT: Check text first to avoid <!doctype error
      const text = await res.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        console.error("Backend returned HTML:", text.slice(0,300))
        throw new Error("Backend error - is Flask running on 5000? Got HTML not JSON")
      }

      if(!res.ok || !data.success) throw new Error(data.message || 'Upload failed')

      // data.profile_image = "avatars/avatar_1_123.jpg"
      // data.url = "/uploads/avatars/avatar_1_123.jpg"
      const fullUrl = `${API}${data.url}` // Permanent full URL
      
      const updated = {...user, profile_image: data.profile_image }
      localStorage.setItem('cbt_user', JSON.stringify(updated))
      setUser(updated)

      return { success: true, url: fullUrl, profile_image: data.profile_image }
    } catch (err: any) {
      console.error(err)
      return { success: false, message: err.message }
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUserData, updateUser, updateAvatar, loginDirect: setUserData }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be inside AuthProvider")
  return ctx
}