import OrderModel from '../models/order.model.js'
import UserModel  from '../models/user.model.js'
import MenuItemModel from '../models/MenuItem.model.js'
import Razorpay   from 'razorpay'
import { verifyRazorpaySignature } from '../utils/verifyRazorpaySignature.js'
import { calcDeliveryFeeFromOrigin, getMinOrderAmountFromOrigin } from '../utils/deliveryFee.js'
import RestaurantModel from '../models/restaurant.model.js'
import FestiveOfferModel from '../models/festiveOffer.model.js'
import { assertStoreOpenForOrder } from '../utils/storeStatus.js'
import { creditFirstOrderReferralBonus } from '../utils/referralBonus.js'
import { validateCoupon } from '../utils/couponValidation.js'
import { notifyAllRiders } from '../utils/firebaseNotify.js'
import {
    notifyUserOrderPlaced,
    notifySellersOfNewOrder,
} from '../utils/notificationService.js'
// FIX: food orders never assigned a real rider — every order silently fell back
// to the OrderModel schema's hardcoded rider_name/rider_contact defaults
// (a specific person's real name + personal phone number). Reuse the same
// load-balanced rider assignment grocery orders already use.
import { assignAvailableRider } from './order.controller.js'

const getRazorpay = () => new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET_KEY,
})

const genOrderId = (suffix = '') =>
  'FOOD-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase() + (suffix ? `-${suffix}` : '')

const genGroupOrderId = () =>
  Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase()

// ── Group cart items by restaurant, trusting the DATABASE for price/margin
// AND for which restaurant each item belongs to. Client-sent restaurantId is
// NEVER trusted for grouping — we look it up from the MenuItem doc itself,
// so a tampered payload can't attach one restaurant's items to another's order.
// Unknown menuItemId REJECTS the order instead of trusting client price. ──
const buildGroupsByRestaurant = async (items) => {
  const ids = (items || []).map(i => i.menuItemId).filter(Boolean)
  const dbItems = await MenuItemModel.find({ _id: { $in: ids } })
  const dbById = new Map(dbItems.map(d => [String(d._id), d]))

  const groups = new Map() // restaurantId(string) -> { restaurantId, cartItems: [] }

  for (const i of (items || [])) {
    const db = dbById.get(String(i.menuItemId))

    if (!db) {
      console.error(`[buildGroupsByRestaurant] menuItemId=${i.menuItemId} not found in DB — rejecting order (never trust client-supplied price/restaurant)`)
      const err = new Error('One or more items in your cart are no longer available. Please refresh and try again.')
      err.statusCode = 400
      throw err
    }

    const effectivePrice = db.discountedPrice > 0 ? db.discountedPrice : db.price
    const margin         = Number(db.snapitMargin || 0)
    const restaurantId   = String(db.restaurantId)
    const cartItem = {
      productId:         db._id,
      name:              db.name,
      image:             db.image || i.image || '',
      price:             effectivePrice,
      sellerPrice:       effectivePrice - margin,
      snapitMargin:      margin,
      quantity:          Number(i.quantity),
      seller_store_name: null,
    }

    if (!groups.has(restaurantId)) groups.set(restaurantId, { restaurantId, cartItems: [] })
    groups.get(restaurantId).cartItems.push(cartItem)
  }

  return [...groups.values()]
}

