import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config({ path: new URL('../.env', import.meta.url).pathname })

async function main() {
  await mongoose.connect(process.env.MONGODB_URI)
  const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }), 'products')
  const Category = mongoose.model('Category', new mongoose.Schema({}, { strict: false }), 'categories')
  const SubCategory = mongoose.model('SubCategory', new mongoose.Schema({}, { strict: false }), 'subcategories')

  console.log('\n--- FULL EXISTING DOCS ---')
  const names = ['Pampers All Round Protection', 'Stayfree Secure Sanitary Pads', 'Stayfree Secure Nights XXL', 'Sofy AntiBacteria XL']
  for (const n of names) {
    const doc = await Product.findOne({ name: new RegExp(n, 'i') }).lean()
    console.log(JSON.stringify(doc, null, 2))
  }

  console.log('\n--- CATEGORIES matching baby/diaper/sanitary/hygiene ---')
  const cats = await Category.find({ name: /baby|diaper|sanitary|hygiene|personal.?care/i }).lean()
  console.log(cats.map(c => ({ _id: c._id, name: c.name })))

  console.log('\n--- SUBCATEGORIES matching same ---')
  const subs = await SubCategory.find({ name: /baby|diaper|sanitary|hygiene|pad|wipe/i }).lean()
  console.log(subs.map(s => ({ _id: s._id, name: s.name })))

  console.log('\n--- ALL STORE NAMES in use ---')
  const stores = await Product.distinct('store_inventory.store_name')
  console.log(stores)

  await mongoose.disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
