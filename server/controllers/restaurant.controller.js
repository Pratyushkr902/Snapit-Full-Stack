import RestaurantModel from '../models/restaurant.model.js'
import MenuItemModel from '../models/MenuItem.model.js'
import FestiveOfferModel from '../models/festiveOffer.model.js'
import NodeCache from 'node-cache'
import mongoose from 'mongoose'

const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 })

const escapeRegex = (str) => {
  if (typeof str !== 'string') return ''
  return str.trim().slice(0, 100).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
}

// ── GET /api/restaurant/all ────────────────────────────────────────────────────
export async function getAllRestaurants(req, res) {
  try {
    const { cuisine, search, isOpen } = req.query
    const safeSearch = typeof search === 'string' ? escapeRegex(search) : ''
    const safeCuisine = typeof cuisine === 'string' ? escapeRegex(cuisine) : ''

    const cacheKey = `all_${isOpen}_${safeCuisine}_${safeSearch}`
    const cached = cache.get(cacheKey)
    if (cached) return res.json(cached)

    const filter = { isActive: true }
    if (isOpen === 'true') filter.isOpen = true
    if (safeCuisine) filter.cuisineTypes = { $in: [new RegExp(safeCuisine, 'i')] }
    if (safeSearch) filter.name = { $regex: safeSearch, $options: 'i' }

    const restaurants = await RestaurantModel
      .find(filter)
      .sort({ isOpen: -1, rating: -1, createdAt: -1 })
      .lean()

    const response = { success: true, data: restaurants, message: 'Restaurants fetched successfully' }
    cache.set(cacheKey, response)
    return res.json(response)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, message: err.message })
  }
}

// ── GET /api/restaurant/:id ────────────────────────────────────────────────────
export async function getRestaurantById(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid restaurant ID' })
    }

    const cacheKey = `restaurant_${req.params.id}`
    const cached = cache.get(cacheKey)
    if (cached) return res.json(cached)

    const restaurant = await RestaurantModel.findById(req.params.id).lean()
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' })

    const items = await MenuItemModel
      .find({ restaurantId: req.params.id })
      .sort({ category: 1, sortOrder: 1, isBestseller: -1 })
      .lean()

    // Check if festive offer is live for this restaurant (Raksha Bandhan dynamic discount)
    const festiveOffer = await FestiveOfferModel.findOne().sort({ createdAt: -1 }).lean()
    const now = new Date()
    const isFestiveLive = festiveOffer && festiveOffer.isActive &&
      now >= new Date(festiveOffer.startsAt) && now < new Date(festiveOffer.endsAt) &&
      String(festiveOffer.restaurantId || '6a3963a7e0dd57acb747e405') === String(req.params.id)

    const processedItems = items.map(item => {
      const isPizzaOrSignature = item.category?.toLowerCase().includes('pizza') ||
        (Array.isArray(item.variants) && item.variants.length > 0)

      if (isFestiveLive && isPizzaOrSignature) {
        // Apply 10% Zero-Loss festive markup on MRP
        const basePrice = item.price
        const mrp = Math.round(basePrice / 0.90)
        const updatedVariants = (item.variants || []).map(v => {
          const vBase = v.price
          const vMrp = Math.round(vBase / 0.90)
          return {
            ...v,
            price: vBase,
            mrp: vMrp,
            discountedPrice: vBase,
          }
        })
        return {
          ...item,
          mrp,
          price: basePrice,
          discountedPrice: basePrice,
          variants: updatedVariants,
        }
      } else {
        // Normal days before Raksha Bandhan: plain base prices, no fake markup, no discount
        const updatedVariants = (item.variants || []).map(v => ({
          ...v,
          mrp: v.price,
          discountedPrice: 0,
        }))
        return {
          ...item,
          mrp: item.price,
          discountedPrice: 0,
          variants: updatedVariants,
        }
      }
    })

    const categoryMap = {}
    for (const item of processedItems) {
      if (!categoryMap[item.category]) categoryMap[item.category] = []
      categoryMap[item.category].push(item)
    }

    let categories = restaurant.menuCategories?.length
      ? restaurant.menuCategories.filter(c => categoryMap[c])
      : Object.keys(categoryMap)

    for (const cat of Object.keys(categoryMap)) {
      if (!categories.includes(cat)) categories.push(cat)
    }

    const menu = categories.map(cat => ({ category: cat, items: categoryMap[cat] || [] }))

    const response = { success: true, data: { restaurant, menu }, message: 'Restaurant details fetched' }
    cache.set(cacheKey, response)
    return res.json(response)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, message: err.message })
  }
}

