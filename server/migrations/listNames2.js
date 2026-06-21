import mongoose from 'mongoose'
import dotenv from 'dotenv'
import RestaurantModel from '../models/restaurant.model.js'
import MenuItemModel from '../models/MenuItem.model.js'
dotenv.config({ path: new URL('../.env', import.meta.url).pathname })

await mongoose.connect(process.env.MONGODB_URI)
const restaurants = await RestaurantModel.find({ name: { $in: ["Satish Chowmein Center", "Shree Ram Sweets"] } })
for (const r of restaurants) {
  const items = await MenuItemModel.find({ restaurantId: r._id }, 'name category price discountedPrice snapitMargin').sort('category name').lean()
  console.log(`\n=== ${r.name} (_id: ${r._id}) — ${items.length} items ===`)
  items.forEach(i => console.log(`  [${i.category}] ${i.name} — price:₹${i.price} discounted:₹${i.discountedPrice} margin:₹${i.snapitMargin}`))
}
await mongoose.disconnect()
