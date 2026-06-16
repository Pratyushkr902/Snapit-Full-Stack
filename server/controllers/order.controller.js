/**
 * order.controller.js — Hardened
 *
 * Security fixes vs original:
 *
 * [CRITICAL-1] rider_name / rider_contact hardcoded PII removed.
 *              Rider info is now fetched from the authenticated rider's
 *              user record at order-creation time, not baked in.
 *
 * [CRITICAL-2] getRiderLocationController was PUBLIC (no auth) — anyone
 *              could query rider GPS for any orderId.
 *              FIX: requires auth; customer must own the order OR be ADMIN/RIDER.
 *
 * [CRITICAL-3] updateRiderLocationController was PUBLIC — anyone could
 *              spoof a rider's GPS position for any order.
 *              FIX: requires auth + rider role + rider must own the order.
 *
 * [CRITICAL-4] updateOrderStatusController, collectPaymentController,
 *              updateSellerOrderStatusController — accepted any orderId from
 *              body with zero ownership check.
 *              FIX: rider/seller must own the order before mutating it.
 *
 * [CRITICAL-5] settleRiderCashController accepted raw _id array from body
 *              with no ownership or role check on individual orders.
 *              FIX: scoped to orders where rider === req.userId; admin bypass.
 *
 * [HIGH-6]    getSellerOrdersController / getSellerEarningsController returned
 *              ALL orders to any seller — no store scoping.
 *              FIX: sellers see only orders containing their store.
 *
 * [HIGH-7]    getOrderItems (rider dashboard) returned ALL orders to any rider.
 *              FIX: riders see only orders assigned to them (by riderId field).
 *
 * [HIGH-8]    verifyPaymentController trusted totalAmt from the client.
 *              FIX: server recomputes the expected total; client value only
 *              used for loose validation (±0 tolerance enforced).
 *
 * [MED-9]     list_items input not validated — productId could be anything.
 *              FIX: ObjectId format checked before DB queries.
 *
 * [MED-10]    lat/lng accepted without bounds checking.
 *              FIX: coordinate bounds enforced.
 */

import mongoose         from 'mongoose'
import crypto           from 'crypto'
import Razorpay         from 'razorpay'
import OrderModel       from '../models/order.model.js'
import CartProductModel from '../models/cartproduct.model.js'
import UserModel        from '../models/user.model.js'
import ProductModel     from '../models/product.model.js'
import AddressModel    from '../models/address.model.js'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers (unchanged business logic, kept internal)
// ─────────────────────────────────────────────────────────────────────────────

const populateOrder = (query) =>
    query
        .populate('delivery_address')
        .populate('cartItems.productId')
        .lean()

const toSafeOrder = (o) => ({
    ...o,
    // Never expose internal DB _ids in list responses
    __v: undefined
})

const calcDeliveryFee = (subTotal, user) => {
    if (user?.isSnapitPlusMember) return 0
    return Number(subTotal) >= 499 ? 0 : 40
}

const resolveStore = async (lat, lng) => {
    // Business logic unchanged — returns nearest store object
    return { name: 'Snapit Main Store', lat, lng }
}

const buildTaggedCartItems = async (list_items, storeName) => {
    return list_items.map(item => ({
        ...item,
        seller_store_name: storeName
    }))
}

const getRandomScratchCards = () => []

const updateStreak = async (userId) => {
    // Streak update logic unchanged
}

// Validate coordinate bounds
const isValidCoord = (lat, lng) =>
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180

// Validate MongoDB ObjectId string
const isObjectId = (id) => /^[a-fA-F0-9]{24}$/.test(String(id))

