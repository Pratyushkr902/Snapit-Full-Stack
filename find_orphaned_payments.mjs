// find_orphaned_payments.mjs
//
// Cross-checks captured Razorpay payments against Order documents in Mongo.
// A "captured" payment with NO matching order means the customer was charged
// but verifyPaymentController's newOrder.save() failed afterward (e.g. the
// cartItems.image cast-error bug) — money taken, no order created.
//
// Usage:
//   node find_orphaned_payments.mjs [daysBack]
//   node find_orphaned_payments.mjs 14      (default: 14 days)

import dotenv from 'dotenv'
dotenv.config({ path: './server/.env' })

import Razorpay from 'razorpay'
import { MongoClient } from 'mongodb'

const RAZORPAY_KEY_ID     = String(process.env.RAZORPAY_KEY_ID || '').trim()
const RAZORPAY_KEY_SECRET = String(process.env.RAZORPAY_SECRET_KEY || '').trim()
const MONGODB_URI         = process.env.MONGODB_URI

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    console.error('Missing RAZORPAY_KEY_ID / RAZORPAY_SECRET_KEY in server/.env')
    process.exit(1)
}
if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI in server/.env')
    process.exit(1)
}

const daysBack = Number(process.argv[2]) || 14
const to = Math.floor(Date.now() / 1000)
const from = to - daysBack * 24 * 60 * 60

const razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET })

async function fetchAllCapturedPayments() {
    let all = []
    let skip = 0
    const count = 100
    while (true) {
        const res = await razorpay.payments.all({ from, to, count, skip })
        all.push(...res.items)
        if (res.items.length < count) break
        skip += count
    }
    return all.filter(p => p.status === 'captured')
}

async function main() {
    console.log(`Checking captured Razorpay payments from the last ${daysBack} day(s)...`)
    const captured = await fetchAllCapturedPayments()
    console.log(`Found ${captured.length} captured payments.\n`)

    const client = new MongoClient(MONGODB_URI)
    await client.connect()
    const db = client.db()
    const orders = db.collection('orders')

    const orphaned = []
    for (const p of captured) {
        const match = await orders.findOne({ paymentId: p.id })
        if (!match) orphaned.push(p)
    }

    if (orphaned.length === 0) {
        console.log('✅ No orphaned payments found — every captured payment has a matching order.')
    } else {
        console.log(`⚠️  ${orphaned.length} ORPHANED payment(s) — customer charged, no order exists:\n`)
        for (const p of orphaned) {
            console.log(
                `- payment_id=${p.id}` +
                ` amount=₹${(p.amount / 100).toFixed(2)}` +
                ` email=${p.email || 'n/a'}` +
                ` contact=${p.contact || 'n/a'}` +
                ` created=${new Date(p.created_at * 1000).toISOString()}` +
                ` notes=${JSON.stringify(p.notes || {})}`
            )
        }
        console.log('\nFor each of these, you likely need to either manually create the order or refund the payment via the Razorpay dashboard.')
    }

    await client.close()
}

main().catch(err => {
    console.error('Script failed:', err)
    process.exit(1)
})
