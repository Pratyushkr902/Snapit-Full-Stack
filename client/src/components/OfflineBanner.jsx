import { useState, useEffect } from 'react'
import { IoCloudOffline, IoCheckmarkCircle } from 'react-icons/io5'

const OfflineBanner = () => {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true))
  const [showRestored, setShowRestored] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowRestored(true)
      const timer = setTimeout(() => {
        setShowRestored(false)
      }, 3000)
      return () => clearTimeout(timer)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowRestored(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline && !showRestored) return null

  if (!isOnline) {
    return (
      <aside
        aria-live="assertive"
        className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-amber-600 to-rose-600 text-white px-4 py-2 pt-[calc(env(safe-area-inset-top,0px)+8px)] text-xs font-bold flex items-center justify-center gap-2 shadow-lg backdrop-blur-md transition-all duration-300"
      >
        <IoCloudOffline className="text-base animate-pulse shrink-0" />
        <span>You are currently offline. Please check your internet connection.</span>
      </aside>
    )
  }

  if (showRestored) {
    return (
      <aside
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2 pt-[calc(env(safe-area-inset-top,0px)+8px)] text-xs font-bold flex items-center justify-center gap-2 shadow-lg backdrop-blur-md transition-all duration-300"
      >
        <IoCheckmarkCircle className="text-base shrink-0" />
        <span>Connection restored! You are back online.</span>
      </aside>
    )
  }

  return null
}

export default OfflineBanner
