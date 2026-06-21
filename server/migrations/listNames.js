import mongoose from 'mongoose'
import dotenv from 'dotenv'
import RestaurantModel from '../models/restaurant.model.js'
import MenuItemModel from '../models/MenuItem.model.js'
import NodeCache from 'node-cache'

const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 })
dotenv.config({ path: new URL('../.env', import.meta.url).pathname })

await mongoose.connect(process.env.MONGODB_URI)
const restaurants = await RestaurantModel.find({ name: { $in: ["Dom's Biryani", "Alka Restaurant", "Pali Paradise"] } })
for (const r of restaurants) {
  const items = await MenuItemModel.find({ restaurantId: r._id }, 'name category price discountedPrice').sort('category name').lean()
  console.log(`\n=== ${r.name} (${items.length} items) ===`)
  items.forEach(i => console.log(`  [${i.category}] ${i.name} — ₹${i.discountedPrice || i.price}`))
}
await mongoose.disconnect()
