import crypto from 'crypto';
import CartProductModel from "../models/cartproduct.model.js";
import OrderModel from "../models/order.model.js";
import UserModel from "../models/user.model.js";
import ProductModel from "../models/product.model.js"; 
import StoreModel from "../models/store.model.js"; 
import mongoose from "mongoose";
import Razorpay from 'razorpay';

// --- HELPER FUNCTIONS ---

export const pricewithDiscount = (price, dis = 1) => {
    const discountAmout = Math.ceil((Number(price) * Number(dis)) / 100)
    const actualPrice = Number(price) - Number(discountAmout)
    return actualPrice
}

// Helper to find which store has stock for a product
const getStoreForProduct = (product, preferredStoreName = null) => {
    if (!product.store_inventory || product.store_inventory.length === 0) return null
    if (preferredStoreName) {
        const preferred = product.store_inventory.find(
            s => s.store_name === preferredStoreName && s.stock > 0 && s.isAvailable
        )
        if (preferred) return preferred.store_name
    }
    const available = product.store_inventory.find(s => s.stock > 0 && s.isAvailable)
    return available ? available.store_name : null
}

// Default store fallback — used when no nearby store found via geo query
const DEFAULT_STORE = {
    name:    "Pali Mega Mart",
    address: "Paliganj, Bihar",
    location: { lat: 25.3309509, lng: 84.8006092 }
}

// --- ORDER CONTROLLERS ---

export async function CashOnDeliveryOrderController(request, response) {
    try {
        const userId = request.userId; 
        const { list_items, totalAmt, addressId, subTotalAmt, lat, lng } = request.body;

        // Stock validation
        for (const item of list_items) {
            const product = await ProductModel.findById(item.productId._id);
            if (!product || product.stock < (item.quantity || 1)) {
                return response.status(400).json({
                    message: `Sorry, ${product?.name || "Product"} is out of stock.`,
                    error: true,
                    success: false
                });
            }
            product.stock -= (item.quantity || 1);
            await product.save();
        }

        // Find nearest store — fallback to Pali Mega Mart if none found
        let assignedStore = DEFAULT_STORE

        if (lat && lng) {
            const nearbyMarts = await StoreModel.find({
                location: {
                    $near: {
                        $geometry: { type: "Point", coordinates: [Number(lng), Number(lat)] },
                        $maxDistance: 5000 
                    }
                }
            }).limit(1);

            if (nearbyMarts.length > 0) {
                assignedStore = {
                    storeId:  nearbyMarts[0]._id,
                    name:     nearbyMarts[0].name,
                    address:  nearbyMarts[0].address,
                    location: {
                        lat: nearbyMarts[0].location.coordinates[1],
                        lng: nearbyMarts[0].location.coordinates[0]
                    }
                };
            }
        }

        // Tag each cart item with the seller store that has it in stock
        const taggedCartItems = await Promise.all(list_items.map(async (el) => {
            const product = await ProductModel.findById(el.productId._id)
            const sellerStoreName = product
                ? getStoreForProduct(product, assignedStore.name)
                : null
            return {
                productId:         el.productId._id,
                name:              el.productId.name,
                image:             el.productId.image[0],
                quantity:          el.quantity || 1,
                price:             el.productId.price,
                seller_store_name: sellerStoreName
            }
        }))

        // Collect unique store names involved in this order
        const involved_stores = [...new Set(
            taggedCartItems.map(i => i.seller_store_name).filter(Boolean)
        )]

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
            involved_stores,
            rider_name: "Pratyush Sharma",
            rider_contact: "9472026580",
            payment_collected: false 
        };

        const generatedOrder = new OrderModel(payload);
        await generatedOrder.save();
        await CartProductModel.deleteMany({ userId });
        await UserModel.updateOne({ _id: userId }, { shopping_cart: [] });

        return response.json({
            message: "Order placed successfully.",
            error: false,
            success: true,
            data: generatedOrder
        });
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
}

