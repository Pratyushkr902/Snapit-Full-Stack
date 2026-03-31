import { Router } from 'express'
import auth from '../middleware/auth.js'
import { 
    CashOnDeliveryOrderController, 
    getOrderDetailsController, 
    paymentController, 
    webhookStripe,
    updateOrderStatusController, 
    getRiderLocationController,    
    updateSellerOrderStatusController,
    getDailySalesReport,      // NEW: For the 7:00 PM Sales Report
    settleRiderCashController,  // NEW: For the "Collect & Settle" button
    getLastOrder              // ADDED: For the recent activity feed
} from '../controllers/order.controller.js'

const orderRouter = Router()

// --- BASIC ORDER ROUTES ---
orderRouter.post("/cash-on-delivery", auth, CashOnDeliveryOrderController)
orderRouter.post('/checkout', auth, paymentController)
orderRouter.post('/webhook', webhookStripe) 
orderRouter.get("/order-list", auth, getOrderDetailsController)

// ADDED: Fetch the single most recent order for the Dashboard Summary
orderRouter.get('/last-order', auth, getLastOrder)

// --- LIVE TRACKING SYSTEM ROUTES ---
orderRouter.post("/get-rider-location", auth, getRiderLocationController)
orderRouter.put("/update-status", auth, updateOrderStatusController)

// --- SELLER APPROVAL SYSTEM ROUTE ---
orderRouter.post("/update-seller-status", auth, updateSellerOrderStatusController)

// --- ADMIN LOGISTICS & SETTLEMENT ROUTES ---

// 1. Get today's total revenue and COD breakdown per Mart
orderRouter.get("/daily-report", auth, getDailySalesReport)

// 2. Clear a Rider's cash balance when they hand over the money
orderRouter.post("/settle-cash", auth, settleRiderCashController)

export default orderRouter