// ── POST /api/restaurant/create ───────────────────────────────────────────────
export async function createRestaurant(req, res) {
  try {
    const restaurant = new RestaurantModel(req.body)
    await restaurant.save()
    cache.flushAll()
    return res.status(201).json({ success: true, data: restaurant, message: 'Restaurant created' })
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message })
  }
}

// ── PATCH /api/restaurant/update/:id ─────────────────────────────────────────
export async function updateRestaurant(req, res) {
  try {
    if (!await assertOwnership(req, res, req.params.id)) return

    const updated = await RestaurantModel.findByIdAndUpdate(
      req.params.id, req.body, { returnDocument: 'after', new: true, runValidators: true }
    )
    if (!updated) return res.status(404).json({ success: false, message: 'Restaurant not found' })
    cache.del(`restaurant_${req.params.id}`)
    cache.flushAll()
    return res.json({ success: true, data: updated, message: 'Restaurant updated' })
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message })
  }
}

// ── Helper: verify RESTO_SELLER owns this restaurant ─────────────────────────
async function assertOwnership(req, res, restaurantId) {
  if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
    res.status(400).json({ success: false, message: 'Invalid restaurant ID' })
    return false
  }

  if (req.userRole === 'ADMIN') return true

  if (req.userRole === 'RESTO_SELLER') {
    const resto = await RestaurantModel.findById(restaurantId).lean()
    if (!resto) {
      res.status(404).json({ success: false, message: 'Restaurant not found' })
      return false
    }
    if (String(resto.ownerId) !== String(req.userId)) {
      res.status(403).json({ success: false, message: 'Not your restaurant' })
      return false
    }
  }

  return true
}

// ── GET /api/restaurant/:id/menu ──────────────────────────────────────────────
export async function getMenuItems(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid restaurant ID' })
    }
    if (!await assertOwnership(req, res, req.params.id)) return

    const items = await MenuItemModel
      .find({ restaurantId: req.params.id })
      .sort({ category: 1, sortOrder: 1 })
      .lean()
    return res.json({ success: true, data: items })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// ── POST /api/restaurant/:id/menu ─────────────────────────────────────────────
export async function addMenuItem(req, res) {
  try {
    if (!await assertOwnership(req, res, req.params.id)) return

    const item = new MenuItemModel({ ...req.body, restaurantId: req.params.id })
    await item.save()

    await RestaurantModel.findByIdAndUpdate(req.params.id, {
      $addToSet: { menuCategories: item.category },
    })

    cache.del(`restaurant_${req.params.id}`)
    cache.flushAll()
    return res.status(201).json({ success: true, data: item, message: 'Menu item created' })
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message })
  }
}

