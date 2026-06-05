import Razorpay from 'razorpay'
import crypto from 'crypto'
import UserModel from '../models/user.model.js'

// Lazy init — only created when a payment function is called
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
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount' })
        }
        const order = await getRazorpayInstance().orders.create({
            amount:   Math.round(amount * 100), // paise, must be integer
            currency: 'INR',
            receipt:  `wallet_${req.userId}_${Date.now()}`
        })
        return res.json({ success: true, order })
    } catch (err) {
        console.error('createOrder error:', err)
        return res.status(500).json({ success: false, message: err.message })
    }
}

// POST /api/payment/verify-wallet
// ✅ FIX: Use req.userId from auth middleware (NOT req.body.userId)
// ✅ FIX: Credit UserModel.walletBalance (NOT WalletModel) — stays consistent with walletController
export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body
        const userId = req.userId  // ← FROM AUTH MIDDLEWARE

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Missing payment fields' })
        }

        // Verify signature
        const sign = razorpay_order_id + '|' + razorpay_payment_id
        const expected = crypto
            .createHmac('sha256', String(process.env.RAZORPAY_SECRET_KEY).trim())
            .update(sign)
            .digest('hex')

        if (expected !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Invalid payment signature' })
        }

        const numAmount = parseFloat(amount)
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount' })
        }

        // 5% bonus for ₹500+
        const bonus = numAmount >= 500 ? Math.floor(numAmount * 0.05) : 0
        const totalCredit = numAmount + bonus

        const transaction = {
            type: 'credit',
            amount: totalCredit,
            description: bonus > 0
                ? `Wallet recharge ₹${numAmount} + ₹${bonus} bonus (Razorpay: ${razorpay_payment_id})`
                : `Wallet recharge ₹${numAmount} (Razorpay: ${razorpay_payment_id})`,
            date: new Date()
        }

        // ✅ FIX: Update UserModel.walletBalance — same model wallet.controller.js uses
        const user = await UserModel.findByIdAndUpdate(
            userId,
            {
                $inc: { walletBalance: totalCredit },
                $push: { walletTransactions: { $each: [transaction], $position: 0 } }
            },
            { new: true, select: 'walletBalance' }
        )

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' })
        }

        return res.json({
            success: true,
            message: bonus > 0
                ? `₹${totalCredit} added! (includes ₹${bonus} bonus) 🎉`
                : `₹${numAmount} added to wallet! 🎉`,
            data: { balance: user.walletBalance, bonus }
        })
    } catch (err) {
        console.error('verifyPayment error:', err)
        return res.status(500).json({ success: false, message: err.message })
    }
}

// POST /api/payment/subscribe-snapitplus
export const createSubscriptionOrder = async (req, res) => {
    try {
        const { planType } = req.body
        const userId = req.userId  // ← FROM AUTH MIDDLEWARE

        const plans = { monthly: 99, yearly: 899 }
        const rawAmount = plans[planType]

        if (!rawAmount) {
            return res.status(400).json({ success: false, message: 'Invalid plan. Use monthly or yearly.' })
        }

        const order = await getRazorpayInstance().orders.create({
            amount:   rawAmount * 100,
            currency: 'INR',
            receipt:  `sub_${planType}_${userId}_${Date.now()}`
        })

        return res.json({ success: true, order, amount: rawAmount })
    } catch (err) {
        console.error('createSubscriptionOrder error:', err)
        return res.status(500).json({ success: false, message: err.message })
    }
}

// POST /api/payment/verify-subscription
// ✅ FIX: Use req.userId from auth middleware (NOT req.body.userId)
export const verifySubscription = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planType } = req.body
        const userId = req.userId  // ← FROM AUTH MIDDLEWARE

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Missing payment fields' })
        }

        // Verify signature
        const sign = razorpay_order_id + '|' + razorpay_payment_id
        const expected = crypto
            .createHmac('sha256', String(process.env.RAZORPAY_SECRET_KEY).trim())
            .update(sign)
            .digest('hex')

        if (expected !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Invalid subscription payment signature' })
        }

        const expiresAt = new Date()
        if (planType === 'yearly') {
            expiresAt.setFullYear(expiresAt.getFullYear() + 1)
        } else {
            expiresAt.setMonth(expiresAt.getMonth() + 1)
        }

        await UserModel.findByIdAndUpdate(userId, {
            isSnapitPlusMember:  true,
            snapitPlusExpiresAt: expiresAt
        })

        return res.json({
            success: true,
            message: `Welcome to Snapit Plus! Your ${planType} subscription is now active. ✨`,
            data: { planType, expiresAt }
        })
    } catch (err) {
        console.error('verifySubscription error:', err)
        return res.status(500).json({ success: false, message: err.message })
    }
}