import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { apiRequest, setSubscriptionBlockedListener } from '../api'
import { useAuth } from './AuthContext'
import {
  isSubscriptionBlockedError,
  parseSubscriptionStatus,
  tickSubscriptionStatus,
  type SubscriptionStatus,
} from '../subscription'

const STATUS_PATH = '/api/students/me/subscription'
const POLL_INTERVAL_MS = 60 * 1000
const TICK_INTERVAL_MS = 1000

type SubscriptionContextValue = {
  status: SubscriptionStatus | null
  /** True once the backend has answered 403 for an authenticated request. */
  blocked: boolean
  /** True while the first status check is still in flight. */
  loading: boolean
  /** Set when the status check failed for a reason other than expiry (5xx, network). */
  error: string | null
  refresh: () => Promise<void>
  /** Called by the API layer whenever a request comes back 403. */
  reportBlocked: () => void
  /** Clears the block after a successful renewal/activation. */
  clearBlocked: () => void
  clearError: () => void
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null)

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const userId = user?.user_id
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)
  const [blocked, setBlocked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastSyncRef = useRef(0)

  const applyStatus = useCallback((next: SubscriptionStatus | null) => {
    lastSyncRef.current = Date.now()
    setError(null)
    setStatus(next)
    // A fresh, active status means the renewal went through.
    setBlocked(next ? next.expired : false)
  }, [])

  const refresh = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const payload = await apiRequest<unknown>(STATUS_PATH)
      applyStatus(parseSubscriptionStatus(payload))
    } catch (requestError) {
      if (isSubscriptionBlockedError(requestError)) {
        setBlocked(true)
      } else {
        // A 5xx or network failure is not an expiry: keep the last known status
        // and surface the problem instead of silently showing nothing.
        setError(requestError instanceof Error ? requestError.message : 'Could not check your subscription status.')
      }
    } finally {
      setLoading(false)
    }
  }, [userId, applyStatus])

  const reportBlocked = useCallback(() => setBlocked(true), [])
  const clearError = useCallback(() => setError(null), [])
  const clearBlocked = useCallback(() => {
    setBlocked(false)
    setStatus(current => (current?.expired ? null : current))
  }, [])

  // Any 403 from an authenticated request means the backend has cut access off.
  useEffect(() => {
    if (!userId) {
      setSubscriptionBlockedListener(null)
      return
    }
    setSubscriptionBlockedListener(reportBlocked)
    return () => setSubscriptionBlockedListener(null)
  }, [userId, reportBlocked])

  // Reset whenever the signed-in user changes.
  useEffect(() => {
    if (!userId) return
    const timer = window.setTimeout(() => { void refresh() }, 0)
    return () => window.clearTimeout(timer)
  }, [userId, refresh])

  // Poll the status endpoint so the countdown stays anchored to the server.
  useEffect(() => {
    if (!userId) return
    const interval = window.setInterval(() => { void refresh() }, POLL_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [userId, refresh])

  // Tick the countdown locally between polls.
  useEffect(() => {
    if (!userId || !status?.active) return
    const interval = window.setInterval(() => {
      const now = Date.now()
      const elapsed = now - lastSyncRef.current
      lastSyncRef.current = now
      setStatus(current => {
        if (!current?.active) return current
        const next = tickSubscriptionStatus(current, elapsed)
        if (next.expired) setBlocked(true)
        return next
      })
    }, TICK_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [userId, status?.active])

  return (
    <SubscriptionContext.Provider value={{ status, blocked, loading, error, refresh, reportBlocked, clearBlocked, clearError }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export const useSubscription = () => {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) throw new Error('useSubscription must be inside SubscriptionProvider')
  return ctx
}