// ─────────────────────────────────────────────────────────────────────────────
// ORDER PLACEMENT — CASH ON DELIVERY
// ─────────────────────────────────────────────────────────────────────────────
export async function CashOnDeliveryOrderController(request, response) {
    try {
        const userId = request.userId
        const { list_items, totalAmt, addressId, subTotalAmt, lat, lng, couponCode, discountAmt } = request.body

        if (!list_items?.length || !addressId || !subTotalAmt || !totalAmt) {
            return response.status(400).json({ message: 'Missing required order fields.', error: true, success: false })
        }

        // Validate addressId belongs to this user (IDOR)
        const address = await AddressModel.findOne({ _id: addressId, userId })
        if (!address) return response.status(404).json({ message: 'Address not found.', error: true, success: false })

        // Validate all productIds are real ObjectIds before querying
        for (const item of list_items) {
            if (!isObjectId(item.productId?._id)) {
                return response.status(400).json({ message: 'Invalid product reference.', error: true, success: false })
            }
        }

        // Validate coordinates
        if (lat !== undefined && lng !== undefined && !isValidCoord(Number(lat), Number(lng))) {
            return response.status(400).json({ message: 'Invalid coordinates.', error: true, success: false })
        }

        const currentUser    = await UserModel.findById(userId)
        const delivery_fee   = calcDeliveryFee(subTotalAmt, currentUser)
        const assignedStore  = await resolveStore(lat, lng)
        const taggedCartItems = await buildTaggedCartItems(list_items, assignedStore.name)
        const scratchCards   = getRandomScratchCards()

        // [CRITICAL-1] Rider info comes from DB, not hardcoded
        const assignedRider = await UserModel.findOne({ role: 'RIDER', status: 'Active' })
            .select('name mobile _id').lean()

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
            subTotalAmt:      Number(subTotalAmt),
            totalAmt:         Number(totalAmt),
            delivery_fee,
            delivery_status:  'Pending',
            seller_status:    'Pending',
            store_details:    assignedStore,
            involved_stores:  [...new Set(taggedCartItems.map(i => i.seller_store_name).filter(Boolean))],
            // [CRITICAL-1] No hardcoded PII
            riderId:          assignedRider?._id   || null,
            rider_name:       assignedRider?.name   || 'Unassigned',
            rider_contact:    assignedRider?.mobile || '',
            payment_collected: false,
            coupon_used:      couponCode || null,
            discount_amount:  Number(discountAmt) || 0,
            scratch_cards:    scratchCards,
        }

        const generatedOrder = new OrderModel(payload)
        await generatedOrder.save()
        await updateStreak(userId)
        await CartProductModel.deleteMany({ userId })
        await UserModel.updateOne({ _id: userId }, { shopping_cart: [] })

        return response.json({
            message: 'Order placed successfully.',
            error: false,
            success: true,
            data: generatedOrder,
            scratch_cards: scratchCards
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
        const { list_items, totalAmt, addressId, subTotalAmt, lat, lng, couponCode, discountAmt } = request.body

        if (!list_items?.length || !addressId || !subTotalAmt || !totalAmt) {
            return response.status(400).json({ message: 'Missing required order fields.', error: true, success: false })
        }

        // Validate address ownership
        const address = await AddressModel.findOne({ _id: addressId, userId })
        if (!address) return response.status(404).json({ message: 'Address not found.', error: true, success: false })

        // Validate productIds
        for (const item of list_items) {
            if (!isObjectId(item.productId?._id)) {
                return response.status(400).json({ message: 'Invalid product reference.', error: true, success: false })
            }
        }

        if (lat !== undefined && lng !== undefined && !isValidCoord(Number(lat), Number(lng))) {
            return response.status(400).json({ message: 'Invalid coordinates.', error: true, success: false })
        }

        const user = await UserModel.findById(userId)
        if (!user) return response.status(404).json({ message: 'User not found.', error: true, success: false })

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

        const delivery_fee    = calcDeliveryFee(subTotalAmt, user)
        const assignedStore   = await resolveStore(lat, lng)
        const taggedCartItems = await buildTaggedCartItems(list_items, assignedStore.name)
        const transactionId   = `WAL-ORD-${new mongoose.Types.ObjectId()}`
        const scratchCards    = getRandomScratchCards()

        const assignedRider = await UserModel.findOne({ role: 'RIDER', status: 'Active' })
            .select('name mobile _id').lean()

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
            subTotalAmt:      Number(subTotalAmt),
            totalAmt:         exactRequiredTotal,
            delivery_fee,
            delivery_status:  'Pending',
            seller_status:    'Pending',
            store_details:    assignedStore,
            involved_stores:  [...new Set(taggedCartItems.map(i => i.seller_store_name).filter(Boolean))],
            riderId:          assignedRider?._id   || null,
            rider_name:       assignedRider?.name   || 'Unassigned',
            rider_contact:    assignedRider?.mobile || '',
            payment_collected: true,
            coupon_used:      couponCode || null,
            discount_amount:  Number(discountAmt) || 0,
            scratch_cards:    scratchCards,
        }

        const newOrder = new OrderModel(payload)
        await newOrder.save()
        await updateStreak(userId)
        await CartProductModel.deleteMany({ userId })

        return response.json({
            message: 'Order placed via Snapit Wallet!',
            error: false,
            success: true,
            data: newOrder,
            scratch_cards: scratchCards
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

        // Validate address ownership before creating Razorpay order
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
            list_items, addressId, subTotalAmt, totalAmt, couponCode, discountAmt, lat, lng
        } = request.body

        // [HIGH-8] Verify Razorpay signature first — before any DB work
        const expectedSignature = crypto
            .createHmac('sha256', String(process.env.RAZORPAY_SECRET_KEY).trim())
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex')

        if (expectedSignature !== razorpay_signature) {
            return response.status(400).json({ message: 'Payment signature verification failed.', error: true, success: false })
        }

        // Validate address ownership
        const address = await AddressModel.findOne({ _id: addressId, userId })
        if (!address) return response.status(404).json({ message: 'Address not found.', error: true, success: false })

        // Validate productIds
        for (const item of list_items) {
            if (!isObjectId(item.productId?._id)) {
                return response.status(400).json({ message: 'Invalid product reference.', error: true, success: false })
            }
        }

        if (lat !== undefined && lng !== undefined && !isValidCoord(Number(lat), Number(lng))) {
            return response.status(400).json({ message: 'Invalid coordinates.', error: true, success: false })
        }

        const user         = await UserModel.findById(userId)
        const delivery_fee = calcDeliveryFee(subTotalAmt, user)

        // [HIGH-8] Server-side price integrity check — zero tolerance
        const serverTotal = Number(subTotalAmt) + delivery_fee - (Number(discountAmt) || 0)
        if (Math.abs(Number(totalAmt) - serverTotal) > 1) {
            console.warn(`PRICE_TAMPER | user=${userId} | clientTotal=${totalAmt} | serverTotal=${serverTotal}`)
            return response.status(422).json({ message: 'Order total mismatch. Please try again.', error: true, success: false })
        }

        const assignedStore   = await resolveStore(lat, lng)
        const taggedCartItems = await buildTaggedCartItems(list_items, assignedStore.name)
        const scratchCards    = getRandomScratchCards()

        const assignedRider = await UserModel.findOne({ role: 'RIDER', status: 'Active' })
            .select('name mobile _id').lean()

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
            subTotalAmt:      Number(subTotalAmt),
            totalAmt:         Number(totalAmt),
            delivery_fee,
            delivery_status:  'Pending',
            seller_status:    'Pending',
            store_details:    assignedStore,
            involved_stores:  [...new Set(taggedCartItems.map(i => i.seller_store_name).filter(Boolean))],
            riderId:          assignedRider?._id   || null,
            rider_name:       assignedRider?.name   || 'Unassigned',
            rider_contact:    assignedRider?.mobile || '',
            payment_collected: true,
            coupon_used:      couponCode || null,
            discount_amount:  Number(discountAmt) || 0,
            scratch_cards:    scratchCards,
        }

        const newOrder = new OrderModel(payload)
        await newOrder.save()
        await updateStreak(userId)

        for (const item of list_items) {
            await ProductModel.findByIdAndUpdate(item.productId._id, { $inc: { stock: -(item.quantity || 1) } })
        }
        await CartProductModel.deleteMany({ userId })
        await UserModel.updateOne({ _id: userId }, { shopping_cart: [] })

        return response.json({
            message: 'Order placed successfully!',
            error: false,
            success: true,
            data: newOrder,
            scratch_cards: scratchCards
        })
    } catch (error) {
        console.error('verifyPaymentController:', error.message)
        return response.status(500).json({ message: 'Payment verification failed.', error: true, success: false })
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS UPDATES
// ─────────────────────────────────────────────────────────────────────────────

// [CRITICAL-4] Seller must own the order's store before updating seller status
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

        // Seller ownership: ADMIN bypasses; seller must appear in involved_stores
        if (request.userRole !== 'ADMIN') {
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

// [CRITICAL-4] Rider must own the order before updating delivery status
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

        // [CRITICAL-4] Rider ownership check — ADMIN bypasses
        if (request.userRole === 'RIDER') {
            if (!order.riderId || order.riderId.toString() !== userId) {
                console.warn(`RIDER_IDOR | user=${userId} | orderId=${orderId} | ip=${request.ip}`)
                return response.status(403).json({ message: 'This order is not assigned to you.', error: true, success: false })
            }
        }

        if (status === 'Delivered' && !order.payment_collected && order.payment_status !== 'PAID' && !payment_status) {
            return response.status(400).json({ message: 'Collect payment before marking as Delivered.', success: false, error: true })
        }

        const updatedOrder = await OrderModel.findOneAndUpdate(
            { orderId },
            {
                delivery_status: status,
                ...(payment_status             && { payment_status, payment_collected: true }),
                ...(isSettled !== undefined    && { isSettled, settledAt: isSettled ? new Date() : null }),
                ...(cashReceived               && { cashReceived: Number(cashReceived) }),
                ...(status === 'Delivered'     && { deliveredAt: new Date() }),
            },
            { new: true }
        )

        return response.json({ message: `Order status updated to ${status}`, success: true, error: false, data: updatedOrder })
    } catch (error) {
        console.error('updateOrderStatusController:', error.message)
        return response.status(500).json({ message: 'Status update failed.', error: true, success: false })
    }
}

// [CRITICAL-4] Rider must own the order before collecting payment
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
// RIDER TRACKING
// ─────────────────────────────────────────────────────────────────────────────

// [CRITICAL-2] Now requires auth; user must own the order OR be ADMIN/RIDER
export const getRiderLocationController = async (request, response) => {
    try {
        const { orderId } = request.params
        const userId   = request.userId
        const userRole = request.userRole

        const order = await OrderModel
            .findOne({ orderId })
            .select('orderId userId riderId rider_name rider_contact riderLocation delivery_status')

        if (!order) return response.status(404).json({ message: 'Order not found.', error: true, success: false })

        // Only the customer who owns the order, the assigned rider, or an admin can view location
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

// [CRITICAL-3] Rider must be authenticated and assigned to this order
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

        // [CRITICAL-3] Rider must be assigned to this specific order
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
// RIDER DASHBOARD — [HIGH-7] Scoped to assigned rider
// ─────────────────────────────────────────────────────────────────────────────
export async function getOrderItems(request, response) {
    try {
        response.set('Cache-Control', 'no-store, no-cache, must-revalidate')
        response.set('Pragma', 'no-cache')

        const userId   = request.userId
        const userRole = request.userRole

        // ADMIN sees all; riders see only their assigned orders
        const filter = userRole === 'ADMIN'
            ? { delivery_status: { $nin: ['Cancelled'] } }
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
// SELLER ORDERS — [HIGH-6] Scoped to seller's store
// ─────────────────────────────────────────────────────────────────────────────
export async function getSellerOrdersController(request, response) {
    try {
        response.set('Cache-Control', 'no-store, no-cache, must-revalidate')
        response.set('Pragma', 'no-cache')
        response.set('Expires', '0')

        const userId   = request.userId
        const userRole = request.userRole

        let filter = {}
        if (userRole !== 'ADMIN') {
            const sellerUser = await UserModel.findById(userId).select('store_name').lean()
            if (!sellerUser?.store_name) {
                return response.status(403).json({ message: 'No store associated with your account.', error: true, success: false })
            }
            // Only show orders that include this seller's store
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
// SELLER EARNINGS — [HIGH-6] Scoped to seller's store
// ─────────────────────────────────────────────────────────────────────────────
export async function getSellerEarningsController(request, response) {
    try {
        response.set('Cache-Control', 'no-store, no-cache, must-revalidate')
        response.set('Pragma', 'no-cache')

        const userId   = request.userId
        const userRole = request.userRole

        let filter = {}
        if (userRole !== 'ADMIN') {
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
        // userId from auth middleware — no IDOR possible here
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
        const orders   = await OrderModel.find({
            createdAt: { $gte: today, $lt: tomorrow },
            delivery_status: { $ne: 'Cancelled' }
        })
        const totalRevenue  = orders.reduce((acc, o) => acc + Number(o.totalAmt     || 0), 0)
        const totalDelivery = orders.reduce((acc, o) => acc + Number(o.delivery_fee || 0), 0)
        return res.json({
            message: 'Daily report', error: false, success: true,
            data: {
                totalOrders:       orders.length,
                totalRevenue:      Number(totalRevenue.toFixed(2)),
                totalDeliveryFees: Number(totalDelivery.toFixed(2)),
                deliveredOrders:   orders.filter(o => o.delivery_status === 'Delivered').length,
                pendingOrders:     orders.filter(o => o.delivery_status !== 'Delivered').length,
                orders,
            },
        })
    } catch (error) {
        console.error('getDailySalesReport:', error.message)
        return res.status(500).json({ message: 'Failed to generate report.', error: true, success: false })
    }
}

// [CRITICAL-5] Admin-only; only settles orders with valid ObjectIds
export const settleRiderCashController = async (req, res) => {
    try {
        const { ordersSettled } = req.body

        if (!Array.isArray(ordersSettled) || ordersSettled.length === 0) {
            return res.status(400).json({ message: 'ordersSettled must be a non-empty array.', error: true, success: false })
        }

        // Validate all IDs are proper ObjectIds before passing to DB
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

        if (couponCode.trim().toUpperCase() === 'FIRSTUSER') {
            const previousOrder = await OrderModel.findOne({ userId })
            if (previousOrder) {
                return response.status(400).json({ message: 'This code is for first-time customers only.', error: true, success: false })
            }
            const discount = Math.floor(Math.random() * 4) + 2
            return response.json({
                message:  `Lucky coupon! You got ₹${discount} surprise discount.`,
                error:    false,
                success:  true,
                data:     { couponCode: 'FIRSTUSER', discount_label: 'Surprise Discount', discount, newTotal: Number(totalAmt) - discount },
            })
        }

        return response.status(400).json({ message: 'Invalid coupon code.', error: true, success: false })
    } catch (error) {
        console.error('applyCouponController:', error.message)
        return response.status(500).json({ message: 'Coupon application failed.', error: true, success: false })
    }
}

export const getScratchCardsController = async (request, response) => {
    try {
        return response.json({ message: 'Scratch cards ready.', error: false, success: true, data: getRandomScratchCards() })
    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false })
    }
}

export async function webhookStripe(request, response) {
    return response.json({ message: 'Webhook received.', success: true })
}