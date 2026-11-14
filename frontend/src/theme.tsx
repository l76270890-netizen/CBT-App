import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'examcore-theme'

type ThemeContextValue = {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function applyTheme(theme: ThemeMode) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.style.colorScheme = theme === 'light' ? 'light' : 'dark'
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'light' ? '#F6F8FC' : '#071126')
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // ignore storage errors
  }
}

export function getStoredTheme(): ThemeMode {
  try {
    const t = localStorage.getItem(STORAGE_KEY)
    return t === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof document !== 'undefined') {
      const attr = document.documentElement.getAttribute('data-theme')
      if (attr === 'light' || attr === 'dark') return attr
    }
    return getStoredTheme()
  })

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    setTheme: (t) => setThemeState(t),
    toggleTheme: () => setThemeState(prev => (prev === 'dark' ? 'light' : 'dark')),
  }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    // Fallback for safety outside provider
    const theme = (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light') ? 'light' : 'dark'
    return {
      theme: theme as ThemeMode,
      setTheme: (t: ThemeMode) => { applyTheme(t) },
      toggleTheme: () => { applyTheme(theme === 'dark' ? 'light' : 'dark') },
    }
  }
  return ctx
}