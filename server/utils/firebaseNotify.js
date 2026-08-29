// ============================================================
// server/utils/firebaseNotify.js — FULL REPLACEMENT (lazy init)
// ============================================================

import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const admin = require('firebase-admin')
const { getMessaging } = require('firebase-admin/messaging')

let messaging = null

function getMessagingClient() {
    if (messaging) return messaging
    try {
        if (admin.getApps().length === 0) {
            const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env
            if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
                throw new Error('Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in .env')
            }
            admin.initializeApp({
                credential: admin.cert({
                    projectId: FIREBASE_PROJECT_ID,
                    clientEmail: FIREBASE_CLIENT_EMAIL,
                    privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                })
            })
            console.log('✅ Firebase Admin initialized')
        }
        messaging = getMessaging()
    } catch (error) {
        console.error('❌ Firebase Admin init failed — push notifications disabled:', error.message)
    }
    return messaging
}

export async function sendPushNotification({ token, title, body, data = {} }) {
    try {
        const client = getMessagingClient()
        if (!client) {
            console.warn('[Push] Firebase not initialized, skipping notification')
            return
        }
        if (!token) return
        const message = {
            token,
            notification: { title, body },
            data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
            android: {
                priority: 'high',
                notification: {
                    title,
                    body,
                    sound: 'default',
                    channelId: 'snapit_orders',
                    priority: 'max',
                    visibility: 'public',
                    defaultSound: true,
                    defaultVibrateTimings: true,
                    tag: data?.orderId ? `order_${data.orderId}` : undefined,
                }
            },
            apns: {
                payload: {
                    aps: {
                        alert: { title, body },
                        sound: 'default',
                        badge: 1
                    }
                }
            },
            webpush: {
                notification: { icon: '/snapit-icon-192.png', badge: '/snapit-icon-192.png', vibrate: [200, 100, 200] },
                fcmOptions: { link: '/rider-panel' }
            }
        }
        const result = await client.send(message)
        console.log('📱 Notification sent:', result)
        return result
    } catch (error) {
        console.error('❌ Notification failed:', error.message)
    }
}

export async function sendPushToMultiple({ tokens, title, body, data = {} }) {
    if (!tokens || tokens.length === 0) return
    const uniqueTokens = [...new Set(tokens.filter(Boolean))]
    const results = await Promise.allSettled(
        uniqueTokens.map(token => sendPushNotification({ token, title, body, data }))
    )
    return results
}

export async function notifyAllRiders({ title, body, data = {} }) {
    try {
        const { default: UserModel } = await import('../models/user.model.js')
        const riders = await UserModel.find({
            role: { $in: ['RIDER', 'rider'] },
            fcmToken: { $exists: true, $ne: null, $ne: '' }
        }).select('fcmToken name role').lean()

        if (riders.length === 0) {
            console.log('No riders with FCM tokens found')
            return
        }
        const tokens = riders.map(r => r.fcmToken).filter(Boolean)
        console.log(`📢 Notifying ${tokens.length} active riders`)
        return await sendPushToMultiple({ tokens, title, body, data })
    } catch (error) {
        console.error('❌ notifyAllRiders failed:', error.message)
    }
}
