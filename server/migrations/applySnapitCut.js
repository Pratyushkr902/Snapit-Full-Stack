// server/migrations/applySnapitCut.js
//
// One-time migration: adds a ₹10 Snapit platform cut to every menu item
// belonging to Alka Restaurant, Palace Paradise, and Dom's Biryani.
//
// Effect per item:
//   price          += 10   (MRP customer sees goes up by ₹10)
//   discountedPrice += 10  (if it was already set — keeps the same discount gap)
//   snapitMargin    = (existing snapitMargin || 0) + 10
//
// Restaurant payout (sellerPrice) is computed at order time as
// price - snapitMargin, so the restaurant still receives the same amount
// as before. The extra ₹10 the customer now pays goes entirely to Snapit.
//
// Run once:
//   node server/migrations/applySnapitCut.js
//
// Safe to re-run? NO — re-running will add another ₹10 each time.
// If you need to verify first, run with --dry-run to only print changes.

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import RestaurantModel from '../models/restaurant.model.js'
import MenuItemModel from '../models/MenuItem.model.js'
import NodeCache from 'node-cache'

const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 })

dotenv.config({ path: new URL('../.env', import.meta.url).pathname })

const TARGET_RESTAURANTS = ['Alka Restaurant', 'Pali Paradise', "Dom's Biryani"]
const SNAPIT_CUT = 10
const DRY_RUN = process.argv.includes('--dry-run')

async function run() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected to MongoDB')

  const restaurants = await RestaurantModel.find({ name: { $in: TARGET_RESTAURANTS } })
  if (!restaurants.length) {
    console.log('⚠️  No matching restaurants found. Checked for:', TARGET_RESTAURANTS)
    await mongoose.disconnect()
    return
  }

  console.log(`Found ${restaurants.length} restaurant(s):`, restaurants.map(r => r.name).join(', '))

  let totalUpdated = 0

  for (const restaurant of restaurants) {
    const items = await MenuItemModel.find({ restaurantId: restaurant._id })
    console.log(`\n— ${restaurant.name}: ${items.length} item(s)`)

    for (const menuItem of items) {
      const oldPrice = menuItem.price
      const oldDiscounted = menuItem.discountedPrice
      const oldMargin = menuItem.snapitMargin || 0

      const newPrice = oldPrice + SNAPIT_CUT
      const newDiscounted = oldDiscounted > 0 ? oldDiscounted + SNAPIT_CUT : oldDiscounted
      const newMargin = oldMargin + SNAPIT_CUT

      console.log(
        `  ${menuItem.name}: price ₹${oldPrice}→₹${newPrice}` +
        (oldDiscounted > 0 ? `, discountedPrice ₹${oldDiscounted}→₹${newDiscounted}` : '') +
        `, snapitMargin ₹${oldMargin}→₹${newMargin}`
      )

      if (!DRY_RUN) {
        menuItem.price = newPrice
        menuItem.discountedPrice = newDiscounted
        menuItem.snapitMargin = newMargin
        await menuItem.save()
      }
      totalUpdated++
    }
  }

  console.log(`\n${DRY_RUN ? '[DRY RUN] Would update' : '✅ Updated'} ${totalUpdated} menu item(s).`)
  await mongoose.disconnect()
}

run().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
