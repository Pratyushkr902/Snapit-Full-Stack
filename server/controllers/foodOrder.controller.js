import OrderModel from '../models/order.model.js'
import UserModel  from '../models/user.model.js'
import MenuItemModel from '../models/MenuItem.model.js'
import Razorpay   from 'razorpay'
import crypto     from 'crypto'
import { calcDeliveryFeeFromOrigin, getMinOrderAmountFromOrigin } from '../utils/deliveryFee.js'
import RestaurantModel from '../models/restaurant.model.js'
import { assertStoreOpenForOrder } from '../utils/storeStatus.js'

const getRazorpay = () => new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET_KEY,
})

const genOrderId = () =>
  'FOOD-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase()

// ── Build cart items, trusting the DATABASE for price/margin, not the client ──
// Looks up each MenuItem by its real _id so a tampered client payload can't
// change what the customer is charged or what the restaurant gets paid.
// Falls back to the client-submitted price only if the menu item can't be
// found (e.g. deleted after being added to cart), so an order doesn't hard-fail.
const buildCartItems = async (items) => {
  const ids = (items || []).map(i => i.menuItemId).filter(Boolean)
  const dbItems = await MenuItemModel.find({ _id: { $in: ids } })
  const dbById = new Map(dbItems.map(d => [String(d._id), d]))

  return (items || []).map(i => {
    const db = dbById.get(String(i.menuItemId))

    if (!db) {
      console.warn(`[buildCartItems] ⚠️ menuItemId=${i.menuItemId} not found in DB, falling back to client price`)
      return {
        productId:         i.menuItemId,
        name:              i.name,
        image:             i.image || '',
        price:             Number(i.price),
        sellerPrice:       Number(i.price),
        snapitMargin:      0,
        quantity:          Number(i.quantity),
        seller_store_name: null,
      }
    }

    // Effective customer-facing price: discountedPrice if set, else MRP price.
    const effectivePrice = db.discountedPrice > 0 ? db.discountedPrice : db.price
    const margin         = Number(db.snapitMargin || 0)
    const sellerPrice     = effectivePrice - margin

    return {
      productId:         db._id,
      name:              db.name,
      image:             db.image || i.image || '',
      price:             effectivePrice,
      sellerPrice,
      snapitMargin:      margin,
      quantity:          Number(i.quantity),
      seller_store_name: null,
    }
  })
}

// ── Validate & extract common fields from request body ──────────────────────
const extractBody = (body) => {
  const {
    restaurantId,
    restaurantName,
    addressId,
    items,
    subTotalAmt,
    delivery_fee,
    totalAmt,
    deliveryLocation,
    tip                  = 0,
    offerKey             = null,   // ✅ now extracted
    couponCode           = null,
    couponDiscount       = 0,      // ✅ also extract coupon discount amount
    walletAmountUsed     = 0,
    deliveryInstructions = null,
    scheduledDelivery    = null,
  } = body

  return {
    restaurantId,
    restaurantName,
    addressId,
    items,
    subTotalAmt:          Number(subTotalAmt    || 0),
    delivery_fee:         Number(delivery_fee   || 0),
    totalAmt:             Number(totalAmt       || 0),
    deliveryLocation,
    tip:                  Math.max(0, Number(tip || 0)),
    offerKey:             offerKey || null,
    couponCode:           couponCode || null,
    couponDiscount:       Math.max(0, Number(couponDiscount || 0)),
    walletAmountUsed:     Math.max(0, Number(walletAmountUsed || 0)),
    deliveryInstructions: deliveryInstructions || null,
    scheduledDelivery:    scheduledDelivery    || null,
  }
}

