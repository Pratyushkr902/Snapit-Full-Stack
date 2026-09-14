import dotenv from 'dotenv'
dotenv.config({ path: new URL('./.env', import.meta.url).pathname })
import mongoose from 'mongoose'
import connectDB from './config/connectDB.js'
import UserModel from './models/user.model.js'
import DeviceTokenModel from './models/deviceToken.model.js'
import NotificationModel from './models/notification.model.js'
import { sendPushNotification } from './utils/firebaseNotify.js'

async function runBroadcast() {
  console.log('🚀 Starting Snapit Free Delivery Notification Broadcast...')
  await connectDB()

  const title = '🎉 100% FREE Delivery is LIVE! 🛵💨'
  const shayari = 'चाहे गरमा-गरम समोसा हो या स्पेशल बिरयानी,\nSnapit लाया है FREE Delivery की मनमानी! 🚀✨'
  const body = '🔥 100% FREE Delivery on Food & Grocery orders ₹149+ in Paliganj & ₹199+ for Food at Himalaya Medical College! Samosa, Chowmein, Biryani, Sweets & Essentials delivered fast. Tap to order!'

  // 1. Fetch all users and active device tokens
  const [users, deviceDocs] = await Promise.all([
    UserModel.find({}).select('_id name mobile fcmToken fcmTokens').lean(),
    DeviceTokenModel.find({
      token: { $exists: true, $ne: null, $ne: '' }
    }).sort({ lastActiveAt: -1 }).select('token userId platform lastActiveAt').lean()
  ])

  console.log(`📊 Found ${users.length} total users in database and ${deviceDocs.length} recent active device tokens.`)

  // 2. Build unique token map (strictly 1 token per user per platform)
  const tokenMap = new Map()
  const userPlatformSeen = new Set()

  deviceDocs.forEach(d => {
    const cleanToken = d.token?.trim()
    if (!cleanToken || cleanToken.length <= 10) return
    const key = d.userId ? `${d.userId}__${d.platform || 'android'}` : cleanToken
    if (!userPlatformSeen.has(key) && !tokenMap.has(cleanToken)) {
      userPlatformSeen.add(key)
      tokenMap.set(cleanToken, { userId: d.userId, platform: d.platform })
    }
  })

  // Add FCM tokens from UserModel for users not yet covered
  users.forEach(u => {
    const uid = String(u._id)
    if (userPlatformSeen.has(`${uid}__android`)) return
    const bestToken = u.fcmToken?.trim() || (Array.isArray(u.fcmTokens) ? u.fcmTokens[0]?.trim() : null)
    if (bestToken && bestToken.length > 10 && !tokenMap.has(bestToken)) {
      tokenMap.set(bestToken, { userId: uid, platform: 'android' })
      userPlatformSeen.add(`${uid}__android`)
    }
  })

  const allTokens = Array.from(tokenMap.keys())
  console.log(`📱 Prepared ${allTokens.length} unique device tokens for push notification blast!`)

  // 3. Create In-App Notification records in MongoDB for all users
  console.log('📝 Creating In-App notifications for all users...')
  const inAppDocs = users.map(u => ({
    recipientId: u._id,
    recipientType: 'user',
    type: 'FREE_DELIVERY_OFFER',
    title,
    message: body,
    shayari,
    body,
    data: {
      promoTag: 'FREE_DELIVERY',
      url: '/food',
      screen: 'FoodHome'
    },
    fcmToken: u.fcmToken || null,
    isRead: false
  }))

  try {
    const inserted = await NotificationModel.insertMany(inAppDocs, { ordered: false })
    console.log(`✅ Stored ${inserted.length} in-app notification records in MongoDB!`)
  } catch (err) {
    console.warn(`⚠️ Partial in-app notification save:`, err.message)
  }

  // 4. Send Push Notifications in Batches
  console.log('📡 Sending Firebase Push Notifications to all devices...')
  const BATCH_SIZE = 50
  let successCount = 0
  let failureCount = 0

  for (let i = 0; i < allTokens.length; i += BATCH_SIZE) {
    const batch = allTokens.slice(i, i + BATCH_SIZE)
    const promises = batch.map(async (token) => {
      try {
        const res = await sendPushNotification({
          token,
          title,
          body: `${shayari}\n\n${body}`,
          data: {
            type: 'FREE_DELIVERY_OFFER',
            title,
            body,
            url: '/food',
            screen: 'FoodHome'
          }
        })
        const isSuccess = Boolean(res && (res.success === true || typeof res === 'string' || (typeof res === 'object' && res.result)))
        if (isSuccess) {
          successCount++
        } else {
          failureCount++
        }
      } catch (err) {
        failureCount++
      }
    })
    await Promise.allSettled(promises)
    console.log(`   Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allTokens.length / BATCH_SIZE)} (Sent: ${successCount}, Failed: ${failureCount})`)
  }

  console.log('\n====================================================')
  console.log(`🎉 BROADCAST COMPLETE:`)
  console.log(`- In-app notifications created: ${inAppDocs.length} users`)
  console.log(`- Device push notifications delivered: ${successCount}`)
  console.log(`- Inactive/unregistered tokens: ${failureCount}`)
  console.log('====================================================\n')

  process.exit(0)
}

runBroadcast().catch(err => {
  console.error('Fatal broadcast error:', err)
  process.exit(1)
})

