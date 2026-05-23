import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { getRemoteConfig, fetchAndActivate, getValue } from 'firebase/remote-config'

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

// Remote Config instance
export const remoteConfig = getRemoteConfig(app)
remoteConfig.settings.minimumFetchIntervalMillis = 300000 // 5 minutes

// Default values (fallback if Firebase is unreachable)
remoteConfig.defaultConfig = {
  // Banners
  banners: JSON.stringify([
    { id: 1, image: '/banners/banner1.png', link: '/category/fruits', active: true },
    { id: 2, image: '/banners/banner2.png', link: '/category/dairy', active: true },
    { id: 3, image: '/banners/banner3.png', link: '/category/snacks', active: true }
  ]),

  // Feature Flags
  show_wallet: 'true',
  show_refer_earn: 'true',
  show_flash_sale: 'false',
  show_coupon_box: 'true',
  show_whatsapp_button: 'true',
  enable_cod: 'true',
  enable_online_payment: 'true',
  enable_wallet_payment: 'true',

  // A/B Testing
  checkout_layout: 'default',       // 'default' or 'compact'
  home_layout: 'grid',              // 'grid' or 'list'
  promo_banner_text: 'Get 15% off on your first order!',

  // Delivery config
  free_delivery_threshold: '399',
  delivery_fee: '12',

  // App Messages
  app_maintenance_mode: 'false',
  maintenance_message: 'We are upgrading Snapit. Back in 10 mins!',
  offer_strip_text: '🚀 Free delivery on orders above ₹399',
  offer_strip_active: 'true',
}

export async function initRemoteConfig() {
  try {
    await fetchAndActivate(remoteConfig)
    console.log('✅ Remote Config fetched')
  } catch (err) {
    console.log('⚠️ Remote Config using defaults:', err.message)
  }
}

export function getFlag(key) {
  return getValue(remoteConfig, key).asString()
}

export function getFlagBool(key) {
  return getValue(remoteConfig, key).asBoolean()
}

export function getFlagNumber(key) {
  return getValue(remoteConfig, key).asNumber()
}

// Notification helpers
export async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null
    const token = await getToken(messaging, { vapidKey: VAPID_KEY })
    if (token) return token
  } catch (error) {
    console.error('FCM token error:', error)
    return null
  }
}

export function onForegroundMessage(callback) {
  return onMessage(messaging, (payload) => {
    callback(payload)
  })
}

export { messaging }
