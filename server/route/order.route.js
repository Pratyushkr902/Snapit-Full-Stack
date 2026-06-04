import { Router } from "express";
import auth           from "../middleware/auth.js";
import { admin, seller, rider } from "../middleware/Admin.js";
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
    updateSellerOrderStatusController,
    getDailySalesReport,
    settleRiderCashController,
    getLastOrder,
    collectPaymentController,
    applyCouponController,
    getScratchCardsController,
    getOrderItems,
} from "../controllers/order.controller.js";

const orderRouter = Router();

// ── Customer ──────────────────────────────────────────────────────────────────
orderRouter.post("/cash-on-delivery",    auth,          CashOnDeliveryOrderController);
orderRouter.post("/wallet-order",        auth,          WalletPaymentOrderController);
orderRouter.post("/checkout",            auth,          paymentController);
orderRouter.post("/verify-payment",      auth,          verifyPaymentController);
orderRouter.post("/webhook",                            webhookStripe);
orderRouter.get( "/order-list",          auth,          getOrderDetailsController);
orderRouter.get( "/last-order",          auth,          getLastOrder);
orderRouter.post("/coupon/apply",        auth,          applyCouponController);
orderRouter.get( "/scratch-cards",       auth,          getScratchCardsController);

// ── Admin ─────────────────────────────────────────────────────────────────────
orderRouter.get( "/daily-report",        auth, admin,   getDailySalesReport);
orderRouter.post("/settle-cash",         auth, admin,   settleRiderCashController);

// ── Seller ────────────────────────────────────────────────────────────────────
orderRouter.get( "/seller-orders",         auth, seller, getSellerOrdersController);
orderRouter.get( "/seller-earnings",       auth, seller, getSellerEarningsController);  // ✅ NEW
orderRouter.post("/update-seller-status",  auth, seller, updateSellerOrderStatusController);

// ── Rider ─────────────────────────────────────────────────────────────────────
orderRouter.get( "/order-items",           auth, rider,  getOrderItems);
orderRouter.post("/get-rider-location",    auth, rider,  getRiderLocationController);
orderRouter.put( "/update-status",         auth, rider,  updateOrderStatusController);
orderRouter.post("/collect-payment",       auth, rider,  collectPaymentController);

export default orderRouter;