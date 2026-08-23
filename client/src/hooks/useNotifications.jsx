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
            if (!Capacitor.isPluginAvailable('PushNotifications')) {
                console.log('PushNotifications plugin not available on this platform')
                return
            }
            try {
                try {
                    await PushNotifications.createChannel({
                        id: 'snapit_orders',
                        name: 'Snapit Orders',
                        description: 'Order updates, delivery status, and offers',
                        importance: 5,
                        visibility: 1,
                        sound: 'default',
                        vibration: true,
                        lights: true,
                    })
                } catch (chErr) {
                    console.warn('PushNotifications createChannel warning:', chErr?.message)
                }

                let permStatus = await PushNotifications.checkPermissions()
                if (permStatus?.receive !== 'granted') {
                    permStatus = await PushNotifications.requestPermissions()
                }
                if (permStatus?.receive !== 'granted') return

                await PushNotifications.register()

                PushNotifications.addListener('registration', (token) => {
                    if (token?.value) saveToken(token.value)
                })

                PushNotifications.addListener('registrationError', (err) => {
                    console.warn('Push registration error:', err?.message)
                })

                PushNotifications.addListener('pushNotificationReceived', (notification) => {
                    if (notification?.title || notification?.body) {
                        toast(
                            renderToast(notification.title, notification.body, notification.data?.type),
                            toastStyle
                        )
                    }
                })

                PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
                    const url = action.notification?.data?.url
                    if (url) {
                        window.location.hash = url.startsWith('#') ? url : `#${url}`
                    }
                })
            } catch (error) {
                console.warn('Native notification setup error:', error?.message)
            }
        }

        const setupWeb = async () => {
            if (typeof window === 'undefined' || typeof Notification === 'undefined' || !('serviceWorker' in navigator)) {
                return
            }
            try {
                const token = await requestNotificationPermission()
                if (!token) return
                await saveToken(token)
                onForegroundMessage((payload) => {
                    const { title, body } = payload.notification || {}
                    if (title || body) {
                        toast(
                            renderToast(title, body, payload.data?.type),
                            toastStyle
                        )
                    }
                })
            } catch (error) {
                console.warn('Web notification setup error:', error?.message)
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