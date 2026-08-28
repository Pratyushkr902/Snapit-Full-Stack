import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { requestNotificationPermission } from '../utils/firebase'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'

import toast from 'react-hot-toast'
import { playOrderAlertChime, playNotificationDing } from '../utils/playChime'

const useNotifications = () => {
  const user = useSelector(state => state.user)

  useEffect(() => {
    if (!user?._id) return

    const registerPush = async () => {
      try {
        // ── 1. NATIVE ANDROID / IOS PLATFORMS ──────────────────────────────
        if (Capacitor.isNativePlatform()) {
          // Sync existing cached native token immediately upon login
          const cachedNativeToken = localStorage.getItem('snapit_native_fcm_token')
          if (cachedNativeToken) {
            console.log('📱 Syncing cached native FCM token for user:', user._id)
            Axios({
              ...SummaryApi.saveFcmToken,
              data: { fcmToken: cachedNativeToken }
            }).catch(err => console.warn('Failed to sync cached native FCM token:', err?.message))
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
            console.warn('[PushNotifications] Channel creation note:', channelErr?.message)
          }

          // Listeners MUST be attached BEFORE calling PushNotifications.register()
          await PushNotifications.removeAllListeners()

          PushNotifications.addListener('registration', async (token) => {
            if (token?.value) {
              console.log('📱 Native FCM Token generated:', token.value)
              try {
                localStorage.setItem('snapit_native_fcm_token', token.value)
                await Axios({
                  ...SummaryApi.saveFcmToken,
                  data: { fcmToken: token.value }
                })
              } catch (err) {
                console.warn('Failed to save native FCM token to backend:', err.message)
              }
            }
          })

          PushNotifications.addListener('registrationError', (error) => {
            console.warn('❌ Native FCM Registration error:', error)
          })

          PushNotifications.addListener('pushNotificationReceived', (notification) => {
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

          let permStatus = await PushNotifications.checkPermissions()
          if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
            permStatus = await PushNotifications.requestPermissions()
          }

          if (permStatus.receive === 'granted') {
            // Register with Google FCM
            await PushNotifications.register()
          }
        } else {
          // ── 2. WEB BROWSER / PWA PLATFORM ────────────────────────────────
          const cachedWebToken = localStorage.getItem('snapit_web_fcm_token')
          if (cachedWebToken) {
            Axios({
              ...SummaryApi.saveFcmToken,
              data: { fcmToken: cachedWebToken }
            }).catch(() => {})
          }

          const token = await requestNotificationPermission()
          if (token) {
            console.log('🌐 Web FCM Token generated:', token)
            localStorage.setItem('snapit_web_fcm_token', token)
            await Axios({
              ...SummaryApi.saveFcmToken,
              data: { fcmToken: token }
            })
          }
        }
      } catch (error) {
        console.warn('[useNotifications] setup error (non-fatal):', error?.message)
      }
    }

    registerPush()
  }, [user?._id])
}

export default useNotifications
