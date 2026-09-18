import { broadcastToAllUsers, triggerMarketingSchedule, MORNING_TEMPLATES, EVENING_TEMPLATES, DINNER_TEMPLATES, WINBACK_TEMPLATES } from '../utils/marketingCron.js'
import UserModel from '../models/user.model.js'
import CartProductModel from '../models/cartproduct.model.js'
import OrderModel from '../models/order.model.js'
import DeviceTokenModel from '../models/deviceToken.model.js'
import { sendPushNotification } from '../utils/firebaseNotify.js'

export const broadcastCampaignController = async (request, response) => {
  try {
    const { title, shayari, body, type = 'CUSTOM_PROMO', promoTag = 'ADMIN_CAMPAIGN' } = request.body

    if (!title || !body) {
      return response.status(400).json({
        message: 'Title and body are required for marketing broadcast.',
        error: true,
        success: false
      })
    }

    const result = await broadcastToAllUsers({ title, shayari, body, type, promoTag })

    return response.json({
      message: `Campaign broadcast dispatched successfully!`,
      error: false,
      success: true,
      data: result
    })
  } catch (error) {
    return response.status(500).json({
      message: error.message || error,
      error: true,
      success: false
    })
  }
}

export const triggerScheduleController = async (request, response) => {
  try {
    const { scheduleType } = request.body
    if (!scheduleType) {
      return response.status(400).json({
        message: 'scheduleType is required (e.g. BREAKFAST, CHAI_TIME, DINNER, CART_NUDGE)',
        error: true,
        success: false
      })
    }

    const result = await triggerMarketingSchedule(scheduleType)

    return response.json({
      message: `${scheduleType} schedule executed successfully!`,
      error: false,
      success: true,
      data: result
    })
  } catch (error) {
    return response.status(500).json({
      message: error.message || error,
      error: true,
      success: false
    })
  }
}

export const getCampaignTemplatesController = async (request, response) => {
  try {
    const templates = [
      {
        category: '🚀 Snapit is Back! (Grand Launch)',
        title: '🚀 We Are Back! Snapit 10-Min Delivery is LIVE! 🎉',
        shayari: '"Aapke intezaar ki ghadi hui khatam aaj,\nSnapit laut aaya hai lekar naya andaaz!" ⚡🛍️',
        body: 'Groceries, fresh milk, dairy, snacks aur resto cravings — ab sab deliver hoga bas 10 minute mein! Tap karke order karo abhi! 🛒✨'
      },
      {
        category: '🎁 Welcome Back (Special Offer)',
        title: '🎉 Snapit is Back with ₹50 OFF on Your Next Order! 🎁',
        shayari: '"Purani yaadein aur naya swaad,\nSnapit ke saath manao khushiyon ki raat!" 🍕🍦',
        body: 'Aapka favourite 10-minute grocery & food delivery partner wapas aa gaya hai. Cart banao aur pao best discounts!'
      },
      {
        category: '⚡ Snapit 2.0 Superfast',
        title: '⚡ Snapit 2.0 is LIVE: Faster, Smoother & Cheaper! 🚀',
        shayari: '"Raftaar wahi par andaaz naya,\nSnapit ne 10 min mein order pohchaya!" 🛵💨',
        body: 'Updated app ke sath groceries, chai-biscuit aur khana bas ek click mein aapke darwaze par!'
      },
      {
        category: '🏏 IND vs SL (Day 5)',
        title: '🏏 IND vs SL: Day 5 Match Thrill! 🇮🇳🔥',
        shayari: '"Jeet ka jashn ho ya har over ka thrill,\nSnapit se snacks manga lo, mood ho jayega chill!" 🏏🍿',
        body: 'Cold drinks, chips, samosa aur popcorn ready hain! TV ke samne se uthna mat — bas 9 minute mein delivered! 🥤🍕'
      },
      ...MORNING_TEMPLATES.map(t => ({ ...t, category: 'Morning Breakfast' })),
      ...EVENING_TEMPLATES.map(t => ({ ...t, category: 'Evening Chai Time' })),
      ...DINNER_TEMPLATES.map(t => ({ ...t, category: 'Dinner Rush' })),
      {
        category: 'Rainy Day Special',
        title: '🌧️ Bahar Baarish? Andar Garma-Garam Chai & Pakode!',
        shayari: '"Baarish ki bundein, chai ka maza,\nSnapit se mangwao, nahi milegi koi saza!" ☕🥟',
        body: 'Barish mein bahar mat niklo! Maggi, chai patti aur snacks 10 min mein deliver!'
      },
      {
        category: 'Match Day Fever',
        title: '🏏 Match Shuru Hone Wala Hai! Ready Ho?',
        shayari: '"Chakke pe chakka lagega jab match dekhenge,\nSnapit se snacks aayenge tabhi toh maze lenge!" 🏏🥤',
        body: 'Cold drinks, chips, popcorn aur ice cream manga lo 9 minute mein!'
      },
      ...WINBACK_TEMPLATES.map(t => ({ ...t, category: 'Inactive Win-Back' }))
    ]

    return response.json({
      message: 'Templates retrieved',
      error: false,
      success: true,
      data: templates
    })
  } catch (error) {
    return response.status(500).json({
      message: error.message || error,
      error: true,
      success: false
    })
  }
}

