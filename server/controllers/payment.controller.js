import Razorpay from 'razorpay'
import crypto from 'crypto'
import WalletModel from '../models/wallet.model.js'

const razorpay = new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
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
        const order = await razorpay.orders.create({
            amount:   amount * 100, // paise
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
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body

        // Verify signature
        const sign = razorpay_order_id + '|' + razorpay_payment_id
        const expected = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(sign)
            .digest('hex')

        if (expected !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Invalid payment signature' })
        }

        // Credit wallet
        await WalletModel.findOneAndUpdate(
            { userId: req.userId },
            { $inc: { balance: amount } },
            { upsert: true, new: true }
        )

        return res.json({ success: true, message: `₹${amount} added to wallet!` })
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message })
    }
}