// ── PUT /api/restaurant/menu/:itemId ──────────────────────────────────────────
export async function updateMenuItem(req, res) {
  try {
    if (req.userRole === 'RESTO_SELLER') {
      const existing = await MenuItemModel.findById(req.params.itemId).lean()
      if (!existing) return res.status(404).json({ success: false, message: 'Item not found' })
      if (!await assertOwnership(req, res, existing.restaurantId)) return
    }

    const item = await MenuItemModel.findByIdAndUpdate(
      req.params.itemId, req.body, { returnDocument: 'after', new: true, runValidators: true }
    )
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' })
    cache.del(`restaurant_${item.restaurantId}`)
    cache.flushAll()
    return res.json({ success: true, data: item, message: 'Menu item updated' })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// ── DELETE /api/restaurant/menu/:itemId ───────────────────────────────────────
export async function deleteMenuItem(req, res) {
  try {
    if (req.userRole === 'RESTO_SELLER') {
      const existing = await MenuItemModel.findById(req.params.itemId).lean()
      if (!existing) return res.status(404).json({ success: false, message: 'Item not found' })
      if (!await assertOwnership(req, res, existing.restaurantId)) return
    }

    const item = await MenuItemModel.findByIdAndDelete(req.params.itemId)
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' })
    cache.del(`restaurant_${item.restaurantId}`)
    cache.flushAll()
    return res.json({ success: true, message: 'Menu item deleted' })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// ── POST /api/restaurant/food-item/create  (old route alias) ─────────────────
export async function createFoodItem(req, res) {
  try {
    const { restaurant: restaurantId, menuCategory, ...rest } = req.body
    const item = new MenuItemModel({
      ...rest,
      category: rest.category || menuCategory,
      restaurantId,
    })
    await item.save()
    await RestaurantModel.findByIdAndUpdate(restaurantId, {
      $addToSet: { menuCategories: item.category },
    })
    cache.del(`restaurant_${restaurantId}`)
    cache.flushAll()
    return res.status(201).json({ success: true, data: item, message: 'Food item created' })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// ── PATCH /api/restaurant/food-item/update/:id  (old route alias) ────────────
export async function updateFoodItem(req, res) {
  try {
    const updated = await MenuItemModel.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (updated) {
      cache.del(`restaurant_${updated.restaurantId}`)
      cache.flushAll()
    }
    return res.json({ success: true, data: updated, message: 'Food item updated' })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// ── GET /api/restaurant/food-items/:restaurantId  (old route alias) ───────────
export async function getFoodItemsByRestaurant(req, res) {
  try {
    const items = await MenuItemModel
      .find({ restaurantId: req.params.restaurantId })
      .sort({ category: 1, sortOrder: 1 })
      .lean()
    return res.json({ success: true, data: items })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// ── POST /api/restaurant/dev/seed ─────────────────────────────────────────────
export async function seedDemoRestaurants(req, res) {
  try {
    const existing = await RestaurantModel.countDocuments()
    if (existing > 0) {
      return res.json({ success: true, message: 'Demo data already exists', count: existing })
    }
    const demos = [
      {
        name: 'Baba Dhaba',
        description: 'Authentic home-style Indian food',
        image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
        cuisineTypes: ['Indian', 'Thali', 'Dal-Rice'],
        rating: 4.6, totalRatings: 238,
        deliveryTimeMin: 25, deliveryTimeMax: 40, deliveryFee: 15, minOrderValue: 80,
        isPureVeg: true, tags: ['bestseller', 'pure-veg'],
        menuCategories: ['Thali', 'Roti & Rice', 'Snacks', 'Drinks'],
        offers: ['50% OFF up to ₹100 on first order', 'Free delivery above ₹199'],
        opensAt: '9:00 AM', address: { area: 'Main Market', city: 'Paliganj' }, isOpen: true,
      },
      {
        name: 'Momo Zone',
        description: 'Fresh momos & Chinese snacks',
        image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=800',
        cuisineTypes: ['Chinese', 'Momos', 'Fast Food'],
        rating: 4.4, totalRatings: 156,
        deliveryTimeMin: 20, deliveryTimeMax: 35, deliveryFee: 20, minOrderValue: 100,
        isPureVeg: false, tags: ['new', 'trending'],
        menuCategories: ['Momos', 'Noodles', 'Rolls', 'Drinks'],
        offers: ['20% OFF on orders above ₹149'],
        opensAt: '11:00 AM', address: { area: 'Station Road', city: 'Paliganj' }, isOpen: true,
      },
      {
        name: 'Burger Adda',
        description: 'Crispy burgers & loaded fries',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
        cuisineTypes: ['Fast Food', 'Burgers', 'Snacks'],
        rating: 4.3, totalRatings: 94,
        deliveryTimeMin: 20, deliveryTimeMax: 30, deliveryFee: 25, minOrderValue: 120,
        isPureVeg: false, tags: ['new'],
        menuCategories: ['Burgers', 'Fries & Sides', 'Drinks', 'Combos'],
        offers: ['Buy 2 Burgers get Fries FREE'],
        opensAt: '10:00 AM', address: { area: 'College Road', city: 'Paliganj' }, isOpen: true,
      },
    ]
    await RestaurantModel.insertMany(demos)
    cache.flushAll()
    return res.json({ success: true, message: 'Demo restaurants seeded', count: demos.length })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}