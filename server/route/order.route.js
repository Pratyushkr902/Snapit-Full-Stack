import { Router } from 'express'
import auth from '../middleware/auth.js'
import { 
    CashOnDeliveryOrderController, 
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
    collectPaymentController // Ensure your billing endpoint maps to this router interface
} from '../controllers/order.controller.js'

const orderRouter = Router()

// --- CHECKOUT & TRANSACTION STRIP MANAGEMENT ---
orderRouter.post("/cash-on-delivery", auth, CashOnDeliveryOrderController)
orderRouter.post('/checkout', auth, paymentController)
orderRouter.post('/verify-payment', auth, verifyPaymentController)
orderRouter.post('/webhook', webhookStripe) 

// --- ACCOUNT ORDER QUERIES ---
orderRouter.get("/order-list", auth, getOrderDetailsController)
orderRouter.get("/seller-orders", auth, getSellerOrdersController)
orderRouter.get('/last-order', auth, getLastOrder)

// --- LIVE RIDER NAVIGATION & WEBHOOK STREAM TRACKING ---
orderRouter.post("/get-rider-location", auth, getRiderLocationController)
orderRouter.put("/update-status", auth, updateOrderStatusController)

// --- STORE PACKING OPERATIONS ---
orderRouter.post("/update-seller-status", auth, updateSellerOrderStatusController)

// --- LOGISTICS & FINANCIAL CASH SETTLEMENTS ---
orderRouter.get("/daily-report", auth, getDailySalesReport)
orderRouter.post("/settle-cash", auth, settleRiderCashController)
orderRouter.post("/collect-payment", auth, collectPaymentController)

export default orderRouter;