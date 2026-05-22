import crypto from 'crypto';
import CartProductModel from "../models/cartproduct.model.js";
import OrderModel from "../models/order.model.js";
import UserModel from "../models/user.model.js";
import ProductModel from "../models/product.model.js"; 
import StoreModel from "../models/store.model.js"; 
import mongoose from "mongoose";
import Razorpay from 'razorpay';

export const pricewithDiscount = (price, dis = 1) => {
    const discountAmout = Math.ceil((Number(price) * Number(dis)) / 100)
    return Number(price) - Number(discountAmout)
}

const getStoreForProduct = (product, preferredStoreName = null) => {
    if (!product.store_inventory || product.store_inventory.length === 0) return null
    if (preferredStoreName) {
        const preferred = product.store_inventory.find(s => s.store_name === preferredStoreName && s.stock > 0 && s.isAvailable)
        if (preferred) return preferred.store_name
    }
    return product.store_inventory.find(s => s.stock > 0 && s.isAvailable)?.store_name || null
}

const DEFAULT_STORE = {
    name: "Pali Mega Mart",
    address: "Paliganj, Bihar",
    location: { lat: 25.330951, lng: 84.800609 }
}

export async function CashOnDeliveryOrderController(request, response) {
    try {
        const userId = request.userId; 
        const { list_items, totalAmt, addressId, subTotalAmt, lat, lng } = request.body;

        for (const item of list_items) {
            const product = await ProductModel.findById(item.productId._id);
            if (!product || product.stock < (item.quantity || 1)) {
                return response.status(400).json({ message: "Out of stock fallback trigger.", error: true, success: false });
            }
            product.stock -= (item.quantity || 1);
            await product.save();
        }

        let assignedStore = DEFAULT_STORE
        if (lat && lng) {
            const nearbyMarts = await StoreModel.find({
                location: { $near: { $geometry: { type: "Point", coordinates: [Number(lng), Number(lat)] }, $maxDistance: 5000 } }
            }).limit(1);
            if (nearbyMarts.length > 0) {
                assignedStore = {
                    storeId: nearbyMarts[0]._id,
                    name: nearbyMarts[0].name,
                    address: nearbyMarts[0].address,
                    location: { lat: nearbyMarts[0].location.coordinates[1], lng: nearbyMarts[0].location.coordinates[0] }
                };
            }
        }

        const taggedCartItems = await Promise.all(list_items.map(async (el) => {
            const product = await ProductModel.findById(el.productId._id)
            return {
                productId: el.productId._id,
                name: el.productId.name,
                image: el.productId.image[0],
                quantity: el.quantity || 1,
                price: el.productId.price,
                seller_store_name: product ? getStoreForProduct(product, assignedStore.name) : null
            }
        }));

        const payload = {
            userId,
            orderId: `ORD-${new mongoose.Types.ObjectId()}`,
            cartItems: taggedCartItems,
            product_details: {
                name: list_items[0].productId.name + (list_items.length > 1 ? ` (+${list_items.length - 1} more)` : ""),
                image: list_items[0].productId.image
            },
            paymentId: "",
            payment_status: "CASH ON DELIVERY",
            delivery_address: addressId,
            subTotalAmt,
            totalAmt,
            delivery_status: "Pending",
            seller_status: "Pending",
            store_details: assignedStore,
            involved_stores: [...new Set(taggedCartItems.map(i => i.seller_store_name).filter(Boolean))],
            rider_name: "Pratyush Sharma",
            rider_contact: "9472026580",
            payment_collected: false
        };

        const generatedOrder = new OrderModel(payload);
        await generatedOrder.save();
        await CartProductModel.deleteMany({ userId });
        await UserModel.updateOne({ _id: userId }, { shopping_cart: [] });

        return response.json({ message: "Order placed successfully.", error: false, success: true, data: generatedOrder });
    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false });
    }
}

export async function paymentController(request, response) {
    try {
        const { totalAmt, addressId } = request.body;
        const razorpay = new Razorpay({
            key_id: String(process.env.RAZORPAY_KEY_ID).trim(),
            key_secret: String(process.env.RAZORPAY_SECRET_KEY).trim()
        });

        const options = {
            amount: Math.round(Number(totalAmt) * 100),
            currency: "INR",
            receipt: `rcpt_${new mongoose.Types.ObjectId()}`,
            notes: { userId: request.userId, addressId }
        };

        const order = await razorpay.orders.create(options);
        return response.status(200).json(order);
    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false });
    }
}

