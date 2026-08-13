import mongoose from 'mongoose'
import dotenv from 'dotenv'
import ProductModel from '../models/product.model.js'

dotenv.config({ path: new URL('../.env', import.meta.url).pathname })

// ── Fixed reference IDs (confirmed against live DB) ─────────────────────────
const CATEGORY = {
  BabyCare:      '69b57091a8b9adccd30c61a4',
  PersonalCare:  '69b571f9a8b9adccd30c61c2',
}
const SUBCATEGORY = {
  BabyDiapers: '69b6cb82dadc7adc316f806a', // confirmed: same one Pampers uses
  BabyWipes:   '69b6cae0dadc7adc316f805e', // confirmed: older "Baby Wipes" (not "Wet Wipes")
  WhisperPad:  '69b6d0e7dadc7adc316f816e', // used for ALL sanitary pads incl. Stayfree/Sofy
}

// Both stores get their own inventory row, each stocked at 1000 (matches existing convention)
const STORE_INVENTORY = [
  { store_name: 'Pali Mega Mart', stock: 1000, isAvailable: true },
  { store_name: 'PharmaWellness', stock: 1000, isAvailable: true },
]

// helper: MRP/selling pair → { price, discount }. Single price → { price, discount: 0 }
const priced = (mrp, selling) => selling == null
  ? { price: mrp, discount: 0 }
  : { price: selling, discount: Math.round(((mrp - selling) / mrp) * 100) }

const products = [
  {
    name: 'Happy Sleep Pampers Diapers | 26 pcs',
    unit: '1 Pack (26 pcs)',
    category: [CATEGORY.BabyCare],
    subCategory: [SUBCATEGORY.BabyDiapers],
    ...priced(399),
  },
  {
    name: 'Doms Wowper Fresh Pants | Small | 38 pcs',
    unit: '1 Pack (38 pcs)',
    category: [CATEGORY.BabyCare],
    subCategory: [SUBCATEGORY.BabyDiapers],
    ...priced(375),
  },
  {
    name: 'Mommy Poko Pants | Large | 54 pcs',
    unit: '1 Pack (54 pcs)',
    category: [CATEGORY.BabyCare],
    subCategory: [SUBCATEGORY.BabyDiapers],
    ...priced(700, 560),
  },
  {
    name: 'Mommy Poko Pants | L | 14 pcs',
    unit: '1 Pack (14 pcs)',
    category: [CATEGORY.BabyCare],
    subCategory: [SUBCATEGORY.BabyDiapers],
    ...priced(210, 168),
  },
  {
    name: 'Doms Diapers | XL | 9 pcs',
    unit: '1 Pack (9 pcs)',
    category: [CATEGORY.BabyCare],
    subCategory: [SUBCATEGORY.BabyDiapers],
    ...priced(93, 74),
  },
  {
    name: 'Doms Wowper for Girls | NB/XS | 9 pcs',
    unit: '1 Pack (9 pcs)',
    category: [CATEGORY.BabyCare],
    subCategory: [SUBCATEGORY.BabyDiapers],
    ...priced(99, 79),
  },
  {
    name: 'Doms Wowper for Baby | M | 30 pcs',
    unit: '1 Pack (30 pcs)',
    category: [CATEGORY.BabyCare],
    subCategory: [SUBCATEGORY.BabyDiapers],
    ...priced(399, 319),
  },
  {
    name: 'Mamy Poko Wipes (Komal Care) | 72 pcs',
    unit: '1 Pack (72 pcs)',
    category: [CATEGORY.BabyCare],
    subCategory: [SUBCATEGORY.BabyWipes],
    ...priced(99),
  },
  {
    name: 'Doms Wowper Baby Wipes | 30 pcs',
    unit: '1 Pack (30 pcs)',
    category: [CATEGORY.BabyCare],
    subCategory: [SUBCATEGORY.BabyWipes],
    ...priced(80),
  },
  {
    name: 'Doms Wowper Baby Wipes | 72 pcs',
    unit: '1 Pack (72 pcs)',
    category: [CATEGORY.BabyCare],
    subCategory: [SUBCATEGORY.BabyWipes],
    ...priced(199),
  },
  {
    // ⚠️ ASSUMPTION: categorized as Baby Wipes based on the 72-pc count matching
    // other wipe SKUs. Himalaya's "Sisu" line is usually baby oil/soap, not wipes.
    // Confirm and re-categorize if this is wrong.
    name: 'Himalaya Sisu Anand | 72 pcs',
    unit: '1 Pack (72 pcs)',
    category: [CATEGORY.BabyCare],
    subCategory: [SUBCATEGORY.BabyWipes],
    ...priced(99),
  },
  {
    // Confirmed distinct from existing "Pampers All Round Protection" (₹399/34pcs) — smaller pack.
    name: 'Pampers Diapers | 8 pcs',
    unit: '1 Pack (8 pcs)',
    category: [CATEGORY.BabyCare],
    subCategory: [SUBCATEGORY.BabyDiapers],
    ...priced(105),
  },
  {
    // Confirmed distinct from existing "Stayfree Secure XL 6pcs" (₹48) — smaller pack, different price point.
    name: 'Stayfree Secure Sanitary Pads | 8 pcs',
    unit: '1 Pack (8 pcs)',
    category: [CATEGORY.PersonalCare],
    subCategory: [SUBCATEGORY.WhisperPad],
    ...priced(35),
  },
  {
    // Confirmed distinct from existing "Stayfree Secure XL 6pcs" (₹48) — bulk pack.
    name: 'Stayfree Secure Sanitary Pads | XL | 40 pcs',
    unit: '1 Pack (40 pcs)',
    category: [CATEGORY.PersonalCare],
    subCategory: [SUBCATEGORY.WhisperPad],
    ...priced(220, 176),
  },
  {
    // Confirmed distinct from existing "Sofy AntiBacteria XL 14pcs" (₹149) — different pack size/price.
    name: 'Sofy Pads | XL | 16 pcs',
    unit: '1 Pack (16 pcs)',
    category: [CATEGORY.PersonalCare],
    subCategory: [SUBCATEGORY.WhisperPad],
    ...priced(99, 79),
  },
]

async function main() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected to DB\n')

  let inserted = 0
  let skipped = 0

  for (const p of products) {
    const exists = await ProductModel.findOne({ name: p.name }).lean()
    if (exists) {
      console.log(`⏭  SKIP (already exists): ${p.name}`)
      skipped++
      continue
    }

    const doc = new ProductModel({
      name: p.name,
      image: [],
      category: p.category,
      subCategory: p.subCategory,
      unit: p.unit,
      store_inventory: STORE_INVENTORY,
      price: p.price,
      discount: p.discount,
      description: '',
      publish: false, // ⚠️ no images/description yet — flip to true once added via admin panel
    })

    await doc.save()
    console.log(`✅ INSERTED: ${p.name}  ₹${p.price}  disc:${p.discount}%  (total stock: ${doc.stock})`)
    inserted++
  }

  console.log(`\nDone. Inserted ${inserted}, skipped ${skipped} (already existed).`)
  await mongoose.disconnect()
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})