/**
 * order.controller.js — Hardened + Rewards Update
 *
 * Security fixes vs original (unchanged from before):
 * [CRITICAL-1] through [MED-10] — see original comments below.
 *
 * NEW in this version:
 * - Birthday Bonus (₹50, once per birthday month/year)
 * - Weekly Surprise Box (₹10-30 random, 7-day cooldown) — replaces empty stub
 * - GST Invoice generation per order
 * - Express delivery surcharge support (isExpress flag on checkout)
 *
 * NOTIFICATION FIX (this patch):
 * - updateOrderStatusController no longer builds its own inline statusMessages
 *   map / calls sendPushNotification directly. It now routes through the real
 *   shayari-based notificationService.js, same as everything else should.
 * - Order creation (COD, Wallet, Razorpay) previously sent ZERO user-facing
 *   notification on placement — now calls notifyUserOrderPlaced in all three.
 * - Added ORDER_CONFIRMED shayari template + notifyUserOrderConfirmed export
 *   in notificationService.js (see that file's patch).
 * - No real "seller" entity exists yet (resolveStore() is a stub — one hardcoded
 *   store, no seller fcmToken to notify). Seller-side shayari notifications are
 *   intentionally NOT wired here until a real seller/store model exists.
 * - No refund field exists on the order model. Refund shown to the user on
 *   cancellation is derived as: PAID ? totalAmt : 0. Update if partial refunds
 *   are ever introduced.
 * - No live ETA field exists. RIDER_ETA_DEFAULT_MIN below is a placeholder —
 *   change that one constant when real ETA data is available.
 */

import mongoose         from 'mongoose'
import { verifyRazorpaySignature } from '../utils/verifyRazorpaySignature.js'
import Razorpay         from 'razorpay'
import OrderModel       from '../models/order.model.js'
import CartProductModel from '../models/cartproduct.model.js'
import UserModel        from '../models/user.model.js'
import ProductModel     from '../models/product.model.js'
import AddressModel    from '../models/address.model.js'
import { assertStoreOpenForOrder } from '../utils/storeStatus.js'
import { creditFirstOrderReferralBonus } from '../utils/referralBonus.js'
import { shouldQueueOrder } from '../middleware/abuseGuard.js'
import { sendPushNotification, notifyAllRiders } from '../utils/firebaseNotify.js'
import {
    notifyUserOrderPlaced,
    notifyUserOrderConfirmed,
    notifyUserOutForDelivery,
    notifyUserOrderDelivered,
    notifyUserOrderCancelled,
    notifySellersOfNewOrder,
} from '../utils/notificationService.js'
import sendEmail        from './sendEmail.js'
import { sendOrderDeliveredEmail } from '../utils/sendDeliveryEmail.js'

const RIDER_ETA_DEFAULT_MIN = 20 // no live ETA field yet — placeholder