export async function verifyPaymentController(request, response) {
    try {
        const userId = request.userId;
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, list_items, addressId, subTotalAmt, totalAmt } = request.body;

        const expectedSignature = crypto.createHmac("sha256", String(process.env.RAZORPAY_SECRET_KEY).trim())
            .update(razorpay_order_id + "|" + razorpay_payment_id).digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return response.status(400).json({ message: "Signature verification failed.", error: true, success: false });
        }

        const expectedDeliveryFee = Number(subTotalAmt) >= 399 ? 0 : 12;
        const normalBaseTotal = Number(subTotalAmt) + expectedDeliveryFee;
        const verifiedCouponTotal = normalBaseTotal - Math.round(Number(subTotalAmt) * 0.15);

        if (Number(totalAmt) !== normalBaseTotal && Number(totalAmt) !== verifiedCouponTotal) {
            return response.status(422).json({ message: "Security Warning: Price alteration alert.", error: true, success: false });
        }

        const taggedCartItems = await Promise.all(list_items.map(async (el) => {
            const product = await ProductModel.findById(el.productId._id)
            return {
                productId: el.productId._id,
                name: el.productId.name,
                image: el.productId.image[0],
                quantity: el.quantity || 1,
                price: el.productId.price,
                seller_store_name: product ? getStoreForProduct(product, DEFAULT_STORE.name) : null
            }
        }));

        const payload = {
            userId,
            orderId: razorpay_order_id,
            cartItems: taggedCartItems,
            product_details: {
                name: list_items[0].productId.name + (list_items.length > 1 ? ` (+${list_items.length - 1} more)` : ""),
                image: list_items[0].productId.image
            },
            paymentId: razorpay_payment_id,
            payment_status: "PAID",
            delivery_address: addressId,
            subTotalAmt,
            totalAmt,
            delivery_status: "Pending",
            seller_status: "Pending",
            store_details: DEFAULT_STORE,
            involved_stores: [...new Set(taggedCartItems.map(i => i.seller_store_name).filter(Boolean))],
            rider_name: "Pratyush Sharma",
            rider_contact: "9472026580",
            payment_collected: true
        };

        const newOrder = new OrderModel(payload);
        await newOrder.save();

        for (const item of list_items) {
            await ProductModel.findByIdAndUpdate(item.productId._id, { $inc: { stock: -(item.quantity || 1) } });
        }

        await CartProductModel.deleteMany({ userId });
        await UserModel.updateOne({ _id: userId }, { shopping_cart: [] });

        return response.json({ message: "Order placed successfully!", error: false, success: true, data: newOrder });
    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false });
    }
}

export const collectPaymentController = async (request, response) => {
    try {
        const { orderId, payment_status, payment_collected, isSettled, cashReceived } = request.body
        const order = await OrderModel.findOneAndUpdate(
            { orderId },
            {
                ...(payment_status && { payment_status }),
                payment_collected: true,
                ...(isSettled !== undefined && { isSettled }),
                ...(cashReceived && { cashReceived })
            },
            { new: true }
        )
        if (!order) return response.status(404).json({ message: "Order not found", error: true, success: false })
        return response.json({ message: "Payment recorded", error: false, success: true, data: order })
    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false })
    }
}

export const updateSellerOrderStatusController = async (request, response) => {
    try {
        const { orderId, sellerStatus } = request.body
        const delivery_status = sellerStatus === "Ready for Pickup" ? "Confirmed" : "Pending"
        const order = await OrderModel.findOneAndUpdate(
            { orderId },
            { seller_status: sellerStatus, delivery_status },
            { new: true }
        )
        if (!order) return response.status(404).json({ message: "Order not found", error: true, success: false })
        return response.json({ message: `Store status updated: ${sellerStatus}`, success: true, error: false, data: order })
    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false })
    }
}

export const updateOrderStatusController = async (request, response) => {
    try {
        const { orderId, status, payment_status, payment_collected, isSettled, cashReceived } = request.body

        const order = await OrderModel.findOne({ orderId })
        if (!order) return response.status(404).json({ message: "Order not found", error: true, success: false })

        if (status === "Delivered" && !order.payment_collected && order.payment_status !== "PAID" && !payment_status) {
            return response.status(400).json({ message: "Collect payment (Cash/UPI) first!", success: false, error: true })
        }

        const updatedOrder = await OrderModel.findOneAndUpdate(
            { orderId },
            {
                delivery_status: status,
                ...(payment_status && { payment_status, payment_collected: true }),
                ...(isSettled !== undefined && { isSettled, settledAt: isSettled ? new Date() : null }),
                ...(cashReceived && { cashReceived }),
                ...(status === "Delivered" && { deliveredAt: new Date() })
            },
            { new: true }
        )

        return response.json({ message: `Order status updated to ${status}`, success: true, error: false, data: updatedOrder })
    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false })
    }
}

