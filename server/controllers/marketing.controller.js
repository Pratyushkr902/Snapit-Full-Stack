import { broadcastToAllUsers, triggerMarketingSchedule, MORNING_TEMPLATES, EVENING_TEMPLATES, DINNER_TEMPLATES } from '../utils/marketingCron.js'

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
      {
        category: 'Inactive Win-Back',
        title: '🥺 Humse koi galti ho gayi kya?',
        shayari: '"Kyun roothe ho humse, kyun nahi kiya order?\nSnapit laya hai discount, mita do saara border!" 🎁',
        body: 'Aapne kaafi dino se order nahi kiya! Yeh lijiye ₹30 cashback aapke wallet mein!'
      }
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
