import { Router } from 'express'
import auth from '../middleware/auth.js'
import { admin, seller, rider } from '../middleware/Admin.js'
import {
    CashOnDeliveryOrderController,
    WalletPaymentOrderController,
    getOrderDetailsController,
    getSellerOrdersController,
    paymentController,
    verifyPaymentController,
    webhookStripe,
    updateOrderStatusController,
    getRiderLocationController,
    updateSellerOrderStatusController,
    getDailySalesReport,
    settleRiderCashController,
    getLastOrder,
    collectPaymentController,
    applyCouponController,
    getScratchCardsController,
    getOrderItems
} from '../controllers/order.controller.js'

const orderRouter = Router()

// ── Customer routes ──────────────────────────────────────────
orderRouter.post("/cash-on-delivery",   auth, CashOnDeliveryOrderController)
orderRouter.post("/wallet-order",       auth, WalletPaymentOrderController)
orderRouter.post('/checkout',           auth, paymentController)
orderRouter.post('/verify-payment',     auth, verifyPaymentController)
orderRouter.post('/webhook',            webhookStripe)
orderRouter.get("/order-list",          auth, getOrderDetailsController)
orderRouter.get("/order-items",         auth, getOrderItems)
orderRouter.get('/last-order',          auth, getLastOrder)
orderRouter.post("/coupon/apply",       auth, applyCouponController)
orderRouter.get("/scratch-cards",       auth, getScratchCardsController)

// ── Admin only ───────────────────────────────────────────────
orderRouter.get("/daily-report",        auth, admin,  getDailySalesReport)
orderRouter.post("/settle-cash",        auth, admin,  settleRiderCashController)

// ── Seller only ──────────────────────────────────────────────
orderRouter.get("/seller-orders",         auth, seller, getSellerOrdersController)
orderRouter.post("/update-seller-status", auth, seller, updateSellerOrderStatusController)

// ── Rider only ───────────────────────────────────────────────
orderRouter.post("/get-rider-location",   auth, rider, getRiderLocationController)
orderRouter.put("/update-status",         auth, rider, updateOrderStatusController)
orderRouter.post("/collect-payment",      auth, rider, collectPaymentController)

export default orderRouter