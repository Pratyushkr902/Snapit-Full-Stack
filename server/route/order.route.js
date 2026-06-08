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
    updateRiderLocationController,
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

// ── Rider Tracking (PUBLIC — no auth, called by customer browser + rider device) ──
//
//   GET  /api/order/rider-location/:orderId
//        Customer tracking page calls this on mount to get rider_name,
//        rider_contact, and last persisted GPS fix to seed the map.
//
//   POST /api/order/rider-location/:orderId
//        server.js socket handler calls this fire-and-forget on every GPS ping
//        to persist position to MongoDB (survives server restarts).
//
// ✅ FIX: was POST /get-rider-location behind auth+rider — completely wrong.
//         Customer has no rider session; GET with :orderId param is correct.
orderRouter.get( "/rider-location/:orderId",  getRiderLocationController);
orderRouter.post("/rider-location/:orderId",  updateRiderLocationController);

// ── Admin ─────────────────────────────────────────────────────────────────────
orderRouter.get( "/daily-report",        auth, admin,   getDailySalesReport);
orderRouter.post("/settle-cash",         auth, admin,   settleRiderCashController);

// ── Seller ────────────────────────────────────────────────────────────────────
orderRouter.get( "/seller-orders",         auth, seller, getSellerOrdersController);
orderRouter.get( "/seller-earnings",       auth, seller, getSellerEarningsController);
orderRouter.post("/update-seller-status",  auth, seller, updateSellerOrderStatusController);

// ── Rider ─────────────────────────────────────────────────────────────────────
orderRouter.get( "/order-items",           auth, rider,  getOrderItems);
orderRouter.put( "/update-status",         auth, rider,  updateOrderStatusController);
orderRouter.post("/collect-payment",       auth, rider,  collectPaymentController);

export default orderRouter;