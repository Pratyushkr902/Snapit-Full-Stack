import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import mongoose from 'mongoose'
import AddressModel from '../models/address.model.js'

// Load .env from server directory
const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)
dotenv.config({ path: join(__dirname, '../.env') })

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const geocodeCity = async (city) => {
  try {
    await sleep(1100) // Nominatim rate limit: 1 req/sec
    const query = `${city}, Bihar, India`
    const url   = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=in`
    const res   = await fetch(url, {
      headers: { 'User-Agent': 'Snapit-Grocery-App/1.0' }
    })
    const data = await res.json()
    if (data?.[0]) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    }
    return null
  } catch (e) {
    console.error(`  ✗ Geocode failed for "${city}":`, e.message)
    return null
  }
}

const run = async () => {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('❌ MONGODB_URI not found in .env')
    process.exit(1)
  }

  await mongoose.connect(uri)
  console.log('✅ Connected to MongoDB\n')

  const addresses = await AddressModel.find({
    $or: [{ lat: null }, { lat: { $exists: false } }]
  })

  console.log(`📦 Found ${addresses.length} addresses without coords\n`)

  let updated = 0
  let failed  = 0

  for (const addr of addresses) {
    console.log(`🔍 Geocoding: ${addr.city} (${addr._id})`)
    const coords = await geocodeCity(addr.city)

    if (coords) {
      await AddressModel.updateOne(
        { _id: addr._id },
        { lat: coords.lat, lng: coords.lng }
      )
      console.log(`  ✓ Saved: ${coords.lat}, ${coords.lng}`)
      updated++
    } else {
      console.log(`  ✗ Could not geocode — skipping`)
      failed++
    }
  }

  console.log(`\n🎉 Done — ${updated} updated, ${failed} failed`)
  await mongoose.disconnect()
  process.exit(0)
}

run().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})