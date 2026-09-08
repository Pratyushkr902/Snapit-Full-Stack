import cron from 'node-cron'
import UserModel, { CronLockModel } from '../models/user.model.js'
import DeviceTokenModel from '../models/deviceToken.model.js'
import CartProductModel from '../models/cartproduct.model.js'
import ProductModel from '../models/product.model.js'
import OrderModel from '../models/order.model.js'
import { Notification } from './notificationService.js'
import { sendPushNotification } from './firebaseNotify.js'

// Helper: Acquire atomic distributed lock in MongoDB so multiple server instances never run duplicate crons
export async function acquireCronLock(lockKey) {
  try {
    await CronLockModel.create({ key: lockKey, executedAt: new Date() })
    console.log(`🔑 [Cron Lock] Successfully acquired exclusive lock for slot: "${lockKey}"`)
    return true
  } catch (err) {
    console.log(`🔒 [Cron Lock] Slot "${lockKey}" already executed by another instance. Skipping duplicate.`)
    return false
  }
}

// Distributed broadcast debounce: guarantees no two broadcasts run within 30 seconds
const BROADCAST_DEBOUNCE_MS = 30 * 1000
let lastBroadcastTimestamp = 0

// Helper: Broadcast to all active unique devices in batches
export async function broadcastToAllUsers({ title, shayari, body, type, promoTag = 'DAILY_CRAVING' }) {
  try {
    const now = Date.now()
    if (now - lastBroadcastTimestamp < BROADCAST_DEBOUNCE_MS) {
      console.warn(`🛑 [Marketing Engine] Broadcast "${title}" skipped by in-memory debounce (${Math.round((now - lastBroadcastTimestamp) / 1000)}s since previous broadcast).`)
      return { success: false, message: 'Throttled: A broadcast was already sent in the last 30 seconds.' }
    }

    // Atomic distributed lock in MongoDB across instances (30s slot)
    const broadcastLockKey = `BROADCAST_LOCK_${Math.floor(now / 30000)}`
    const lockAcquired = await acquireCronLock(broadcastLockKey)
    if (!lockAcquired) {
      console.warn(`🛑 [Marketing Engine] Broadcast "${title}" blocked by distributed MongoDB lock. Duplicate execution prevented.`)
      return { success: false, message: 'Broadcast already dispatched by another instance.' }
    }

    lastBroadcastTimestamp = now

    const [users, deviceDocs] = await Promise.all([
      UserModel.find({
        $or: [
          { fcmToken: { $exists: true, $ne: null, $ne: '' } },
          { 'fcmTokens.0': { $exists: true } }
        ]
      }).select('_id name fcmToken fcmTokens').lean(),
      DeviceTokenModel.find({
        token: { $exists: true, $ne: null, $ne: '' },
        lastActiveAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Active in last 30 days
      }).sort({ lastActiveAt: -1 }).select('token userId platform lastActiveAt').lean()
    ])

    const tokenMap = new Map()
    const userDevices = new Map() // userPlatformKey -> newest deviceDoc
    const guestTokens = new Set()

    // 1. Group device tokens per user PER PLATFORM (e.g. 1 android, 1 ios, 1 web)
    // Avoids 4x duplicates on the same device while ensuring an iOS device is not suppressed by an Android device
    deviceDocs.forEach(d => {
      const cleanToken = d.token?.trim()
      if (!cleanToken || cleanToken.length <= 10) return

      if (d.userId) {
        const uid = String(d.userId)
        const platform = d.platform || 'unknown'
        const userPlatformKey = `${uid}__${platform}`

        if (!userDevices.has(userPlatformKey)) {
          userDevices.set(userPlatformKey, d)
        } else {
          const existing = userDevices.get(userPlatformKey)
          const existingTime = existing.lastActiveAt ? new Date(existing.lastActiveAt).getTime() : 0
          const currentTime = d.lastActiveAt ? new Date(d.lastActiveAt).getTime() : 0
          if (currentTime > existingTime) {
            userDevices.set(userPlatformKey, d)
          }
        }
      } else {
        guestTokens.add(cleanToken)
      }
    })

    const seenUsers = new Set()

    // Add exactly ONE device token per user per platform
    for (const [, dev] of userDevices.entries()) {
      tokenMap.set(dev.token.trim(), { name: 'Customer', userId: dev.userId, platform: dev.platform })
      seenUsers.add(String(dev.userId))
    }

    // 2. For users who only have token in UserModel and not in DeviceTokenModel
    users.forEach(u => {
      const uid = String(u._id)
      if (seenUsers.has(uid)) return // Already have their primary active device!

      let bestToken = null
      if (u.fcmToken && typeof u.fcmToken === 'string' && u.fcmToken.trim().length > 10) {
        bestToken = u.fcmToken.trim()
      } else if (Array.isArray(u.fcmTokens) && u.fcmTokens.length > 0) {
        const valid = u.fcmTokens.filter(t => typeof t === 'string' && t.trim().length > 10)
        if (valid.length > 0) bestToken = valid[valid.length - 1].trim()
      }

      if (bestToken && !tokenMap.has(bestToken)) {
        tokenMap.set(bestToken, { name: u.name || 'Customer', userId: uid })
        seenUsers.add(uid)
      }
    })

    // 3. Add guest / anonymous devices (skip if token is already registered to a user)
    for (const gToken of guestTokens) {
      if (!tokenMap.has(gToken)) {
        tokenMap.set(gToken, { name: 'Customer' })
      }
    }

    const uniqueTokens = Array.from(tokenMap.keys())
    if (uniqueTokens.length === 0) return { success: true, deliveredCount: 0, totalDevices: 0 }

    console.log(`📢 [Marketing Engine] Broadcasting "${title}" to ${uniqueTokens.length} active unique device(s)...`)

    const BATCH_SIZE = 50
    let successCount = 0
    const deadTokens = []
    const pushErrors = []

    for (let i = 0; i < uniqueTokens.length; i += BATCH_SIZE) {
      const batch = uniqueTokens.slice(i, i + BATCH_SIZE)
      const promises = batch.map(async (token) => {
        try {
          const res = await sendPushNotification({
            token,
            title,
            body: shayari ? `${shayari}\n\n${body}` : body,
            data: {
              type: type || 'PROMO_BROADCAST',
              title,
              body,
              url: '/'
            }
          })
          const isSuccess = Boolean(res && (res.success === true || typeof res === 'string' || (typeof res === 'object' && res.result)))
          if (isSuccess) {
            successCount++
          } else {
            if (res?.error) pushErrors.push(res.error)
            if (res?.isUnregistered) {
              deadTokens.push(token)
            }
          }
        } catch (err) {
          pushErrors.push(err.message)
        }
      })
      await Promise.allSettled(promises)
    }

    // Auto-clean dead tokens from database in background
    if (deadTokens.length > 0) {
      UserModel.updateMany(
        { fcmTokens: { $in: deadTokens } },
        { $pull: { fcmTokens: { $in: deadTokens } } }
      ).catch(() => {})
      UserModel.updateMany(
        { fcmToken: { $in: deadTokens } },
        { $set: { fcmToken: null } }
      ).catch(() => {})
    }

    // Save in-app notification records (for recent 50 active users)
    const inAppDocs = users.slice(0, 50).map(u => ({
      recipientId: String(u._id),
      recipientType: 'user',
      type: type || 'PROMO_BROADCAST',
      title,
      message: body,
      shayari: shayari || '',
      body,
      data: { promoTag },
      fcmToken: u.fcmToken || null,
      deliveredAt: new Date()
    }))

    await Notification.insertMany(inAppDocs, { ordered: false }).catch(() => {})
    console.log(`✅ [Marketing Engine] Broadcast complete: ${successCount} devices received "${title}".`)
    return { 
      success: true, 
      deliveredCount: successCount, 
      totalDevices: uniqueTokens.length,
      errors: pushErrors.slice(0, 5)
    }
  } catch (err) {
    console.error('❌ [Marketing Engine] Broadcast failed:', err.message)
    return { success: false, error: err.message }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. DAILY MORNING BREAKFAST & MILK CRON (08:30 AM IST)
// ─────────────────────────────────────────────────────────────────────────────
export const MORNING_TEMPLATES = [
  {
    title: '🥛 Nashta ready hai? Ya doodh khatam?',
    shayari: '"Chai ki patti ho ya Amul ka taaza doodh,\nSnapit pahunchega 10 min mein, banao mast mood!" ☕🍳',
    body: 'Fresh milk, bread, butter, eggs aur chai patti 10 minute mein aapke kitchen mein! ⚡'
  },
  {
    title: '🍳 Subah ki shuruat, taza nashte ke sath!',
    shayari: '"Subah ka suraj aaya, nayi umang laya,\nSnapit 10 minute mein garam nashta laya!" 🍞☕',
    body: 'Bread, dahi, biscuits aur breakfast essentials bas 9 minute mein delivered!'
  }
]

// ─────────────────────────────────────────────────────────────────────────────
// 2. EVENING CHAI & SNACK TIME (05:00 PM IST)
// ─────────────────────────────────────────────────────────────────────────────
export const EVENING_TEMPLATES = [
  {
    title: '☕ Sham ki chai bina Maggi & Biscuits ke adhoori hai!',
    shayari: '"Thandi thandi sham ho, haath mein garam pyali,\nSnapit se mangwa lo snacks, na rahe koi plate khali!" 🍪🥟',
    body: 'Maggi, Kurkure, chips, namkeen aur cold drinks manga lo sirf 9 minute mein! 🚀'
  },
  {
    title: '🥟 Chai Time Craving? 10 Min Mein Delivered!',
    shayari: '"Bhookh lagi hai choti wali? Ya chai ka hai plan?\nSnapit deliver karega fatfat, sit back and enjoy man!" ☕✨',
    body: 'Parle-G, Oreo, Lays, samosa snacks aur chai patti ready for 10-minute dispatch!'
  }
]

// ─────────────────────────────────────────────────────────────────────────────
// 3. DINNER RUSH & WEEKEND FEAST (08:30 PM IST)
// ─────────────────────────────────────────────────────────────────────────────
export const DINNER_TEMPLATES = [
  {
    title: '🍛 Garam Dinner Doorstep Pe! (RJ Garden, Alka & MGD Pizza)',
    shayari: 'Fresh Paneer Handi, Biryani, Crispy Pizza & Chowmein ready in 15 mins! 🛵💨',
    body: 'Tired after a long day? Get piping-hot dinner delivered from Paliganj’s best restaurants in minutes!\n\nUse Code: SNAPIT for instant discount. Order now!'
  },
  {
    title: '🍕 Aaj kitchen se chhutti lo boss!',
    shayari: '"Kyun banana roz khana, jab Snapit hai sath,\nPaliganj ke top khane se sajao apni thali aaj raat!" 🍛✨',
    body: 'Pizza, Biryani, Paneer Butter Masala ya Chowmein? Aaj ka dinner Snapit ke naam!'
  },
  {
    title: '🔥 Garma-Garam Dinner Treat — 20 Min Delivery!',
    shayari: '"Raat ka waqt suhana hai, kuch lazeez khana hai,\nSnapit se order karo, khushiyan ghar laana hai!" 🍕🍔',
    body: 'Order your favorite dinner tonight from Paliganj’s best restaurants on Snapit Food!'
  },
  {
    title: '🎂 Gaon Tak Fresh Cake & Alka ki Biryani!',
    shayari: '"Gaon mein ho ya shahar ke paar,\nSnapit layega garam Biryani aur Cake aapke dwar!" 🎂🍗🛵',
    body: 'Alka Restro ki Biryani aur Fresh Cake ab 6-14km gaon tak direct bike delivery! Use code: SNAPIT'
  }
]

// In-memory debounce to prevent spamming the same user within 2 hours
const userLastNudgeMap = new Map()

// ─────────────────────────────────────────────────────────────────────────────
// 4. ABANDONED CART AUTO-NUDGE (Runs every 10 minutes)
// ─────────────────────────────────────────────────────────────────────────────
export async function checkAbandonedCarts() {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    // Find all cart items added/updated in the last 24 hours
    const activeCarts = await CartProductModel.find({
      updatedAt: { $gte: twentyFourHoursAgo }
    }).populate('productId', 'name price').lean()

    if (activeCarts.length === 0) {
      console.log('ℹ️ [Abandoned Cart] No active cart items found in last 24h.')
      return { success: true, nudgedCount: 0 }
    }

    // Group cart items by userId
    const userCartMap = new Map()
    activeCarts.forEach(c => {
      if (!c.userId) return
      const uId = String(c.userId)
      if (!userCartMap.has(uId)) userCartMap.set(uId, [])
      userCartMap.get(uId).push(c)
    })

    let nudgedCount = 0
    const now = Date.now()

    for (const [uId, items] of userCartMap.entries()) {
      // 1. Debounce: Don't nudge the same user more than once every 2 hours
      const lastNudge = userLastNudgeMap.get(uId) || 0
      if (now - lastNudge < 2 * 60 * 60 * 1000) continue

      // 2. Check if user placed an order since the most recent cart update
      const latestCartTime = new Date(Math.max(...items.map(i => new Date(i.updatedAt || i.createdAt).getTime())))
      const recentOrder = await OrderModel.findOne({
        userId: uId,
        createdAt: { $gte: latestCartTime }
      }).lean()

      if (recentOrder) continue // User already placed order

      const user = await UserModel.findById(uId).select('name fcmToken fcmTokens').lean()
      if (!user) continue

      const targetToken = (user.fcmToken && typeof user.fcmToken === 'string' && user.fcmToken.trim().length > 10)
        ? user.fcmToken.trim()
        : (Array.isArray(user.fcmTokens) && user.fcmTokens.length > 0 ? user.fcmTokens[user.fcmTokens.length - 1] : null)

      if (!targetToken) continue

      const firstItemName = items[0]?.productId?.name || 'Aapke favorite items'
      const moreCount = items.length > 1 ? ` (+${items.length - 1} aur items)` : ''
      const cartTitle = '🛒 Aapka cart intezaar kar raha hai!'
      const cartBody = `"${firstItemName}${moreCount}" cart mein hain. 10 min express delivery on Snapit! ⚡`

      try {
        const res = await sendPushNotification({
          token: targetToken,
          title: cartTitle,
          body: cartBody,
          data: { type: 'ABANDONED_CART', url: '/cart' }
        })
        if (res) {
          userLastNudgeMap.set(uId, now)
          nudgedCount++
          console.log(`🛒 [Cart Nudge] Sent reminder to user: ${user.name || uId} (${firstItemName})`)
        }
      } catch (err) {
        console.warn(`[Cart Nudge] Push error for ${uId}:`, err.message)
      }
    }

    return { success: true, nudgedCount, totalActiveCarts: userCartMap.size }
  } catch (err) {
    console.error('❌ [checkAbandonedCarts] Error:', err.message)
    return { success: false, error: err.message }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER MANUAL CRON SCHEDULE ON DEMAND
// ─────────────────────────────────────────────────────────────────────────────
export async function triggerMarketingSchedule(type) {
  const windowSlot = Math.floor(Date.now() / 60000)
  const lockKey = `TRIGGER_${type}_${windowSlot}`
  const acquired = await acquireCronLock(lockKey)
  if (!acquired) {
    console.log(`🔒 [Marketing Engine] Schedule "${type}" was already triggered in the last minute. Skipping duplicate.`)
    return { success: true, message: `${type} already executed recently.` }
  }

  if (type === 'BREAKFAST') {
    const template = MORNING_TEMPLATES[Math.floor(Math.random() * MORNING_TEMPLATES.length)]
    return await broadcastToAllUsers({ ...template, type: 'BREAKFAST_PROMO', promoTag: 'MORNING_RUSH' })
  }
  if (type === 'CHAI_TIME') {
    const template = EVENING_TEMPLATES[Math.floor(Math.random() * EVENING_TEMPLATES.length)]
    return await broadcastToAllUsers({ ...template, type: 'CHAI_TIME_PROMO', promoTag: 'EVENING_SNACKS' })
  }
  if (type === 'DINNER') {
    const template = DINNER_TEMPLATES[Math.floor(Math.random() * DINNER_TEMPLATES.length)]
    return await broadcastToAllUsers({ ...template, type: 'DINNER_PROMO', promoTag: 'DINNER_RUSH' })
  }
  if (type === 'CART_NUDGE') {
    return await checkAbandonedCarts()
  }
  throw new Error(`Unknown schedule type: ${type}`)
}

export const initMarketingCron = () => {
  // Guarantee crons run EXCLUSIVELY on Railway Production
  const isRailway = Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY_PROJECT_ID ||
    process.env.RAILWAY_SERVICE_ID ||
    process.env.RAILWAY_STATIC_URL ||
    process.env.ENABLE_CRON === 'true'
  )

  const isBlocked = process.env.RENDER === 'true' || 
                    process.env.IS_FALLBACK_SERVER === 'true' || 
                    process.env.DISABLE_CRON === 'true' ||
                    process.env.RENDER_SERVICE_ID ||
                    process.env.RENDER_EXTERNAL_URL

  if (!isRailway || isBlocked) {
    console.log('🛑 [Marketing Cron] Non-Railway/Standby server detected. Marketing crons disabled. ONLY Railway Production can send notifications.')
    return
  }

  console.log('🚀 [Marketing Cron] Initializing Blinkit/Swiggy-style smart marketing schedules...')

  // 1. Morning Breakfast Rush (08:30 AM IST)
  cron.schedule('30 8 * * *', async () => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    const lockKey = `CRON_BREAKFAST_${today}`
    const acquired = await acquireCronLock(lockKey)
    if (!acquired) return

    console.log('⏰ [Cron] Triggering Morning Breakfast Rush Notification...')
    await triggerMarketingSchedule('BREAKFAST')
  }, { timezone: 'Asia/Kolkata' })

  // 2. Evening Chai & Snack Time (05:00 PM IST)
  cron.schedule('0 17 * * *', async () => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    const lockKey = `CRON_CHAI_TIME_${today}`
    const acquired = await acquireCronLock(lockKey)
    if (!acquired) return

    console.log('⏰ [Cron] Triggering Evening Chai Time Notification...')
    await triggerMarketingSchedule('CHAI_TIME')
  }, { timezone: 'Asia/Kolkata' })

  // 3. Dinner Rush (07:00 PM IST)
  cron.schedule('0 19 * * *', async () => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    const lockKey = `CRON_DINNER_${today}`
    const acquired = await acquireCronLock(lockKey)
    if (!acquired) return

    console.log('⏰ [Cron] Triggering Dinner Rush Notification (07:00 PM)...')
    await triggerMarketingSchedule('DINNER')
  }, { timezone: 'Asia/Kolkata' })

  // 4. Abandoned Cart Auto-Nudge (Every 10 mins)
  cron.schedule('*/10 * * * *', async () => {
    const tenMinSlot = Math.floor(Date.now() / (10 * 60 * 1000))
    const lockKey = `CRON_CART_NUDGE_${tenMinSlot}`
    const acquired = await acquireCronLock(lockKey)
    if (!acquired) return

    await checkAbandonedCarts()
  })

  console.log('✅ [Marketing Cron] Morning (8:30 AM), Chai Time (5:00 PM), Dinner (7:00 PM), and Cart Recovery (every 10m) active!')
}
