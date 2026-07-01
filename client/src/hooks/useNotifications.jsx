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
                const permStatus = await PushNotifications.requestPermissions()
                if (permStatus.receive !== 'granted') return

                await PushNotifications.register()

                PushNotifications.addListener('registration', (token) => {
                    saveToken(token.value)
                })

                PushNotifications.addListener('registrationError', (err) => {
                    console.error('Push registration error:', err)
                })

                PushNotifications.addListener('pushNotificationReceived', (notification) => {
                    toast(
                        renderToast(notification.title, notification.body, notification.data?.type),
                        toastStyle
                    )
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
