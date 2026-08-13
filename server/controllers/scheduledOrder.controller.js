import ScheduledOrderModel from '../models/scheduledOrder.model.js'
import AddressModel from '../models/address.model.js'

const isObjectId = (id) => /^[a-fA-F0-9]{24}$/.test(String(id))

// ─────────────────────────────────────────────────────────────────────────────
// CREATE SCHEDULED ORDER
// ─────────────────────────────────────────────────────────────────────────────
export const createScheduledOrderController = async (request, response) => {
    try {
        const userId = request.userId
        const { addressId, cartItems, frequency, paymentMode, startDate } = request.body

        if (!addressId || !isObjectId(addressId)) {
            return response.status(400).json({ message: 'Valid addressId is required.', error: true, success: false })
        }
        if (!Array.isArray(cartItems) || cartItems.length === 0) {
            return response.status(400).json({ message: 'cartItems must be a non-empty array.', error: true, success: false })
        }
        if (!['DAILY', 'WEEKLY'].includes(frequency)) {
            return response.status(400).json({ message: 'frequency must be DAILY or WEEKLY.', error: true, success: false })
        }

        const address = await AddressModel.findOne({ _id: addressId, userId })
        if (!address) {
            return response.status(404).json({ message: 'Address not found.', error: true, success: false })
        }

        const validPaymentMode = ['COD', 'WALLET'].includes(paymentMode) ? paymentMode : 'COD'

        const nextRunAt = startDate ? new Date(startDate) : new Date()
        if (isNaN(nextRunAt.getTime())) {
            return response.status(400).json({ message: 'Invalid startDate.', error: true, success: false })
        }

        const scheduled = new ScheduledOrderModel({
            userId,
            addressId,
            cartItems,
            frequency,
            paymentMode: validPaymentMode,
            nextRunAt,
            isActive: true,
        })
        await scheduled.save()

        return response.json({
            message: 'Scheduled order created.',
            error: false,
            success: true,
            data: scheduled
        })
    } catch (error) {
        console.error('createScheduledOrderController:', error.message)
        return response.status(500).json({ message: 'Failed to create scheduled order.', error: true, success: false })
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST MY SCHEDULED ORDERS
// ─────────────────────────────────────────────────────────────────────────────
export const getMyScheduledOrdersController = async (request, response) => {
    try {
        const userId = request.userId
        const schedules = await ScheduledOrderModel
            .find({ userId })
            .populate('addressId')
            .sort({ createdAt: -1 })

        return response.json({
            message: 'Scheduled orders fetched.',
            error: false,
            success: true,
            data: schedules
        })
    } catch (error) {
        console.error('getMyScheduledOrdersController:', error.message)
        return response.status(500).json({ message: 'Failed to fetch scheduled orders.', error: true, success: false })
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CANCEL / DEACTIVATE A SCHEDULED ORDER
// ─────────────────────────────────────────────────────────────────────────────
export const cancelScheduledOrderController = async (request, response) => {
    try {
        const userId = request.userId
        const { id } = request.params

        if (!isObjectId(id)) {
            return response.status(400).json({ message: 'Invalid schedule id.', error: true, success: false })
        }

        const schedule = await ScheduledOrderModel.findOne({ _id: id, userId })
        if (!schedule) {
            return response.status(404).json({ message: 'Scheduled order not found.', error: true, success: false })
        }

        schedule.isActive = false
        await schedule.save()

        return response.json({
            message: 'Scheduled order cancelled.',
            error: false,
            success: true
        })
    } catch (error) {
        console.error('cancelScheduledOrderController:', error.message)
        return response.status(500).json({ message: 'Failed to cancel scheduled order.', error: true, success: false })
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PAUSE / RESUME (optional toggle, reuses isActive)
// ─────────────────────────────────────────────────────────────────────────────
export const toggleScheduledOrderController = async (request, response) => {
    try {
        const userId = request.userId
        const { id } = request.params

        if (!isObjectId(id)) {
            return response.status(400).json({ message: 'Invalid schedule id.', error: true, success: false })
        }

        const schedule = await ScheduledOrderModel.findOne({ _id: id, userId })
        if (!schedule) {
            return response.status(404).json({ message: 'Scheduled order not found.', error: true, success: false })
        }

        schedule.isActive = !schedule.isActive
        await schedule.save()

        return response.json({
            message: `Scheduled order ${schedule.isActive ? 'resumed' : 'paused'}.`,
            error: false,
            success: true,
            data: { isActive: schedule.isActive }
        })
    } catch (error) {
        console.error('toggleScheduledOrderController:', error.message)
        return response.status(500).json({ message: 'Failed to update scheduled order.', error: true, success: false })
    }
}
