import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { RouterProvider } from 'react-router-dom'
import router from './route/index'
import { Provider } from 'react-redux'
import { store, persistor } from './store/store.js'
import { PersistGate } from 'redux-persist/integration/react'
import { SplashScreen } from '@capacitor/splash-screen'
import { Capacitor } from '@capacitor/core'

// Auto-recover from Vite dynamic chunk import failures on deployment / cache rollover
window.addEventListener('vite:preloadError', (event) => {
  console.warn('[Vite Preload Error] Chunk fetch failed, performing auto-recovery reload...', event)
  const lastReload = parseInt(sessionStorage.getItem('snapit_preload_reload') || '0', 10)
  const now = Date.now()
  // Prevent reload loop if network is completely offline (max 1 reload per 8 seconds)
  if (now - lastReload > 8000) {
    sessionStorage.setItem('snapit_preload_reload', String(now))
    if ('caches' in window) {
      window.caches.keys().then((keys) => {
        return Promise.all(keys.filter((k) => k.includes('snapit')).map((k) => window.caches.delete(k)))
      }).catch(() => {})
    }
    window.location.reload()
  }
})

// Global safety net: intercept uncaught errors and promise rejections so the WebView/React never crashes
window.addEventListener('error', (event) => {
  console.warn('Snapit Global Error Guard:', event?.error?.message || event?.message)
})

window.addEventListener('unhandledrejection', (event) => {
  console.warn('Snapit Unhandled Rejection Guard:', event?.reason?.message || event?.reason)
})

if (Capacitor.isNativePlatform()) {
  SplashScreen.hide().catch(() => {})
}

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <RouterProvider router={router}/>
    </PersistGate>
  </Provider>
)