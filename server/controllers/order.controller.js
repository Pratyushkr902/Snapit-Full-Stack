import CartProductModel from "../models/cartproduct.model.js";
import OrderModel from "../models/order.model.js";
import UserModel from "../models/user.model.js";
import ProductModel from "../models/product.model.js"; 
import StoreModel from "../models/store.model.js"; 
import mongoose from "mongoose";
import Razorpay from 'razorpay';
import crypto from 'crypto'; // Needed for signature verification

// --- HELPER: Signature Verification (REQUIRED for Razorpay Security) ---
export async function verifyPaymentController(request, response) {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = request.body;
        const secret = process.env.RAZORPAY_SECRET_KEY;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", secret)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature === razorpay_signature) {
            return response.json({ success: true, message: "Payment verified successfully" });
        } else {
            return response.status(400).json({ success: false, message: "Invalid signature" });
        }
    } catch (error) {
        return response.status(500).json({ success: false, message: error.message });
    }
}

export async function CashOnDeliveryOrderController(request, response) {
    try {
        const userId = request.userId; 
        const { list_items, totalAmt, addressId, subTotalAmt, lat, lng } = request.body;

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

        let assignedStore = {
            name: "Snapit Main Store - Paliganj",
            address: "Main Road, Paliganj",
            location: { lat: 25.2921, lng: 84.8170 }
        };

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
                    storeId: nearbyMarts[0]._id,
                    name: nearbyMarts[0].name,
                    address: nearbyMarts[0].address,
                    location: {
                        lat: nearbyMarts[0].location.coordinates[1],
                        lng: nearbyMarts[0].location.coordinates[0]
                    }
                };
            }
        }

        const payload = {
            userId: userId,
            orderId: `ORD-${new mongoose.Types.ObjectId()}`,
            cartItems: list_items.map(el => ({
                productId: el.productId._id,
                name: el.productId.name,
                image: el.productId.image[0],
                quantity: el.quantity || 1,
                price: el.productId.price
            })),
            product_details: {
                name: list_items[0].productId.name + (list_items.length > 1 ? ` (+${list_items.length - 1} more)` : ""),
                image: list_items[0].productId.image
            },
            paymentId: "",
            payment_status: "CASH ON DELIVERY",
            delivery_address: addressId,
            subTotalAmt: subTotalAmt,
            totalAmt: totalAmt,
            delivery_status: "Pending",
            seller_status: "Pending",
            store_details: assignedStore, 
            rider_name: "Pratyush Sharma",
            rider_contact: "9472026580"
        };

        const generatedOrder = new OrderModel(payload);
        await generatedOrder.save();
        await CartProductModel.deleteMany({ userId: userId });
        await UserModel.updateOne({ _id: userId }, { shopping_cart: [] });

        return response.json({
            message: "Order placed successfully. Assigned to nearest Paliganj Mart.",
            error: false,
            success: true,
            data: generatedOrder
        });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

export const pricewithDiscount = (price, dis = 1) => {
    const discountAmout = Math.ceil((Number(price) * Number(dis)) / 100)
    return Number(price) - Number(discountAmout)
}

// --- FIXED PAYMENT CONTROLLER ---
export async function paymentController(request, response) {
    try {
        const userId = request.userId 
        const { totalAmt, addressId } = request.body 

        // RENDER DEBUG: Check if variables are truly present
        const key_id = process.env.RAZORPAY_KEY_ID?.trim(); // .trim() removes accidental spaces
        const key_secret = process.env.RAZORPAY_SECRET_KEY?.trim();

        if (!key_id || !key_secret) {
            console.error("❌ RAZORPAY ERROR: Keys are missing in process.env");
            return response.status(500).json({
                message: "Razorpay keys not found. Check Render Environment variables.",
                error: true,
                success: false
            });
        }

        const razorpay = new Razorpay({
            key_id: key_id,
            key_secret: key_secret,
        });

        const options = {
            amount: Math.round(totalAmt * 100), 
            currency: "INR",
            receipt: `rcpt_${new mongoose.Types.ObjectId()}`,
            notes: { userId, addressId }
        };

        const order = await razorpay.orders.create(options);
        return response.status(200).json(order);

    } catch (error) {
        // Detailed logging for the 401 error
        console.error("🚨 Razorpay API Call Failed:", error);
        return response.status(error.statusCode || 500).json({
            message: error.description || "Razorpay Authentication Failed. Verify Key ID and Secret.",
            error: true,
            success: false,
            code: error.code
        })
    }
}

