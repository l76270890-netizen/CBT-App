import { createContext, useContext, useState } from 'react'

const API = "http://localhost:5000"

const AuthContext = createContext<any>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('cbt_user')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })
  const [loading, setLoading] = useState(false)

  // Login with Flask
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

      // data = {success, user_id, username, email}
      localStorage.setItem('cbt_user', JSON.stringify(data))
      setUser(data)
      return { success: true, data }
    } catch (err: any) {
      return { success: false, message: err.message }
    } finally {
      setLoading(false)
    }
  }

  // Register with Flask
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

  // For admin login + direct set
  const setUserData = (data: any) => {
    localStorage.setItem('cbt_user', JSON.stringify(data))
    setUser(data)
  }

  const logout = () => {
    localStorage.removeItem('cbt_user')
    localStorage.removeItem('token')
    setUser(null)
  }

  // update username locally + backend
  const updateUser = async (newUsername: string) => {
    if (!user?.user_id) return
    try {
      await fetch(`${API}/api/update-user/${user.user_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername })
      })
      const updated = { ...user, username: newUsername }
      localStorage.setItem('cbt_user', JSON.stringify(updated))
      setUser(updated)
    } catch {}
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUserData, updateUser, loginDirect: setUserData }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be inside AuthProvider")
  return ctx
}