export const getAbandonedCartsController = async (request, response) => {
  try {
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const activeCarts = await CartProductModel.find({
      updatedAt: { $gte: sevenDaysAgo, $lte: fifteenMinsAgo }
    }).populate('productId', 'name price image unit').lean()

    if (!activeCarts || activeCarts.length === 0) {
      return response.json({
        message: 'No abandoned carts found in the selected time window.',
        error: false,
        success: true,
        data: []
      })
    }

    const userCartMap = new Map()
    activeCarts.forEach(c => {
      if (!c.userId) return
      const uId = String(c.userId)
      if (!userCartMap.has(uId)) userCartMap.set(uId, [])
      userCartMap.get(uId).push(c)
    })

    const abandonedList = []

    for (const [uId, items] of userCartMap.entries()) {
      const latestCartTime = new Date(Math.max(...items.map(i => new Date(i.updatedAt || i.createdAt).getTime())))

      // Check if user placed an order since the most recent cart update
      const recentOrder = await OrderModel.findOne({
        userId: uId,
        createdAt: { $gte: latestCartTime }
      }).lean()

      if (recentOrder) continue

      const user = await UserModel.findById(uId).select('name mobile email').lean()
      if (!user) continue

      const cartTotal = items.reduce((sum, i) => sum + ((Number(i.productId?.price) || 0) * (Number(i.quantity) || 1)), 0)
      const itemsSummary = items
        .filter(i => i.productId?.name)
        .map(i => `${i.productId.name} (x${i.quantity || 1})`)

      abandonedList.push({
        userId: uId,
        userName: user.name || 'Valued Customer',
        userMobile: user.mobile || '',
        userEmail: user.email || '',
        itemCount: items.length,
        itemsSummary,
        cartTotal,
        updatedAt: latestCartTime,
        minutesAgo: Math.round((Date.now() - latestCartTime.getTime()) / 60000)
      })
    }

    abandonedList.sort((a, b) => b.updatedAt - a.updatedAt)

    return response.json({
      message: 'Abandoned carts retrieved successfully',
      error: false,
      success: true,
      data: abandonedList
    })
  } catch (error) {
    return response.status(500).json({
      message: error.message || error,
      error: true,
      success: false
    })
  }
}

export const nudgeSingleCartController = async (request, response) => {
  try {
    const { userId } = request.body
    if (!userId) {
      return response.status(400).json({ message: 'userId is required', error: true, success: false })
    }

    const user = await UserModel.findById(userId).select('name fcmToken fcmTokens').lean()
    if (!user) {
      return response.status(404).json({ message: 'User not found', error: true, success: false })
    }

    let targetToken = (user.fcmToken && typeof user.fcmToken === 'string' && user.fcmToken.trim().length > 10)
      ? user.fcmToken.trim()
      : (Array.isArray(user.fcmTokens) && user.fcmTokens.length > 0 ? user.fcmTokens[user.fcmTokens.length - 1] : null)

    if (!targetToken) {
      const dev = await DeviceTokenModel.findOne({ userId, token: { $exists: true, $ne: '' } }).sort({ lastActiveAt: -1 }).lean()
      if (dev?.token) targetToken = dev.token.trim()
    }

    if (!targetToken) {
      return response.status(400).json({ message: 'No push token available for this customer. Please send via WhatsApp instead.', error: true, success: false })
    }

    const res = await sendPushNotification({
      token: targetToken,
      title: '🛒 Aapka Snapit Cart Intezaar Kar Raha Hai!',
      body: 'Aapke items cart mein hain. FREE Delivery on orders ₹149+ (within 5 km)! Abhi order complete karein ⚡🛵',
      data: { type: 'ABANDONED_CART', url: '/cart' }
    })

    return response.json({
      message: 'Push notification sent to customer!',
      error: false,
      success: true,
      data: res
    })
  } catch (error) {
    return response.status(500).json({
      message: error.message || error,
      error: true,
      success: false
    })
  }
}

