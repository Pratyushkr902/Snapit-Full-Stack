// ============================================================
// server/utils/firebaseNotify.js — FULL REPLACEMENT (lazy init)
// ============================================================

import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const admin = require('firebase-admin')
const { getMessaging } = require('firebase-admin/messaging')

let messaging = null
let initError = null

function formatPrivateKey(key) {
    if (!key) return ''
    let cleaned = key.trim()
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
        cleaned = cleaned.slice(1, -1)
    }
    return cleaned.replace(/\\n/g, '\n').replace(/\r/g, '').trim()
}

function getMessagingClient() {
    if (messaging) return messaging
    try {
        if (admin.getApps().length === 0) {
            let projectId = process.env.FIREBASE_PROJECT_ID
            let clientEmail = process.env.FIREBASE_CLIENT_EMAIL
            let privateKey = process.env.FIREBASE_PRIVATE_KEY

            if (process.env.FIREBASE_SERVICE_ACCOUNT) {
                try {
                    const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
                    projectId = parsed.project_id || projectId
                    clientEmail = parsed.client_email || clientEmail
                    privateKey = parsed.private_key || privateKey
                } catch (e) {
                    console.warn('Could not parse FIREBASE_SERVICE_ACCOUNT JSON:', e.message)
                }
            }

            if (!projectId || !clientEmail || !privateKey) {
                initError = `Missing Firebase config. ID: ${Boolean(projectId)}, Email: ${Boolean(clientEmail)}, Key: ${Boolean(privateKey)}`
                throw new Error(initError)
            }

            admin.initializeApp({
                credential: admin.cert({
                    projectId: projectId,
                    clientEmail: clientEmail,
                    privateKey: formatPrivateKey(privateKey),
                })
            })
            console.log('✅ Firebase Admin initialized')
        }
        messaging = getMessaging()
        initError = null
    } catch (error) {
        initError = error.message
        console.error('❌ Firebase Admin init failed — push notifications disabled:', error.message)
    }
    return messaging
}

export async function sendPushNotification({ token, title, body, data = {} }) {
    try {
        const client = getMessagingClient()
        if (!client) {
            console.warn('[Push] Firebase not initialized, skipping notification:', initError)
            return { success: false, error: initError || 'Firebase not initialized' }
        }
        if (!token) return { success: false, error: 'Missing token' }
        const dataMap = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]))
        const message = {
            token,
            notification: { title, body },
            data: {
                title,
                body,
                message: body,
                ...dataMap
            },
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
                    tag: data?.type === 'ABANDONED_CART' ? 'cart_nudge' : (data?.type ? `promo_${data.type}` : (data?.orderId ? `order_${data.orderId}` : undefined)),
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
                notification: {
                    title,
                    body,
                    icon: '/snapit-icon-192.png',
                    badge: '/snapit-icon-192.png',
                    vibrate: [200, 100, 200]
                },
                data: {
                    title,
                    body,
                    ...dataMap
                },
                fcmOptions: { link: data?.url || (data?.orderId ? `/#/dashboard/order-tracking/${data.orderId}` : '/') }
            }
        }
        const result = await client.send(message)
        console.log('📱 Notification sent:', result)
        return { success: true, result }
    } catch (error) {
        const isUnregistered = 
            error.code === 'messaging/registration-token-not-registered' ||
            error.message?.includes('NotRegistered') ||
            error.message?.includes('Device unregistered') ||
            error.message?.includes('registration-token-not-registered')
        
        console.error('❌ Notification failed:', error.message, isUnregistered ? '(Unregistered)' : '')
        return { success: false, isUnregistered, error: error.message }
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
            $or: [
                { fcmToken: { $exists: true, $ne: null, $ne: '' } },
                { 'fcmTokens.0': { $exists: true } }
            ]
        }).select('fcmToken fcmTokens name role').lean()

        if (riders.length === 0) {
            console.log('No riders with FCM tokens found')
            return
        }
        const tokens = riders.map(r => {
            if (r.fcmToken && typeof r.fcmToken === 'string' && r.fcmToken.trim().length > 10) return r.fcmToken.trim();
            if (Array.isArray(r.fcmTokens) && r.fcmTokens.length > 0) return r.fcmTokens[r.fcmTokens.length - 1];
            return null;
        }).filter(Boolean)
        const uniqueTokens = [...new Set(tokens)]
        console.log(`📢 Notifying ${uniqueTokens.length} active unique rider devices`)
        return await sendPushToMultiple({ tokens: uniqueTokens, title, body, data })
    } catch (error) {
        console.error('❌ notifyAllRiders failed:', error.message)
    }
}