// ── Recompute delivery_fee & totalAmt server-side; client values are never trusted ──
const applyServerPricing = async (fields, user) => {
  const { lat, lng } = fields.deliveryLocation || {}

  const restaurant = await RestaurantModel.findById(fields.restaurantId).select('location name')
  if (!restaurant?.location?.lat || !restaurant?.location?.lng) {
    console.warn(`PRICE_TAMPER | food-order | restaurant=${fields.restaurantId} missing location, cannot verify delivery fee server-side`)
    // Fail safe: reject rather than silently trust the client-sent fee
    const err = new Error('Restaurant delivery info unavailable. Please try again shortly.')
    err.statusCode = 400
    throw err
  }

  const serverDeliveryFee = calcDeliveryFeeFromOrigin(
    restaurant.location.lat, restaurant.location.lng, lat, lng
  )

  const isPlusForMinOrder = Boolean(
    user?.isSnapitPlusMember && user?.snapitPlusExpiresAt &&
    new Date() < new Date(user.snapitPlusExpiresAt)
  )
  const minOrderRequired = getMinOrderAmountFromOrigin(lat, lng, isPlusForMinOrder)
  if (minOrderRequired > 0 && fields.subTotalAmt < minOrderRequired) {
    const err = new Error(`Minimum order of ₹${minOrderRequired} required for this location.`)
    err.statusCode = 400
    throw err
  }

  const serverTotal = fields.subTotalAmt + serverDeliveryFee
    + fields.tip - fields.couponDiscount - fields.walletAmountUsed

  if (Math.abs(fields.delivery_fee - serverDeliveryFee) > 1 ||
      Math.abs(fields.totalAmt - serverTotal) > 1) {
    console.warn(
      `PRICE_TAMPER | food-order | user=${user._id} | ` +
      `clientFee=${fields.delivery_fee} serverFee=${serverDeliveryFee} | ` +
      `clientTotal=${fields.totalAmt} serverTotal=${serverTotal}`
    )
  }

  fields.delivery_fee = serverDeliveryFee
  fields.totalAmt = serverTotal
  return fields
}

// ── Shared order fields ─────────────────────────────────────────────────────
// NOTE: now async because buildCartItems looks up the DB — every caller must await this.
const buildOrderFields = async (userId, fields, extra = {}) => {
  const {
    restaurantName, addressId, items,
    subTotalAmt, delivery_fee, totalAmt,
    deliveryLocation, tip, offerKey, couponCode, couponDiscount,
    walletAmountUsed, deliveryInstructions, scheduledDelivery,
  } = fields

  return {
    userId,
    orderId:      genOrderId(),
    cartItems:    await buildCartItems(items),
    product_details: { name: restaurantName || 'Food Order', image: [] },
    delivery_address: addressId,
    subTotalAmt,
    delivery_fee,
    totalAmt,
    tip,
    offerKey,           // ✅ saved
    couponCode,
    couponDiscount,     // ✅ saved
    walletAmountUsed,
    deliveryInstructions,
    scheduledDelivery,
     restaurantId: fields.restaurantId,   // add this line in buildOrderFields return object
       store_details: {
        name:     restaurantName || 'Restaurant',
      address:  '',
      location: {
        lat: deliveryLocation?.lat || 25.2921,
        lng: deliveryLocation?.lng || 84.817,
      },
    },
    delivery_status: 'Pending',
    ...extra,
  }
}

// ── Deduct wallet helper (reused across routes) ─────────────────────────────
const deductWallet = async (userId, amount, restaurantName) => {
  if (!amount || amount <= 0) return
  await UserModel.findByIdAndUpdate(userId, {
    $inc:  { walletBalance: -amount },
    $push: {
      walletTransactions: {
        $each: [{
          type:        'debit',
          amount,
          description: `Food order at ${restaurantName || 'Restaurant'}`,
          date:        new Date(),
        }],
        $position: 0,
      },
    },
  })
}

