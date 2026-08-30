import cron from 'node-cron'
import UserModel from '../models/user.model.js'
import CartProductModel from '../models/cartproduct.model.js'
import OrderModel from '../models/order.model.js'
import { Notification } from './notificationService.js'
import { sendPushNotification } from './firebaseNotify.js'

// Helper: Broadcast to all active unique devices in batches
export async function broadcastToAllUsers({ title, shayari, body, type, promoTag = 'DAILY_CRAVING' }) {
  try {
    const users = await UserModel.find({
      $or: [
        { fcmToken: { $exists: true, $ne: null, $ne: '' } },
        { 'fcmTokens.0': { $exists: true } }
      ]
    }).select('_id name fcmToken fcmTokens').lean()

    if (users.length === 0) return { success: true, count: 0 }

    const tokenMap = new Map()
    users.forEach(u => {
      const tokens = [
        ...(u.fcmToken ? [u.fcmToken] : []),
        ...(Array.isArray(u.fcmTokens) ? u.fcmTokens : [])
      ].filter(t => typeof t === 'string' && t.trim().length > 10)

      tokens.forEach(tok => {
        if (!tokenMap.has(tok)) tokenMap.set(tok, u)
      })
    })

    const uniqueTokens = Array.from(tokenMap.keys())
    console.log(`📢 [Marketing Engine] Broadcasting "${title}" to ${uniqueTokens.length} active device(s)...`)

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
    title: '🍕 Aaj kitchen se chhutti lo boss!',
    shayari: '"Kyun banana roz khana, jab Snapit hai sath,\nPaliganj ke top khane se sajao apni thali aaj raat!" 🍛✨',
    body: 'Pizza, Biryani, Paneer Butter Masala ya Chowmein? Aaj ka dinner Snapit ke naam!'
  },
  {
    title: '🔥 Garma-Garam Dinner Treat — 20 Min Delivery!',
    shayari: '"Raat ka waqt suhana hai, kuch lazeez khana hai,\nSnapit se order karo, khushiyan ghar laana hai!" 🍕🍔',
    body: 'Order your favorite dinner tonight from Paliganj’s best restaurants on Snapit Food!'
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

      const tokens = [
        ...(user.fcmToken ? [user.fcmToken] : []),
        ...(Array.isArray(user.fcmTokens) ? user.fcmTokens : [])
      ].filter(t => typeof t === 'string' && t.trim().length > 10)

      if (tokens.length === 0) continue

      const firstItemName = items[0]?.productId?.name || 'Aapke favorite items'
      const moreCount = items.length > 1 ? ` (+${items.length - 1} aur items)` : ''
      const cartTitle = '🛒 Aapka cart intezaar kar raha hai!'
      const cartBody = `"${firstItemName}${moreCount}" cart mein hain. 10 min express delivery on Snapit! ⚡`

      let userReceived = false
      for (const token of tokens) {
        try {
          const res = await sendPushNotification({
            token,
            title: cartTitle,
            body: cartBody,
            data: { type: 'ABANDONED_CART', url: '/cart' }
          })
          if (res) userReceived = true
        } catch {}
      }

      if (userReceived) {
        userLastNudgeMap.set(uId, now)
        nudgedCount++
        console.log(`🛒 [Cart Nudge] Sent reminder to user: ${user.name || uId} (${firstItemName})`)
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

// ─────────────────────────────────────────────────────────────────────────────
// MASTER INITIALIZER
// ─────────────────────────────────────────────────────────────────────────────
export const initMarketingCron = () => {
  console.log('🚀 [Marketing Cron] Initializing Blinkit/Swiggy-style smart marketing schedules...')

  // 1. Morning Breakfast Rush (08:30 AM IST)
  cron.schedule('30 8 * * *', async () => {
    console.log('⏰ [Cron] Triggering Morning Breakfast Rush Notification...')
    await triggerMarketingSchedule('BREAKFAST')
  }, { timezone: 'Asia/Kolkata' })

  // 2. Evening Chai & Snack Time (05:00 PM IST)
  cron.schedule('0 17 * * *', async () => {
    console.log('⏰ [Cron] Triggering Evening Chai Time Notification...')
    await triggerMarketingSchedule('CHAI_TIME')
  }, { timezone: 'Asia/Kolkata' })

  // 3. Dinner Rush (08:00 PM IST)
  cron.schedule('0 20 * * *', async () => {
    console.log('⏰ [Cron] Triggering Dinner Rush Notification (08:00 PM)...')
    await triggerMarketingSchedule('DINNER')
  }, { timezone: 'Asia/Kolkata' })

  // 4. Abandoned Cart Auto-Nudge (Every 10 mins)
  cron.schedule('*/10 * * * *', async () => {
    await checkAbandonedCarts()
  })

  console.log('✅ [Marketing Cron] Morning (8:30 AM), Chai Time (5:00 PM), Dinner (8:00 PM), and Cart Recovery (every 10m) active!')
}
