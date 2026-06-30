import * as admin from 'firebase-admin'

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