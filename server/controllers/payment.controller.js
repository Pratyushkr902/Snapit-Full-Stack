import Razorpay from 'razorpay'
import crypto from 'crypto'
import UserModel from '../models/user.model.js'
import SubscriptionModel from '../models/subscription.model.js'

// ── Razorpay instance with full validation ─────────────────────────────────
const getRazorpayInstance = () => {
    const key_id     = (process.env.RAZORPAY_KEY_ID     || '').trim()
    const key_secret = (process.env.RAZORPAY_SECRET_KEY || '').trim()

    if (!key_id)     throw new Error('RAZORPAY_KEY_ID is not set in environment variables')
    if (!key_secret) throw new Error('RAZORPAY_SECRET_KEY is not set in environment variables')
    if (!key_id.startsWith('rzp_')) throw new Error(`RAZORPAY_KEY_ID looks invalid: "${key_id.slice(0,8)}..."`)

    return new Razorpay({ key_id, key_secret })
}

// GET /api/payment/razorpay-key
export const getRazorpayKey = (req, res) => {
    const key = (process.env.RAZORPAY_KEY_ID || '').trim()
    if (!key) return res.status(500).json({ success: false, message: 'Razorpay key not configured' })
    return res.json({ success: true, key })
}

// POST /api/payment/create-order
export const createOrder = async (req, res) => {
    try {
        const { amount } = req.body

        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount' })
        }

        const paise = Math.round(Number(amount) * 100)
        console.log(`[createOrder] userId=${req.userId} amount=₹${amount} paise=${paise}`)

        const razorpay = getRazorpayInstance()
        const order = await razorpay.orders.create({
            amount:   paise,
            currency: 'INR',
            receipt:  `w_${Date.now()}`
        })

        console.log(`[createOrder] ✅ order created: ${order.id}`)
        return res.json({ success: true, order })

    } catch (err) {
        const msg = err?.message || err?.error?.description || JSON.stringify(err)
        console.error('[createOrder] ❌', msg)
        return res.status(500).json({ success: false, message: msg })
    }
}

// POST /api/payment/verify-wallet
export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body
        const userId = req.userId

        console.log(`[verifyPayment] userId=${userId} amount=₹${amount}`)

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Missing payment verification fields' })
        }

        const secret = (process.env.RAZORPAY_SECRET_KEY || '').trim()
        const expected = crypto
            .createHmac('sha256', secret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex')

        if (expected !== razorpay_signature) {
            console.error('[verifyPayment] ❌ Signature mismatch')
            return res.status(400).json({ success: false, message: 'Invalid payment signature' })
        }

        const numAmount = parseFloat(amount)
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount' })
        }

        // 5% bonus for ₹500+
        const bonus       = numAmount >= 500 ? Math.floor(numAmount * 0.05) : 0
        const totalCredit = numAmount + bonus

        const transaction = {
            type: 'credit',
            amount: totalCredit,
            description: bonus > 0
                ? `Wallet recharge ₹${numAmount} + ₹${bonus} bonus`
                : `Wallet recharge ₹${numAmount}`,
            date: new Date()
        }

        const user = await UserModel.findByIdAndUpdate(
            userId,
            {
                $inc:  { walletBalance: totalCredit },
                $push: { walletTransactions: { $each: [transaction], $position: 0 } }
            },
            { new: true, select: 'walletBalance' }
        )

        if (!user) return res.status(404).json({ success: false, message: 'User not found' })

        console.log(`[verifyPayment] ✅ ₹${totalCredit} credited. New balance: ₹${user.walletBalance}`)
        return res.json({
            success: true,
            message: bonus > 0
                ? `₹${totalCredit} added! (includes ₹${bonus} bonus) 🎉`
                : `₹${numAmount} added to wallet! 🎉`,
            data: { balance: user.walletBalance, bonus }
        })

    } catch (err) {
        const msg = err?.message || err?.error?.description || JSON.stringify(err)
        console.error('[verifyPayment] ❌', msg)
        return res.status(500).json({ success: false, message: msg })
    }
}

// POST /api/payment/subscribe-snapitplus
export const createSubscriptionOrder = async (req, res) => {
    try {
        const { planType } = req.body
        const userId = req.userId

        console.log(`[createSubscriptionOrder] userId=${userId} planType=${planType}`)

        const plans = { monthly: 99, yearly: 899 }
        const rawAmount = plans[planType]

        if (!rawAmount) {
            return res.status(400).json({ success: false, message: 'Invalid plan. Use "monthly" or "yearly".' })
        }

        const razorpay = getRazorpayInstance()
        const order = await razorpay.orders.create({
            amount:   rawAmount * 100,
            currency: 'INR',
            receipt:  `sub_${planType}_${Date.now()}`
        })

        console.log(`[createSubscriptionOrder] ✅ order created: ${order.id}`)
        return res.json({ success: true, order, amount: rawAmount })

    } catch (err) {
        const msg = err?.message || err?.error?.description || JSON.stringify(err)
        console.error('[createSubscriptionOrder] ❌', msg)
        return res.status(500).json({ success: false, message: msg })
    }
}

// POST /api/payment/verify-subscription
export const verifySubscription = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planType } = req.body
        const userId = req.userId

        console.log(`[verifySubscription] userId=${userId} planType=${planType}`)

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Missing payment verification fields' })
        }

        // ── Verify Razorpay signature ──────────────────────────────────────
        const secret = (process.env.RAZORPAY_SECRET_KEY || '').trim()
        const expected = crypto
            .createHmac('sha256', secret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex')

        if (expected !== razorpay_signature) {
            console.error('[verifySubscription] ❌ Signature mismatch')
            return res.status(400).json({ success: false, message: 'Invalid subscription payment signature' })
        }

        // ── Calculate expiry ───────────────────────────────────────────────
        const expiresAt = new Date()
        if (planType === 'yearly') {
            expiresAt.setFullYear(expiresAt.getFullYear() + 1)
        } else {
            expiresAt.setMonth(expiresAt.getMonth() + 1)
        }

        const planAmount = planType === 'yearly' ? 899 : 99

        // ── 1. Update user membership flag ────────────────────────────────
        await UserModel.findByIdAndUpdate(userId, {
            isSnapitPlusMember:  true,
            snapitPlusExpiresAt: expiresAt
        })

        // ── 2. ✅ FIXED: Create SubscriptionModel record so MySubscriptions
        //        page shows the Snapit Plus membership ─────────────────────
        const nextDeliveryDate = new Date()
        nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 30)

        await SubscriptionModel.create({
            userId,
            items: [{
                name:     `Snapit Plus — ${planType === 'yearly' ? 'Yearly (12 months)' : 'Monthly (30 days)'}`,
                quantity: 1,
                price:    planAmount,
            }],
            frequency:      planType === 'yearly' ? 'yearly' : 'monthly',
            nextDeliveryDate,
            payment_method: 'Online',
            status:         'Active',
            isSnapitPlus:   true,
            planType,
            expiresAt,
            paymentId:      razorpay_payment_id,
            orderId:        razorpay_order_id,
        })

        console.log(`[verifySubscription] ✅ Snapit Plus activated for userId=${userId} until ${expiresAt}`)
        return res.json({
            success: true,
            message: `Welcome to Snapit Plus! Your ${planType} subscription is now active. ✨`,
            data: { planType, expiresAt }
        })

    } catch (err) {
        const msg = err?.message || err?.error?.description || JSON.stringify(err)
        console.error('[verifySubscription] ❌', msg)
        return res.status(500).json({ success: false, message: msg })
    }
}