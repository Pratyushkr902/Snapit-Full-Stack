import OrderModel from '../models/order.model.js'
import UserModel from '../models/user.model.js'
import Razorpay from 'razorpay'
import crypto from 'crypto'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

const genOrderId = () => 'FOOD-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase()

const buildCartItems = (items) =>
  (items || []).map(i => ({
    productId: i.menuItemId,
    name: i.name,
    image: i.image || '',
    price: Number(i.price),
    sellerPrice: Number(i.price),
    snapitMargin: 0,
    quantity: Number(i.quantity),
    seller_store_name: null,
  }))

// POST /api/restaurant/food-order/cash-on-delivery
export async function foodOrderCOD(req, res) {
  try {
    const { restaurantId, restaurantName, addressId, items, subTotalAmt, delivery_fee, totalAmt, deliveryLocation } = req.body
    if (!items?.length) return res.status(400).json({ success: false, message: 'No items in order' })
    if (!addressId) return res.status(400).json({ success: false, message: 'Address required' })

    const order = new OrderModel({
      userId: req.user._id,
      orderId: genOrderId(),
      cartItems: buildCartItems(items),
      product_details: { name: restaurantName || 'Food Order', image: [] },
      payment_status: 'CASH ON DELIVERY',
      payment_mode: 'COD',
      delivery_address: addressId,
      subTotalAmt: Number(subTotalAmt),
      delivery_fee: Number(delivery_fee || 0),
      totalAmt: Number(totalAmt),
      store_details: {
        name: restaurantName || 'Restaurant',
        address: '',
        location: { lat: deliveryLocation?.lat || 25.2921, lng: deliveryLocation?.lng || 84.817 },
      },
      delivery_status: 'Pending',
    })
    await order.save()
    return res.json({ success: true, message: 'Food order placed!', data: order })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, message: err.message })
  }
}

// POST /api/restaurant/food-order/wallet
export async function foodOrderWallet(req, res) {
  try {
    const { restaurantId, restaurantName, addressId, items, subTotalAmt, delivery_fee, totalAmt, deliveryLocation } = req.body
    if (!items?.length) return res.status(400).json({ success: false, message: 'No items in order' })
    if (!addressId) return res.status(400).json({ success: false, message: 'Address required' })

    const user = await UserModel.findById(req.user._id)
    const amount = Number(totalAmt)
    if (Number(user.walletBalance || 0) < amount)
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' })

    user.walletBalance = Number(user.walletBalance) - amount
    await user.save()

    const order = new OrderModel({
      userId: req.user._id,
      orderId: genOrderId(),
      cartItems: buildCartItems(items),
      product_details: { name: restaurantName || 'Food Order', image: [] },
      paymentId: 'WALLET-' + Date.now(),
      payment_status: 'PAID',
      payment_mode: 'WALLET',
      delivery_address: addressId,
      subTotalAmt: Number(subTotalAmt),
      delivery_fee: Number(delivery_fee || 0),
      totalAmt: amount,
      store_details: {
        name: restaurantName || 'Restaurant',
        address: '',
        location: { lat: deliveryLocation?.lat || 25.2921, lng: deliveryLocation?.lng || 84.817 },
      },
      delivery_status: 'Confirmed',
    })
    await order.save()
    return res.json({ success: true, message: 'Paid via wallet!', data: order })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, message: err.message })
  }
}

// POST /api/restaurant/food-order/create-payment
export async function foodOrderCreatePayment(req, res) {
  try {
    const { totalAmt } = req.body
    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(Number(totalAmt) * 100),
      currency: 'INR',
      receipt: genOrderId(),
    })
    return res.json(rzpOrder)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, message: err.message })
  }
}

// POST /api/restaurant/food-order/verify-payment
export async function foodOrderVerifyPayment(req, res) {
  try {
    const {
      razorpay_order_id, razorpay_payment_id, razorpay_signature,
      restaurantId, restaurantName, addressId, items, subTotalAmt, delivery_fee, totalAmt, deliveryLocation
    } = req.body

    const body = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSig = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex')
    if (expectedSig !== razorpay_signature)
      return res.status(400).json({ success: false, message: 'Payment verification failed' })

    const order = new OrderModel({
      userId: req.user._id,
      orderId: genOrderId(),
      cartItems: buildCartItems(items),
      product_details: { name: restaurantName || 'Food Order', image: [] },
      paymentId: razorpay_payment_id,
      payment_status: 'PAID',
      payment_mode: 'ONLINE',
      delivery_address: addressId,
      subTotalAmt: Number(subTotalAmt),
      delivery_fee: Number(delivery_fee || 0),
      totalAmt: Number(totalAmt),
      store_details: {
        name: restaurantName || 'Restaurant',
        address: '',
        location: { lat: deliveryLocation?.lat || 25.2921, lng: deliveryLocation?.lng || 84.817 },
      },
      delivery_status: 'Confirmed',
    })
    await order.save()
    return res.json({ success: true, message: 'Food order placed!', data: order })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, message: err.message })
  }
}