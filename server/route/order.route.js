import { Router } from 'express'
import auth from '../middleware/auth.js'
import { 
    CashOnDeliveryOrderController, 
    WalletPaymentOrderController, // ✅ Imported the newly added balance controller
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
    getOrderItems
} from '../controllers/order.controller.js'

const orderRouter = Router()

orderRouter.post("/cash-on-delivery", auth, CashOnDeliveryOrderController)
orderRouter.post("/wallet-order", auth, WalletPaymentOrderController) // ✅ Added Route for point-of-sale wallet deductions
orderRouter.post('/checkout', auth, paymentController)
orderRouter.post('/verify-payment', auth, verifyPaymentController)
orderRouter.post('/webhook', webhookStripe) 

orderRouter.get("/order-list", auth, getOrderDetailsController)
orderRouter.get("/order-items", auth, getOrderItems)
orderRouter.get("/seller-orders", auth, getSellerOrdersController)
orderRouter.get('/last-order', auth, getLastOrder)

orderRouter.post("/get-rider-location", auth, getRiderLocationController)
orderRouter.put("/update-status", auth, updateOrderStatusController)

orderRouter.post("/update-seller-status", auth, updateSellerOrderStatusController)

orderRouter.get("/daily-report", auth, getDailySalesReport)
orderRouter.post("/settle-cash", auth, settleRiderCashController)
orderRouter.post("/collect-payment", auth, collectPaymentController)

orderRouter.post("/coupon/apply", auth, applyCouponController)

export default orderRouter;