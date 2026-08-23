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
                console.warn('Token save error:', err?.message)
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
                    const { title, body } = payload?.notification || {}
                    if (title || body) {
                        toast(
                            renderToast(title, body, payload?.data?.type),
                            toastStyle
                        )
                    }
                })
            } catch (error) {
                console.warn('Web notification setup warning:', error?.message)
            }
        }

        // Run web notifications only outside native platform to guarantee zero APK crashes
        if (!Capacitor.isNativePlatform()) {
            setupWeb()
        }
    }, [user?._id])
}

export default useNotifications