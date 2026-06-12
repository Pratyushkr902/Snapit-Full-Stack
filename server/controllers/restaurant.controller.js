import RestaurantModel from '../models/restaurant.model.js'
import FoodItemModel from '../models/foodItem.model.js'
import MenuItemModel from '../models/MenuItem.model.js'

// ─── GET ALL ACTIVE RESTAURANTS ───────────────────────────────────────────────
export async function getAllRestaurants(req, res) {
  try {
    const { cuisine, search, isOpen } = req.query

    const filter = { isActive: true }
    if (isOpen === 'true') filter.isOpen = true
    if (cuisine) filter.cuisineTypes = { $in: [new RegExp(cuisine, 'i')] }
    if (search) filter.name = { $regex: search, $options: 'i' }

    const restaurants = await RestaurantModel.find(filter).sort({
      rating: -1,
      createdAt: -1,
    })

    return res.json({
      success: true,
      data: restaurants,
      message: 'Restaurants fetched successfully',
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// ─── GET SINGLE RESTAURANT WITH MENU ─────────────────────────────────────────
export async function getRestaurantById(req, res) {
  try {
    const { id } = req.params
    const restaurant = await RestaurantModel.findById(id)
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' })
    }

    // Fetch all available menu items grouped by category
    const items = await MenuItemModel.find({
      restaurantId: id,
      isAvailable: true,
    }).sort({ category: 1, sortOrder: 1, isBestseller: -1 })

    // Group by menuCategory
    const menuMap = {}
    for (const item of items) {
      if (!menuMap[item.category]) menuMap[item.menuCategory] = []
      menuMap[item.menuCategory].push(item)
    }

    const menu = Object.entries(menuMap).map(([category, items]) => ({
      category,
      items,
    }))

    return res.json({
      success: true,
      data: { restaurant, menu },
      message: 'Restaurant details fetched',
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// ─── CREATE RESTAURANT (Admin only) ───────────────────────────────────────────
export async function createRestaurant(req, res) {
  try {
    const data = req.body
    const restaurant = new RestaurantModel(data)
    await restaurant.save()
    return res.status(201).json({
      success: true,
      data: restaurant,
      message: 'Restaurant created',
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// ─── UPDATE RESTAURANT ─────────────────────────────────────────────────────────
export async function updateRestaurant(req, res) {
  try {
    const { id } = req.params
    const updated = await RestaurantModel.findByIdAndUpdate(id, req.body, { new: true })
    return res.json({ success: true, data: updated, message: 'Restaurant updated' })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// ─── CREATE FOOD ITEM ─────────────────────────────────────────────────────────
export async function createFoodItem(req, res) {
  try {
    const item = new FoodItemModel(req.body)
    await item.save()

    // Add menuCategory to restaurant's list if not there
    await RestaurantModel.findByIdAndUpdate(req.body.restaurant, {
      $addToSet: { menuCategories: req.body.menuCategory },
    })

    return res.status(201).json({
      success: true,
      data: item,
      message: 'Food item created',
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// ─── UPDATE FOOD ITEM ─────────────────────────────────────────────────────────
export async function updateFoodItem(req, res) {
  try {
    const { id } = req.params
    const updated = await FoodItemModel.findByIdAndUpdate(id, req.body, { new: true })
    return res.json({ success: true, data: updated, message: 'Food item updated' })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// ─── GET ITEMS BY RESTAURANT (for admin / restaurant owner) ──────────────────
export async function getFoodItemsByRestaurant(req, res) {
  try {
    const { restaurantId } = req.params
    const items = await FoodItemModel.find({ restaurant: restaurantId }).sort({
      menuCategory: 1,
      sortOrder: 1,
    })
    return res.json({ success: true, data: items })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// ─── SEED DEMO DATA (dev helper) ──────────────────────────────────────────────
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
        rating: 4.6,
        totalRatings: 238,
        deliveryTimeMin: 25,
        deliveryTimeMax: 40,
        deliveryFee: 15,
        minOrderValue: 80,
        isPureVeg: true,
        tags: ['bestseller', 'pure-veg'],
        menuCategories: ['Thali', 'Roti & Rice', 'Snacks', 'Drinks'],
        address: { area: 'Main Market', city: 'Paliganj' },
        isOpen: true,
      },
      {
        name: 'Momo Zone',
        description: 'Fresh momos & Chinese snacks',
        image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=800',
        cuisineTypes: ['Chinese', 'Momos', 'Fast Food'],
        rating: 4.4,
        totalRatings: 156,
        deliveryTimeMin: 20,
        deliveryTimeMax: 35,
        deliveryFee: 20,
        minOrderValue: 100,
        isPureVeg: false,
        tags: ['new', 'trending'],
        menuCategories: ['Momos', 'Noodles', 'Rolls', 'Drinks'],
        address: { area: 'Station Road', city: 'Paliganj' },
        isOpen: true,
      },
      {
        name: 'Burger Adda',
        description: 'Crispy burgers & loaded fries',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
        cuisineTypes: ['Fast Food', 'Burgers', 'Snacks'],
        rating: 4.3,
        totalRatings: 94,
        deliveryTimeMin: 20,
        deliveryTimeMax: 30,
        deliveryFee: 25,
        minOrderValue: 120,
        isPureVeg: false,
        tags: ['new'],
        menuCategories: ['Burgers', 'Fries & Sides', 'Drinks', 'Combos'],
        address: { area: 'College Road', city: 'Paliganj' },
        isOpen: true,
      },
    ]

    await RestaurantModel.insertMany(demos)
    return res.json({ success: true, message: 'Demo restaurants seeded', count: demos.length })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}