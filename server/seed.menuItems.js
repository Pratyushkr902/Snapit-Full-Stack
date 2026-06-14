/**
 * seed.menuItems.js
 *
 * Populates sample menu items for all 4 local restaurants.
 * Run once from your backend folder:
 *   node seed.menuItems.js
 *
 * Requires MONGO_URI in .env  (or edit the connection string below)
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import RestaurantModel from './models/Restaurant.model.js'
import MenuItemModel from './models/MenuItem.model.js'

dotenv.config()
await mongoose.connect('REDACTED_MONGO_URI')
console.log('✅ Connected to MongoDB')

// ── Helper ─────────────────────────────────────────────────────────────────────
function item(name, price, discountedPrice = 0, category, isVeg = true, opts = {}) {
  return { name, price, discountedPrice, category, isVeg, ...opts }
}

// ── Menu data per restaurant name ──────────────────────────────────────────────
const MENUS = {
  'Paliganj Resto': [
    // Starters
    item('Aloo Tikki', 60, 0, 'Starters', true, { isBestseller: true, description: 'Crispy potato patties with green chutney', calories: 180 }),
    item('Paneer Tikka', 160, 140, 'Starters', true, { isBestseller: true, isSpicy: true }),
    item('Veg Cutlet', 70, 0, 'Starters', true, { description: 'Mixed veg cutlets served with ketchup' }),
    item('Masala Papad', 30, 0, 'Starters', true),
    item('Soup of the Day', 80, 0, 'Starters', true),

    // Dal & Sabzi
    item('Dal Tadka', 120, 100, 'Dal & Sabzi', true, { isBestseller: true, description: 'Yellow lentils tempered with cumin & garlic' }),
    item('Dal Makhani', 150, 130, 'Dal & Sabzi', true, { description: 'Slow-cooked black lentils in buttery tomato gravy' }),
    item('Paneer Butter Masala', 180, 160, 'Dal & Sabzi', true, { isBestseller: true }),
    item('Aloo Gobi', 110, 0, 'Dal & Sabzi', true),
    item('Bhindi Masala', 120, 0, 'Dal & Sabzi', true),
    item('Mix Veg', 130, 110, 'Dal & Sabzi', true),
    item('Palak Paneer', 160, 140, 'Dal & Sabzi', true),
    item('Shahi Paneer', 190, 170, 'Dal & Sabzi', true),
    item('Chana Masala', 130, 0, 'Dal & Sabzi', true),
    item('Rajma', 120, 0, 'Dal & Sabzi', true, { isBestseller: true }),

    // Rice
    item('Plain Rice', 60, 0, 'Rice', true),
    item('Jeera Rice', 90, 0, 'Rice', true),
    item('Veg Pulao', 130, 110, 'Rice', true, { isBestseller: true }),
    item('Paneer Biryani', 180, 160, 'Rice', true),
    item('Curd Rice', 80, 0, 'Rice', true),

    // Breads
    item('Tandoori Roti', 20, 0, 'Breads', true),
    item('Butter Roti', 25, 0, 'Breads', true),
    item('Naan', 35, 0, 'Breads', true),
    item('Butter Naan', 45, 0, 'Breads', true),
    item('Garlic Naan', 55, 0, 'Breads', true, { isBestseller: true }),
    item('Paratha', 40, 0, 'Breads', true),

    // Thali
    item('Veg Thali (Mini)', 150, 130, 'Thali', true, { isBestseller: true, description: 'Dal + 2 sabzi + rice + roti + papad + sweet' }),
    item('Veg Thali (Full)', 220, 190, 'Thali', true, { description: 'Dal + 3 sabzi + rice + 3 roti + salad + papad + sweet' }),
    item('Special Thali', 280, 250, 'Thali', true, { isBestseller: true, description: 'Premium sabzis + paneer + rice + breads + dessert' }),

    // Sweets & Drinks
    item('Gulab Jamun (2 pcs)', 50, 0, 'Sweets & Drinks', true),
    item('Kheer', 70, 0, 'Sweets & Drinks', true),
    item('Raita', 50, 0, 'Sweets & Drinks', true),
    item('Lassi', 60, 0, 'Sweets & Drinks', true, { isBestseller: true }),
    item('Masala Chaas', 40, 0, 'Sweets & Drinks', true),
    item('Cold Drink (Pepsi/Sprite)', 40, 0, 'Sweets & Drinks', true),
    item('Water Bottle', 20, 0, 'Sweets & Drinks', true),
  ],

  'Pali Paradise': [
    // Kebabs & Starters
    item('Chicken Seekh Kebab (6 pcs)', 220, 199, 'Kebabs & Starters', false, { isBestseller: true, isSpicy: true }),
    item('Mutton Seekh Kebab (4 pcs)', 280, 260, 'Kebabs & Starters', false, { isSpicy: true }),
    item('Paneer Tikka', 180, 160, 'Kebabs & Starters', true, { isBestseller: true }),
    item('Chicken Tikka (6 pcs)', 250, 220, 'Kebabs & Starters', false),
    item('Fish Tikka (4 pcs)', 240, 220, 'Kebabs & Starters', false),
    item('Reshmi Kebab (4 pcs)', 260, 0, 'Kebabs & Starters', false, { isBestseller: true }),
    item('Veg Shammi Kebab (4 pcs)', 120, 100, 'Kebabs & Starters', true),
    item('Tandoori Chicken (half)', 299, 279, 'Kebabs & Starters', false, { isBestseller: true }),

    // Biryani
    item('Chicken Biryani (1 plate)', 220, 199, 'Biryani', false, { isBestseller: true, description: 'Aromatic basmati rice cooked with tender chicken' }),
    item('Chicken Biryani (2 plates)', 400, 370, 'Biryani', false),
    item('Mutton Biryani (1 plate)', 280, 260, 'Biryani', false, { isBestseller: true }),
    item('Veg Biryani (1 plate)', 160, 140, 'Biryani', true),
    item('Egg Biryani (1 plate)', 180, 160, 'Biryani', false),
    item('Raita (with biryani)', 40, 0, 'Biryani', true),

    // Mughlai Mains
    item('Chicken Butter Masala', 260, 240, 'Mughlai Mains', false, { isBestseller: true }),
    item('Chicken Korma', 270, 0, 'Mughlai Mains', false),
    item('Mutton Rogan Josh', 320, 290, 'Mughlai Mains', false, { isSpicy: true }),
    item('Chicken Kadhai', 250, 230, 'Mughlai Mains', false, { isSpicy: true }),
    item('Nihari', 310, 280, 'Mughlai Mains', false, { isBestseller: true }),
    item('Paneer Lababdar', 200, 180, 'Mughlai Mains', true),

    // Breads
    item('Tandoori Roti', 20, 0, 'Breads', true),
    item('Butter Naan', 45, 0, 'Breads', true),
    item('Garlic Naan', 55, 0, 'Breads', true, { isBestseller: true }),
    item('Roomali Roti', 35, 0, 'Breads', true),
    item('Lachha Paratha', 50, 0, 'Breads', true),

    // Rolls
    item('Chicken Kathi Roll', 140, 120, 'Rolls', false, { isBestseller: true }),
    item('Paneer Kathi Roll', 120, 100, 'Rolls', true),
    item('Egg Roll', 110, 0, 'Rolls', false),
    item('Mutton Roll', 160, 140, 'Rolls', false),

    // Drinks
    item('Rooh Afza Sharbat', 60, 0, 'Drinks', true),
    item('Lassi (Sweet)', 70, 0, 'Drinks', true, { isBestseller: true }),
    item('Shahi Tukda', 90, 80, 'Drinks', true),
    item('Cold Drink', 40, 0, 'Drinks', true),
  ],

  'Alka Restaurant': [
    // Starters
    item('Veg Manchurian (Dry)', 130, 110, 'Starters', true, { isBestseller: true }),
    item('Chicken 65', 200, 180, 'Starters', false, { isSpicy: true, isBestseller: true }),
    item('Chilli Paneer (Dry)', 160, 140, 'Starters', true),
    item('Chicken Lollipop (6 pcs)', 230, 210, 'Starters', false, { isSpicy: true }),
    item('Spring Roll (4 pcs)', 110, 0, 'Starters', true),
    item('French Fries', 90, 0, 'Starters', true),

    // Chinese
    item('Veg Fried Rice', 130, 110, 'Chinese', true, { isBestseller: true }),
    item('Chicken Fried Rice', 170, 150, 'Chinese', false, { isBestseller: true }),
    item('Egg Fried Rice', 150, 130, 'Chinese', false),
    item('Veg Noodles (Hakka)', 130, 0, 'Chinese', true),
    item('Chicken Noodles', 170, 150, 'Chinese', false),
    item('Veg Manchurian Gravy + Rice', 180, 160, 'Chinese', true, { isBestseller: true }),
    item('Chilli Chicken (Gravy)', 220, 200, 'Chinese', false, { isSpicy: true }),
    item('Schezwan Fried Rice', 160, 140, 'Chinese', true, { isSpicy: true }),

    // Indian Mains
    item('Dal Fry', 110, 0, 'Indian Mains', true),
    item('Chicken Curry', 230, 210, 'Indian Mains', false, { isSpicy: true }),
    item('Egg Curry', 150, 130, 'Indian Mains', false),
    item('Paneer Masala', 180, 160, 'Indian Mains', true, { isBestseller: true }),
    item('Aloo Curry', 100, 0, 'Indian Mains', true),
    item('Fish Curry', 240, 220, 'Indian Mains', false),

    // Fast Food
    item('Veg Burger', 80, 0, 'Fast Food', true),
    item('Chicken Burger', 120, 100, 'Fast Food', false, { isBestseller: true }),
    item('Veg Pizza (7")', 160, 140, 'Fast Food', true),
    item('Chicken Pizza (7")', 200, 180, 'Fast Food', false),
    item('Pav Bhaji', 100, 0, 'Fast Food', true, { isBestseller: true }),
    item('Samosa (2 pcs)', 30, 0, 'Fast Food', true),

    // Breads & Rice
    item('Roti', 20, 0, 'Breads & Rice', true),
    item('Paratha', 40, 0, 'Breads & Rice', true),
    item('Naan', 40, 0, 'Breads & Rice', true),
    item('Plain Rice', 60, 0, 'Breads & Rice', true),

    // Drinks
    item('Lassi', 60, 0, 'Drinks', true, { isBestseller: true }),
    item('Cold Drink', 40, 0, 'Drinks', true),
    item('Fresh Lime Soda', 50, 0, 'Drinks', true),
    item('Masala Chai', 20, 0, 'Drinks', true),
  ],

"Dom's Biryani": [
    // Signature Biryani
    item('Chicken Dum Biryani (1 plate)', 240, 220, 'Signature Biryani', false, { isBestseller: true, description: 'Slow-cooked dum biryani with saffron & whole spices' }),
    item('Chicken Dum Biryani (2 plates)', 440, 400, 'Signature Biryani', false, { isBestseller: true }),
    item('Mutton Dum Biryani (1 plate)', 310, 280, 'Signature Biryani', false, { isBestseller: true }),
    item('Mutton Dum Biryani (2 plates)', 580, 540, 'Signature Biryani', false),
    item('Veg Dum Biryani (1 plate)', 180, 160, 'Signature Biryani', true),
    item('Egg Dum Biryani (1 plate)', 200, 180, 'Signature Biryani', false),
    item('Prawn Biryani (1 plate)', 340, 310, 'Signature Biryani', false, { isNew: true }),
    item('Fish Biryani (1 plate)', 290, 260, 'Signature Biryani', false, { isNew: true }),
    item('Mixed Dum Biryani (1 plate)', 280, 260, 'Signature Biryani', false, { isBestseller: true }),

    // Half Plates
    item('Chicken Dum Biryani (half)', 130, 120, 'Half Plates', false, { isBestseller: true }),
    item('Mutton Dum Biryani (half)', 170, 155, 'Half Plates', false),
    item('Veg Dum Biryani (half)', 100, 90, 'Half Plates', true),

    // Sides
    item('Raita (Bowl)', 50, 0, 'Sides', true, { isBestseller: true }),
    item('Salan (Mirchi)', 60, 0, 'Sides', true, { isSpicy: true }),
    item('Boiled Egg (2 pcs)', 30, 0, 'Sides', false),
    item('Chicken Tikka (4 pcs)', 240, 220, 'Sides', false),
    item('Shorba (Soup)', 80, 0, 'Sides', false, { isBestseller: true }),
    item('Papad', 20, 0, 'Sides', true),
    item('Green Salad', 40, 0, 'Sides', true),
    item('Onion Slices + Lemon', 20, 0, 'Sides', true),

    // Kebabs
    item('Chicken Seekh Kebab (4 pcs)', 200, 180, 'Kebabs', false, { isBestseller: true }),
    item('Mutton Seekh Kebab (4 pcs)', 260, 240, 'Kebabs', false),
    item('Reshmi Kebab (4 pcs)', 240, 220, 'Kebabs', false, { isBestseller: true }),
    item('Tandoori Chicken (half)', 290, 270, 'Kebabs', false),

    // Drinks & Desserts
    item('Lassi (Sweet)', 70, 0, 'Drinks & Desserts', true, { isBestseller: true }),
    item('Phirni', 80, 0, 'Drinks & Desserts', true, { isBestseller: true }),
    item('Gulab Jamun (2 pcs)', 50, 0, 'Drinks & Desserts', true),
    item('Cold Drink', 40, 0, 'Drinks & Desserts', true),
    item('Mineral Water', 20, 0, 'Drinks & Desserts', true),
  ],
}

// ── Seed ───────────────────────────────────────────────────────────────────────
const restaurants = await RestaurantModel.find({ name: { $in: Object.keys(MENUS) } })

if (restaurants.length === 0) {
  console.log('⚠️  No matching restaurants found. Insert them first via /api/restaurant or your admin panel.')
  process.exit(0)
}

let totalInserted = 0

for (const restaurant of restaurants) {
  const menuData = MENUS[restaurant.name]
  if (!menuData) continue

  // Remove existing items so re-runs are idempotent
  await MenuItemModel.deleteMany({ restaurantId: restaurant._id })

  const docs = menuData.map((d, i) => ({
    ...d,
    restaurantId: restaurant._id,
    sortOrder: i,
  }))

  await MenuItemModel.insertMany(docs)

  // Update restaurant's menuCategories list
  const cats = [...new Set(menuData.map(d => d.category))]
  await RestaurantModel.findByIdAndUpdate(restaurant._id, { menuCategories: cats })

  console.log(`✅ ${restaurant.name}: ${docs.length} items across ${cats.length} categories`)
  totalInserted += docs.length
}

console.log(`\n🎉 Done! ${totalInserted} menu items seeded across ${restaurants.length} restaurants.`)
await mongoose.disconnect()