// Seller-specific orders endpoint
// SELLER → only their store's orders
// ADMIN  → all orders
// USER   → their own orders
export async function getSellerOrdersController(request, response) {
    try {
        const userId = request.userId
        const user = await UserModel.findById(userId)

        if (!user) {
            return response.status(404).json({ message: "User not found", error: true, success: false })
        }

        if (user.role === "ADMIN") {
            const orders = await OrderModel.find({})
                .sort({ createdAt: -1 })
                .populate('delivery_address')
                .populate('userId')
            return response.json({ message: "All orders", data: orders, error: false, success: true })
        }

        if (user.role === "SELLER") {
            if (!user.store_name) {
                return response.status(400).json({
                    message: "Your account has no store name assigned. Please contact admin.",
                    error: true,
                    success: false
                })
            }

            const orders = await OrderModel.find({
                involved_stores: user.store_name,
                seller_status:   { $in: ["Pending", "Packing"] },
                delivery_status: { $nin: ["Delivered", "Cancelled"] }
            })
                .sort({ createdAt: -1 })
                .populate('delivery_address')
                .populate('userId')

            // Only expose items belonging to this seller in each order
            const filteredOrders = orders.map(order => {
                const orderObj = order.toObject()
                orderObj.cartItems = orderObj.cartItems.filter(
                    item => item.seller_store_name === user.store_name
                )
                return orderObj
            })

            return response.json({
                message: "Seller orders",
                data: filteredOrders,
                error: false,
                success: true
            })
        }

        // Regular USER
        const orders = await OrderModel.find({ userId })
            .sort({ createdAt: -1 })
            .populate('delivery_address')
            .populate('userId')

        return response.json({ message: "Order list", data: orders, error: false, success: true })

    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false })
    }
}

// --- RAZORPAY CONTROLLERS ---

export async function paymentController(request, response) {
    try {
        const userId = request.userId 
        const { totalAmt, addressId } = request.body 

        const key_id     = String(process.env.RAZORPAY_KEY_ID     || "").trim();
        const key_secret = String(process.env.RAZORPAY_SECRET_KEY || "").trim();

        if (!key_id || !key_secret) {
            return response.status(500).json({
                message: "Server configuration error: Razorpay keys missing.",
                error: true, success: false
            });
        }

        const razorpay = new Razorpay({ key_id, key_secret });
        const amount   = Math.round(Number(totalAmt || 0) * 100);
        
        if (amount <= 0) {
            return response.status(400).json({ message: "Invalid order amount", error: true, success: false });
        }

        const options = {
            amount,
            currency: "INR",
            receipt:  `rcpt_${new mongoose.Types.ObjectId()}`,
            notes:    { userId, addressId }
        };

        const order = await razorpay.orders.create(options);
        return response.status(200).json(order);
    } catch (error) {
        console.error("Razorpay Order Error:", error);
        return response.status(error.statusCode || 500).json({
            message: error.description || "Razorpay Authentication failed.",
            error: true, success: false
        })
    }
}

export async function verifyPaymentController(request, response) {
    try {
        const userId = request.userId;
        const { 
            razorpay_order_id, razorpay_payment_id, razorpay_signature,
            list_items, addressId, subTotalAmt, totalAmt 
        } = request.body;

        const key_secret        = String(process.env.RAZORPAY_SECRET_KEY || "").trim();
        const body              = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto.createHmac("sha256", key_secret).update(body).digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return response.status(400).json({ message: "Invalid signature.", error: true, success: false });
        }

        // Tag items with seller_store_name for online orders too
        const taggedCartItems = await Promise.all(list_items.map(async (el) => {
            const product        = await ProductModel.findById(el.productId._id)
            const sellerStoreName = product ? getStoreForProduct(product, DEFAULT_STORE.name) : null
            return {
                productId:         el.productId._id,
                name:              el.productId.name,
                image:             el.productId.image[0],
                quantity:          el.quantity || 1,
                price:             el.productId.price,
                seller_store_name: sellerStoreName
            }
        }))

        const involved_stores = [...new Set(
            taggedCartItems.map(i => i.seller_store_name).filter(Boolean)
        )]

        const payload = {
            userId,
            orderId: razorpay_order_id,
            cartItems: taggedCartItems,
            product_details: {
                name: list_items[0].productId.name + (list_items.length > 1 ? ` (+${list_items.length - 1} more)` : ""),
                image: list_items[0].productId.image
            },
            paymentId:      razorpay_payment_id,
            payment_status: "PAID",
            delivery_address: addressId,
            subTotalAmt,
            totalAmt,
            delivery_status: "Pending",
            seller_status:   "Pending",
            store_details:   DEFAULT_STORE,   // Razorpay orders use default store
            involved_stores,
            rider_name:      "Pratyush Sharma",
            rider_contact:   "9472026580",
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

// --- BLINKIT STYLE LOGISTICS & STATUS ---

export const collectPaymentController = async (request, response) => {
    try {
        const { orderId, paymentMode, cashReceived, isSettled } = request.body; 
        const updatedOrder = await OrderModel.findOneAndUpdate(
            { orderId },
            { 
                payment_collected: true,
                payment_mode:      paymentMode,
                payment_status:    paymentMode === "UPI" ? "PAID" : "CASH ON DELIVERY",
                cashReceived:      cashReceived || 0,
                isSettled:         isSettled || false,
                settledAt:         isSettled ? new Date() : null
            },
            { new: true }
        );
        return response.json({ message: `Payment collected via ${paymentMode}`, success: true, error: false, data: updatedOrder });
    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false });
    }
};

