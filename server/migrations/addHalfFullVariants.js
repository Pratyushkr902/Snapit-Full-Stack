// server/migrations/addHalfFullVariants.js
//
// Adds Half/Full menu item variants as SEPARATE listings (no size-picker UI
// exists yet, so this matches how Shree Ram Sweets already works).
//
// 1. Satish Chowmein Center — exact table values (no formula)
// 2. Pali Paradise         — category "Non Veg Main Course", Half = round(Full/2, nearest ₹5)
// 3. Dom's Biryani         — categories "Mutton Biryani", "Non Veg Biryani", "Veg Biryani", same formula
// 4. Alka Restaurant       — categories "Biryani", "Non-Veg Main Course", "Veg Main Course",
//                            "Non-Veg Starter", "Veg Starter", same formula
//
// For each matched item:
//   - Renames the existing item to "<name> (Full)" (skipped if already suffixed)
//   - Creates a new sibling item "<name> (Half)" at the Half price
//   - Snapit margin on the new Half item matches the original item's margin (flat ₹, not scaled)
//
// Safe to re-run: items already ending in "(Full)" or "(Half)" are skipped.
//
// Run:
//   node server/migrations/addHalfFullVariants.js --dry-run
//   node server/migrations/addHalfFullVariants.js

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import RestaurantModel from '../models/restaurant.model.js'
import MenuItemModel from '../models/MenuItem.model.js'

dotenv.config({ path: new URL('../.env', import.meta.url).pathname })

const DRY_RUN = process.argv.includes('--dry-run')

const round5 = (n) => Math.round(n / 5) * 5

// ── 1. Satish Chowmein Center — exact table ──────────────────────────────────
const SATISH_TABLE = [
  { name: 'Chowmin',                 full: 60,  half: 30 },
  { name: 'Chowmin Fry Manchurian',  full: 100, half: 60 },
  { name: 'Mix Chowmin',             full: 160, half: 80 },
  { name: 'Fry Chowmin',             full: 80,  half: 50 },
  { name: 'Paneer Chowmin',          full: 130, half: 80 },
  { name: 'Egg Chowmin',             full: 100, half: 50 },
  { name: 'Chicken Chowmin',         full: 140, half: 80 },
  { name: 'Manchurian',              full: 80,  half: 40 },
  { name: 'Fry Manchurian',          full: 130, half: 50 },
  { name: 'Paneer Chilli',           full: 160, half: 80 },
  { name: 'Chicken Chilli',          full: 80,  half: 40 },
  { name: 'Chicken Bone Fry',        full: 120, half: 70 },
  { name: 'Chicken Boneless',        full: 140, half: 80 },
]

// ── 2/3/4. Formula-based restaurants ─────────────────────────────────────────
const FORMULA_RESTAURANTS = {
  'Pali Paradise': ['Non Veg Main Course'],
  "Dom's Biryani": ['Mutton Biryani', 'Non Veg Biryani', 'Veg Biryani'],
  'Alka Restaurant': ['Biryani', 'Non-Veg Main Course', 'Veg Main Course', 'Non-Veg Starter', 'Veg Starter'],
}

const isAlreadySuffixed = (name) => /\((Full|Half)\)\s*$/i.test(name)

async function processSatish() {
  const restaurant = await RestaurantModel.findOne({ name: 'Satish Chowmein Center' })
  if (!restaurant) { console.log('⚠️  Satish Chowmein Center not found'); return }

  console.log(`\n════ Satish Chowmein Center ════`)
  for (const row of SATISH_TABLE) {
    const fullItem = await MenuItemModel.findOne({ restaurantId: restaurant._id, name: row.name })
    if (!fullItem) { console.log(`  ⚠️  "${row.name}" not found, skipping`); continue }
    if (isAlreadySuffixed(fullItem.name)) { console.log(`  ⏭  "${fullItem.name}" already processed, skipping`); continue }

    const halfExists = await MenuItemModel.findOne({ restaurantId: restaurant._id, name: `${row.name} (Half)` })
    if (halfExists) { console.log(`  ⏭  "${row.name} (Half)" already exists, skipping`); continue }

    console.log(`  "${row.name}" → "${row.name} (Full)" ₹${row.full}  +  new "${row.name} (Half)" ₹${row.half}`)

    if (!DRY_RUN) {
      fullItem.name = `${row.name} (Full)`
      fullItem.price = row.full
      await fullItem.save()

      await MenuItemModel.create({
        restaurantId: restaurant._id,
        name: `${row.name} (Half)`,
        description: fullItem.description,
        image: fullItem.image,
        category: fullItem.category,
        price: row.half,
        discountedPrice: 0,
        snapitMargin: fullItem.snapitMargin || 0,
        isVeg: fullItem.isVeg,
        isSpicy: fullItem.isSpicy,
        isAvailable: fullItem.isAvailable,
      })
    }
  }
}

async function processFormulaRestaurant(name, categories) {
  const restaurant = await RestaurantModel.findOne({ name })
  if (!restaurant) { console.log(`⚠️  ${name} not found`); return }

  console.log(`\n════ ${name} ════`)
  const items = await MenuItemModel.find({ restaurantId: restaurant._id, category: { $in: categories } })

  for (const item of items) {
    if (isAlreadySuffixed(item.name)) { console.log(`  ⏭  "${item.name}" already processed, skipping`); continue }

    const halfExists = await MenuItemModel.findOne({ restaurantId: restaurant._id, name: `${item.name} (Half)` })
    if (halfExists) { console.log(`  ⏭  "${item.name} (Half)" already exists, skipping`); continue }

    const effectivePrice = item.discountedPrice > 0 ? item.discountedPrice : item.price
    const halfPrice = round5(effectivePrice / 2)

    console.log(`  [${item.category}] "${item.name}" (₹${effectivePrice}) → "${item.name} (Full)"  +  new "${item.name} (Half)" ₹${halfPrice}`)

    if (!DRY_RUN) {
      item.name = `${item.name} (Full)`
      await item.save()

      await MenuItemModel.create({
        restaurantId: restaurant._id,
        name: `${item.name.replace(/\s*\(Full\)\s*$/, '')} (Half)`,
        description: item.description,
        image: item.image,
        category: item.category,
        price: halfPrice,
        discountedPrice: 0,
        snapitMargin: item.snapitMargin || 0,
        isVeg: item.isVeg,
        isSpicy: item.isSpicy,
        isAvailable: item.isAvailable,
      })
    }
  }
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log(`Connected to MongoDB ${DRY_RUN ? '(DRY RUN — no changes will be saved)' : ''}\n`)

  await processSatish()
  for (const [name, categories] of Object.entries(FORMULA_RESTAURANTS)) {
    await processFormulaRestaurant(name, categories)
  }

  console.log(`\n\n${DRY_RUN ? 'Dry run complete. No changes made.' : '✅ Migration complete.'}`)
  await mongoose.disconnect()
}

run().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})