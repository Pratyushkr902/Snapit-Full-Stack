import dotenv from 'dotenv'
dotenv.config({ path: new URL('./.env', import.meta.url).pathname })
import mongoose from 'mongoose'
import connectDB from './config/connectDB.js'
import UserModel from './models/user.model.js'
import DeviceTokenModel from './models/deviceToken.model.js'
import NotificationModel from './models/notification.model.js'
import RestaurantModel from './models/restaurant.model.js'
import StoreModel from './models/store.model.js'
import { sendPushNotification } from './utils/firebaseNotify.js'

async function runFastRestoGroceryBroadcast() {
  console.log('🚀 Starting Snapit Resto Food & Grocery Urgent Broadcast...')
  await connectDB()

  // 1. Ensure all restaurants & stores are active and open
  await RestaurantModel.updateMany({}, { $set: { isOpen: true, isActive: true } })
  await StoreModel.updateMany({}, { $set: { isActive: true } })
  console.log('✅ All restaurants and stores confirmed OPEN & Active!')

  const title = '🍔 Bhookh Lagi Hai? Resto Food & Groceries in 10 Mins! ⚡🛵'
  const shayari = 'गरमा-गरम खाना या ठंडी-ठंडी कोल्ड ड्रिंक,\nSnapit पहुँचाए आपके पास faster than a blink! 🍕🥤'
  const body = '🔥 Craving delicious restaurant meals or daily groceries? Pizza, Burger, Biryani, Cold Drinks & Snacks delivered in just 10 minutes! Tap to order fast before rush hour.'

  // 2. Fetch all users and active device tokens
  const [users, deviceDocs] = await Promise.all([
    UserModel.find({}).select('_id name mobile fcmToken fcmTokens').lean(),
    DeviceTokenModel.find({
      token: { $exists: true, $ne: null, $ne: '' }
    }).sort({ lastActiveAt: -1 }).select('token userId platform lastActiveAt').lean()
  ])

  console.log(`📊 Found ${users.length} total users in DB and ${deviceDocs.length} registered device tokens.`)

  // 3. Build unique token map (strictly 1 token per user per platform)
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
  console.log(`📱 Prepared ${allTokens.length} unique device tokens for broadcast blast!`)

  // 4. Create In-App Notification records in MongoDB for all users
  console.log('📝 Creating In-App notifications for all users in MongoDB...')
  const inAppDocs = users.map(u => ({
    recipientId: u._id,
    recipientType: 'user',
    type: 'RESTO_GROCERY_FLASH_RUSH',
    title,
    message: `${shayari}\n\n${body}`,
    body,
    data: {
      promoTag: 'RESTO_FOOD_GROCERY_RUSH',
      url: '/',
      screen: 'Home'
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

  // 5. Send Push Notifications in Batches
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
            type: 'RESTO_GROCERY_FLASH_RUSH',
            title,
            body,
            url: '/',
            screen: 'Home'
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
  console.log('🎉 RESTO FOOD & GROCERY BROADCAST COMPLETED!')
  console.log(`✅ Push Sent Successfully: ${successCount}`)
  console.log(`⚠️ Push Failed / Inactive Tokens: ${failureCount}`)
  console.log(`📝 Total In-App Notifications Created: ${inAppDocs.length}`)
  console.log('=============================================\n')

  process.exit(0)
}

runFastRestoGroceryBroadcast().catch(err => {
  console.error('❌ Broadcast Failed:', err)
  process.exit(1)
})

