import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { requestNotificationPermission, onForegroundMessage } from '../utils/firebase'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import useNotifications from './hooks/useNotifications'
const useNotifications = () => {
    const user = useSelector(state => state.user)

    useEffect(() => {
        if (!user?._id) return

        const setupNotifications = async () => {
            try {
                const token = await requestNotificationPermission()
                if (!token) return

                // Save token to backend
                await Axios({
                    ...SummaryApi.saveFcmToken,
                    data: { fcmToken: token }
                })
                console.log('✅ FCM token registered')

                // Listen for foreground messages
                onForegroundMessage((payload) => {
                    const { title, body } = payload.notification || {}
                    toast(
                        <div className='flex items-center gap-3'>
                            <span className='text-2xl'>
                                {payload.data?.type === 'new_order' ? '🛒' : '📦'}
                            </span>
                            <div>
                                <p className='font-black text-slate-800 text-sm'>{title}</p>
                                <p className='text-xs text-slate-500'>{body}</p>
                            </div>
                        </div>,
                        {
                            duration: 6000,
                            style: {
                                borderRadius: '16px',
                                padding: '12px 16px',
                                background: '#fff',
                                boxShadow: '0 8px 30px rgba(0,0,0,0.12)'
                            }
                        }
                    )
                })
            } catch (error) {
                console.error('Notification setup error:', error)
            }
        }

        setupNotifications()
    }, [user?._id])
}

export default useNotifications