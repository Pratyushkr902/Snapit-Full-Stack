// server/migrations/findHalfFullPairs.js
//
// DRY RUN ONLY — reads menu items and prints proposed Half/Full pairings.
// Does NOT modify the database. Review this output before building the
// actual merge migration.
//
// Run:
//   node server/migrations/findHalfFullPairs.js

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import RestaurantModel from '../models/restaurant.model.js'
import MenuItemModel from '../models/MenuItem.model.js'

dotenv.config({ path: new URL('../.env', import.meta.url).pathname })

// Suffixes that mark an item as the "half" variant
const HALF_SUFFIX = /\s*\(\s*half\s*\)\s*$/i

// Suffixes that mark an item as the "full" variant (explicit)
const FULL_SUFFIXES = [
  /\s*\(\s*1\s*plate\s*\)\s*$/i,
  /\s*\(\s*full\s*\)\s*$/i,
  /\s*\(\s*full\s*plate\s*\)\s*$/i,
]

// Suffixes that should be left ALONE — not part of a half/full pair
// (e.g. "2 plates" is a separate family-pack product, not a "full" portion)
const SKIP_SUFFIXES = [
  /\(\s*2\s*plates?\s*\)/i,
  /\(\s*quarter\s*\)/i,
]

function classify(name) {
  if (SKIP_SUFFIXES.some(re => re.test(name))) {
    return { type: 'skip', base: name }
  }
  if (HALF_SUFFIX.test(name)) {
    return { type: 'half', base: name.replace(HALF_SUFFIX, '').trim() }
  }
  for (const re of FULL_SUFFIXES) {
    if (re.test(name)) {
      return { type: 'full-explicit', base: name.replace(re, '').trim() }
    }
  }
  return { type: 'full-implicit', base: name.trim() }
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected to MongoDB\n')

  const restaurants = await RestaurantModel.find({}, 'name _id').lean()

  for (const restaurant of restaurants) {
    const items = await MenuItemModel.find({ restaurantId: restaurant._id }).lean()
    if (!items.length) continue

    // group by category + base name
    const groups = new Map()
    const skipped = []

    for (const item of items) {
      const { type, base } = classify(item.name)
      if (type === 'skip') {
        skipped.push(item)
        continue
      }
      const key = `${item.category}::${base}`
      if (!groups.has(key)) groups.set(key, { base, category: item.category, half: null, full: null })
      const g = groups.get(key)
      if (type === 'half') g.half = item
      else g.full = item // full-explicit or full-implicit
    }

    const pairs = [...groups.values()].filter(g => g.half && g.full)
    const halfOnly = [...groups.values()].filter(g => g.half && !g.full)
    const fullOnly = [...groups.values()].filter(g => g.full && !g.half)

    if (!pairs.length && !halfOnly.length && !fullOnly.length) continue

    console.log(`\n════ ${restaurant.name} ════`)

    if (pairs.length) {
      console.log(`\n✅ MATCHED PAIRS (${pairs.length}) — would merge into one item with Half/Full size:`)
      pairs.forEach(p => {
        console.log(
          `  "${p.base}" [${p.category}]  →  Half ₹${p.half.discountedPrice || p.half.price} / Full ₹${p.full.discountedPrice || p.full.price}`
        )
      })
    }

    if (halfOnly.length) {
      console.log(`\n⚠️  HALF ONLY, no matching full found (${halfOnly.length}) — left untouched:`)
      halfOnly.forEach(p => console.log(`  "${p.half.name}" [${p.category}] ₹${p.half.discountedPrice || p.half.price}`))
    }

    if (fullOnly.length === items.length - pairs.length * 2 - halfOnly.length) {
      // (most items are just normal single-price items — don't spam the log with all of them)
    }
  }

  console.log('\n\nDone. No changes were made (dry run).')
  await mongoose.disconnect()
}

run().catch(err => {
  console.error('Failed:', err)
  process.exit(1)
})