// ... Rest of your controller functions (updateSellerOrderStatusController, getOrderDetailsController, etc.) remain unchanged as requested.
// [Skipping repetition for brevity but keeping logic identical to your snippet]

export const updateSellerOrderStatusController = async (request, response) => {
    try {
        const { orderId, sellerStatus } = request.body;
        const updatedOrder = await OrderModel.findOneAndUpdate(
            { orderId: orderId },
            { 
                seller_status: sellerStatus,
                delivery_status: sellerStatus === "Ready for Pickup" ? "Confirmed" : "Pending"
            },
            { new: true }
        );
        return response.json({ message: `Store status updated: ${sellerStatus}`, success: true, error: false, data: updatedOrder });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export async function webhookStripe(request, response) {
    response.json({ message: "Stripe disabled. Use Razorpay verification instead." });
}

export async function getOrderDetailsController(request, response) {
    try {
        const userId = request.userId 
        const user = await UserModel.findById(userId)
        let query = { userId: userId };
        if (user.role === "ADMIN") { query = {}; }
        const orderlist = await OrderModel.find(query).sort({ createdAt: -1 }).populate('delivery_address').populate('userId'); 
        return response.json({ message: "order list", data: orderlist, error: false, success: true })
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false })
    }
}

export const updateOrderStatusController = async (request, response) => {
    try {
        const { orderId, status } = request.body;
        const updatedOrder = await OrderModel.findOneAndUpdate({ orderId: orderId }, { delivery_status: status }, { new: true });
        return response.json({ message: `Order status updated to ${status}`, success: true, error: false, data: updatedOrder });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const getRiderLocationController = async (request, response) => {
    try {
        const { orderId } = request.body;
        return response.json({ message: "Rider location fetched", success: true, error: false, data: { latitude: 25.2921, longitude: 84.8170, orderId } });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const getDailySalesReport = async (req, res) => {
    try {
        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
        const report = await OrderModel.aggregate([
            { $match: { createdAt: { $gte: startOfDay, $lte: endOfDay }, delivery_status: "Delivered" } },
            { $group: { _id: "$store_details.name", totalOrders: { $sum: 1 }, totalRevenue: { $sum: "$totalAmt" }, codCollected: { $sum: { $cond: [{ $eq: ["$payment_status", "CASH ON DELIVERY"] }, "$totalAmt", 0] } } } },
            { $sort: { totalRevenue: -1 } }
        ]);
        res.json({ success: true, data: report });
    } catch (error) { res.status(500).json({ message: error.message, success: false }); }
};

export const settleRiderCashController = async (req, res) => {
    try {
        const { rider_name } = req.body; 
        const result = await OrderModel.updateMany({ rider_name: rider_name, delivery_status: "Delivered", payment_status: "CASH ON DELIVERY", isSettled: { $ne: true } }, { $set: { isSettled: true, settledAt: new Date() } });
        return res.json({ success: true, message: `Settled ${result.modifiedCount} orders for ${rider_name}`, error: false });
    } catch (error) { return res.status(500).json({ message: error.message || error, success: false, error: true }); }
};

export async function getLastOrder(req, res) {
    try {
        const lastOrder = await OrderModel.findOne({ userId: req.userId }).sort({ createdAt: -1 }).populate('cartItems.productId');
        return res.json({ success: true, data: lastOrder })
    } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
}