import Razorpay from 'razorpay'
import crypto from 'crypto'
import WalletModel from '../models/wallet.model.js'
import UserModel from '../models/user.model.js'

// ✅ FIX: lazy init — only created when a payment function is called, not on startup
const getRazorpayInstance = () => new Razorpay({
    key_id:     String(process.env.RAZORPAY_KEY_ID).trim(),
    key_secret: String(process.env.RAZORPAY_SECRET_KEY).trim()
})

// GET /api/payment/razorpay-key
export const getRazorpayKey = (req, res) => {
    return res.json({
        success: true,
        key: process.env.RAZORPAY_KEY_ID
    })
}

// POST /api/payment/create-order
export const createOrder = async (req, res) => {
    try {
        const { amount } = req.body
        const order = await getRazorpayInstance().orders.create({
            amount:   amount * 100,
            currency: 'INR',
            receipt:  `wallet_${Date.now()}`
        })
        return res.json({ success: true, order })
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message })
    }
}

// POST /api/payment/verify-wallet
export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, userId } = req.body

        if (!userId) {
            return res.status(400).json({ success: false, message: 'Missing explicit user reference payload context' })
        }

        const sign = razorpay_order_id + '|' + razorpay_payment_id
        const expected = crypto
            .createHmac('sha256', String(process.env.RAZORPAY_SECRET_KEY).trim())
            .update(sign)
            .digest('hex')

        if (expected !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Invalid payment signature' })
        }

        await WalletModel.findOneAndUpdate(
            { userId },
            { $inc: { balance: Number(amount) } },
            { upsert: true, new: true }
        )

        return res.json({ success: true, message: `₹${amount} added to wallet!` })
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message })
    }
}

// POST /api/payment/subscribe-snapitplus
export const createSubscriptionOrder = async (req, res) => {
    try {
        const { planType, userId } = req.body
        const targetUser = userId || req.userId
        const rawAmount = planType === 'yearly' ? 899 : 99

        const order = await getRazorpayInstance().orders.create({
            amount:  rawAmount * 100,
            currency: 'INR',
            receipt: `sub_${planType}_${targetUser}_${Date.now()}`
        })

        return res.json({ success: true, order })
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message })
    }
}

// POST /api/payment/verify-subscription
export const verifySubscription = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planType, userId } = req.body

        if (!userId) {
            return res.status(400).json({ success: false, message: 'Missing user contextual routing parameters' })
        }

        const sign = razorpay_order_id + '|' + razorpay_payment_id
        const expected = crypto
            .createHmac('sha256', String(process.env.RAZORPAY_SECRET_KEY).trim())
            .update(sign)
            .digest('hex')

        if (expected !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Invalid subscription payment signature' })
        }

        const expirationDate = new Date()
        if (planType === 'yearly') {
            expirationDate.setFullYear(expirationDate.getFullYear() + 1)
        } else {
            expirationDate.setMonth(expirationDate.getMonth() + 1)
        }

        await UserModel.findByIdAndUpdate(userId, {
            isSnapitPlusMember:  true,
            snapitPlusExpiresAt: expirationDate
        })

        return res.json({
            success: true,
            message: "Welcome to Snapit Plus! Your subscription benefits are active immediately."
        })
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message })
    }
}