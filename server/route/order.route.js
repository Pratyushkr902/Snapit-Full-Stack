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
    getDailySalesReport,
    settleRiderCashController,
    getLastOrder,
    collectPaymentController,
    applyCouponController,
    getScratchCardsController,
    getOrderItems,
    updateSellerOrderStatusController 
} from "../controllers/order.controller.js"
import {
    getRestaurantOrdersController,
    updateFoodOrderStatusController,
} from "../controllers/foodOrderAdmin.controller.js"

const orderRouter = Router()

// ── Customer ──────────────────────────────────────────────────────────────────
orderRouter.post("/cash-on-delivery",   auth,        CashOnDeliveryOrderController)
orderRouter.post("/wallet-order",       auth,        WalletPaymentOrderController)
orderRouter.post("/checkout",           auth,        paymentController)
orderRouter.post("/verify-payment",     auth,        verifyPaymentController)
orderRouter.post("/webhook",                         webhookStripe)
orderRouter.get( "/order-list",         auth,        getOrderDetailsController)
orderRouter.get( "/last-order",         auth,        getLastOrder)
orderRouter.post("/coupon/apply",       auth,        applyCouponController)
orderRouter.get( "/scratch-cards",      auth,        getScratchCardsController)

// ── Rider Tracking ────────────────────────────────────────────────────────────
orderRouter.get( "/rider-location/:orderId", auth,        getRiderLocationController)
orderRouter.post("/rider-location/:orderId", auth, rider,  updateRiderLocationController)

// ── Admin ─────────────────────────────────────────────────────────────────────
orderRouter.get( "/admin/restaurant-orders", auth, admin, getRestaurantOrdersController)
orderRouter.get( "/resto-seller/orders", auth, getRestoSellerOrdersController)
orderRouter.put( "/update-status/:id",       auth, admin, updateFoodOrderStatusController)
orderRouter.get( "/daily-report",            auth, admin, getDailySalesReport)
orderRouter.post("/settle-cash",             auth, admin, settleRiderCashController)

// ── Seller ────────────────────────────────────────────────────────────────────
orderRouter.get( "/seller-orders",         auth, seller, getSellerOrdersController)
orderRouter.get( "/seller-earnings",       auth, seller, getSellerEarningsController)
orderRouter.post("/update-seller-status",  auth, seller, updateSellerOrderStatusController)

// ── Rider ─────────────────────────────────────────────────────────────────────
orderRouter.get( "/order-items",           auth, rider,  getOrderItems)
orderRouter.put( "/update-status",         auth, rider,  updateOrderStatusController)
orderRouter.post("/collect-payment",       auth, rider,  collectPaymentController)

export default orderRouter