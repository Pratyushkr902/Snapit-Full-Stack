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
    if (!user?._id) return

    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    const isStandalone = window.navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)

    if (isIos && !isStandalone) {
      setIsIosSafari(true)
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        const dismissed = sessionStorage.getItem('snapit_notif_banner_dismissed')
        if (!dismissed) {
          setShowPrompt(true)
        }
      }
    }
  }, [user?._id])

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
    sessionStorage.setItem('snapit_notif_banner_dismissed', 'true')
    setShowPrompt(false)
  }

  if (!showPrompt) return null

  return (
    <div className='fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-50 max-w-md bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 rounded-2xl shadow-2xl border border-slate-700/60 animate-in fade-in slide-in-from-bottom-4 duration-300'>
      <div className='flex items-start gap-3'>
        <div className='p-2 bg-green-500/20 text-green-400 rounded-xl flex-shrink-0 mt-0.5'>
          <IoNotificationsOutline size={22} className='animate-bounce' />
        </div>
        <div className='flex-1 min-w-0'>
          <h4 className='font-bold text-sm text-white'>Enable Order Updates</h4>
          <p className='text-xs text-slate-300 mt-0.5 leading-relaxed'>
            Get instant lock screen delivery alerts, rider tracking, and discounts directly on your iPhone.
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
        </div>
        <button onClick={handleDismiss} className='text-slate-400 hover:text-white p-1'>
          <IoClose size={18} />
        </button>
      </div>
    </div>
  )
}

export default NotificationPermissionBanner
