import OrderModel from '../models/order.model.js'
import UserModel  from '../models/user.model.js'
import Razorpay   from 'razorpay'
import crypto     from 'crypto'

const getRazorpay = () => new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,   // ✅ single consistent name
})

const genOrderId = () =>
  'FOOD-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase()

const buildCartItems = (items) =>
  (items || []).map(i => ({
    productId:         i.menuItemId,
    name:              i.name,
    image:             i.image || '',
    price:             Number(i.price),
    sellerPrice:       Number(i.price),
    snapitMargin:      0,
    quantity:          Number(i.quantity),
    seller_store_name: null,
  }))

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

// ── Shared order fields ─────────────────────────────────────────────────────
const buildOrderFields = (userId, fields, extra = {}) => {
  const {
    restaurantName, addressId, items,
    subTotalAmt, delivery_fee, totalAmt,
    deliveryLocation, tip, offerKey, couponCode, couponDiscount,
    walletAmountUsed, deliveryInstructions, scheduledDelivery,
  } = fields

  return {
    userId,
    orderId:      genOrderId(),
    cartItems:    buildCartItems(items),
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

    const order = new OrderModel(buildOrderFields(req.user._id, fields, {
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

    const user = await UserModel.findById(req.user._id)
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    const walletBal = Number(user.walletBalance || 0)
    // ✅ deduct only what the frontend says was used from wallet (grandTotal when paying 100% via wallet)
    const deductAmt = fields.walletAmountUsed > 0 ? fields.walletAmountUsed : fields.totalAmt

    if (walletBal < deductAmt)
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. Have ₹${walletBal}, need ₹${deductAmt}`,
      })

    await deductWallet(req.user._id, deductAmt, fields.restaurantName)

    const order = new OrderModel(buildOrderFields(req.user._id, fields, {
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
    const { totalAmt } = req.body
    if (!totalAmt || Number(totalAmt) <= 0)
      return res.status(400).json({ success: false, message: 'Invalid amount' })

    const rzpOrder = await getRazorpay().orders.create({
      amount:   Math.round(Number(totalAmt) * 100),
      currency: 'INR',
      receipt:  genOrderId(),
    })

    console.log(`[foodOrderCreatePayment] ✅ rzpOrderId=${rzpOrder.id} amount=₹${totalAmt}`)
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
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (expected !== razorpay_signature) {
      console.error('[foodOrderVerifyPayment] ❌ Signature mismatch')
      return res.status(400).json({ success: false, message: 'Payment verification failed' })
    }

    const fields = extractBody(rest)
    if (!fields.items?.length) return res.status(400).json({ success: false, message: 'No items in order' })
    if (!fields.addressId)     return res.status(400).json({ success: false, message: 'Address required' })

    // ✅ deduct partial wallet if used alongside online payment
    await deductWallet(req.user._id, fields.walletAmountUsed, fields.restaurantName)

    const order = new OrderModel(buildOrderFields(req.user._id, fields, {
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