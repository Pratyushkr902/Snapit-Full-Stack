import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Capacitor } from '@capacitor/core'
import { requestNotificationPermission } from '../utils/firebase'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import { IoNotificationsOutline, IoClose } from 'react-icons/io5'

const NotificationPermissionBanner = () => {
  const user = useSelector(state => state.user)
  const [showPrompt, setShowPrompt] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isIosSafari, setIsIosSafari] = useState(false)

  useEffect(() => {
    // Only needed on Web / PWA (Capacitor handles native prompt automatically)
    if (Capacitor.isNativePlatform()) return

    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    const isStandalone = window.navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)

    if (isIos && !isStandalone) {
      setIsIosSafari(true)
      const dismissed = sessionStorage.getItem('snapit_ios_install_dismissed')
      if (!dismissed) {
        setShowPrompt(true)
      }
      return
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        const dismissed = sessionStorage.getItem('snapit_notif_banner_dismissed')
        if (!dismissed) {
          setShowPrompt(true)
        }
      }
    }
  }, [])

  const handleEnable = async () => {
    try {
      setLoading(true)
      const token = await requestNotificationPermission()
      if (token) {
        localStorage.setItem('snapit_web_fcm_token', token)
        await Axios({
          ...SummaryApi.saveFcmToken,
          data: { fcmToken: token }
        })
        toast.success('🔔 Order notifications enabled!')
        setShowPrompt(false)
      } else {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'denied') {
          toast.error('Notifications are blocked in your browser settings.')
        } else if (isIosSafari) {
          toast('📱 On iPhone: Tap Share ⬆️ and "Add to Home Screen" to receive live push alerts!', {
            icon: 'ℹ️',
            duration: 6000
          })
        }
        setShowPrompt(false)
      }
    } catch (err) {
      console.warn('Failed to enable push notifications:', err?.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = () => {
    if (isIosSafari) {
      sessionStorage.setItem('snapit_ios_install_dismissed', 'true')
    } else {
      sessionStorage.setItem('snapit_notif_banner_dismissed', 'true')
    }
    setShowPrompt(false)
  }

  if (!showPrompt) return null

  return (
    <div className='fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-50 max-w-md bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 rounded-2xl shadow-2xl border border-slate-700/60 animate-in fade-in slide-in-from-bottom-4 duration-300'>
      <div className='flex items-start gap-3'>
        <div className={`p-2 rounded-xl flex-shrink-0 mt-0.5 ${isIosSafari ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
          {isIosSafari ? <span className='text-xl'>📱</span> : <IoNotificationsOutline size={22} className='animate-bounce' />}
        </div>
        <div className='flex-1 min-w-0'>
          {isIosSafari ? (
            <>
              <h4 className='font-bold text-sm text-white flex items-center gap-1.5'>
                <span>Get Order Alerts on iPhone</span>
              </h4>
              <p className='text-xs text-slate-300 mt-1 leading-relaxed'>
                Apple requires adding Snapit to your Home Screen to deliver live order alerts & rider tracking:
              </p>
              <div className='mt-2.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-700/50 text-[11px] text-slate-300 space-y-1.5'>
                <p className='flex items-center gap-1.5'>
                  <span className='font-bold text-white'>1.</span> Tap Safari <strong className='text-blue-400 font-bold'>Share (⬆️)</strong> button below
                </p>
                <p className='flex items-center gap-1.5'>
                  <span className='font-bold text-white'>2.</span> Select <strong className='text-emerald-400 font-bold'>"Add to Home Screen"</strong> (➕)
                </p>
                <p className='flex items-center gap-1.5'>
                  <span className='font-bold text-white'>3.</span> Open Snapit icon & tap <strong className='text-white font-bold'>"Allow"</strong>
                </p>
              </div>
              <div className='flex items-center gap-2 mt-3'>
                <button
                  onClick={handleDismiss}
                  className='px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all'
                >
                  Got It 👍
                </button>
              </div>
            </>
          ) : (
            <>
              <h4 className='font-bold text-sm text-white'>Enable Order Updates</h4>
              <p className='text-xs text-slate-300 mt-0.5 leading-relaxed'>
                Get instant lock screen delivery alerts, rider tracking, and discounts directly on your device.
              </p>
              <div className='flex items-center gap-2 mt-3'>
                <button
                  onClick={handleEnable}
                  disabled={loading}
                  className='px-3.5 py-1.5 bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all'
                >
                  {loading ? 'Enabling...' : '🔔 Allow Notifications'}
                </button>
                <button
                  onClick={handleDismiss}
                  className='px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 font-semibold'
                >
                  Later
                </button>
              </div>
            </>
          )}
        </div>
        <button onClick={handleDismiss} className='text-slate-400 hover:text-white p-1'>
          <IoClose size={18} />
        </button>
      </div>
    </div>
  )
}

export default NotificationPermissionBanner