// ── Validate & extract common (restaurant-agnostic) fields from request body ──
const extractBody = (body) => {
  const {
    items,
    addressId,
    deliveryLocation,
    tip                  = 0,
    offerKey             = null,
    couponCode           = null,
    couponDiscount       = 0,
    walletAmountUsed     = 0,
    deliveryInstructions = null,
    scheduledDelivery    = null,
  } = body

  return {
    items,
    addressId,
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

// ── Price ONE restaurant's group server-side: subtotal from DB-sourced prices,
// delivery fee from THAT restaurant's location → deliveryLocation, min-order check. ──
const priceGroup = async (group, deliveryLocation, user) => {
  const restaurant = await RestaurantModel.findById(group.restaurantId).select('location name')
  if (!restaurant?.location?.lat || !restaurant?.location?.lng) {
    console.warn(`PRICE_TAMPER | food-order | restaurant=${group.restaurantId} missing location, cannot verify delivery fee server-side`)
    const err = new Error('Restaurant delivery info unavailable. Please try again shortly.')
    err.statusCode = 400
    throw err
  }

  const { lat, lng } = deliveryLocation || {}
  const subTotalAmt = group.cartItems.reduce((s, it) => s + it.price * it.quantity, 0)

  const deliveryFee = calcDeliveryFeeFromOrigin(
    restaurant.location.lat, restaurant.location.lng, lat, lng
  )

  const isPlusForMinOrder = Boolean(
    user?.isSnapitPlusMember && user?.snapitPlusExpiresAt &&
    new Date() < new Date(user.snapitPlusExpiresAt)
  )
  const minOrderRequired = getMinOrderAmountFromOrigin(restaurant.location.lat, restaurant.location.lng, lat, lng, isPlusForMinOrder)
  if (minOrderRequired > 0 && subTotalAmt < minOrderRequired) {
    const err = new Error(`Minimum order of ₹${minOrderRequired} required at ${restaurant.name} for this location.`)
    err.statusCode = 400
    throw err
  }

  // Check if festive offer is active for this restaurant (Raksha Bandhan freebie)
  const festiveOffer = await FestiveOfferModel.findOne().sort({ createdAt: -1 }).lean()
  const now = new Date()
  const isFestiveActive = festiveOffer && festiveOffer.isActive &&
    now >= new Date(festiveOffer.startsAt) && now < new Date(festiveOffer.endsAt) &&
    String(festiveOffer.restaurantId || '6a3963a7e0dd57acb747e405') === String(group.restaurantId)

  if (isFestiveActive && subTotalAmt >= (festiveOffer.minOrderForFreebie || 599)) {
    const alreadyHasFreebie = group.cartItems.some(it => it.name?.includes('Free Margherita Pizza') || it.isFreebie)
    if (!alreadyHasFreebie) {
      group.cartItems.push({
        productId: null,
        name: `🎁 ${festiveOffer.freebieName || 'Free Margherita Pizza (Worth ₹99)'}`,
        image: '',
        price: 0,
        sellerPrice: 0,
        snapitMargin: 0,
        quantity: 1,
        isFreebie: true,
        seller_store_name: null,
      })
    }
  }

  return { ...group, restaurantName: restaurant.name, subTotalAmt, deliveryFee }
}

// ── Price every restaurant group, then fold tip/coupon/wallet into the FIRST
// group only, so sum(order.totalAmt across the group) === what the customer paid.
// Coupon discount is computed SERVER-SIDE via validateCoupon — client-supplied
// couponDiscount is never trusted. ──
const priceAllGroups = async (groups, fields, user) => {
  const priced = []
  for (const g of groups) priced.push(await priceGroup(g, fields.deliveryLocation, user))

  const totalSubTotal = priced.reduce((s, g) => s + g.subTotalAmt, 0)
  const { code: validCouponCode, discount: couponDiscount } = validateCoupon(fields.couponCode, totalSubTotal, user._id)

  priced.forEach((g, idx) => {
    g.tip              = idx === 0 ? fields.tip : 0
    g.couponDiscount   = idx === 0 ? couponDiscount : 0
    g.walletAmountUsed = idx === 0 ? fields.walletAmountUsed : 0
    g.offerKey         = idx === 0 ? fields.offerKey : null
    g.couponCode       = idx === 0 ? validCouponCode : null
    g.totalAmt = g.subTotalAmt + g.deliveryFee + g.tip - g.couponDiscount - g.walletAmountUsed
  })

  const grandTotal = priced.reduce((s, g) => s + g.totalAmt, 0)
  return { priced, grandTotal }
}

// ── Build one order document's fields for a single restaurant group ─────────
const buildOrderFields = (userId, groupOrderId, group, fields, extra = {}) => ({
  userId,
  orderId:          genOrderId(groupOrderId),
  cartItems:        group.cartItems,
  product_details:  { name: group.restaurantName || 'Food Order', image: [] },
  delivery_address: fields.addressId,
  subTotalAmt:      group.subTotalAmt,
  delivery_fee:     group.deliveryFee,
  totalAmt:         group.totalAmt,
  tip:              group.tip,
  offerKey:         group.offerKey,
  couponCode:       group.couponCode,
  couponDiscount:   group.couponDiscount,
  walletAmountUsed: group.walletAmountUsed,
  deliveryInstructions: fields.deliveryInstructions,
  scheduledDelivery:    fields.scheduledDelivery,
  restaurantId: group.restaurantId,
  store_details: {
    name:     group.restaurantName || 'Restaurant',
    address:  '',
    location: {
      lat: fields.deliveryLocation?.lat || 25.2921,
      lng: fields.deliveryLocation?.lng || 84.817,
    },
  },
  // FIX: was never set, so notifySellersOfNewOrder() always found zero matching
  // stores for food orders and silently skipped notifying the restaurant owner
  // of every single new order.
  involved_stores:  [group.restaurantName || 'Restaurant'],
  delivery_status:   'Pending',
  isRestaurantOrder: true,
  ...extra,
})

// ── Notify user + seller/restaurant + riders for one saved food order.
// Mirrors the grocery flow in order.controller.js. Fire-and-forget (non-fatal
// on failure) so a push-notification hiccup never blocks order placement. ──
const notifyFoodOrderPlaced = (order, user) => {
  notifyUserOrderPlaced(order.userId, order.orderId, user?.fcmToken).catch(() => {})
  notifySellersOfNewOrder(order).catch(() => {})
  notifyAllRiders({
    title: '🛵 New Order!',
    body:  `Order ${order.orderId} is ready for pickup — ₹${order.totalAmt}`,
    data:  { orderId: order.orderId, type: 'NEW_ORDER' },
  }).catch(() => {})
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

// ── Shared setup used by every route: validate, group by restaurant, run the
// store-open guard, check wallet balance up front, price every group server-side. ──
const prepareMultiRestaurantOrder = async (req) => {
  const fields = extractBody(req.body)
  if (!fields.items?.length) { const e = new Error('No items in order'); e.statusCode = 400; throw e }
  if (!fields.addressId)     { const e = new Error('Address required');  e.statusCode = 400; throw e }

  const user = await UserModel.findById(req.userId)
  if (!user) { const e = new Error('User not found'); e.statusCode = 404; throw e }

  const groups = await buildGroupsByRestaurant(fields.items)
  if (!groups.length) { const e = new Error('No valid items in order'); e.statusCode = 400; throw e }

  if (fields.walletAmountUsed > 0 && fields.walletAmountUsed > Number(user.walletBalance || 0)) {
    const e = new Error(`Insufficient wallet balance. Have ₹${user.walletBalance || 0}, need ₹${fields.walletAmountUsed}`)
    e.statusCode = 400
    throw e
  }

  await assertStoreOpenForOrder({ list_items: fields.items, userRole: user?.role, orderType: 'food' })

  const { priced, grandTotal } = await priceAllGroups(groups, fields, user)
  const groupOrderId = genGroupOrderId()

  return { fields, user, priced, grandTotal, groupOrderId }
}

// ── POST /api/restaurant/food-order/cash-on-delivery ───────────────────────
export async function foodOrderCOD(req, res) {
  try {
    // COD never touches wallet balance — strip any client-supplied
    // walletAmountUsed before pricing so it can't fake a discount here.
    req.body.walletAmountUsed = 0
    const { fields, user, priced, grandTotal, groupOrderId } = await prepareMultiRestaurantOrder(req)
    const assignedRider = await assignAvailableRider()

    const orders = []
    for (const group of priced) {
      const order = new OrderModel(buildOrderFields(req.userId, groupOrderId, group, fields, {
        payment_status:  'CASH ON DELIVERY',
        payment_mode:    'COD',
        delivery_status: 'Pending',
        riderId:         assignedRider?._id    || null,
        rider_name:      assignedRider?.name   || 'Unassigned',
        rider_contact:   assignedRider?.mobile || '',
      }))
      await order.save()
      orders.push(order)
      notifyFoodOrderPlaced(order, user)
    }
    creditFirstOrderReferralBonus(req.userId, grandTotal).catch(() => {})

    console.log(`[foodOrderCOD] ✅ group=${groupOrderId} restaurants=${orders.length} orderIds=${orders.map(o => o.orderId).join(',')}`)
    return res.json({ success: true, message: 'Food order placed!', data: orders })

  } catch (err) {
    console.error('[foodOrderCOD] ❌', err.message)
    return res.status(err.statusCode || 500).json({ success: false, message: err.message })
  }
}

// ── POST /api/restaurant/food-order/wallet ─────────────────────────────────
export async function foodOrderWallet(req, res) {
  try {
    const { fields, user, priced, grandTotal, groupOrderId } = await prepareMultiRestaurantOrder(req)

    const walletBal = Number(user.walletBalance || 0)
    const deductAmt = fields.walletAmountUsed > 0 ? fields.walletAmountUsed : grandTotal
    if (walletBal < deductAmt)
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. Have ₹${walletBal}, need ₹${deductAmt}`,
      })

    await deductWallet(req.userId, deductAmt, priced[0]?.restaurantName)
    const assignedRider = await assignAvailableRider()

    const orders = []
    for (const group of priced) {
      const order = new OrderModel(buildOrderFields(req.userId, groupOrderId, group, fields, {
        paymentId:       'WALLET-' + Date.now(),
        payment_status:  'PAID',
        payment_mode:    'WALLET',
        delivery_status: 'Confirmed',
        riderId:         assignedRider?._id    || null,
        rider_name:      assignedRider?.name   || 'Unassigned',
        rider_contact:   assignedRider?.mobile || '',
      }))
      await order.save()
      orders.push(order)
      notifyFoodOrderPlaced(order, user)
    }

    creditFirstOrderReferralBonus(req.userId, grandTotal).catch(() => {})
    console.log(`[foodOrderWallet] ✅ group=${groupOrderId} walletDeducted=₹${deductAmt} restaurants=${orders.length}`)
    return res.json({ success: true, message: 'Paid via wallet!', data: orders })

  } catch (err) {
    console.error('[foodOrderWallet] ❌', err.message)
    return res.status(err.statusCode || 500).json({ success: false, message: err.message })
  }
}

// ── POST /api/restaurant/food-order/create-payment ────────────────────────
export async function foodOrderCreatePayment(req, res) {
  try {
    const { grandTotal } = await prepareMultiRestaurantOrder(req)

    if (grandTotal <= 0)
      return res.status(400).json({ success: false, message: 'Invalid amount' })

    const rzpOrder = await getRazorpay().orders.create({
      amount:   Math.round(grandTotal * 100),
      currency: 'INR',
      receipt:  genOrderId(),
    })
    console.log(`[foodOrderCreatePayment] ✅ rzpOrderId=${rzpOrder.id} amount=₹${grandTotal}`)
    return res.json(rzpOrder)
  } catch (err) {
    console.error('[foodOrderCreatePayment] ❌', err.message)
    return res.status(err.statusCode || 500).json({ success: false, message: err.message })
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

    if (!verifyRazorpaySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature })) {
      console.error('[foodOrderVerifyPayment] ❌ Signature mismatch')
      return res.status(400).json({ success: false, message: 'Payment verification failed' })
    }

    req.body = rest
    const { fields, user, priced, grandTotal, groupOrderId } = await prepareMultiRestaurantOrder(req)

    await deductWallet(req.userId, fields.walletAmountUsed, priced[0]?.restaurantName)
    const assignedRider = await assignAvailableRider()

    const orders = []
    for (const group of priced) {
      const order = new OrderModel(buildOrderFields(req.userId, groupOrderId, group, fields, {
        paymentId:       razorpay_payment_id,
        payment_status:  'PAID',
        payment_mode:    'ONLINE',
        delivery_status: 'Confirmed',
        riderId:         assignedRider?._id    || null,
        rider_name:      assignedRider?.name   || 'Unassigned',
        rider_contact:   assignedRider?.mobile || '',
      }))
      await order.save()
      orders.push(order)
      notifyFoodOrderPlaced(order, user)
    }

    console.log(`[foodOrderVerifyPayment] ✅ group=${groupOrderId} paymentId=${razorpay_payment_id} restaurants=${orders.length}`)
    return res.json({ success: true, message: 'Food order placed!', data: orders })

  } catch (err) {
    console.error('[foodOrderVerifyPayment] ❌', err.message)
    return res.status(err.statusCode || 500).json({ success: false, message: err.message })
  }
}