// ── POST /api/restaurant/food-order/cash-on-delivery ───────────────────────
export async function foodOrderCOD(req, res) {
  try {
    const fields = extractBody(req.body)
    if (!fields.items?.length) return res.status(400).json({ success: false, message: 'No items in order' })
    if (!fields.addressId)     return res.status(400).json({ success: false, message: 'Address required' })
    // ✅ FIX: auth middleware sets req.userId (not req.user._id) — req.user does not exist
    const user = await UserModel.findById(req.userId)
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    try {
      await assertStoreOpenForOrder({ list_items: fields.items, userRole: user?.role })
    } catch (guardErr) {
      return res.status(guardErr.statusCode || 400).json({ success: false, message: guardErr.message })
    }

    await applyServerPricing(fields, user)

    const order = new OrderModel(await buildOrderFields(req.userId, fields, {
      payment_status:  'CASH ON DELIVERY',
      payment_mode:    'COD',
      delivery_status: 'Pending',
    }))
    await order.save()

    console.log(`[foodOrderCOD] ✅ orderId=${order.orderId} total=₹${fields.totalAmt} tip=₹${fields.tip} offer=${fields.offerKey} coupon=${fields.couponCode}`)
    return res.json({ success: true, message: 'Food order placed!', data: order })

  } catch (err) {
    console.error('[foodOrderCOD] ❌', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
}

// ── POST /api/restaurant/food-order/wallet ─────────────────────────────────
export async function foodOrderWallet(req, res) {
  try {
    const fields = extractBody(req.body)
    if (!fields.items?.length) return res.status(400).json({ success: false, message: 'No items in order' })
    if (!fields.addressId)     return res.status(400).json({ success: false, message: 'Address required' })

    // ✅ FIX: req.userId, not req.user._id
    // ✅ FIX: req.userId, not req.user._id
    const user = await UserModel.findById(req.userId)
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    try {
      await assertStoreOpenForOrder({ list_items: fields.items, userRole: user?.role })
    } catch (guardErr) {
      return res.status(guardErr.statusCode || 400).json({ success: false, message: guardErr.message })
    }

    await applyServerPricing(fields, user)   // ← must run before balance check / deduction below

    const walletBal = Number(user.walletBalance || 0)
    // ✅ deduct only what the frontend says was used from wallet (grandTotal when paying 100% via wallet)
    const deductAmt = fields.walletAmountUsed > 0 ? fields.walletAmountUsed : fields.totalAmt
    if (walletBal < deductAmt)
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. Have ₹${walletBal}, need ₹${deductAmt}`,
      })

    // ✅ FIX: req.userId, not req.user._id
    await deductWallet(req.userId, deductAmt, fields.restaurantName)

    // ✅ FIX: req.userId, not req.user._id
    const order = new OrderModel(await buildOrderFields(req.userId, fields, {
      paymentId:       'WALLET-' + Date.now(),
      payment_status:  'PAID',
      payment_mode:    'WALLET',
      delivery_status: 'Confirmed',
    }))
    await order.save()

    console.log(`[foodOrderWallet] ✅ orderId=${order.orderId} walletDeducted=₹${deductAmt}`)
    return res.json({ success: true, message: 'Paid via wallet!', data: order })

  } catch (err) {
    console.error('[foodOrderWallet] ❌', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
}

// ── POST /api/restaurant/food-order/create-payment ────────────────────────
export async function foodOrderCreatePayment(req, res) {
  try {
    const fields = extractBody(req.body)
    if (!fields.items?.length) return res.status(400).json({ success: false, message: 'No items in order' })
    if (!fields.addressId)     return res.status(400).json({ success: false, message: 'Address required' })

    const user = await UserModel.findById(req.userId)
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    try {
      await assertStoreOpenForOrder({ list_items: fields.items, userRole: user?.role })
    } catch (guardErr) {
      return res.status(guardErr.statusCode || 400).json({ success: false, message: guardErr.message })
    }

    await applyServerPricing(fields, user)

    if (fields.totalAmt <= 0)
      return res.status(400).json({ success: false, message: 'Invalid amount' })

    const rzpOrder = await getRazorpay().orders.create({
      amount:   Math.round(fields.totalAmt * 100),
      currency: 'INR',
      receipt:  genOrderId(),
    })
    console.log(`[foodOrderCreatePayment] ✅ rzpOrderId=${rzpOrder.id} amount=₹${fields.totalAmt}`)
    return res.json(rzpOrder)
  } catch (err) {
    console.error('[foodOrderCreatePayment] ❌', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
}
// ── POST /api/restaurant/food-order/verify-payment ────────────────────────
export async function foodOrderVerifyPayment(req, res) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      ...rest
    } = req.body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
      return res.status(400).json({ success: false, message: 'Missing payment verification fields' })

    // ✅ uses same env var as getRazorpay()
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_SECRET_KEY)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (expected !== razorpay_signature) {
      console.error('[foodOrderVerifyPayment] ❌ Signature mismatch')
      return res.status(400).json({ success: false, message: 'Payment verification failed' })
    }

    const fields = extractBody(rest)
    if (!fields.items?.length) return res.status(400).json({ success: false, message: 'No items in order' })
    if (!fields.addressId)     return res.status(400).json({ success: false, message: 'Address required' })

    const user = await UserModel.findById(req.userId)
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    try {
      await assertStoreOpenForOrder({ list_items: fields.items, userRole: user?.role })
    } catch (guardErr) {
      return res.status(guardErr.statusCode || 400).json({ success: false, message: guardErr.message })
    }

    await applyServerPricing(fields, user)

    // ✅ FIX: req.userId, not req.user._id — deduct partial wallet if used alongside online payment
    await deductWallet(req.userId, fields.walletAmountUsed, fields.restaurantName)

    // ✅ FIX: req.userId, not req.user._id
    const order = new OrderModel(await buildOrderFields(req.userId, fields, {
      paymentId:       razorpay_payment_id,
      payment_status:  'PAID',
      payment_mode:    'ONLINE',
      delivery_status: 'Confirmed',
    }))
    await order.save()

    console.log(`[foodOrderVerifyPayment] ✅ orderId=${order.orderId} paymentId=${razorpay_payment_id} total=₹${fields.totalAmt} tip=₹${fields.tip}`)
    return res.json({ success: true, message: 'Food order placed!', data: order })

  } catch (err) {
    console.error('[foodOrderVerifyPayment] ❌', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
}