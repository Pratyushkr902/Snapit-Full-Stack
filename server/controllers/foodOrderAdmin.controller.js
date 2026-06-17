import OrderModel from '../models/order.model.js'

// GET /api/order/admin/restaurant-orders
export async function getRestaurantOrdersController(req, res) {
  try {
    const orders = await OrderModel
      .find({ payment_mode: { $in: ['COD', 'WALLET', 'ONLINE'] }, 'store_details.name': { $exists: true } })
      .populate('userId', 'name email mobile')
      .populate('delivery_address')
      .sort({ createdAt: -1 })
      .lean()

    // Filter to food orders only — they have no cartItems[].productId (it's menuItemId)
    // Reliable distinguisher: orderId starts with 'FOOD-'
    const foodOrders = orders.filter(o => String(o.orderId).startsWith('FOOD-'))

    return res.json({ success: true, data: foodOrders })
  } catch (err) {
    console.error('[getRestaurantOrders]', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// PUT /api/order/update-status/:id  (used by OrderRow in RestaurantAdminPage)
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

    return res.json({ success: true, data: order })
  } catch (err) {
    console.error('[updateFoodOrderStatus]', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}