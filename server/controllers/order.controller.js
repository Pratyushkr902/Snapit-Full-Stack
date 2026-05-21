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
            rider_contact: "9472026580"
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

        // ✅ INJECTED SERVER-SIDE DISCOUNTERS INTEGRITY BOUNDS SECURITY CHECK
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

// Keep all your remaining Blinkit-style status controllers intact from here down...
export const collectPaymentController = async (request, response) => { /* ... */ };
export const updateSellerOrderStatusController = async (request, response) => { /* ... */ };
export const updateOrderStatusController = async (request, response) => { /* ... */ };
export async function getOrderDetailsController(request, response) { /* ... */ };
export const getRiderLocationController = async (request, response) => { /* ... */ };
export const getDailySalesReport = async (req, res) => { /* ... */ };
export const settleRiderCashController = async (req, res) => { /* ... */ };
export async function getLastOrder(req, res) { /* ... */ };
export async function getSellerOrdersController(request, response) { /* ... */ };
export async function webhookStripe(request, response) { /* ... */ };