import { Router } from "express"
import auth             from "../middleware/auth.js"
import { admin, seller, rider, restoSeller } from "../middleware/Admin.js"
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
    verifyDeliveryOtpController,
    getRiderLocationController,
    updateRiderLocationController,
    getDailySalesReport,
    settleRiderCashController,
    settleCashController,
    getLastOrder,
    collectPaymentController,
    applyCouponController,
    getScratchCardsController,
    getOrderItems,
    updateSellerOrderStatusController,
    claimBirthdayBonusController,
    claimSurpriseBoxController,
    getOrderInvoiceController,
    reportOrderDisputeController,
    customerCancelOrderController,
} from "../controllers/order.controller.js"
import {
    getRestaurantOrdersController,
    getRestoSellerOrdersController,
    updateFoodOrderStatusController,
} from "../controllers/foodOrderAdmin.controller.js"

const orderRouter = Router()

// ── Customer ──────────────────────────────────────────────────────────────────
orderRouter.post("/cash-on-delivery",   auth,        CashOnDeliveryOrderController)
orderRouter.post("/wallet-order",       auth,        WalletPaymentOrderController)
orderRouter.post("/cancel-order",       auth,        customerCancelOrderController)
orderRouter.post("/checkout",           auth,        paymentController)
orderRouter.post("/verify-payment",     auth,        verifyPaymentController)
orderRouter.post("/webhook",                         webhookStripe)
orderRouter.get( "/order-list",         auth,        getOrderDetailsController)
orderRouter.get( "/last-order",         auth,        getLastOrder)
orderRouter.post("/coupon/apply",       auth,        applyCouponController)
orderRouter.get( "/scratch-cards",      auth,        getScratchCardsController)
orderRouter.post("/claim-birthday-bonus", auth,      claimBirthdayBonusController)
orderRouter.post("/claim-surprise-box",   auth,      claimSurpriseBoxController)
orderRouter.get( "/invoice/:orderId",     auth,      getOrderInvoiceController)

// ── Rider Tracking ────────────────────────────────────────────────────────────
orderRouter.get( "/rider-location/:orderId", auth,        getRiderLocationController)
orderRouter.post("/rider-location/:orderId", auth, rider,  updateRiderLocationController)

// ── Admin ─────────────────────────────────────────────────────────────────────
orderRouter.get( "/admin/restaurant-orders", auth, admin, getRestaurantOrdersController)
orderRouter.get( "/resto-seller/orders", auth, restoSeller, getRestoSellerOrdersController)
orderRouter.put( "/update-status/:id",       auth, admin, updateFoodOrderStatusController)
orderRouter.get( "/daily-report",            auth, admin, getDailySalesReport)
orderRouter.post("/settle-cash",             auth, admin, settleCashController)       // AdminDashboard bulk COD settle
orderRouter.post("/settle-rider-cash",       auth, admin, settleRiderCashController)  // per-order IDs settle

// ── Seller ────────────────────────────────────────────────────────────────────
orderRouter.get( "/seller-orders",        auth, seller, getSellerOrdersController)
orderRouter.get( "/seller-earnings",      auth, seller, getSellerEarningsController)
orderRouter.post("/update-seller-status", auth, seller, updateSellerOrderStatusController)

// ── Rider + Admin (controller handles role-based filtering) ───────────────────
orderRouter.get( "/order-items",          auth,         getOrderItems)        // ADMIN → all orders, RIDER → own orders
orderRouter.put( "/update-status",        auth, rider,  updateOrderStatusController)
orderRouter.post("/collect-payment",      auth, rider,  collectPaymentController)
orderRouter.post("/verify-delivery-otp",  auth, rider,  verifyDeliveryOtpController)
orderRouter.post("/report-dispute",       auth, rider,  reportOrderDisputeController)

export default orderRouter