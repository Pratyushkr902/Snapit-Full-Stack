// ============================================================
// server/utils/firebaseNotify.js — FULL REPLACEMENT FOR TOP SECTION
// ============================================================
//
// firebase-admin is fundamentally a CommonJS package. Its ESM wrapper
// has been inconsistent across versions (v12-v14) in how it exposes
// the default export and named exports under Node's native ESM loader.
// Both `import admin from 'firebase-admin'` and
// `import * as admin from 'firebase-admin'` have known issues depending
// on the exact subpath Node resolves to.
//
// The bulletproof fix: use createRequire to load it as CommonJS
// directly, bypassing the ESM interop layer entirely. This is the
// approach Firebase's own GitHub issues recommend for Node ESM projects.

import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const admin = require('firebase-admin')

// ─── everything below this line is UNCHANGED from your existing file ───

// Initialize Firebase Admin only once
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        })
        console.log('✅ Firebase Admin initialized')
    } catch (error) {
        console.error('❌ Firebase Admin init failed:', error.message)
    }
}

// Send notification to a single device token
export async function sendPushNotification({ token, title, body, data = {} }) {
    try {
        if (!token) return
        const message = {
            token,
            notification: { title, body },
            data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
            android: {
                priority: 'high',
                notification: { sound: 'default', channelId: 'snapit_orders' }
            },
            webpush: {
                notification: { icon: '/snapit-icon-192.png', badge: '/snapit-icon-192.png', vibrate: [200, 100, 200] },
                fcmOptions: { link: '/rider-panel' }
            }
        }
        const result = await admin.messaging().send(message)
        console.log('📱 Notification sent:', result)
        return result
    } catch (error) {
        console.error('❌ Notification failed:', error.message)
    }
}

// Send notification to multiple tokens
export async function sendPushToMultiple({ tokens, title, body, data = {} }) {
    if (!tokens || tokens.length === 0) return
    const results = await Promise.allSettled(
        tokens.map(token => sendPushNotification({ token, title, body, data }))
    )
    return results
}

// Send notification to all riders
export async function notifyAllRiders({ title, body, data = {} }) {
    try {
        const { default: UserModel } = await import('../models/user.model.js')
        const riders = await UserModel.find({
            role: 'rider',
            fcmToken: { $exists: true, $ne: null, $ne: '' }
        }).select('fcmToken name')

        if (riders.length === 0) {
            console.log('No riders with FCM tokens found')
            return
        }
        const tokens = riders.map(r => r.fcmToken)
        console.log(`📢 Notifying ${tokens.length} riders`)
        return await sendPushToMultiple({ tokens, title, body, data })
    } catch (error) {
        console.error('❌ notifyAllRiders failed:', error.message)
    }
}