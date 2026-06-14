import { Router } from "express"
import auth             from "../middleware/auth.js"
import { admin, seller, rider } from "../middleware/Admin.js"
import {
    CashOnDeliveryOrderController,
    WalletPaymentOrderController,
    getOrderDetailsController,
    getSellerOrdersController,
    getSellerEarningsController,
    paymentController,
    verifyPaymentController,
    webhookStripe,
    updateOrderStatusController,
    getRiderLocationController,
    updateRiderLocationController,
    updateSellerOrderStatusController,
    getDailySalesReport,
    settleRiderCashController,
    getLastOrder,
    collectPaymentController,
    applyCouponController,
    getScratchCardsController,
    getOrderItems,
} from "../controllers/order.controller.js"

const orderRouter = Router()

// ── Customer ──────────────────────────────────────────────────────────────────
orderRouter.post("/cash-on-delivery",   auth,        CashOnDeliveryOrderController)
orderRouter.post("/wallet-order",       auth,        WalletPaymentOrderController)
orderRouter.post("/checkout",           auth,        paymentController)
orderRouter.post("/verify-payment",     auth,        verifyPaymentController)
orderRouter.post("/webhook",                         webhookStripe)   // unsigned webhook — Razorpay hits this
orderRouter.get( "/order-list",         auth,        getOrderDetailsController)
orderRouter.get( "/last-order",         auth,        getLastOrder)
orderRouter.post("/coupon/apply",       auth,        applyCouponController)
orderRouter.get( "/scratch-cards",      auth,        getScratchCardsController)

// ── Rider Tracking ────────────────────────────────────────────────────────────
//
// SECURITY FIX (CRITICAL): Both rider-location endpoints now require auth.
//
// Previously both routes had NO middleware:
//   orderRouter.get( "/rider-location/:orderId", getRiderLocationController)
//   orderRouter.post("/rider-location/:orderId", updateRiderLocationController)
//
// Without auth middleware, request.userId and request.userRole are undefined,
// so the ownership checks inside the controllers (isOwner, isRider, isAdmin)
// all evaluated to false — either the 403 branch always fired (GET was broken)
// or the guard was silently skipped (POST let anyone spoof GPS coordinates).
//
// GET  — customer tracking page: requires auth; controller verifies the caller
//         is the order owner, the assigned rider, or an admin.
// POST — rider GPS update: requires auth + rider role; controller additionally
//         verifies the rider is assigned to this specific order.

orderRouter.get( "/rider-location/:orderId", auth,        getRiderLocationController)
orderRouter.post("/rider-location/:orderId", auth, rider,  updateRiderLocationController)

// ── Admin ─────────────────────────────────────────────────────────────────────
orderRouter.get( "/daily-report",        auth, admin,   getDailySalesReport)
orderRouter.post("/settle-cash",         auth, admin,   settleRiderCashController)

// ── Seller ────────────────────────────────────────────────────────────────────
orderRouter.get( "/seller-orders",         auth, seller, getSellerOrdersController)
orderRouter.get( "/seller-earnings",       auth, seller, getSellerEarningsController)
orderRouter.post("/update-seller-status",  auth, seller, updateSellerOrderStatusController)

// ── Rider ─────────────────────────────────────────────────────────────────────
orderRouter.get( "/order-items",           auth, rider,  getOrderItems)
orderRouter.put( "/update-status",         auth, rider,  updateOrderStatusController)
orderRouter.post("/collect-payment",       auth, rider,  collectPaymentController)

export default orderRouter