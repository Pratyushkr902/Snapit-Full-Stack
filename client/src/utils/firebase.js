import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { getRemoteConfig, fetchAndActivate, getValue } from 'firebase/remote-config'

// ─── SECURITY FIX: All credentials moved to environment variables ───────────
// Never commit API keys. Add these to your .env file (never commit that file).
// VITE_ prefix is required for Vite to expose them to the client bundle.
//
// Required .env entries:
//   VITE_FIREBASE_API_KEY=
//   VITE_FIREBASE_AUTH_DOMAIN=
//   VITE_FIREBASE_PROJECT_ID=
//   VITE_FIREBASE_STORAGE_BUCKET=
//   VITE_FIREBASE_MESSAGING_SENDER_ID=
//   VITE_FIREBASE_APP_ID=
//   VITE_FIREBASE_MEASUREMENT_ID=
//   VITE_FIREBASE_VAPID_KEY=

const requiredEnvVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
    'VITE_FIREBASE_VAPID_KEY',
]

const missingVars = requiredEnvVars.filter(v => !import.meta.env[v])
if (missingVars.length > 0) {
    console.error('[Firebase] Missing required env vars:', missingVars.join(', '))
}

const firebaseConfig = {
    apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId:             import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

// VAPID key for push notifications — must come from env, never hardcoded
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

let app = null
let messaging = null
let remoteConfigInstance = null

try {
    if (firebaseConfig.apiKey) {
        app = initializeApp(firebaseConfig)
        try {
            if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                messaging = getMessaging(app)
            }
        } catch (mErr) {
            console.warn('[Firebase] Messaging not available in this environment:', mErr?.message)
        }

        try {
            remoteConfigInstance = getRemoteConfig(app)
            remoteConfigInstance.settings.minimumFetchIntervalMillis = 300000 // 5 minutes
        } catch (rcErr) {
            console.warn('[Firebase] RemoteConfig not available:', rcErr?.message)
        }
    }
} catch (err) {
    console.warn('[Firebase] Initialization error:', err?.message)
}

// Default values (fallback if Firebase is unreachable)
const DEFAULT_CONFIG = {
    // Banners
    banners: JSON.stringify([
        { id: 1, image: '/banners/banner1.png', link: '/category/fruits', active: true },
        { id: 2, image: '/banners/banner2.png', link: '/category/dairy', active: true },
        { id: 3, image: '/banners/banner3.png', link: '/category/snacks', active: true },
    ]),
    // Feature Flags
    show_wallet:           'true',
    show_refer_earn:       'true',
    show_flash_sale:       'false',
    show_coupon_box:       'true',
    show_whatsapp_button:  'true',
    enable_cod:            'true',
    enable_online_payment: 'true',
    enable_wallet_payment: 'true',
    // A/B Testing
    checkout_layout:    'default',
    home_layout:        'grid',
    promo_banner_text:  'Get 15% off on your first order!',
    // Delivery config
    free_delivery_threshold: '399',
    delivery_fee:            '12',
    // App Messages
    app_maintenance_mode: 'false',
    maintenance_message:  'We are upgrading Snapit. Back in 10 mins!',
    offer_strip_text:     '🚀 Free delivery on orders above ₹399',
    offer_strip_active:   'true',
}

if (remoteConfigInstance) {
    remoteConfigInstance.defaultConfig = DEFAULT_CONFIG
}

export const remoteConfig = remoteConfigInstance

export async function initRemoteConfig() {
    if (!remoteConfigInstance) return
    try {
        await fetchAndActivate(remoteConfigInstance)
        console.log('✅ Remote Config fetched')
    } catch (err) {
        console.log('⚠️ Remote Config using defaults:', err.message)
    }
}

export function getFlag(key) {
    try {
        if (remoteConfigInstance) return getValue(remoteConfigInstance, key).asString()
    } catch (e) {}
    return DEFAULT_CONFIG[key] || ''
}

export function getFlagBool(key) {
    try {
        if (remoteConfigInstance) return getValue(remoteConfigInstance, key).asBoolean()
    } catch (e) {}
    return DEFAULT_CONFIG[key] === 'true'
}

export function getFlagNumber(key) {
    try {
        if (remoteConfigInstance) return getValue(remoteConfigInstance, key).asNumber()
    } catch (e) {}
    return Number(DEFAULT_CONFIG[key]) || 0
}

export async function requestNotificationPermission() {
    try {
        if (!VAPID_KEY || !messaging) {
            return null
        }

        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return null

        const swRegistration = await navigator.serviceWorker.register(
            '/firebase-messaging-sw.js'
        )

        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: swRegistration,
        })

        if (token) return token
        return null
    } catch (error) {
        console.warn('FCM token error:', error?.message)
        return null
    }
}

export function onForegroundMessage(callback) {
    if (!messaging) return () => {}
    try {
        return onMessage(messaging, (payload) => {
            callback(payload)
        })
    } catch (e) {
        return () => {}
    }
}

export { messaging }