import OrderModel from '../models/order.model.js'
import RestaurantModel from '../models/restaurant.model.js'
import { sendOrderDeliveredEmail } from '../utils/sendDeliveryEmail.js'

// GET /api/order/admin/restaurant-orders  (admin — all food orders)
export async function getRestaurantOrdersController(req, res) {
  try {
    const orders = await OrderModel
      .find({ orderId: /^FOOD-/ })
      .populate('userId', 'name email mobile')
      .populate('delivery_address')
      .sort({ createdAt: -1 })
      .lean()

    return res.json({ success: true, data: orders })
  } catch (err) {
    console.error('[getRestaurantOrders]', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// GET /api/order/resto-seller/orders  (seller — only their restaurant's orders)
// Matches by store_details.name because food orders don't store restaurantId
export async function getRestoSellerOrdersController(req, res) {
  try {
    const restaurantId = req.user?.restaurantId
    if (!restaurantId) {
      return res.status(403).json({ success: false, message: 'No restaurant linked to your account' })
    }

    // Look up the restaurant name so we can match store_details.name
    const restaurant = await RestaurantModel.findById(restaurantId).lean()
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' })
    }

    const orders = await OrderModel
      .find({ orderId: /^FOOD-/, 'store_details.name': restaurant.name })
      .populate('userId', 'name email mobile')
      .populate('delivery_address')
      .sort({ createdAt: -1 })
      .lean()

    return res.json({ success: true, data: orders })
  } catch (err) {
    console.error('[getRestoSellerOrders]', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// PUT /api/order/update-status/:id
export async function updateFoodOrderStatusController(req, res) {
  try {
    const { id } = req.params
    const { delivery_status } = req.body

    const ALLOWED = ['Pending', 'Confirmed', 'Out for Delivery', 'Delivered', 'Cancelled']
    if (!ALLOWED.includes(delivery_status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' })
    }

    const order = await OrderModel.findByIdAndUpdate(
      id,
      { delivery_status },
      { new: true }
    )
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })

    if (delivery_status === 'Delivered') {
      sendOrderDeliveredEmail(order).catch(() => {})
    }

    return res.json({ success: true, data: order })
  } catch (err) {
    console.error('[updateFoodOrderStatus]', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}