export async function getOrderDetailsController(request, response) {
    try {
        const userId = request.userId
        const orders = await OrderModel.find({ userId })
            .populate('delivery_address')
            .sort({ createdAt: -1 })
        return response.json({ message: "Orders fetched", error: false, success: true, data: orders })
    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false })
    }
}

export async function getOrderItems(request, response) {
    try {
        const orders = await OrderModel.find({
            delivery_status: { $nin: ['Cancelled'] }
        })
            .populate('userId', 'name email mobile')
            .populate('delivery_address')
            .populate('cartItems.productId', 'name image price')
            .sort({ createdAt: -1 })
        return response.json({ message: "Orders fetched", error: false, success: true, data: orders })
    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false })
    }
}

export const getRiderLocationController = async (request, response) => {
    try {
        const { orderId } = request.body
        const order = await OrderModel.findOne({ orderId }).select('riderLocation delivery_status')
        if (!order) return response.status(404).json({ message: "Order not found", error: true, success: false })
        return response.json({ message: "Location fetched", error: false, success: true, data: order.riderLocation })
    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false })
    }
}

export const getDailySalesReport = async (req, res) => {
    try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const orders = await OrderModel.find({
            createdAt: { $gte: today, $lt: tomorrow },
            delivery_status: { $ne: 'Cancelled' }
        })

        const totalRevenue = orders.reduce((acc, o) => acc + (Number(o.totalAmt) || 0), 0)
        const deliveredOrders = orders.filter(o => o.delivery_status === 'Delivered')
        const pendingOrders = orders.filter(o => o.delivery_status !== 'Delivered')

        return res.json({
            message: "Daily report",
            error: false,
            success: true,
            data: {
                totalOrders: orders.length,
                totalRevenue,
                deliveredOrders: deliveredOrders.length,
                pendingOrders: pendingOrders.length,
                orders
            }
        })
    } catch (error) {
        return res.status(500).json({ message: error.message, error: true, success: false })
    }
}

export const settleRiderCashController = async (req, res) => {
    try {
        const { ordersSettled } = req.body
        await OrderModel.updateMany(
            { _id: { $in: ordersSettled } },
            { isSettled: true, settledAt: new Date() }
        )
        return res.json({ message: "Cash settled successfully", error: false, success: true })
    } catch (error) {
        return res.status(500).json({ message: error.message, error: true, success: false })
    }
}

export async function getLastOrder(req, res) {
    try {
        const userId = req.userId
        const order = await OrderModel.findOne({ userId })
            .sort({ createdAt: -1 })
            .populate('delivery_address')
        if (!order) return res.status(404).json({ message: "No orders found", error: true, success: false })
        return res.json({ message: "Last order fetched", error: false, success: true, data: order })
    } catch (error) {
        return res.status(500).json({ message: error.message, error: true, success: false })
    }
}

export async function getSellerOrdersController(request, response) {
    try {
        const orders = await OrderModel.find({
            delivery_status: { $nin: ['Cancelled'] }
        })
            .populate('userId', 'name email mobile')
            .populate('delivery_address')
            .populate('cartItems.productId', 'name image price')
            .sort({ createdAt: -1 })
        return response.json({ message: "Seller orders fetched", error: false, success: true, data: orders })
    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false })
    }
}

export async function webhookStripe(request, response) {
    return response.json({ message: "Webhook received", success: true })
}

export const applyCouponController = async (request, response) => {
    try {
        const { couponCode, totalAmt } = request.body
        const userId = request.userId

        if (!couponCode || !totalAmt) {
            return response.status(400).json({ message: "Coupon code and amount required", error: true, success: false })
        }

        const user = await UserModel.findById(userId)
        if (!user) {
            return response.status(404).json({ message: "User not found", error: true, success: false })
        }

        if (couponCode === "FIRSTORDER" || couponCode === "SNAPIT15") {
            const orderCount = await OrderModel.countDocuments({ userId })
            if (orderCount > 0) {
                return response.status(400).json({ message: "Coupon only valid on first order", error: true, success: false })
            }
            const discount = Math.round(Number(totalAmt) * 0.15)
            const newTotal = Number(totalAmt) - discount
            return response.json({
                message: "Coupon applied successfully!",
                error: false,
                success: true,
                data: { discount, newTotal, couponCode }
            })
        }

        return response.status(400).json({ message: "Invalid coupon code", error: true, success: false })
    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false })
    }
}