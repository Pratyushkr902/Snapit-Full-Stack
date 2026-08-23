import { useEffect } from 'react'
import { useSelector } from 'react-redux'

const useNotifications = () => {
    const user = useSelector(state => state.user)

    useEffect(() => {
        // Notification auto-request on login is permanently disabled to prevent WebView/APK shutdowns
        if (!user?._id) return
    }, [user?._id])
}

export default useNotifications