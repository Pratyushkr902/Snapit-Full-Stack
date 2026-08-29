import OrderModel from '../models/order.model.js'
import RiderDutyModel from '../models/riderDuty.model.js'

export async function getPublicTrackingController(req, res) {
  try {
    const { token } = req.params
    if (!token) {
      return res.status(400).json({ success: false, message: 'Tracking token or order ID required' })
    }

    const order = await OrderModel.findOne({
      $or: [
        { shareable_tracking_token: token },
        { orderId: token }
      ]
    })
    .populate('delivery_address')
    .populate('cartItems.productId', 'name image')
    .lean()

    if (!order) {
      return res.status(404).json({ success: false, message: 'Delivery tracking link expired or not found' })
    }

    // Get live rider GPS if assigned and on duty
    let riderLiveCoords = null
    if (order.riderId) {
      const duty = await RiderDutyModel.findOne({ riderId: order.riderId }).lean()
      if (duty && duty.currentLat && duty.currentLng) {
        riderLiveCoords = {
          lat: duty.currentLat,
          lng: duty.currentLng,
          lastUpdated: duty.lastGpsPingAt || duty.updatedAt
        }
      }
    }

    const destinationLat = order.delivery_lat || order.delivery_address?.lat || 25.2921
    const destinationLng = order.delivery_lng || order.delivery_address?.lng || 84.8170

    const formattedResponse = {
      orderId: order.orderId,
      createdAt: order.createdAt,
      delivery_status: order.delivery_status,
      seller_status: order.seller_status,
      payment_status: order.payment_status,
      totalAmt: order.totalAmt,
      order_for: order.order_for || 'SELF',
      recipient_name: order.recipient_name || 'Customer',
      recipient_mobile: order.recipient_mobile || '',
      delivery_instructions: order.delivery_instructions || '',
      delivery_address: {
        address_line: order.delivery_address?.address_line || '',
        city: order.delivery_address?.city || 'Paliganj',
        landmark: order.delivery_address?.landmark || '',
        lat: destinationLat,
        lng: destinationLng,
      },
      store_details: {
        name: order.store_details?.name || (order.isRestaurantOrder ? 'Restaurant' : 'Snapit Dark Store'),
        lat: order.store_details?.location?.lat || order.store_details?.lat || 25.3312,
        lng: order.store_details?.location?.lng || order.store_details?.lng || 84.8006,
      },
      rider: {
        name: order.rider_name !== 'Unassigned' ? order.rider_name : null,
        contact: order.rider_contact || null,
        liveCoords: riderLiveCoords,
      },
      items: ((order.cartItems && order.cartItems.length > 0) ? order.cartItems : (order.product_details?.name ? [order.product_details] : [])).map(it => {
        const rawImg = it.image || it.productId?.image || (order.product_details?.image)
        const displayImg = Array.isArray(rawImg) ? rawImg[0] : (rawImg || '')
        return {
          name: it.name || it.productId?.name || order.product_details?.name || 'Item',
          quantity: it.quantity || 1,
          price: it.price || 0,
          image: displayImg,
        }
      })
    }

    return res.json({
      success: true,
      message: 'Live tracking data loaded',
      data: formattedResponse,
    })
  } catch (error) {
    console.error('[getPublicTrackingController]', error.message)
    return res.status(500).json({ success: false, message: 'Failed to load tracking data' })
  }
}