export const updateSellerOrderStatusController = async (request, response) => {
    try {
        const { orderId, sellerStatus } = request.body;
        const updatedOrder = await OrderModel.findOneAndUpdate(
            { orderId },
            { 
                seller_status:   sellerStatus,
                delivery_status: sellerStatus === "Ready for Pickup" ? "Confirmed" : "Pending"
            },
            { new: true }
        );
        return response.json({ message: `Store status updated: ${sellerStatus}`, success: true, error: false, data: updatedOrder });
    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false });
    }
};

export const updateOrderStatusController = async (request, response) => {
    try {
        const { orderId, status, payment_status, isSettled, cashReceived } = request.body;
        const order = await OrderModel.findOne({ orderId });

        if (status === "Delivered" && !order.payment_collected && order.payment_status !== "PAID" && !payment_status) {
            return response.status(400).json({
                message: "Collect payment (Cash/UPI) first!",
                success: false, error: true
            });
        }

        const updatedOrder = await OrderModel.findOneAndUpdate(
            { orderId },
            { 
                delivery_status: status,
                ...(payment_status     && { payment_status, payment_collected: true }),
                ...(isSettled !== undefined && { isSettled, settledAt: isSettled ? new Date() : null }),
                ...(cashReceived !== undefined && { cashReceived }),
                ...(status === "Delivered" && { deliveredAt: new Date() })
            },
            { new: true }
        );
        return response.json({ message: `Order status updated to ${status}`, success: true, error: false, data: updatedOrder });
    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false });
    }
};

// --- DATA & REPORTING ---

export async function getOrderDetailsController(request, response) {
    try {
        const userId = request.userId 
        const user   = await UserModel.findById(userId)
        const query  = user.role === "ADMIN" ? {} : { userId };
        const orderlist = await OrderModel.find(query).sort({ createdAt: -1 }).populate('delivery_address').populate('userId'); 
        return response.json({ message: "order list", data: orderlist, error: false, success: true })
    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false })
    }
}

export const getRiderLocationController = async (request, response) => {
    try {
        const { orderId } = request.body;
        return response.json({ message: "Rider location fetched", success: true, error: false, data: { latitude: 25.3309509, longitude: 84.8006092, orderId } });
    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false });
    }
};

export const getDailySalesReport = async (req, res) => {
    try {
        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay   = new Date(); endOfDay.setHours(23, 59, 59, 999);
        const report = await OrderModel.aggregate([
            { $match: { createdAt: { $gte: startOfDay, $lte: endOfDay }, delivery_status: "Delivered" } },
            {
                $group: {
                    _id:          "$store_details.name",
                    totalOrders:  { $sum: 1 },
                    totalRevenue: { $sum: "$totalAmt" },
                    codCollected: { $sum: { $cond: [{ $eq: ["$payment_status", "CASH ON DELIVERY"] }, "$totalAmt", 0] } }
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);
        res.json({ success: true, data: report });
    } catch (error) {
        res.status(500).json({ message: error.message, success: false });
    }
};

export const settleRiderCashController = async (req, res) => {
    try {
        const { rider_name } = req.body; 
        const result = await OrderModel.updateMany(
            { rider_name, delivery_status: "Delivered", payment_status: "CASH ON DELIVERY", isSettled: { $ne: true } },
            { $set: { isSettled: true, settledAt: new Date() } }
        );
        return res.json({ success: true, message: `Settled ${result.modifiedCount} orders`, error: false });
    } catch (error) {
        return res.status(500).json({ message: error.message, success: false, error: true });
    }
};

export async function getLastOrder(req, res) {
    try {
        const lastOrder = await OrderModel.findOne({ userId: req.userId }).sort({ createdAt: -1 }).populate('cartItems.productId');
        return res.json({ success: true, data: lastOrder });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}

export async function webhookStripe(request, response) {
    response.json({ message: "Stripe disabled. Use Razorpay verification instead." });
}