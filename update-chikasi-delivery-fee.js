// scripts/update-chikasi-delivery-fee.js
// Run with: node scripts/update-chikasi-delivery-fee.js
// One-off: updates Chikasi's deliveryFee from 59 to 49

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import RestaurantModel from '../server/models/restaurant.model.js'

// Loads .env from the current working directory — run this script from the
// project root (same pattern as server/scripts/fixDeliveryFee.js)
dotenv.config()

async function main() {
    const uri = process.env.MONGODB_URI
    if (!uri) {
        console.error('❌ MONGODB_URI not found. Check server/.env')
        process.exit(1)
    }

    await mongoose.connect(uri)
    console.log('✅ Connected to MongoDB')

    // Find first to confirm the match before writing
    const match = await RestaurantModel.findOne({ name: /chikasi/i })

    if (!match) {
        console.log('❌ No restaurant found matching "chikasi". Check the name field manually.')
        await mongoose.disconnect()
        process.exit(1)
    }

    console.log(`Found: "${match.name}" — current deliveryFee: ${match.deliveryFee}`)

    match.deliveryFee = 49
    await match.save()

    console.log(`✅ Updated "${match.name}" deliveryFee to ₹49`)

    await mongoose.disconnect()
    process.exit(0)
}

main().catch(err => {
    console.error('❌ Script failed:', err)
    process.exit(1)
})