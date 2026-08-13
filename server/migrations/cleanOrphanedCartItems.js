// server/migrations/cleanOrphanedCartItems.js
//
// One-time migration: removes cartProduct documents whose productId no
// longer points to an existing product (e.g. the product was deleted
// after migration / catalog cleanup, leaving a dangling reference that
// causes ₹NaN totals and broken "ghost" cards in the cart UI).
//
// Effect:
//   Deletes any cartProduct doc where productId is null, OR where
//   productId does not match any document in the product collection.
//
// Run once:
//   node server/migrations/cleanOrphanedCartItems.js --dry-run   (preview only)
//   node server/migrations/cleanOrphanedCartItems.js             (actually delete)
//
// Safe to re-run? YES — re-running finds zero orphans once cleaned and is a no-op.

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import CartProductModel from '../models/cartproduct.model.js'
import ProductModel from '../models/product.model.js'

dotenv.config({ path: new URL('../.env', import.meta.url).pathname })

const DRY_RUN = process.argv.includes('--dry-run')

async function run() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected to MongoDB')

  const cartCollection = CartProductModel.collection
  const productCollection = ProductModel.collection

  console.log(`Cart collection:    ${cartCollection.collectionName}`)
  console.log(`Product collection: ${productCollection.collectionName}`)

  const cartItems = await cartCollection
    .find({}, { projection: { productId: 1, userId: 1, quantity: 1 } })
    .toArray()

  console.log(`\nTotal cart items found: ${cartItems.length}`)

  if (cartItems.length === 0) {
    console.log('Nothing to check. Exiting.')
    await mongoose.disconnect()
    return
  }

  const referencedIds = [
    ...new Set(
      cartItems
        .filter(item => item.productId)
        .map(item => item.productId.toString())
    )
  ]

  const existingProducts = await productCollection
    .find(
      { _id: { $in: referencedIds.map(id => new mongoose.Types.ObjectId(id)) } },
      { projection: { _id: 1 } }
    )
    .toArray()

  const existingIdSet = new Set(existingProducts.map(p => p._id.toString()))

  const orphans = cartItems.filter(item => {
    if (!item.productId) return true
    return !existingIdSet.has(item.productId.toString())
  })

  console.log(`Orphaned cart items found: ${orphans.length}`)

  if (orphans.length === 0) {
    console.log('✅ No orphaned cart items. Nothing to clean.')
    await mongoose.disconnect()
    return
  }

  console.log('\nOrphaned items:')
  for (const item of orphans) {
    console.log(
      `  cartItem._id=${item._id}  userId=${item.userId}  productId=${item.productId || 'null'}  qty=${item.quantity}`
    )
  }

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] Would delete ${orphans.length} orphaned cart item(s). No changes made.`)
    await mongoose.disconnect()
    return
  }

  const orphanIds = orphans.map(item => item._id)
  const result = await cartCollection.deleteMany({ _id: { $in: orphanIds } })

  if (result.deletedCount !== orphans.length) {
    console.warn(
      `⚠️  Expected to delete ${orphans.length} but deletedCount was ${result.deletedCount}. Verify manually.`
    )
  } else {
    console.log(`\n✅ Deleted ${result.deletedCount} orphaned cart item(s).`)
  }

  await mongoose.disconnect()
}

run().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
