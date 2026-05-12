import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: "AIzaSyAn7lwvs2e4x1vkHN3aqpZL1cwF5_LCFrE",
  authDomain: "snapit-da080.firebaseapp.com",
  projectId: "snapit-da080",
  storageBucket: "snapit-da080.firebasestorage.app",
  messagingSenderId: "404894201207",
  appId: "1:404894201207:web:1603b3e3dc46f65f4e9d72",
  measurementId: "G-MHJZV49XNS"
}

const VAPID_KEY = "BL_FzqJGuSIYUsMzNo6ZUTjAQSW7IDgcAdumxCwjHFSGa_XJRiubBJa-hvFgdiCE8VcfnPIobc6IDFSlqMzvvak"

const app = initializeApp(firebaseConfig)
const messaging = getMessaging(app)

// Request notification permission and get FCM token
export async function requestNotificationPermission() {
    try {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
            console.log('Notification permission denied')
            return null
        }

        const token = await getToken(messaging, { vapidKey: VAPID_KEY })
        if (token) {
            console.log('FCM Token:', token)
            return token
        }
    } catch (error) {
        console.error('FCM token error:', error)
        return null
    }
}

// Listen for foreground messages
export function onForegroundMessage(callback) {
    return onMessage(messaging, (payload) => {
        console.log('Foreground message:', payload)
        callback(payload)
    })
}

export { messaging }