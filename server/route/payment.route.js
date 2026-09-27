import express from 'express'
import { 
    getRazorpayKey, 
    createOrder, 
    verifyPayment, 
    createSubscriptionOrder,
    verifySubscription,
    subscribeWithWallet
} from '../controllers/payment.controller.js'
import auth from '../middleware/auth.js'

const router = express.Router()

router.get('/razorpay-key', auth, getRazorpayKey)
router.post('/create-order', auth, createOrder)
router.post('/verify-wallet', auth, verifyPayment)

// --- SNAPIT PLUS CORE SUBSCRIPTION MODULES ---
router.post('/subscribe-snapitplus', auth, createSubscriptionOrder)
router.post('/verify-subscription', auth, verifySubscription)
router.post('/subscribe-wallet', auth, subscribeWithWallet)

export default router;