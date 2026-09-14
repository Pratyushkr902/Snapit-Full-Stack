import dotenv from 'dotenv'
dotenv.config({ path: new URL('./.env', import.meta.url).pathname })
import mongoose from 'mongoose'
import connectDB from './config/connectDB.js'
import UserModel from './models/user.model.js'
import DeviceTokenModel from './models/deviceToken.model.js'
import NotificationModel from './models/notification.model.js'
import { sendPushNotification } from './utils/firebaseNotify.js'

async function runDinnerBroadcast() {
  console.log('🚀 Starting Snapit Evening Dinner Rush Broadcast...')
  await connectDB()

  const title = '🍛 Aaj Raat Ka Dinner Snapit Se! 🛵💨'
  const shayari = 'मेस के खाने से हैं परेशान? Snapit लाया है समाधान!\nगरमा-गरम बिरयानी, रोल्स और चाउमीन, 8:30 PM से पहले मंगाएं! ✨'
  const body = '🔥 Flat 100% FREE Delivery on orders ₹149+! RJ Garden, Monginis, MGD Pizza, Momos Point & more. Use code SNAPIT50 for surprise discount. Order now before 8:30 PM shutter!'

  // 1. Fetch all users and active device tokens
  const [users, deviceDocs] = await Promise.all([
    UserModel.find({}).select('_id name mobile fcmToken fcmTokens').lean(),
    DeviceTokenModel.find({
      token: { $exists: true, $ne: null, $ne: '' }
    }).sort({ lastActiveAt: -1 }).select('token userId platform lastActiveAt').lean()
  ])

  console.log(`📊 Found ${users.length} total users in database and ${deviceDocs.length} device tokens.`)

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
  console.log(`📱 Prepared ${allTokens.length} unique device tokens for dinner push blast!`)

  // 3. Create In-App Notification records in MongoDB for all users
  console.log('📝 Creating In-App notifications for all users in MongoDB...')
  const inAppDocs = users.map(u => ({
    recipientId: u._id,
    recipientType: 'user',
    type: 'FOOD_PROMO',
    title,
    message: body,
    shayari,
    body,
    data: {
      promoTag: 'DINNER_RUSH',
      couponCode: 'SNAPIT50',
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
            type: 'FOOD_PROMO',
            title,
            body,
            url: '/food',
            screen: 'FoodHome',
            couponCode: 'SNAPIT50'
          }
        })
        if (res && res.success) {
          successCount++
        } else {
          failureCount++
        }
      } catch (err) {
        failureCount++
      }
    })

    await Promise.all(promises)
    console.log(`⚡ Sent batch ${Math.floor(i / BATCH_SIZE) + 1} (${Math.min(i + BATCH_SIZE, allTokens.length)} / ${allTokens.length})`)
  }

  console.log('\n=============================================')
  console.log('🎉 DINNER RUSH BROADCAST COMPLETED!')
  console.log(`✅ Push Sent Successfully: ${successCount}`)
  console.log(`⚠️ Push Failed / Inactive Tokens: ${failureCount}`)
  console.log(`📝 Total In-App Notifications Created: ${inAppDocs.length}`)
  console.log('=============================================\n')

  process.exit(0)
}

runDinnerBroadcast().catch(err => {
  console.error('❌ Dinner Broadcast Failed:', err)
  process.exit(1)
})
