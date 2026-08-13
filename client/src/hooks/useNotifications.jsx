import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { requestNotificationPermission, onForegroundMessage } from '../utils/firebase'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'

const renderToast = (title, body, type) => (
    <div className='flex items-center gap-3'>
        <span className='text-2xl'>{type === 'new_order' ? '🛒' : '📦'}</span>
        <div>
            <p className='font-black text-slate-800 text-sm'>{title}</p>
            <p className='text-xs text-slate-500'>{body}</p>
        </div>
    </div>
)

const toastStyle = {
    duration: 6000,
    style: {
        borderRadius: '16px',
        padding: '12px 16px',
        background: '#fff',
        boxShadow: '0 8px 30px rgba(0,0,0,0.12)'
    }
}

const useNotifications = () => {
    const user = useSelector(state => state.user)

    useEffect(() => {
        if (!user?._id) return

        const saveToken = async (fcmToken) => {
            try {
                await Axios({ ...SummaryApi.saveFcmToken, data: { fcmToken } })
                console.log('✅ FCM token registered')
            } catch (err) {
                console.error('Token save error:', err)
            }
        }

        const setupNative = async () => {
            try {
                // FIX: create the 'snapit_orders' Android notification channel.
                // Your backend (firebaseNotify.js / notificationService.js) sends
                // every push with channelId: 'snapit_orders'. On Android 8+, if
                // that channel was never created on-device, the OS silently
                // DROPS the notification whenever the app is backgrounded or
                // killed — no error anywhere, it just never appears. This is
                // almost certainly why notifications work in foreground (via
                // the pushNotificationReceived listener/toast below) but never
                // show on the home screen / lock screen when the app is closed.
                // Must be created before register() and on every app launch —
                // it's a no-op if the channel already exists.
                await PushNotifications.createChannel({
                    id: 'snapit_orders',
                    name: 'Snapit Orders',
                    description: 'Order updates, delivery status, and offers',
                    importance: 5,      // IMPORTANCE_HIGH — required for heads-up/lock-screen display
                    visibility: 1,      // VISIBILITY_PUBLIC — show full content on lock screen
                    sound: 'default',
                    vibration: true,
                    lights: true,
                })

                const permStatus = await PushNotifications.requestPermissions()
                if (permStatus.receive !== 'granted') return

                await PushNotifications.register()

                PushNotifications.addListener('registration', (token) => {
                    saveToken(token.value)
                })

                PushNotifications.addListener('registrationError', (err) => {
                    console.error('Push registration error:', err)
                })

                // Fires only while the app is in the FOREGROUND — background/
                // killed-state display is handled entirely by the OS using the
                // channel created above, no JS code runs for that case.
                PushNotifications.addListener('pushNotificationReceived', (notification) => {
                    toast(
                        renderToast(notification.title, notification.body, notification.data?.type),
                        toastStyle
                    )
                })

                // ADDED: handle the user tapping a notification from the tray/
                // lock screen (app was backgrounded or killed) — without this,
                // tapping the notification just opens the app to wherever it
                // last was, instead of the relevant order/screen.
                PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
                    const url = action.notification?.data?.url
                    if (url) {
                        window.location.hash = url.startsWith('#') ? url : `#${url}`
                    }
                })
            } catch (error) {
                console.error('Native notification setup error:', error)
            }
        }

        const setupWeb = async () => {
            try {
                const token = await requestNotificationPermission()
                if (!token) return
                await saveToken(token)
                onForegroundMessage((payload) => {
                    const { title, body } = payload.notification || {}
                    toast(
                        renderToast(title, body, payload.data?.type),
                        toastStyle
                    )
                })
            } catch (error) {
                console.error('Web notification setup error:', error)
            }
        }

        if (Capacitor.isNativePlatform()) {
            setupNative()
        } else {
            setupWeb()
        }
    }, [user?._id])
}

export default useNotifications