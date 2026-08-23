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