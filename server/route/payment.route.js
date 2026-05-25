import express from 'express'
import { getRazorpayKey, createOrder, verifyPayment } from '../controllers/payment.controller.js'
import auth from '../middleware/auth.js'

const router = express.Router()

router.get('/razorpay-key', auth, getRazorpayKey)
router.post('/create-order', auth, createOrder)
router.post('/verify-wallet', auth, verifyPayment)

export default router