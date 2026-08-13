import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config({ path: new URL('../.env', import.meta.url).pathname })

const searchTerms = [
  'Pampers all round protection',
  'Pampers',
  'Happy sleep pampers',
  'Doms wowper fresh pants',
  'Stayfree',
  'Mommy poko pants',
  'Doms diapers',
  'Doms wowper',
  'Sofy pads',
  'Mamy poko wipes',
  'Doms wowper baby wipes',
  'Himalaya sisu anand',
]

async function main() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected to DB\n')

  const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }), 'products')

  for (const term of searchTerms) {
    const regex = new RegExp(term.split(' ').join('.*'), 'i')
    const matches = await Product.find({ name: regex }).select('name price discount stock').lean()

    console.log(`\n🔍 "${term}"`)
    if (matches.length === 0) {
      console.log('   ❌ NOT FOUND')
    } else {
      matches.forEach(m => {
        console.log(`   ✅ ${m.name}  ₹${m.price}  disc:${m.discount || 0}%  stock:${m.stock ?? 'n/a'}`)
      })
    }
  }

  await mongoose.disconnect()
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
