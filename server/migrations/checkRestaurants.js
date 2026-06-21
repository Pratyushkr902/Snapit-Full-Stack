import mongoose from 'mongoose'
import dotenv from 'dotenv'
import RestaurantModel from '../models/restaurant.model.js'
dotenv.config({ path: new URL('../.env', import.meta.url).pathname })

await mongoose.connect(process.env.MONGODB_URI)
const all = await RestaurantModel.find({}, 'name _id').lean()
const matches = all.filter(r => /alka|pali|paradise|dom/i.test(r.name))
console.log(JSON.stringify(matches, null, 2))
await mongoose.disconnect()
