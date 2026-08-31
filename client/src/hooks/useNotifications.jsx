import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { PushNotifications } from '@capacitor/push-notifications'
import { requestNotificationPermission } from '../utils/firebase'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import { playOrderAlertChime, playNotificationDing } from '../utils/playChime'
import { CURRENT_APP_VERSION } from '../constants/appVersion'

const useNotifications = () => {
  const user = useSelector(state => state.user)
  const registeredRef = useRef(false)

  // Helper to send token with metadata to backend
  const syncTokenToBackend = async (token) => {
    if (!token || typeof token !== 'string' || token.trim().length < 10) return
    try {
      await Axios({
        ...SummaryApi.saveFcmToken,
        data: {
          fcmToken: token.trim(),
          platform: Capacitor.isNativePlatform() ? 'android' : 'web',
          appVersion: CURRENT_APP_VERSION || '2.6.33'
        }
      })
      console.log('✅ FCM Token synced with server')
    } catch (err) {
      console.warn('FCM sync note:', err?.message)
    }
  }

  useEffect(() => {
    const registerPush = async () => {
      try {
        // ── 1. NATIVE ANDROID / IOS PLATFORMS ──────────────────────────────
        if (Capacitor.isNativePlatform()) {
          // Sync existing cached native token immediately
          const cachedNativeToken = localStorage.getItem('snapit_native_fcm_token')
          if (cachedNativeToken) {
            syncTokenToBackend(cachedNativeToken)
          }

          // Create Android High-Priority Notification Channels for heads-up alerts
          try {
            await PushNotifications.createChannel({
              id: 'snapit_orders',
              name: 'Snapit Orders & Delivery',
              description: 'Real-time order alerts, status updates, and rider notifications',
              importance: 5, // MAX importance (heads-up pop-up + sound)
              visibility: 1, // PUBLIC on lockscreen (shows full card like Zomato/Swiggy)
              sound: 'default',
              vibration: true,
              lights: true,
              lightColor: '#ea580c',
            })
            await PushNotifications.createChannel({
              id: 'default',
              name: 'General Alerts',
              description: 'General updates and offers',
              importance: 4,
              visibility: 1,
              sound: 'default',
              vibration: true,
            })
          } catch (channelErr) {
            console.warn('[PushNotifications] Channel note:', channelErr?.message)
          }

          if (!registeredRef.current) {
            registeredRef.current = true

            await PushNotifications.removeAllListeners()

            PushNotifications.addListener('registration', async (token) => {
              if (token?.value) {
                console.log('📱 Native FCM Token generated:', token.value)
                localStorage.setItem('snapit_native_fcm_token', token.value)
                syncTokenToBackend(token.value)
              }
            })

            PushNotifications.addListener('registrationError', (error) => {
              console.warn('❌ Native FCM Registration error:', error)
            })

            const recentPushes = new Map()
            PushNotifications.addListener('pushNotificationReceived', (notification) => {
              const notifKey = String(notification.id || notification.data?.orderId || notification.title || notification.body || '').trim()
              const now = Date.now()
              if (notifKey && recentPushes.has(notifKey) && (now - recentPushes.get(notifKey) < 4000)) {
                console.log('🔇 Duplicate push notification suppressed:', notifKey)
                return
              }
              if (notifKey) recentPushes.set(notifKey, now)

              console.log('🔔 Push notification received in foreground:', notification)
              const title = notification.title || notification.data?.title || 'Snapit Alert'
              const body = notification.body || notification.data?.body || ''

              const isOrderAlert = title.toLowerCase().includes('order') ||
                                   title.toLowerCase().includes('delivery') ||
                                   ['SELLER', 'RESTO_SELLER', 'RIDER', 'ADMIN', 'SUPER_ADMIN'].includes(user?.role)

              if (isOrderAlert) {
                playOrderAlertChime()
              } else {
                playNotificationDing()
              }

              toast(
                (t) => (
                  <div className='flex flex-col gap-0.5'>
                    <p className='font-black text-xs text-slate-800 flex items-center gap-1.5'>
                      <span>🔔</span> {title}
                    </p>
                    {body && <p className='text-xs text-slate-600 font-medium'>{body}</p>}
                  </div>
                ),
                {
                  duration: 6000,
                  style: {
                    background: '#ffffff',
                    color: '#0f172a',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    padding: '12px 16px',
                  },
                }
              )
            })

            PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
              console.log('👆 User tapped push notification:', notification)
              const url = notification.notification?.data?.url
              if (url && typeof window !== 'undefined') {
                window.location.hash = url
              }
            })

            // Prompt permission on app start
            let permStatus = await PushNotifications.checkPermissions()
            if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
              permStatus = await PushNotifications.requestPermissions()
            }

            if (permStatus.receive === 'granted') {
              await PushNotifications.register()
            }
          }
        } else {
          // ── 2. WEB BROWSER / PWA PLATFORM ────────────────────────────────
          const cachedWebToken = localStorage.getItem('snapit_web_fcm_token')
          if (cachedWebToken) {
            syncTokenToBackend(cachedWebToken)
          }

          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            const token = await requestNotificationPermission()
            if (token) {
              localStorage.setItem('snapit_web_fcm_token', token)
              syncTokenToBackend(token)
            }
          }
        }
      } catch (error) {
        console.warn('[useNotifications] setup note:', error?.message)
      }
    }

    registerPush()

    // Sync on App Resume / Foreground
    let appStateSub = null
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          const cached = localStorage.getItem('snapit_native_fcm_token')
          if (cached) syncTokenToBackend(cached)
        }
      }).then(sub => { appStateSub = sub }).catch(() => {})
    }

    return () => {
      if (appStateSub?.remove) appStateSub.remove()
    }
  }, [user?._id])
}

export default useNotifications
