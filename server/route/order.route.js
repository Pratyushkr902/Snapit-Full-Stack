import { Router } from 'express'
import auth from '../middleware/auth.js'
import { 
    CashOnDeliveryOrderController, 
    getOrderDetailsController,
    getSellerOrdersController,   // FIX: New seller-specific orders endpoint
    paymentController, 
    verifyPaymentController,
    webhookStripe,
    updateOrderStatusController, 
    getRiderLocationController,    
    updateSellerOrderStatusController,
    getDailySalesReport,      
    settleRiderCashController,  
    getLastOrder              
} from '../controllers/order.controller.js'

const orderRouter = Router()

// --- BASIC ORDER ROUTES ---
orderRouter.post("/cash-on-delivery", auth, CashOnDeliveryOrderController)
orderRouter.post('/checkout', auth, paymentController)
orderRouter.post('/verify-payment', auth, verifyPaymentController)
orderRouter.post('/webhook', webhookStripe) 

// Customer order list (their own orders)
orderRouter.get("/order-list", auth, getOrderDetailsController)

// FIX: Seller order list — only returns orders containing this seller's products
// SELLER role → filtered by store_name
// ADMIN role  → all orders
orderRouter.get("/seller-orders", auth, getSellerOrdersController)

orderRouter.get('/last-order', auth, getLastOrder)

// --- LIVE TRACKING ROUTES ---
orderRouter.post("/get-rider-location", auth, getRiderLocationController)
orderRouter.put("/update-status", auth, updateOrderStatusController)

// --- SELLER PACKING ROUTE ---
orderRouter.post("/update-seller-status", auth, updateSellerOrderStatusController)

// --- ADMIN LOGISTICS & SETTLEMENT ROUTES ---
orderRouter.get("/daily-report", auth, getDailySalesReport)
orderRouter.post("/settle-cash", auth, settleRiderCashController)

export default orderRouter