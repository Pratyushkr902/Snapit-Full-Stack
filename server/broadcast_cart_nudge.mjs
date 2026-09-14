import dotenv from 'dotenv'
dotenv.config({ path: new URL('./.env', import.meta.url).pathname })
import mongoose from 'mongoose'
import connectDB from './config/connectDB.js'
import UserModel from './models/user.model.js'
import DeviceTokenModel from './models/deviceToken.model.js'
import NotificationModel from './models/notification.model.js'
import CartProductModel from './models/cartproduct.model.js'
import ProductModel from './models/product.model.js'
import { sendPushNotification } from './utils/firebaseNotify.js'

async function runCartNudgeBroadcast() {
  console.log('🚀 Starting Snapit Abandoned Cart Nudge Broadcast...')
  await connectDB()

  // 1. Fetch active cart products in database
  const activeCartItems = await CartProductModel.find({})
    .populate('productId', 'name price')
    .sort({ updatedAt: -1 })
    .lean()

  console.log(`📦 Found ${activeCartItems.length} total cart items in database.`)

  // Group cart items by userId
  const userCartMap = new Map()
  activeCartItems.forEach(item => {
    if (!item.userId) return
    const uId = String(item.userId)
    if (!userCartMap.has(uId)) userCartMap.set(uId, [])
    userCartMap.get(uId).push(item)
  })
  console.log(`👥 Users with items currently in cart: ${userCartMap.size}`)

  // 2. Fetch all registered users & active device tokens
  const [users, deviceDocs] = await Promise.all([
    UserModel.find({}).select('_id name mobile fcmToken fcmTokens').lean(),
    DeviceTokenModel.find({
      token: { $exists: true, $ne: null, $ne: '' }
    }).sort({ lastActiveAt: -1 }).select('token userId platform lastActiveAt').lean()
  ])

  console.log(`📊 Found ${users.length} total users in DB and ${deviceDocs.length} device tokens.`)

  // Build unique token map: token -> { userId, platform, cartItems }
  const tokenMap = new Map()
  const userPlatformSeen = new Set()

  deviceDocs.forEach(d => {
    const cleanToken = d.token?.trim()
    if (!cleanToken || cleanToken.length <= 10) return
    const uIdStr = d.userId ? String(d.userId) : null
    const key = uIdStr ? `${uIdStr}__${d.platform || 'android'}` : cleanToken
    if (!userPlatformSeen.has(key) && !tokenMap.has(cleanToken)) {
      userPlatformSeen.add(key)
      tokenMap.set(cleanToken, {
        userId: uIdStr,
        platform: d.platform || 'android',
        cartItems: uIdStr ? (userCartMap.get(uIdStr) || []) : []
      })
    }
  })

  // Cover users from UserModel whose FCM tokens are not in DeviceTokenModel
  users.forEach(u => {
    const uid = String(u._id)
    if (userPlatformSeen.has(`${uid}__android`)) return
    const bestToken = u.fcmToken?.trim() || (Array.isArray(u.fcmTokens) ? u.fcmTokens[0]?.trim() : null)
    if (bestToken && bestToken.length > 10 && !tokenMap.has(bestToken)) {
      tokenMap.set(bestToken, {
        userId: uid,
        platform: 'android',
        cartItems: userCartMap.get(uid) || []
      })
      userPlatformSeen.add(`${uid}__android`)
    }
  })

  const allTokens = Array.from(tokenMap.entries())
  console.log(`📱 Prepared ${allTokens.length} unique device tokens for cart nudge blast!`)

  // 3. Create In-App Notification records in MongoDB for all users
  console.log('📝 Creating In-App Cart Nudge notifications in MongoDB...')
  const inAppDocs = users.map(u => {
    const uid = String(u._id)
    const cartItems = userCartMap.get(uid) || []
    
    let title, shayari, body
    if (cartItems.length > 0) {
      const firstItem = cartItems[0]?.productId?.name || 'Aapke pasandeeda items'
      const moreCount = cartItems.length > 1 ? ` (+${cartItems.length - 1} aur)` : ''
      title = '🛒 Aapka Snapit Cart Intezaar Kar Raha Hai! 🛵💨'
      shayari = 'सामान सजा है टोकरी में, बस आर्डर की देरी है,\nSnapit पहुँचाएगा झटपट, जब मर्ज़ी तेरी है! ✨'
      body = `"${firstItem}${moreCount}" aapke cart mein intezaar kar rahe hain! Tap karke order complete karein aur superfast delivery payein.`
    } else {
      title = '🛒 Don\'t Leave Your Cart Empty! 🛍️⚡'
      shayari = 'भूख लगी हो या राशन की हो दरकार,\nSnapit का कार्ट तैयार है, बस कर दीजिए आर्डर यार! 🍛📦'
      body = 'Aapke favourite grocery, snacks & food items intezaar kar rahe hain! Abhi cart mein add karein aur 10-15 minute mein deliver karwayein!'
    }

    return {
      recipientId: u._id,
      recipientType: 'user',
      type: 'ABANDONED_CART',
      title,
      message: body,
      shayari,
      body,
      data: {
        type: 'ABANDONED_CART',
        url: '/cart',
        screen: 'Cart'
      },
      fcmToken: u.fcmToken || null,
      isRead: false
    }
  })

  try {
    const inserted = await NotificationModel.insertMany(inAppDocs, { ordered: false })
    console.log(`✅ Stored ${inserted.length} in-app cart nudge records in MongoDB!`)
  } catch (err) {
    console.warn(`⚠️ Partial in-app notification save:`, err.message)
  }

  // 4. Send Push Notifications in Batches
  console.log('📡 Sending Firebase Push Notifications to all devices...')
  const BATCH_SIZE = 50
  let successCount = 0
  let failureCount = 0
  let personalizedCount = 0

  for (let i = 0; i < allTokens.length; i += BATCH_SIZE) {
    const batch = allTokens.slice(i, i + BATCH_SIZE)
    const promises = batch.map(async ([token, info]) => {
      let title, shayari, body
      const cartItems = info.cartItems || []

      if (cartItems.length > 0) {
        personalizedCount++
        const firstItem = cartItems[0]?.productId?.name || 'Aapke favourite items'
        const moreCount = cartItems.length > 1 ? ` (+${cartItems.length - 1} more)` : ''
        title = '🛒 Aapka Cart Intezaar Kar Raha Hai! 🛵💨'
        shayari = 'सामान सजा है टोकरी में, बस आर्डर की देरी है,\nSnapit पहुँचाएगा झटपट, जब मर्ज़ी तेरी है! ✨'
        body = `"${firstItem}${moreCount}" aapke cart mein hain. Complete order now for superfast delivery!`
      } else {
        title = '🛒 Complete Your Snapit Order! 🛍️⚡'
        shayari = 'भूख लगी हो या राशन की हो दरकार,\nSnapit का कार्ट तैयार है, बस कर दीजिए आर्डर यार! 🍛📦'
        body = 'Aapke favourite grocery & food items cart mein intezaar kar rahe hain! Complete checkout now for instant delivery.'
      }

      try {
        const res = await sendPushNotification({
          token,
          title,
          body: `${shayari}\n\n${body}`,
          data: {
            type: 'ABANDONED_CART',
            title,
            body,
            url: '/cart',
            screen: 'Cart'
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
  console.log('🎉 CART NUDGE BROADCAST COMPLETED!')
  console.log(`✅ Push Sent Successfully: ${successCount}`)
  console.log(`⚠️ Push Failed / Inactive Tokens: ${failureCount}`)
  console.log(`🎯 Personalized Push Reminders (Active Carts): ${personalizedCount}`)
  console.log(`📝 Total In-App Notifications Created: ${inAppDocs.length}`)
  console.log('=============================================\n')

  process.exit(0)
}

runCartNudgeBroadcast().catch(err => {
  console.error('❌ Cart Nudge Broadcast Failed:', err)
  process.exit(1)
})
