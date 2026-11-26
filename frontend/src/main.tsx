import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { startOfflineSync } from './offline/sync.ts'

// Build marker: confirm in the browser console which bundle is running.
// Must read "offline-sync-3" (no question deletion) on the fixed build.
console.info('[ExamCore] build offline-sync-3 (permanent offline question bank)')

startOfflineSync()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