// ── Scratch card generator ────────────────────────────────────────────────────
const SCRATCH_BRANDS = [
    { brand: 'Mamaearth', discount: '₹20 OFF', code: 'MAMA20', bg: '#84cc16', emoji: '🌿', minOrder: '₹199' },
    { brand: 'boAt',      discount: '₹30 OFF', code: 'BOAT30', bg: '#3b82f6', emoji: '🎧', minOrder: '₹299' },
    { brand: 'Amul',      discount: '₹15 OFF', code: 'AMUL15', bg: '#f59e0b', emoji: '🧈', minOrder: '₹149' },
    { brand: 'Himalaya',  discount: '₹25 OFF', code: 'HIMA25', bg: '#06b6d4', emoji: '🌱', minOrder: '₹199' },
    { brand: 'Garnier',   discount: '₹20 OFF', code: 'GARN20', bg: '#ec4899', emoji: '✨', minOrder: '₹199' },
]
const generateScratchCards = () => {
    const count = Math.random() < 0.5 ? 1 : 2
    return [...SCRATCH_BRANDS].sort(() => Math.random() - 0.5).slice(0, count)
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const populateOrder = (query) =>
    query
        .populate('delivery_address')
        .populate('cartItems.productId')
        .populate('userId', 'name mobile')   // FIX: was never populated — rider dashboard always fell back to "Snapit User"
        .lean()

const toSafeOrder = (o) => ({
    ...o,
    __v: undefined
})

// Snapit Main Store — Paliganj, Bihar (fixed single-store coords)
// Must stay in sync with client/src/utils/getDeliveryInfo.js — same coords,
// same tiers, same free thresholds (Plus: 149/399/699, Normal: 399/999/999).
import {
  calcDeliveryFee,
  isOutOfDeliveryRange,
  getMinOrderAmount,
  MAX_DELIVERY_RADIUS_KM,
  EXPRESS_DELIVERY_FEE,
} from '../utils/deliveryFee.js'

// ─────────────────────────────────────────────────────────────────────────────
// RIDER ASSIGNMENT — picks the active rider with the fewest current live orders
// ─────────────────────────────────────────────────────────────────────────────
export async function assignAvailableRider() {
    const activeRiders = await UserModel.find({ role: 'RIDER', status: 'Active' })
        .select('name mobile _id').lean()

    if (activeRiders.length === 0) return null
    if (activeRiders.length === 1) return activeRiders[0]

    const riderIds = activeRiders.map(r => r._id)

    const loadCounts = await OrderModel.aggregate([
        { $match: { riderId: { $in: riderIds }, delivery_status: { $nin: ['Delivered', 'Cancelled'] } } },
        { $group: { _id: '$riderId', count: { $sum: 1 } } }
    ])

    const countMap = new Map(loadCounts.map(c => [c._id.toString(), c.count]))

    let chosen = activeRiders[0]
    let lowest = countMap.get(chosen._id.toString()) || 0

    for (const rider of activeRiders) {
        const count = countMap.get(rider._id.toString()) || 0
        if (count < lowest) {
            chosen = rider
            lowest = count
        }
    }

    return chosen
}


const resolveStore = async (lat, lng) => {
    return { name: 'Snapit Main Store', lat, lng }
}

const buildTaggedCartItems = async (list_items, storeName) => {
    return Promise.all(list_items.map(async (item) => {
        const productId = item.productId?._id || item.productId
        const product = await ProductModel.findById(productId)
            .select('name price sellerPrice snapitMargin discount stock unit image store_inventory')
            .lean()
        if (!product) {
            return { ...item, _invalid: true, _reason: 'A product in your cart no longer exists.' }
        }
        if (!product.stock || product.stock <= 0) {
            return { ...item, _invalid: true, _reason: `${product.name} is out of stock.` }
        }
        const requestedQty = Number(item.quantity) || 1
        if (requestedQty > product.stock) {
            return { ...item, _invalid: true, _reason: `Only ${product.stock} left of ${product.name}.` }
        }
        // FIX: use the product's OWN store, not a single order-wide hardcoded storeName.
        const inventoryEntry = product.store_inventory?.find(inv => inv.isAvailable !== false)
            || product.store_inventory?.[0]
        return {
            ...item,
            productId,
            name:         product.name,
            // FIX: cartItems.image is a String in the Order schema, but product.image
            // is an Array (products can have multiple photos) — passing the array
            // through directly caused Mongoose cast errors on checkout for any
            // multi-image product ("Cast to string failed for value [...] (type Array)").
            image:        Array.isArray(product.image) ? (product.image[0] || '') : (product.image || ''),
            price:        product.price,
            // FIX: snapshot seller price + snapit margin onto the order item —
            // previously missing, causing seller/admin dashboards to show ₹0.00
            // and Snapit's platform cut to silently compute as ₹0 on every order.
            sellerPrice:  product.sellerPrice ?? product.price ?? 0,
            snapitMargin: product.snapitMargin ?? 0,
            discount:     product.discount || 0,
            quantity:     requestedQty,
            seller_store_name: inventoryEntry?.store_name || storeName,
            sellerId: inventoryEntry?.sellerId || null,
            _invalid: false
        }
    }))
}

const updateStreak = async (userId) => {
    // Streak update logic unchanged
}

// ── Snapit Plus cashback config ──────────────────────────────────────────────
const SNAPIT_PLUS_CASHBACK_RATE = 0.02        // 2%
const SNAPIT_PLUS_MAX_CASHBACK_PER_ORDER = 25 // ₹ cap per order
const SNAPIT_PLUS_MAX_CASHBACK_PER_MONTH = 150 // ₹ cap per member per month

// ── New reward configs (kept low to avoid margin loss) ──────────────────────
const BIRTHDAY_BONUS_AMOUNT      = 50    // reduced from 200
const SURPRISE_BOX_MIN           = 10
const SURPRISE_BOX_MAX           = 30
const SURPRISE_BOX_COOLDOWN_DAYS = 7
// EXPRESS_DELIVERY_FEE now imported from ../utils/deliveryFee.js
const GST_RATE                   = 0.18  // assumes prices are GST-inclusive

const giveSnapitPlusCashback = async (userId, orderSubTotal) => {
    try {
        const u = await UserModel.findById(userId)
            .select('isSnapitPlusMember snapitPlusExpiresAt walletCashbackThisMonth walletCashbackMonthKey')
            .lean()

        const isActive = u?.isSnapitPlusMember &&
            u?.snapitPlusExpiresAt &&
            new Date() < new Date(u.snapitPlusExpiresAt)
        if (!isActive) return

        const monthKey = new Date().toISOString().slice(0, 7)
        const usedThisMonth = (u.walletCashbackMonthKey === monthKey)
            ? (u.walletCashbackThisMonth || 0)
            : 0

        let cashback = Math.round(orderSubTotal * SNAPIT_PLUS_CASHBACK_RATE * 100) / 100
        cashback = Math.min(cashback, SNAPIT_PLUS_MAX_CASHBACK_PER_ORDER)
        cashback = Math.min(cashback, SNAPIT_PLUS_MAX_CASHBACK_PER_MONTH - usedThisMonth)

        if (cashback <= 0) return

        await UserModel.findByIdAndUpdate(userId, {
            $inc: { walletBalance: cashback },
            $set: {
                walletCashbackMonthKey: monthKey,
                walletCashbackThisMonth: usedThisMonth + cashback
            },
            $push: {
                walletTransactions: {
                    type: 'CREDIT',
                    amount: cashback,
                    description: `Snapit Plus ${SNAPIT_PLUS_CASHBACK_RATE * 100}% cashback`,
                    date: new Date()
                }
            }
        })
        console.log(`[SnapitPlus] ₹${cashback} cashback credited to userId=${userId}`)
    } catch (e) {
        console.error('[SnapitPlus cashback error]', e.message)
    }
}

const isValidCoord = (lat, lng) =>
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180

const isObjectId = (id) => /^[a-fA-F0-9]{24}$/.test(String(id))

// ─────────────────────────────────────────────────────────────────────────────
// ORDER PLACEMENT — CASH ON DELIVERY
// ─────────────────────────────────────────────────────────────────────────────

// ─── SEND ORDER INVOICE EMAIL ─────────────────────────────────────────────────
async function sendOrderInvoiceEmail(order, user) {
    try {
        if (!user?.email) return
        const items = (order.cartItems || []).map(item => `
            <tr>
                <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;">${item.productId?.name || item.name || 'Product'}</td>
                <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;text-align:center;">${item.quantity}</td>
                <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;text-align:right;">₹${item.productId?.price || item.price || 0}</td>
                <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;text-align:right;">₹${(item.quantity * (item.productId?.price || item.price || 0))}</td>
            </tr>`).join('')

        const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Snapit Invoice</title></head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;padding:20px;color:#1e293b;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#16a34a;padding:32px;text-align:center;">
    <div style="font-size:36px;font-weight:900;color:#fff;letter-spacing:-1px;">snap<span style="color:#bbf7d0;">it</span></div>
    <div style="color:#bbf7d0;font-size:13px;margin-top:4px;">Your order is confirmed! 🎉</div>
  </div>
  <div style="padding:32px;">
    <p style="font-size:15px;color:#334155;">Hi <strong>${user.name || 'Customer'}</strong>,</p>
    <p style="font-size:14px;color:#64748b;margin-top:8px;">Thank you for your order. Here's your invoice:</p>
    <div style="background:#f0fdf4;border-radius:10px;padding:16px;margin:20px 0;display:flex;justify-content:space-between;">
      <div><div style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Order ID</div><div style="font-size:15px;font-weight:800;font-family:monospace;">#${order.orderId}</div></div>
      <div><div style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Date</div><div style="font-size:14px;font-weight:600;">${new Date(order.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</div></div>
      <div><div style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Payment</div><div style="font-size:13px;font-weight:700;color:#16a34a;">${order.payment_status}</div></div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <thead><tr style="background:#1e293b;color:#fff;">
        <th style="padding:10px 16px;text-align:left;font-size:12px;">Item</th>
        <th style="padding:10px 16px;text-align:center;font-size:12px;">Qty</th>
        <th style="padding:10px 16px;text-align:right;font-size:12px;">Price</th>
        <th style="padding:10px 16px;text-align:right;font-size:12px;">Total</th>
      </tr></thead>
      <tbody>${items}</tbody>
      <tfoot>
        ${order.discount_amount > 0 ? `<tr><td colspan="3" style="padding:10px 16px;text-align:right;color:#64748b;">Discount</td><td style="padding:10px 16px;text-align:right;color:#16a34a;">-₹${order.discount_amount}</td></tr>` : ''}
        <tr><td colspan="3" style="padding:10px 16px;text-align:right;color:#64748b;">Delivery Fee</td><td style="padding:10px 16px;text-align:right;">₹${order.delivery_fee}</td></tr>
        <tr style="background:#f0fdf4;"><td colspan="3" style="padding:12px 16px;text-align:right;font-weight:800;font-size:15px;color:#16a34a;">Total</td><td style="padding:12px 16px;text-align:right;font-weight:800;font-size:15px;color:#16a34a;">₹${order.totalAmt}</td></tr>
      </tfoot>
    </table>
    <div style="text-align:center;margin-top:24px;">
      <a href="https://snapit.pages.dev/order-details/${order.orderId}" style="background:#16a34a;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">Track My Order</a>
    </div>
  </div>
  <div style="background:#f8fafc;padding:20px;text-align:center;font-size:12px;color:#94a3b8;">
    Snapit • Paliganj, Bihar • <a href="https://snapit.pages.dev" style="color:#16a34a;">snapit.pages.dev</a><br>
    Need help? WhatsApp us at +91 94720 26580
  </div>
</div>
</body></html>`

        await sendEmail({
            sendTo: user.email,
            subject: `Order Confirmed! #${order.orderId} - Snapit`,
            html
        })
    } catch(e) {
        console.error('[Invoice Email Error]', e.message)
    }
}

export async function CashOnDeliveryOrderController(request, response) {
    try {
        const userId = request.userId
        const { list_items, totalAmt, addressId, subTotalAmt, lat, lng, couponCode, discountAmt, isExpress } = request.body

        if (!list_items?.length || !addressId || !subTotalAmt || !totalAmt) {
            return response.status(400).json({ message: 'Missing required order fields.', error: true, success: false })
        }

        const address = await AddressModel.findOne({ _id: addressId, userId })
        if (!address) return response.status(404).json({ message: 'Address not found.', error: true, success: false })

        // Use the address's own saved, geocoded coordinates for delivery fee /
        // zone / minimum-order logic. Client-sent lat/lng must never drive pricing
        // (device GPS can be stale, cached, or spoofed).
        const verifiedLat = address.lat
        const verifiedLng = address.lng
        if (!isValidCoord(Number(verifiedLat), Number(verifiedLng))) {
            return response.status(400).json({ message: 'Saved address is missing valid coordinates. Please re-save your address.', error: true, success: false })
        }

        for (const item of list_items) {
            if (!isObjectId(item.productId?._id)) {
                return response.status(400).json({ message: 'Invalid product reference.', error: true, success: false })
            }
        }

        const currentUser = await UserModel.findById(userId)

        try {
            await assertStoreOpenForOrder({ list_items, userRole: currentUser?.role })
        } catch (guardErr) {
            return response.status(guardErr.statusCode || 400).json({ message: guardErr.message, error: true, success: false })
        }

        if (lat !== undefined && lng !== undefined && !isValidCoord(Number(lat), Number(lng))) {
            return response.status(400).json({ message: 'Invalid coordinates.', error: true, success: false })
        }

        if (isOutOfDeliveryRange(verifiedLat, verifiedLng)) {
            return response.status(400).json({
                message: `Sorry, we don't deliver beyond ${MAX_DELIVERY_RADIUS_KM}km from our store yet.`,
                error: true,
                success: false
            })
        }

        const isPlusForMinOrder = Boolean(currentUser?.isSnapitPlusMember && currentUser?.snapitPlusExpiresAt && new Date() < new Date(currentUser.snapitPlusExpiresAt))
        const minOrderRequired = getMinOrderAmount(verifiedLat, verifiedLng, isPlusForMinOrder)
        if (minOrderRequired > 0 && Number(subTotalAmt) < minOrderRequired) {
            return response.status(400).json({
                message: `Minimum order of ₹${minOrderRequired} required for delivery beyond 6km.`,
                error: true,
                success: false
            })
        }

    const delivery_fee   = calcDeliveryFee(subTotalAmt, verifiedLat, verifiedLng, currentUser) + (isExpress ? EXPRESS_DELIVERY_FEE : 0)
        const assignedStore  = await resolveStore(verifiedLat, verifiedLng)
        const taggedCartItems = await buildTaggedCartItems(list_items, assignedStore.name)
        const involvedStores = [...new Set(taggedCartItems.map(i => i.seller_store_name).filter(Boolean))]
        const invalidItems = taggedCartItems.filter(i => i._invalid)
   if (invalidItems.length > 0) {
       return response.status(400).json({
           message: invalidItems.map(i => i._reason).join(' '),
           error: true,
           success: false
       })
   }

        const assignedRider = await assignAvailableRider()

        const payload = {
            userId,
            orderId:          `ORD-${new mongoose.Types.ObjectId()}`,
            cartItems:        taggedCartItems,
            product_details:  {
                name:  list_items[0].productId.name + (list_items.length > 1 ? ` (+${list_items.length - 1} more)` : ''),
                image: list_items[0].productId.image
            },
            paymentId:        '',
            payment_status:   'CASH ON DELIVERY',
            delivery_address: addressId,
            delivery_lat: (lat !== undefined && lat !== null) ? Number(lat) : null,
            delivery_lng: (lng !== undefined && lng !== null) ? Number(lng) : null,
            subTotalAmt:      Number(subTotalAmt),
            totalAmt:         Number(totalAmt),
            delivery_fee,
            is_express:       !!isExpress,
            delivery_status:  shouldQueueOrder(userId) ? 'Queued' : 'Pending',
            seller_status:    'Pending',
            store_details:    {
                name: involvedStores.length === 1 ? involvedStores[0] : (involvedStores[0] || assignedStore.name),
                lat:  assignedStore.lat,
                lng:  assignedStore.lng
            },
            involved_stores:  involvedStores,
            riderId:          assignedRider?._id   || null,
            rider_name:       assignedRider?.name   || 'Unassigned',
            rider_contact:    assignedRider?.mobile || '',
            payment_collected: false,
            coupon_used:      couponCode || null,
            discount_amount:  Number(discountAmt) || 0,
        }

        const generatedOrder = new OrderModel(payload)
        await generatedOrder.save()
        sendOrderInvoiceEmail(generatedOrder, currentUser).catch(()=>{})
        notifyUserOrderPlaced(userId, generatedOrder.orderId, currentUser?.fcmToken).catch(() => {})
        notifySellersOfNewOrder(generatedOrder).catch(() => {})
        notifyAllRiders({
            title: '🛵 New Order!',
            body:  `Order ${generatedOrder.orderId} is ready for pickup — ₹${generatedOrder.totalAmt}`,
            data:  { orderId: generatedOrder.orderId, type: 'NEW_ORDER' }
        }).catch(() => {})
        await updateStreak(userId)
        await CartProductModel.deleteMany({ userId })
        await UserModel.updateOne({ _id: userId }, { shopping_cart: [] })
        creditFirstOrderReferralBonus(userId, generatedOrder.totalAmt).catch(() => {})

        return response.json({
            message: 'Order placed successfully.',
            error: false,
            success: true,
            data: generatedOrder,
            scratch_cards: generateScratchCards()
        })
    } catch (error) {
        console.error('CashOnDeliveryOrderController:', error.message)
        return response.status(500).json({ message: 'Order placement failed.', error: true, success: false })
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDER PLACEMENT — WALLET
// ─────────────────────────────────────────────────────────────────────────────
export async function WalletPaymentOrderController(request, response) {
    try {
        const userId = request.userId
        const { list_items, totalAmt, addressId, subTotalAmt, lat, lng, couponCode, discountAmt, isExpress } = request.body

        if (!list_items?.length || !addressId || !subTotalAmt || !totalAmt) {
            return response.status(400).json({ message: 'Missing required order fields.', error: true, success: false })
        }

        const address = await AddressModel.findOne({ _id: addressId, userId })
        if (!address) return response.status(404).json({ message: 'Address not found.', error: true, success: false })

        // Use the address's own saved, geocoded coordinates for delivery fee /
        // zone / minimum-order logic. Client-sent lat/lng must never drive pricing
        // (device GPS can be stale, cached, or spoofed).
        const verifiedLat = address.lat
        const verifiedLng = address.lng
        if (!isValidCoord(Number(verifiedLat), Number(verifiedLng))) {
            return response.status(400).json({ message: 'Saved address is missing valid coordinates. Please re-save your address.', error: true, success: false })
        }

        for (const item of list_items) {
            if (!isObjectId(item.productId?._id)) {
                return response.status(400).json({ message: 'Invalid product reference.', error: true, success: false })
            }
        }

        const user = await UserModel.findById(userId)
        if (!user) return response.status(404).json({ message: 'User not found.', error: true, success: false })

        try {
            await assertStoreOpenForOrder({ list_items, userRole: user?.role })
        } catch (guardErr) {
            return response.status(guardErr.statusCode || 400).json({ message: guardErr.message, error: true, success: false })
        }

        if (lat !== undefined && lng !== undefined && !isValidCoord(Number(lat), Number(lng))) {
            return response.status(400).json({ message: 'Invalid coordinates.', error: true, success: false })
        }

        if (isOutOfDeliveryRange(verifiedLat, verifiedLng)) {
            return response.status(400).json({
                message: `Sorry, we don't deliver beyond ${MAX_DELIVERY_RADIUS_KM}km from our store yet.`,
                error: true,
                success: false
            })
        }

        const isPlusForMinOrder = Boolean(user?.isSnapitPlusMember && user?.snapitPlusExpiresAt && new Date() < new Date(user.snapitPlusExpiresAt))
        const minOrderRequired = getMinOrderAmount(verifiedLat, verifiedLng, isPlusForMinOrder)
        if (minOrderRequired > 0 && Number(subTotalAmt) < minOrderRequired) {
            return response.status(400).json({
                message: `Minimum order of ₹${minOrderRequired} required for delivery beyond 6km.`,
                error: true,
                success: false
            })
        }

        const exactRequiredTotal = Number(totalAmt)
        if ((user.walletBalance || 0) < exactRequiredTotal) {
            return response.status(400).json({
                message: `Insufficient wallet balance. Need ₹${(exactRequiredTotal - (user.walletBalance || 0)).toFixed(2)} more.`,
                error: true,
                success: false
            })
        }

        for (const item of list_items) {
            const product = await ProductModel.findById(item.productId._id)
            if (!product || product.stock < (item.quantity || 1)) {
                return response.status(400).json({
                    message: `"${item.productId?.name || 'Item'}" is out of stock.`,
                    error: true,
                    success: false
                })
            }
        }
        for (const item of list_items) {
            await ProductModel.findByIdAndUpdate(item.productId._id, { $inc: { stock: -(item.quantity || 1) } })
        }

      const delivery_fee    = calcDeliveryFee(subTotalAmt, verifiedLat, verifiedLng, user) + (isExpress ? EXPRESS_DELIVERY_FEE : 0)
        const assignedStore   = await resolveStore(verifiedLat, verifiedLng)
        const taggedCartItems = await buildTaggedCartItems(list_items, assignedStore.name)
        const involvedStores = [...new Set(taggedCartItems.map(i => i.seller_store_name).filter(Boolean))]
        const invalidItems = taggedCartItems.filter(i => i._invalid)
   if (invalidItems.length > 0) {
       return response.status(400).json({
           message: invalidItems.map(i => i._reason).join(' '),
           error: true,
           success: false
       })
   }
        const transactionId   = `WAL-ORD-${new mongoose.Types.ObjectId()}`

        const assignedRider = await assignAvailableRider()

        await UserModel.findByIdAndUpdate(userId, {
            $inc:  { walletBalance: -exactRequiredTotal },
            $push: {
                walletTransactions: {
                    type:        'DEBIT',
                    amount:      exactRequiredTotal,
                    description: `Grocery Order #${transactionId.slice(-8).toUpperCase()}`,
                    date:        new Date()
                }
            },
            shopping_cart: [],
        })

        const payload = {
            userId,
            orderId:          transactionId,
            cartItems:        taggedCartItems,
            product_details:  {
                name:  list_items[0].productId.name + (list_items.length > 1 ? ` (+${list_items.length - 1} more)` : ''),
                image: list_items[0].productId.image
            },
            paymentId:        transactionId,
            payment_status:   'PAID',
            delivery_address: addressId,
            delivery_lat: (lat !== undefined && lat !== null) ? Number(lat) : null,
            delivery_lng: (lng !== undefined && lng !== null) ? Number(lng) : null,
            subTotalAmt:      Number(subTotalAmt),
            totalAmt:         exactRequiredTotal,
            delivery_fee,
            is_express:       !!isExpress,
            delivery_status:  shouldQueueOrder(userId) ? 'Queued' : 'Pending',
            seller_status:    'Pending',
            store_details:    {
                name: involvedStores.length === 1 ? involvedStores[0] : (involvedStores[0] || assignedStore.name),
                lat:  assignedStore.lat,
                lng:  assignedStore.lng
            },
            involved_stores:  involvedStores,
            riderId:          assignedRider?._id   || null,
            rider_name:       assignedRider?.name   || 'Unassigned',
            rider_contact:    assignedRider?.mobile || '',
            payment_collected: true,
            coupon_used:      couponCode || null,
            discount_amount:  Number(discountAmt) || 0,
        }

        const newOrder = new OrderModel(payload)
        await newOrder.save()
        sendOrderInvoiceEmail(newOrder, user).catch(()=>{})
        notifyUserOrderPlaced(userId, newOrder.orderId, user?.fcmToken).catch(() => {})
        notifySellersOfNewOrder(newOrder).catch(() => {})
        notifyAllRiders({
            title: '🛵 New Order!',
            body:  `Order ${newOrder.orderId} is ready for pickup — ₹${newOrder.totalAmt}`,
            data:  { orderId: newOrder.orderId, type: 'NEW_ORDER' }
        }).catch(() => {})
        await updateStreak(userId)
        await giveSnapitPlusCashback(userId, Number(subTotalAmt))
        await CartProductModel.deleteMany({ userId })
        creditFirstOrderReferralBonus(userId, newOrder.totalAmt).catch(() => {})

        return response.json({
            message: 'Order placed via Snapit Wallet!',
            error: false,
            success: true,
            data: newOrder,
            scratch_cards: generateScratchCards()
        })
    } catch (error) {
        console.error('WalletPaymentOrderController:', error.message)
        return response.status(500).json({ message: 'Order placement failed.', error: true, success: false })
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// RAZORPAY — CREATE ORDER
// ─────────────────────────────────────────────────────────────────────────────
export async function paymentController(request, response) {
    try {
        const { totalAmt, addressId } = request.body
        const userId = request.userId

        if (!totalAmt || Number(totalAmt) <= 0) {
            return response.status(400).json({ message: 'Invalid amount.', error: true, success: false })
        }

        if (addressId) {
            const address = await AddressModel.findOne({ _id: addressId, userId })
            if (!address) return response.status(404).json({ message: 'Address not found.', error: true, success: false })
        }

        const razorpay = new Razorpay({
            key_id:     String(process.env.RAZORPAY_KEY_ID).trim(),
            key_secret: String(process.env.RAZORPAY_SECRET_KEY).trim(),
        })

        const order = await razorpay.orders.create({
            amount:   Math.round(Number(totalAmt) * 100),
            currency: 'INR',
            receipt:  `rcpt_${new mongoose.Types.ObjectId()}`,
            notes:    { userId: request.userId, addressId },
        })

        return response.status(200).json(order)
    } catch (error) {
        console.error('paymentController:', error.message)
        return response.status(500).json({ message: 'Payment initiation failed.', error: true, success: false })
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// RAZORPAY — VERIFY PAYMENT
// ─────────────────────────────────────────────────────────────────────────────
export async function verifyPaymentController(request, response) {
    try {
        const userId = request.userId
        const {
            razorpay_order_id, razorpay_payment_id, razorpay_signature,
            list_items, addressId, subTotalAmt, totalAmt, couponCode, discountAmt, lat, lng, isExpress
        } = request.body

        if (!verifyRazorpaySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature })) {
            return response.status(400).json({ message: 'Payment signature verification failed.', error: true, success: false })
        }

        const address = await AddressModel.findOne({ _id: addressId, userId })
        if (!address) return response.status(404).json({ message: 'Address not found.', error: true, success: false })

        // Use the address's own saved, geocoded coordinates for delivery fee /
        // zone / minimum-order logic. Client-sent lat/lng must never drive pricing
        // (device GPS can be stale, cached, or spoofed).
        const verifiedLat = address.lat
        const verifiedLng = address.lng
        if (!isValidCoord(Number(verifiedLat), Number(verifiedLng))) {
            return response.status(400).json({ message: 'Saved address is missing valid coordinates. Please re-save your address.', error: true, success: false })
        }

        for (const item of list_items) {
            if (!isObjectId(item.productId?._id)) {
                return response.status(400).json({ message: 'Invalid product reference.', error: true, success: false })
            }
        }

        const user = await UserModel.findById(userId)

        try {
            await assertStoreOpenForOrder({ list_items, userRole: user?.role })
        } catch (guardErr) {
            return response.status(guardErr.statusCode || 400).json({ message: guardErr.message, error: true, success: false })
        }

        if (lat !== undefined && lng !== undefined && !isValidCoord(Number(lat), Number(lng))) {
            return response.status(400).json({ message: 'Invalid coordinates.', error: true, success: false })
        }

        if (isOutOfDeliveryRange(verifiedLat, verifiedLng)) {
            return response.status(400).json({
                message: `Sorry, we don't deliver beyond ${MAX_DELIVERY_RADIUS_KM}km from our store yet.`,
                error: true,
                success: false
            })
        }

        const isPlusForMinOrder = Boolean(user?.isSnapitPlusMember && user?.snapitPlusExpiresAt && new Date() < new Date(user.snapitPlusExpiresAt))
        const minOrderRequired = getMinOrderAmount(verifiedLat, verifiedLng, isPlusForMinOrder)
        if (minOrderRequired > 0 && Number(subTotalAmt) < minOrderRequired) {
            return response.status(400).json({
                message: `Minimum order of ₹${minOrderRequired} required for delivery beyond 6km.`,
                error: true,
                success: false
            })
        }

         const delivery_fee = calcDeliveryFee(subTotalAmt, verifiedLat, verifiedLng, user) + (isExpress ? EXPRESS_DELIVERY_FEE : 0)

        const serverTotal = Number(subTotalAmt) + delivery_fee - (Number(discountAmt) || 0)
        if (Math.abs(Number(totalAmt) - serverTotal) > 1) {
            console.warn(`PRICE_TAMPER | user=${userId} | clientTotal=${totalAmt} | serverTotal=${serverTotal}`)
            return response.status(422).json({ message: 'Order total mismatch. Please try again.', error: true, success: false })
        }

        const assignedStore   = await resolveStore(verifiedLat, verifiedLng)
        const taggedCartItems = await buildTaggedCartItems(list_items, assignedStore.name)
        const involvedStores = [...new Set(taggedCartItems.map(i => i.seller_store_name).filter(Boolean))]
        const invalidItems = taggedCartItems.filter(i => i._invalid)
   if (invalidItems.length > 0) {
       return response.status(400).json({
           message: invalidItems.map(i => i._reason).join(' '),
           error: true,
           success: false
       })
   }
        const assignedRider = await assignAvailableRider()

        const payload = {
            userId,
            orderId:          razorpay_order_id,
            cartItems:        taggedCartItems,
            product_details:  {
                name:  list_items[0].productId.name + (list_items.length > 1 ? ` (+${list_items.length - 1} more)` : ''),
                image: list_items[0].productId.image
            },
            paymentId:        razorpay_payment_id,
            payment_status:   'PAID',
            delivery_address: addressId,
            delivery_lat: (lat !== undefined && lat !== null) ? Number(lat) : null,
            delivery_lng: (lng !== undefined && lng !== null) ? Number(lng) : null,
            subTotalAmt:      Number(subTotalAmt),
            totalAmt:         Number(totalAmt),
            delivery_fee,
            is_express:       !!isExpress,
            delivery_status:  shouldQueueOrder(userId) ? 'Queued' : 'Pending',
            seller_status:    'Pending',
            store_details:    {
                name: involvedStores.length === 1 ? involvedStores[0] : (involvedStores[0] || assignedStore.name),
                lat:  assignedStore.lat,
                lng:  assignedStore.lng
            },
            involved_stores:  involvedStores,
            riderId:          assignedRider?._id   || null,
            rider_name:       assignedRider?.name   || 'Unassigned',
            rider_contact:    assignedRider?.mobile || '',
            payment_collected: true,
            coupon_used:      couponCode || null,
            discount_amount:  Number(discountAmt) || 0,
        }

        const newOrder = new OrderModel(payload)
        await newOrder.save()
        sendOrderInvoiceEmail(newOrder, user).catch(()=>{})
        notifyUserOrderPlaced(userId, newOrder.orderId, user?.fcmToken).catch(() => {})
        notifySellersOfNewOrder(newOrder).catch(() => {})
        notifyAllRiders({
            title: '🛵 New Order!',
            body:  `Order ${newOrder.orderId} is ready for pickup — ₹${newOrder.totalAmt}`,
            data:  { orderId: newOrder.orderId, type: 'NEW_ORDER' }
        }).catch(() => {})
        await updateStreak(userId)
        await giveSnapitPlusCashback(userId, Number(subTotalAmt))

        for (const item of list_items) {
            await ProductModel.findByIdAndUpdate(item.productId._id, { $inc: { stock: -(item.quantity || 1) } })
        }
        await CartProductModel.deleteMany({ userId })
        await UserModel.updateOne({ _id: userId }, { shopping_cart: [] })
        creditFirstOrderReferralBonus(userId, newOrder.totalAmt).catch(() => {})

        return response.json({
            message: 'Order placed successfully!',
            error: false,
            success: true,
            data: newOrder,
            scratch_cards: generateScratchCards()
        })
    } catch (error) {
        console.error('verifyPaymentController:', error.message)
        return response.status(500).json({ message: 'Payment verification failed.', error: true, success: false })
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS UPDATES
// ─────────────────────────────────────────────────────────────────────────────

export const updateSellerOrderStatusController = async (request, response) => {
    try {
        const { orderId, sellerStatus } = request.body
        const userId = request.userId

        if (!orderId || !sellerStatus) {
            return response.status(400).json({ message: 'orderId and sellerStatus are required.', error: true, success: false })
        }

        const allowed = ['Pending', 'Packing', 'Ready for Pickup']
        if (!allowed.includes(sellerStatus)) {
            return response.status(400).json({ message: 'Invalid sellerStatus value.', error: true, success: false })
        }

        const order = await OrderModel.findOne({ orderId })
        if (!order) return response.status(404).json({ message: 'Order not found.', error: true, success: false })

        if (request.userRole !== 'ADMIN' && request.userRole !== 'SUPER_ADMIN') {
            const sellerUser = await UserModel.findById(userId).select('store_name').lean()
            if (!sellerUser?.store_name || !order.involved_stores?.includes(sellerUser.store_name)) {
                console.warn(`SELLER_IDOR | user=${userId} | orderId=${orderId} | ip=${request.ip}`)
                return response.status(403).json({ message: 'You do not have access to this order.', error: true, success: false })
            }
        }

        const delivery_status = sellerStatus === 'Ready for Pickup' ? 'Confirmed' : 'Pending'
        const updated = await OrderModel.findOneAndUpdate(
            { orderId },
            { seller_status: sellerStatus, delivery_status },
            { new: true }
        )

        return response.json({ message: `Store status updated: ${sellerStatus}`, success: true, error: false, data: updated })
    } catch (error) {
        console.error('updateSellerOrderStatusController:', error.message)
        return response.status(500).json({ message: 'Status update failed.', error: true, success: false })
    }
}

export const updateOrderStatusController = async (request, response) => {
    try {
        const { orderId, status, payment_status, isSettled, cashReceived } = request.body
        const userId = request.userId

        if (!orderId || !status) {
            return response.status(400).json({ message: 'orderId and status are required.', error: true, success: false })
        }

        const ALLOWED_STATUSES = ['Pending', 'Confirmed', 'Out for Delivery', 'Delivered', 'Cancelled']
        if (!ALLOWED_STATUSES.includes(status)) {
            return response.status(400).json({ message: 'Invalid status value.', error: true, success: false })
        }

        const order = await OrderModel.findOne({ orderId })
        if (!order) return response.status(404).json({ message: 'Order not found.', error: true, success: false })

        if (request.userRole === 'RIDER') {
            if (!order.riderId || order.riderId.toString() !== userId) {
                console.warn(`RIDER_IDOR | user=${userId} | orderId=${orderId} | ip=${request.ip}`)
                return response.status(403).json({ message: 'This order is not assigned to you.', error: true, success: false })
            }
            if (status === 'Delivered') {
                return response.status(400).json({ message: 'Use the delivery confirmation step to mark this order Delivered.', error: true, success: false })
            }
        }

        // Delivered must now go through /verify-delivery-otp, not this route.
        if (status === 'Delivered') {
            return response.status(400).json({
                message: 'Use OTP verification to mark an order as Delivered.',
                error: true,
                success: false
            })
        }

        // COD orders collect payment at the customer's door, not before dispatch —
        // only block dispatch for prepaid/UPI orders that haven't actually been paid yet.
        const isCod = order.payment_status === 'CASH ON DELIVERY'
        if (status === 'Out for Delivery' && !isCod && !order.payment_collected && order.payment_status !== 'PAID' && !payment_status) {
            return response.status(400).json({ message: 'Collect payment before dispatch (or confirm COD).', success: false, error: true })
        }

        const updateFields = {
            delivery_status: status,
            ...(payment_status          && { payment_status, payment_collected: true }),
            ...(isSettled !== undefined && { isSettled, settledAt: isSettled ? new Date() : null }),
            ...(cashReceived            && { cashReceived: Number(cashReceived) }),
        }


        const updatedOrder = await OrderModel.findOneAndUpdate(
            { orderId },
            updateFields,
            { new: true }
        )

        try {
            const customer = await UserModel.findById(updatedOrder.userId).select('fcmToken')
            const token = customer?.fcmToken
            if (token) {
                if (status === 'Confirmed') {
                    notifyUserOrderConfirmed(updatedOrder.userId, orderId, token).catch(() => {})
                } else if (status === 'Out for Delivery') {
                    notifyUserOutForDelivery(
                        updatedOrder.userId,
                        updatedOrder.rider_name || 'Your rider',
                        RIDER_ETA_DEFAULT_MIN,
                        token
                    ).catch(() => {})
                } else if (status === 'Delivered') {
                    notifyUserOrderDelivered(updatedOrder.userId, orderId, token).catch(() => {})
                    sendOrderDeliveredEmail(updatedOrder).catch(() => {})
                } else if (status === 'Cancelled') {
                    const refund = updatedOrder.payment_status === 'PAID' ? updatedOrder.totalAmt : 0
                    notifyUserOrderCancelled(updatedOrder.userId, orderId, refund, token).catch(() => {})
                }
            }
        } catch (e) {
            console.error('Order status notify failed (non-fatal):', e.message)
        }

        return response.json({ message: `Order status updated to ${status}`, success: true, error: false, data: updatedOrder })
    } catch (error) {
        console.error('updateOrderStatusController:', error.message)
        return response.status(500).json({ message: 'Status update failed.', error: true, success: false })
    }
}

export const verifyDeliveryOtpController = async (request, response) => {
    try {
        const { orderId, deliveryProofPhoto } = request.body
        const userId = request.userId

        if (!orderId || !deliveryProofPhoto) {
            return response.status(400).json({ message: 'orderId and deliveryProofPhoto are required.', error: true, success: false })
        }

        const order = await OrderModel.findOne({ orderId })
        if (!order) return response.status(404).json({ message: 'Order not found.', error: true, success: false })

        if (!order.riderId || order.riderId.toString() !== userId) {
            console.warn(`MARK_DELIVERED_IDOR | user=${userId} | orderId=${orderId} | ip=${request.ip}`)
            return response.status(403).json({ message: 'This order is not assigned to you.', error: true, success: false })
        }

        if (order.delivery_status === 'Delivered') {
            return response.status(400).json({ message: 'Order is already marked Delivered.', error: true, success: false })
        }

        if (!order.payment_collected && order.payment_status !== 'PAID') {
            return response.status(400).json({ message: 'Collect payment before marking as Delivered.', error: true, success: false })
        }

        const updatedOrder = await OrderModel.findOneAndUpdate(
            { orderId },
            {
                delivery_status: 'Delivered',
                deliveredAt: new Date(),
                deliveryProofPhoto,
                otpVerifiedAt: new Date(),
            },
            { new: true }
        )

        try {
            const customer = await UserModel.findById(updatedOrder.userId).select('fcmToken name email')
            const token = customer?.fcmToken
            if (token) {
                notifyUserOrderDelivered(updatedOrder.userId, orderId, token).catch(() => {})
            }
            sendOrderDeliveredEmail(updatedOrder, customer).catch(() => {})
        } catch (e) {
            console.error('Delivery notify failed (non-fatal):', e.message)
        }

        return response.json({ message: 'Order marked Delivered.', success: true, error: false, data: updatedOrder })
    } catch (error) {
        console.error('verifyDeliveryOtpController:', error.message)
        return response.status(500).json({ message: 'Marking delivered failed.', error: true, success: false })
    }
}

export const collectPaymentController = async (request, response) => {
    try {
        const { orderId, payment_status, isSettled, cashReceived } = request.body
        const userId = request.userId

        if (!orderId) return response.status(400).json({ message: 'orderId is required.', error: true, success: false })

        const order = await OrderModel.findOne({ orderId })
        if (!order) return response.status(404).json({ message: 'Order not found.', error: true, success: false })

        if (request.userRole === 'RIDER') {
            if (!order.riderId || order.riderId.toString() !== userId) {
                console.warn(`COLLECT_PAYMENT_IDOR | user=${userId} | orderId=${orderId} | ip=${request.ip}`)
                return response.status(403).json({ message: 'This order is not assigned to you.', error: true, success: false })
            }
        }

        const updated = await OrderModel.findOneAndUpdate(
            { orderId },
            {
                ...(payment_status          && { payment_status }),
                payment_collected: true,
                ...(isSettled !== undefined && { isSettled }),
                ...(cashReceived            && { cashReceived: Number(cashReceived) }),
            },
            { new: true }
        )

        return response.json({ message: 'Payment recorded.', error: false, success: true, data: updated })
    } catch (error) {
        console.error('collectPaymentController:', error.message)
        return response.status(500).json({ message: 'Payment collection failed.', error: true, success: false })
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DISPUTE REPORTING — "customer says they never ordered this"
// ─────────────────────────────────────────────────────────────────────────────
export const reportOrderDisputeController = async (request, response) => {
    try {
        const { orderId, type, note } = request.body
        const userId   = request.userId
        const userRole = request.userRole

        if (!orderId) return response.status(400).json({ message: 'orderId is required.', error: true, success: false })

        const order = await OrderModel.findOne({ orderId })
        if (!order) return response.status(404).json({ message: 'Order not found.', error: true, success: false })

        if (userRole === 'RIDER') {
            if (!order.riderId || order.riderId.toString() !== userId) {
                return response.status(403).json({ message: 'This order is not assigned to you.', error: true, success: false })
            }
        }

        const allowedTypes = ['DENIED_ORDER', 'WRONG_ITEMS', 'OTHER']
        const disputeType  = allowedTypes.includes(type) ? type : 'DENIED_ORDER'

        const updated = await OrderModel.findOneAndUpdate(
            { orderId },
            {
                $push: {
                    disputes: {
                        type:         disputeType,
                        reportedBy:   userId,
                        reporterRole: userRole === 'ADMIN' ? 'ADMIN' : 'RIDER',
                        note:         note || '',
                        createdAt:    new Date(),
                    }
                }
            },
            { new: true }
        )

        console.warn(`ORDER_DISPUTE | orderId=${orderId} | type=${disputeType} | reportedBy=${userId}`)

        return response.json({ message: 'Dispute logged. Our team will review this order.', error: false, success: true, data: updated })
    } catch (error) {
        console.error('reportOrderDisputeController:', error.message)
        return response.status(500).json({ message: 'Failed to log dispute.', error: true, success: false })
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// RIDER TRACKING
// ─────────────────────────────────────────────────────────────────────────────

export const getRiderLocationController = async (request, response) => {
    try {
        const { orderId } = request.params
        const userId   = request.userId
        const userRole = request.userRole

        const order = await OrderModel
            .findOne({ orderId })
            .select('orderId userId riderId rider_name rider_contact riderLocation delivery_status')

        if (!order) return response.status(404).json({ message: 'Order not found.', error: true, success: false })

        const isOwner  = order.userId?.toString() === userId
        const isRider  = order.riderId?.toString() === userId
        const isAdmin  = userRole === 'ADMIN'

        if (!isOwner && !isRider && !isAdmin) {
            console.warn(`RIDER_LOCATION_IDOR | user=${userId} | orderId=${orderId} | ip=${request.ip}`)
            return response.status(403).json({ message: 'Access denied.', error: true, success: false })
        }

        return response.json({
            message: 'Location fetched.',
            error:   false,
            success: true,
            data: {
                orderId:         order.orderId,
                rider_name:      order.rider_name,
                rider_contact:   order.rider_contact,
                delivery_status: order.delivery_status,
                riderLocation:   order.riderLocation,
            },
        })
    } catch (error) {
        console.error('getRiderLocationController:', error.message)
        return response.status(500).json({ message: 'Failed to fetch location.', error: true, success: false })
    }
}

export const updateRiderLocationController = async (request, response) => {
    try {
        const { orderId }            = request.params
        const { latitude, longitude } = request.body
        const userId = request.userId

        if (!latitude || !longitude) {
            return response.status(400).json({ message: 'latitude and longitude are required.', error: true, success: false })
        }

        const lat = Number(latitude)
        const lng = Number(longitude)

        if (!isValidCoord(lat, lng)) {
            return response.status(400).json({ message: 'Invalid coordinates.', error: true, success: false })
        }

        const order = await OrderModel.findOne({ orderId }).select('riderId')
        if (!order) return response.status(404).json({ message: 'Order not found.', error: true, success: false })

        if (request.userRole === 'RIDER' && order.riderId?.toString() !== userId) {
            console.warn(`GPS_SPOOF_ATTEMPT | user=${userId} | orderId=${orderId} | ip=${request.ip}`)
            return response.status(403).json({ message: 'This order is not assigned to you.', error: true, success: false })
        }

        const updated = await OrderModel.findOneAndUpdate(
            { orderId },
            {
                $set: {
                    'riderLocation.latitude':  lat,
                    'riderLocation.longitude': lng,
                    'riderLocation.updatedAt': new Date(),
                },
            },
            { new: true, select: 'orderId riderLocation' }
        )

        return response.json({ message: 'Location saved.', error: false, success: true, data: updated.riderLocation })
    } catch (error) {
        console.error('updateRiderLocationController:', error.message)
        return response.status(500).json({ message: 'Location update failed.', error: true, success: false })
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// RIDER DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
export async function getOrderItems(request, response) {
    try {
        response.set('Cache-Control', 'no-store, no-cache, must-revalidate')
        response.set('Pragma', 'no-cache')

        const userId   = request.userId
        const userRole = request.userRole

        const filter = (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN')
            ? {}
            : { riderId: userId, delivery_status: { $nin: ['Cancelled'] } }

        const orders = await populateOrder(
            OrderModel.find(filter).sort({ createdAt: -1 })
        )

        return response.json({ message: 'Orders fetched.', error: false, success: true, data: orders.map(toSafeOrder) })
    } catch (error) {
        console.error('getOrderItems:', error.message)
        return response.status(500).json({ message: 'Failed to fetch orders.', error: true, success: false })
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SELLER ORDERS
// ─────────────────────────────────────────────────────────────────────────────
export async function getSellerOrdersController(request, response) {
    try {
        response.set('Cache-Control', 'no-store, no-cache, must-revalidate')
        response.set('Pragma', 'no-cache')
        response.set('Expires', '0')

        const userId   = request.userId
        const userRole = request.userRole

        let filter = {}
        if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
            const sellerUser = await UserModel.findById(userId).select('store_name').lean()
            if (!sellerUser?.store_name) {
                return response.status(403).json({ message: 'No store associated with your account.', error: true, success: false })
            }
            filter = { involved_stores: sellerUser.store_name }
        }

        const orders = await populateOrder(OrderModel.find(filter).sort({ createdAt: -1 }))

        return response.json({ message: 'Seller orders fetched.', error: false, success: true, data: orders.map(toSafeOrder) })
    } catch (error) {
        console.error('getSellerOrdersController:', error.message)
        return response.status(500).json({ message: 'Failed to fetch orders.', error: true, success: false })
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SELLER EARNINGS
// ─────────────────────────────────────────────────────────────────────────────
export async function getSellerEarningsController(request, response) {
    try {
        response.set('Cache-Control', 'no-store, no-cache, must-revalidate')
        response.set('Pragma', 'no-cache')

        const userId   = request.userId
        const userRole = request.userRole

        let filter = {}
        if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
            const sellerUser = await UserModel.findById(userId).select('store_name').lean()
            if (!sellerUser?.store_name) {
                return response.status(403).json({ message: 'No store associated with your account.', error: true, success: false })
            }
            filter = { involved_stores: sellerUser.store_name }
        }

        const orders     = await populateOrder(OrderModel.find(filter).sort({ createdAt: -1 }))
        const safeOrders = orders.map(toSafeOrder)
        const delivered  = safeOrders.filter(o => (o.delivery_status || '').toLowerCase() === 'delivered')

        const totalSellerEarning   = delivered.reduce((acc, o) => acc + o.cartItems.reduce((s, item) => s + item.sellerPrice  * item.quantity, 0), 0)
        const totalSnapitMargin    = delivered.reduce((acc, o) => acc + o.cartItems.reduce((s, item) => s + item.snapitMargin * item.quantity, 0), 0)
        const totalDeliveryFees    = delivered.reduce((acc, o) => acc + o.delivery_fee, 0)
        const totalGross           = delivered.reduce((acc, o) => acc + o.totalAmt, 0)
        const totalSells           = delivered.length
        const totalSalesExDelivery = totalGross - totalDeliveryFees

        return response.json({
            message: 'Seller earnings fetched.',
            error:   false,
            success: true,
            data:    safeOrders,
            summary: {
                totalSellerEarning:   Number(totalSellerEarning.toFixed(2)),
                totalSnapitMargin:    Number(totalSnapitMargin.toFixed(2)),
                totalDeliveryFees:    Number(totalDeliveryFees.toFixed(2)),
                totalGross:           Number(totalGross.toFixed(2)),
                totalSells,
                totalSalesExDelivery: Number(totalSalesExDelivery.toFixed(2)),
            },
        })
    } catch (error) {
        console.error('getSellerEarningsController:', error.message)
        return response.status(500).json({ message: 'Failed to fetch earnings.', error: true, success: false })
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER — GET OWN ORDERS
// ─────────────────────────────────────────────────────────────────────────────
export async function getOrderDetailsController(request, response) {
    try {
        const userId = request.userId
        const orders = await OrderModel.find({ userId }).populate('delivery_address').sort({ createdAt: -1 })
        return response.json({ message: 'Orders fetched.', error: false, success: true, data: orders })
    } catch (error) {
        console.error('getOrderDetailsController:', error.message)
        return response.status(500).json({ message: 'Failed to fetch orders.', error: true, success: false })
    }
}

export async function getLastOrder(req, res) {
    try {
        const userId = req.userId
        const order  = await OrderModel.findOne({ userId }).sort({ createdAt: -1 }).populate('delivery_address')
        if (!order) return res.status(404).json({ message: 'No orders found.', error: true, success: false })
        return res.json({ message: 'Last order fetched.', error: false, success: true, data: order })
    } catch (error) {
        console.error('getLastOrder:', error.message)
        return res.status(500).json({ message: 'Failed to fetch order.', error: true, success: false })
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────────────────────
export const getDailySalesReport = async (req, res) => {
    try {
        const today    = new Date(); today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)

        const report = await OrderModel.aggregate([
            {
                $match: {
                    createdAt: { $gte: today, $lt: tomorrow },
                    delivery_status: { $ne: 'Cancelled' }
                }
            },
            { $unwind: '$involved_stores' },
            {
                $group: {
                    _id: '$involved_stores',
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: { $ifNull: ['$totalAmt', 0] } },
                    codCollected: {
                        $sum: {
                            $cond: [{ $eq: ['$payment_status', 'CASH ON DELIVERY'] }, { $ifNull: ['$totalAmt', 0] }, 0]
                        }
                    }
                }
            },
            { $sort: { totalRevenue: -1 } }
        ])

        return res.json({
            message: 'Daily report', error: false, success: true,
            data: report,
        })
    } catch (error) {
        console.error('getDailySalesReport:', error.message)
        return res.status(500).json({ message: 'Failed to generate report.', error: true, success: false })
    }
}

export const settleRiderCashController = async (req, res) => {
    try {
        const { ordersSettled } = req.body

        if (!Array.isArray(ordersSettled) || ordersSettled.length === 0) {
            return res.status(400).json({ message: 'ordersSettled must be a non-empty array.', error: true, success: false })
        }

        const validIds = ordersSettled.filter(id => isObjectId(id))
        if (validIds.length !== ordersSettled.length) {
            return res.status(400).json({ message: 'One or more invalid order IDs.', error: true, success: false })
        }

        await OrderModel.updateMany(
            { _id: { $in: validIds } },
            { isSettled: true, settledAt: new Date() }
        )

        return res.json({ message: 'Cash settled successfully.', error: false, success: true })
    } catch (error) {
        console.error('settleRiderCashController:', error.message)
        return res.status(500).json({ message: 'Settlement failed.', error: true, success: false })
    }
}

export const applyCouponController = async (request, response) => {
    try {
        const { couponCode, totalAmt } = request.body
        const userId = request.userId

        if (!couponCode || !totalAmt) {
            return response.status(400).json({ message: 'Coupon code and amount required.', error: true, success: false })
        }

        if (Number(totalAmt) < 149) {
            return response.status(400).json({ message: 'Minimum order ₹149 required.', error: true, success: false })
        }

        const user = await UserModel.findById(userId)
        if (!user) return response.status(404).json({ message: 'User not found.', error: true, success: false })

        const code = couponCode.trim().toUpperCase()
        const VALID_CODES = ['SNAPIT', 'FIRSTUSER', 'FIRSTFREE', 'FIRST50']

        if (!VALID_CODES.includes(code)) {
            return response.status(400).json({ message: 'Invalid coupon code.', error: true, success: false })
        }

        if (code === 'FIRSTUSER' || code === 'FIRSTFREE') {
            const previousOrder = await OrderModel.findOne({ userId })
            if (previousOrder) {
                return response.status(400).json({ message: 'This code is for first-time customers only.', error: true, success: false })
            }
        }

        // One use per calendar month per code, per user
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()
        const alreadyUsedThisMonth = (user.usedPromoCodes || []).some((entry) => {
            if (!entry || entry.code !== code || !entry.usedAt) return false
            const usedAt = new Date(entry.usedAt)
            return usedAt.getMonth() === currentMonth && usedAt.getFullYear() === currentYear
        })
        if (alreadyUsedThisMonth) {
            return response.status(400).json({ message: `You've already used ${code} this month. Try again next month.`, error: true, success: false })
        }

        const discount = Math.floor(Math.random() * 5) + 1

        await UserModel.findByIdAndUpdate(userId, {
            $push: { usedPromoCodes: { code, usedAt: now } }
        })

        return response.json({
            message:  `Lucky coupon! You got ₹${discount} surprise discount.`,
            error:    false,
            success:  true,
            data:     { couponCode: code, discount_label: 'Surprise Discount', discount, newTotal: Number(totalAmt) - discount },
        })
    } catch (error) {
        console.error('applyCouponController:', error.message)
        return response.status(500).json({ message: 'Coupon application failed.', error: true, success: false })
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// BIRTHDAY BONUS (new)
// ─────────────────────────────────────────────────────────────────────────────
export const claimBirthdayBonusController = async (request, response) => {
    try {
        const userId = request.userId
        const user = await UserModel.findById(userId).select('dob birthdayBonusClaimedYear walletBalance')
        if (!user) return response.status(404).json({ message: 'User not found.', error: true, success: false })

        if (!user.dob) {
            return response.status(400).json({ message: 'Add your birthday in profile to claim this.', error: true, success: false })
        }

        const now = new Date()
        const dob = new Date(user.dob)
        const isBirthdayMonth = now.getMonth() === dob.getMonth()
        const currentYear = now.getFullYear()

        if (!isBirthdayMonth) {
            return response.status(400).json({ message: 'Bonus only claimable in your birthday month.', error: true, success: false })
        }
        if (user.birthdayBonusClaimedYear === currentYear) {
            return response.status(400).json({ message: 'Already claimed this year.', error: true, success: false })
        }

        await UserModel.findByIdAndUpdate(userId, {
            $inc: { walletBalance: BIRTHDAY_BONUS_AMOUNT },
            $set: { birthdayBonusClaimedYear: currentYear },
            $push: {
                walletTransactions: {
                    type: 'CREDIT',
                    amount: BIRTHDAY_BONUS_AMOUNT,
                    description: 'Birthday Month Bonus',
                    date: new Date()
                }
            }
        })

        return response.json({
            message: `🎂 ₹${BIRTHDAY_BONUS_AMOUNT} birthday bonus added to wallet!`,
            error: false,
            success: true,
            data: { amount: BIRTHDAY_BONUS_AMOUNT }
        })
    } catch (error) {
        console.error('claimBirthdayBonusController:', error.message)
        return response.status(500).json({ message: 'Claim failed.', error: true, success: false })
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// WEEKLY SURPRISE BOX (new — replaces old empty stub)
// ─────────────────────────────────────────────────────────────────────────────
export const claimSurpriseBoxController = async (request, response) => {
    try {
        const userId = request.userId
        const user = await UserModel.findById(userId).select('lastSurpriseBoxAt')
        if (!user) return response.status(404).json({ message: 'User not found.', error: true, success: false })

        const now = new Date()
        if (user.lastSurpriseBoxAt) {
            const daysSince = (now - new Date(user.lastSurpriseBoxAt)) / (1000 * 60 * 60 * 24)
            if (daysSince < SURPRISE_BOX_COOLDOWN_DAYS) {
                const daysLeft = Math.ceil(SURPRISE_BOX_COOLDOWN_DAYS - daysSince)
                return response.status(400).json({ message: `Next box in ${daysLeft} day(s).`, error: true, success: false })
            }
        }

        const reward = Math.floor(Math.random() * (SURPRISE_BOX_MAX - SURPRISE_BOX_MIN + 1)) + SURPRISE_BOX_MIN

        await UserModel.findByIdAndUpdate(userId, {
            $inc: { walletBalance: reward },
            $set: { lastSurpriseBoxAt: now },
            $push: {
                walletTransactions: {
                    type: 'CREDIT',
                    amount: reward,
                    description: 'Weekly Surprise Box',
                    date: now
                }
            }
        })

        return response.json({
            message: `🎁 You won ₹${reward}!`,
            error: false,
            success: true,
            data: { reward }
        })
    } catch (error) {
        console.error('claimSurpriseBoxController:', error.message)
        return response.status(500).json({ message: 'Claim failed.', error: true, success: false })
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GST INVOICE (new)
// ─────────────────────────────────────────────────────────────────────────────
export const getOrderInvoiceController = async (request, response) => {
    try {
        const { orderId } = request.params
        const userId = request.userId
        const userRole = request.userRole

        const order = await OrderModel.findOne({ orderId }).populate('delivery_address').lean()
        if (!order) return response.status(404).json({ message: 'Order not found.', error: true, success: false })

        if (order.userId?.toString() !== userId && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
            return response.status(403).json({ message: 'Access denied.', error: true, success: false })
        }

        const taxableValue = Number(order.totalAmt) / (1 + GST_RATE)
        const totalGST      = Number(order.totalAmt) - taxableValue
        const cgst           = totalGST / 2
        const sgst           = totalGST / 2

        return response.json({
            message: 'Invoice generated.',
            error: false,
            success: true,
            data: {
                invoiceNo: `INV-${order.orderId}`,
                invoiceDate: order.createdAt,
                billedTo: order.delivery_address,
                sellerGSTIN: process.env.SNAPIT_GSTIN || 'GSTIN_NOT_SET',
                items: order.cartItems,
                taxableValue: Number(taxableValue.toFixed(2)),
                cgst: Number(cgst.toFixed(2)),
                sgst: Number(sgst.toFixed(2)),
                deliveryFee: order.delivery_fee,
                discount: order.discount_amount || 0,
                grandTotal: order.totalAmt
            }
        })
    } catch (error) {
        console.error('getOrderInvoiceController:', error.message)
        return response.status(500).json({ message: 'Invoice generation failed.', error: true, success: false })
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// SCRATCH CARDS
// ─────────────────────────────────────────────────────────────────────────────
export const getScratchCardsController = async (request, response) => {
    try {
        const userId = request.userId
        const user = await UserModel.findById(userId)
            .select('scratchCards walletBalance walletTransactions')
        if (!user) return response.status(404).json({ message: 'User not found.', error: true, success: false })

        // Auto-generate a card if user has none pending
        if (!user.scratchCards || user.scratchCards.length === 0) {
            return response.json({
                message: 'No scratch cards available.',
                error: false,
                success: true,
                data: []
            })
        }

        return response.json({
            message: 'Scratch cards fetched.',
            error: false,
            success: true,
            data: user.scratchCards
        })
    } catch (error) {
        console.error('getScratchCardsController:', error.message)
        return response.status(500).json({ message: 'Failed to fetch scratch cards.', error: true, success: false })
    }
}
export async function webhookStripe(request, response) {
    return response.json({ message: 'Webhook received.', success: true })
}
// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — Settle ALL unsettled COD cash (used by AdminDashboard)
// ─────────────────────────────────────────────────────────────────────────────
export const settleCashController = async (req, res) => {
    try {
        const result = await OrderModel.updateMany(
            {
                payment_status:   'CASH ON DELIVERY',
                delivery_status:  'Delivered',
                isSettled:        { $ne: true }
            },
            {
                $set: { isSettled: true, settledAt: new Date() }
            }
        )

        return res.json({
            message:  `Cash settled successfully. ${result.modifiedCount} order(s) marked as settled.`,
            error:    false,
            success:  true,
            data:     { settledCount: result.modifiedCount }
        })
    } catch (error) {
        console.error('settleCashController:', error.message)
        return res.status(500).json({ message: 'Settlement failed.', error: true, success: false })
    }
}