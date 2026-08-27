import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { requestNotificationPermission } from '../utils/firebase'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'

const useNotifications = () => {
  const user = useSelector(state => state.user)

  useEffect(() => {
    if (!user?._id) return

    const registerPush = async () => {
      try {
        // ── 1. NATIVE ANDROID / IOS PLATFORMS ──────────────────────────────
        if (Capacitor.isNativePlatform()) {
          // Create Android High-Priority Notification Channels for heads-up alerts
          try {
            await PushNotifications.createChannel({
              id: 'snapit_orders',
              name: 'Snapit Orders & Delivery',
              description: 'Real-time order alerts, status updates, and rider notifications',
              importance: 5, // MAX importance (heads-up pop-up + sound)
              visibility: 1, // PUBLIC on lockscreen
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
          const token = await requestNotificationPermission()
          if (token) {
            console.log('🌐 Web FCM Token generated:', token)
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
