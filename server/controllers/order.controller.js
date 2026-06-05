import crypto from "crypto";
import CartProductModel from "../models/cartproduct.model.js";
import OrderModel       from "../models/order.model.js";
import UserModel        from "../models/user.model.js";
import ProductModel     from "../models/product.model.js";
import StoreModel       from "../models/store.model.js";
import mongoose         from "mongoose";
import Razorpay         from "razorpay";
import updateStreak     from "../utils/updateStreak.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export const pricewithDiscount = (price, dis = 1) => {
    const discountAmount = Math.ceil((Number(price) * Number(dis)) / 100);
    return Number(price) - Number(discountAmount);
};

const getStoreForProduct = (product, preferredStoreName = null) => {
    if (!product.store_inventory || product.store_inventory.length === 0) return null;
    if (preferredStoreName) {
        const preferred = product.store_inventory.find(
            (s) => s.store_name === preferredStoreName && s.stock > 0 && s.isAvailable
        );
        if (preferred) return preferred.store_name;
    }
    return product.store_inventory.find((s) => s.stock > 0 && s.isAvailable)?.store_name || null;
};

const DEFAULT_STORE = {
    name:     "Pali Mega Mart",
    address:  "Paliganj, Bihar",
    location: { lat: 25.330951, lng: 84.800609 },
};

const calcDeliveryFee = (subTotalAmt, user) => {
    if (Number(subTotalAmt) >= 399) return 0;
    if (
        user?.isSnapitPlusMember &&
        user?.snapitPlusExpiresAt &&
        new Date() < new Date(user.snapitPlusExpiresAt) &&
        Number(subTotalAmt) >= 99
    ) return 0;
    return 12;
};

const SCRATCH_CARDS_POOL = [
    { brand: "Nykaa",      discount: "20% OFF", code: "NYK20SNAP",  expires_days: 7 },
    { brand: "boAt",       discount: "15% OFF", code: "BOAT15IT",   expires_days: 5 },
    { brand: "Mamaearth",  discount: "50 OFF",  code: "MAMA50SN",   expires_days: 7 },
    { brand: "Wow Skin",   discount: "25% OFF", code: "WOW25SNAP",  expires_days: 3 },
    { brand: "mCaffeine",  discount: "30 OFF",  code: "MCAF30IT",   expires_days: 5 },
    { brand: "Plum",       discount: "10% OFF", code: "PLUM10SN",   expires_days: 7 },
    { brand: "Minimalist", discount: "40 OFF",  code: "MINI40SN",   expires_days: 4 },
    { brand: "Beardo",     discount: "12% OFF", code: "BERD12SN",   expires_days: 6 },
];

export const getRandomScratchCards = () =>
    [...SCRATCH_CARDS_POOL]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((c) => ({
            brand:        c.brand,
            discount:     c.discount,
            code:         c.code,
            expires_days: c.expires_days,
            expires_at:   new Date(Date.now() + c.expires_days * 86400000),
        }));

const resolveStore = async (lat, lng) => {
    if (lat && lng) {
        const nearby = await StoreModel.find({
            location: {
                $near: {
                    $geometry:    { type: "Point", coordinates: [Number(lng), Number(lat)] },
                    $maxDistance: 5000,
                },
            },
        }).limit(1);
        if (nearby.length > 0) {
            return {
                storeId:  nearby[0]._id,
                name:     nearby[0].name,
                address:  nearby[0].address,
                location: {
                    lat: nearby[0].location.coordinates[1],
                    lng: nearby[0].location.coordinates[0],
                },
            };
        }
    }
    return DEFAULT_STORE;
};

const buildTaggedCartItems = async (list_items, assignedStoreName) => {
    return Promise.all(
        list_items.map(async (el) => {
            const product = await ProductModel.findById(el.productId._id).lean();
            const sellerPrice  = Number(product?.sellerPrice  ?? product?.price ?? el.productId.price ?? 0);
            const snapitMargin = Number(product?.snapitMargin ?? 0);
            const price        = Number(product?.price        ?? el.productId.price ?? sellerPrice + snapitMargin);
            return {
                productId:         el.productId._id,
                name:              el.productId.name  || product?.name  || "",
                image:             el.productId.image?.[0] || product?.image?.[0] || "",
                quantity:          Number(el.quantity) || 1,
                price,
                sellerPrice,
                snapitMargin,
                seller_store_name: product ? getStoreForProduct(product, assignedStoreName) : null,
            };
        })
    );
};

// Shared populate used by every dashboard GET
const populateOrder = (query) =>
    query
        .populate("userId",            "name email mobile")
        .populate("delivery_address")
        .populate("cartItems.productId", "name image price sellerPrice snapitMargin");

// Coerces all money fields to Number after populate
const toSafeOrder = (o) => {
    const obj = o.toObject ? o.toObject() : { ...o };
    obj.delivery_fee = Number(obj.delivery_fee ?? 0);
    obj.totalAmt     = Number(obj.totalAmt     ?? 0);
    obj.subTotalAmt  = Number(obj.subTotalAmt  ?? 0);
    obj.cartItems = (obj.cartItems || []).map((item) => ({
        ...item,
        price:        Number(item.price        ?? 0),
        sellerPrice:  Number(item.sellerPrice  ?? item.productId?.sellerPrice ?? item.price ?? 0),
        snapitMargin: Number(item.snapitMargin ?? item.productId?.snapitMargin ?? 0),
        quantity:     Number(item.quantity     ?? 1),
    }));
    return obj;
};

// ─────────────────────────────────────────────────────────────────────────────
// ORDER CREATION
// ─────────────────────────────────────────────────────────────────────────────

export async function CashOnDeliveryOrderController(request, response) {
    try {
        const userId = request.userId;
        const { list_items, totalAmt, addressId, subTotalAmt, lat, lng, couponCode, discountAmt } = request.body;

        for (const item of list_items) {
            const product = await ProductModel.findById(item.productId._id);
            if (!product || product.stock < (item.quantity || 1)) {
                return response.status(400).json({ message: `"${item.productId?.name || "Item"}" is out of stock.`, error: true, success: false });
            }
            product.stock -= item.quantity || 1;
            await product.save();
        }

        const currentUser     = await UserModel.findById(userId);
        const delivery_fee    = calcDeliveryFee(subTotalAmt, currentUser);
        const assignedStore   = await resolveStore(lat, lng);
        const taggedCartItems = await buildTaggedCartItems(list_items, assignedStore.name);
        const scratchCards    = getRandomScratchCards();

        const payload = {
            userId,
            orderId:           `ORD-${new mongoose.Types.ObjectId()}`,
            cartItems:         taggedCartItems,
            product_details:   { name: list_items[0].productId.name + (list_items.length > 1 ? ` (+${list_items.length - 1} more)` : ""), image: list_items[0].productId.image },
            paymentId:         "",
            payment_status:    "CASH ON DELIVERY",
            delivery_address:  addressId,
            subTotalAmt:       Number(subTotalAmt),
            totalAmt:          Number(totalAmt),
            delivery_fee,
            delivery_status:   "Pending",
            seller_status:     "Pending",
            store_details:     assignedStore,
            involved_stores:   [...new Set(taggedCartItems.map((i) => i.seller_store_name).filter(Boolean))],
            rider_name:        "Pratyush Sharma",
            rider_contact:     "9472026580",
            payment_collected: false,
            coupon_used:       couponCode || null,
            discount_amount:   Number(discountAmt) || 0,
            scratch_cards:     scratchCards,
        };

        const generatedOrder = new OrderModel(payload);
        await generatedOrder.save();
        await updateStreak(userId);
        await CartProductModel.deleteMany({ userId });
        await UserModel.updateOne({ _id: userId }, { shopping_cart: [] });

        return response.json({ message: "Order placed successfully.", error: false, success: true, data: generatedOrder, scratch_cards: scratchCards });
    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false });
    }
}

export async function WalletPaymentOrderController(request, response) {
    try {
        const userId = request.userId;
        const { list_items, totalAmt, addressId, subTotalAmt, lat, lng, couponCode, discountAmt } = request.body;

        const user = await UserModel.findById(userId);
        if (!user) return response.status(404).json({ message: "User not found.", error: true, success: false });

        const exactRequiredTotal = Number(totalAmt);
        if ((user.walletBalance || 0) < exactRequiredTotal)
            return response.status(400).json({ message: `Insufficient wallet balance. Need Rs.${(exactRequiredTotal - (user.walletBalance || 0)).toFixed(2)} more.`, error: true, success: false });

        for (const item of list_items) {
            const product = await ProductModel.findById(item.productId._id);
            if (!product || product.stock < (item.quantity || 1))
                return response.status(400).json({ message: `"${item.productId?.name || "Item"}" is out of stock.`, error: true, success: false });
        }
        for (const item of list_items) {
            await ProductModel.findByIdAndUpdate(item.productId._id, { $inc: { stock: -(item.quantity || 1) } });
        }

        const delivery_fee    = calcDeliveryFee(subTotalAmt, user);
        const assignedStore   = await resolveStore(lat, lng);
        const taggedCartItems = await buildTaggedCartItems(list_items, assignedStore.name);
        const transactionId   = `WAL-ORD-${new mongoose.Types.ObjectId()}`;
        const scratchCards    = getRandomScratchCards();

        await UserModel.findByIdAndUpdate(userId, {
            $inc:  { walletBalance: -exactRequiredTotal },
            $push: { walletTransactions: { type: "DEBIT", amount: exactRequiredTotal, description: `Grocery Order #${transactionId.slice(-8).toUpperCase()}`, date: new Date() } },
            shopping_cart: [],
        });

        const payload = {
            userId,
            orderId:           transactionId,
            cartItems:         taggedCartItems,
            product_details:   { name: list_items[0].productId.name + (list_items.length > 1 ? ` (+${list_items.length - 1} more)` : ""), image: list_items[0].productId.image },
            paymentId:         transactionId,
            payment_status:    "PAID",
            delivery_address:  addressId,
            subTotalAmt:       Number(subTotalAmt),
            totalAmt:          exactRequiredTotal,
            delivery_fee,
            delivery_status:   "Pending",
            seller_status:     "Pending",
            store_details:     assignedStore,
            involved_stores:   [...new Set(taggedCartItems.map((i) => i.seller_store_name).filter(Boolean))],
            rider_name:        "Pratyush Sharma",
            rider_contact:     "9472026580",
            payment_collected: true,
            coupon_used:       couponCode || null,
            discount_amount:   Number(discountAmt) || 0,
            scratch_cards:     scratchCards,
        };

        const newOrder = new OrderModel(payload);
        await newOrder.save();
        await updateStreak(userId);
        await CartProductModel.deleteMany({ userId });

        return response.json({ message: "Order placed via Snapit Wallet!", error: false, success: true, data: newOrder, scratch_cards: scratchCards });
    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false });
    }
}

export async function paymentController(request, response) {
    try {
        const { totalAmt, addressId } = request.body;
        const razorpay = new Razorpay({
            key_id:     String(process.env.RAZORPAY_KEY_ID).trim(),
            key_secret: String(process.env.RAZORPAY_SECRET_KEY).trim(),
        });
        const order = await razorpay.orders.create({
            amount:   Math.round(Number(totalAmt) * 100),
            currency: "INR",
            receipt:  `rcpt_${new mongoose.Types.ObjectId()}`,
            notes:    { userId: request.userId, addressId },
        });
        return response.status(200).json(order);
    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false });
    }
}

export async function verifyPaymentController(request, response) {
    try {
        const userId = request.userId;
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, list_items, addressId, subTotalAmt, totalAmt, couponCode, discountAmt, lat, lng } = request.body;

        const expectedSignature = crypto
            .createHmac("sha256", String(process.env.RAZORPAY_SECRET_KEY).trim())
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (expectedSignature !== razorpay_signature)
            return response.status(400).json({ message: "Signature verification failed.", error: true, success: false });

        const user         = await UserModel.findById(userId);
        const delivery_fee = calcDeliveryFee(subTotalAmt, user);
        const normalBaseTotal = Number(subTotalAmt) + delivery_fee;

        if (Number(totalAmt) > normalBaseTotal || Number(totalAmt) < normalBaseTotal - 5)
            return response.status(422).json({ message: "Security Warning: price alteration detected.", error: true, success: false });

        const assignedStore   = await resolveStore(lat, lng);
        const taggedCartItems = await buildTaggedCartItems(list_items, assignedStore.name);
        const scratchCards    = getRandomScratchCards();

        const payload = {
            userId,
            orderId:           razorpay_order_id,
            cartItems:         taggedCartItems,
            product_details:   { name: list_items[0].productId.name + (list_items.length > 1 ? ` (+${list_items.length - 1} more)` : ""), image: list_items[0].productId.image },
            paymentId:         razorpay_payment_id,
            payment_status:    "PAID",
            delivery_address:  addressId,
            subTotalAmt:       Number(subTotalAmt),
            totalAmt:          Number(totalAmt),
            delivery_fee,
            delivery_status:   "Pending",
            seller_status:     "Pending",
            store_details:     assignedStore,
            involved_stores:   [...new Set(taggedCartItems.map((i) => i.seller_store_name).filter(Boolean))],
            rider_name:        "Pratyush Sharma",
            rider_contact:     "9472026580",
            payment_collected: true,
            coupon_used:       couponCode || null,
            discount_amount:   Number(discountAmt) || 0,
            scratch_cards:     scratchCards,
        };

        const newOrder = new OrderModel(payload);
        await newOrder.save();
        await updateStreak(userId);

        for (const item of list_items) {
            await ProductModel.findByIdAndUpdate(item.productId._id, { $inc: { stock: -(item.quantity || 1) } });
        }
        await CartProductModel.deleteMany({ userId });
        await UserModel.updateOne({ _id: userId }, { shopping_cart: [] });

        return response.json({ message: "Order placed successfully!", error: false, success: true, data: newOrder, scratch_cards: scratchCards });
    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS UPDATES
// ─────────────────────────────────────────────────────────────────────────────

export const updateSellerOrderStatusController = async (request, response) => {
    try {
        const { orderId, sellerStatus } = request.body;
        if (!orderId || !sellerStatus)
            return response.status(400).json({ message: "orderId and sellerStatus are required.", error: true, success: false });

        const allowed = ["Pending", "Packing", "Ready for Pickup"];
        if (!allowed.includes(sellerStatus))
            return response.status(400).json({ message: `Invalid sellerStatus: ${sellerStatus}`, error: true, success: false });

        const delivery_status = sellerStatus === "Ready for Pickup" ? "Confirmed" : "Pending";
        const order = await OrderModel.findOneAndUpdate({ orderId }, { seller_status: sellerStatus, delivery_status }, { new: true });
        if (!order) return response.status(404).json({ message: "Order not found.", error: true, success: false });

        return response.json({ message: `Store status updated: ${sellerStatus}`, success: true, error: false, data: order });
    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false });
    }
};

export const updateOrderStatusController = async (request, response) => {
    try {
        const { orderId, status, payment_status, isSettled, cashReceived } = request.body;
        if (!orderId || !status)
            return response.status(400).json({ message: "orderId and status are required.", error: true, success: false });

        const order = await OrderModel.findOne({ orderId });
        if (!order) return response.status(404).json({ message: "Order not found.", error: true, success: false });

        if (status === "Delivered" && !order.payment_collected && order.payment_status !== "PAID" && !payment_status)
            return response.status(400).json({ message: "Collect payment before marking as Delivered.", success: false, error: true });

        const updatedOrder = await OrderModel.findOneAndUpdate(
            { orderId },
            {
                delivery_status: status,
                ...(payment_status    && { payment_status, payment_collected: true }),
                ...(isSettled !== undefined && { isSettled, settledAt: isSettled ? new Date() : null }),
                ...(cashReceived      && { cashReceived: Number(cashReceived) }),
                ...(status === "Delivered" && { deliveredAt: new Date() }),
            },
            { new: true }
        );
        return response.json({ message: `Order status updated to ${status}`, success: true, error: false, data: updatedOrder });
    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false });
    }
};

export const collectPaymentController = async (request, response) => {
    try {
        const { orderId, payment_status, isSettled, cashReceived } = request.body;
        if (!orderId) return response.status(400).json({ message: "orderId is required.", error: true, success: false });

        const order = await OrderModel.findOneAndUpdate(
            { orderId },
            {
                ...(payment_status    && { payment_status }),
                payment_collected: true,
                ...(isSettled !== undefined && { isSettled }),
                ...(cashReceived      && { cashReceived: Number(cashReceived) }),
            },
            { new: true }
        );
        if (!order) return response.status(404).json({ message: "Order not found.", error: true, success: false });
        return response.json({ message: "Payment recorded.", error: false, success: true, data: order });
    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET — RIDER DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

export async function getOrderItems(request, response) {
    try {
        response.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        response.set('Pragma', 'no-cache');

        const orders = await populateOrder(
            OrderModel.find({ delivery_status: { $nin: ["Cancelled"] } }).sort({ createdAt: -1 })
        );
        return response.json({ message: "Orders fetched.", error: false, success: true, data: orders.map(toSafeOrder) });
    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — SELLER ORDERS  (packing / history / earnings tabs)
// ─────────────────────────────────────────────────────────────────────────────

export async function getSellerOrdersController(request, response) {
    try {
        // ✅ Prevent HTTP-level caching so seller always gets fresh data
        response.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        response.set('Pragma', 'no-cache');
        response.set('Expires', '0');

        // ✅ Fetch ALL orders (including Delivered) so history/earnings tabs work
        // ✅ Sorted newest first
        const orders = await populateOrder(
            OrderModel.find({}).sort({ createdAt: -1 })
        );

        return response.json({
            message: "Seller orders fetched.",
            error:   false,
            success: true,
            data:    orders.map(toSafeOrder),
        });
    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — SELLER EARNINGS  (/api/order/seller-earnings)
// ─────────────────────────────────────────────────────────────────────────────

export async function getSellerEarningsController(request, response) {
    try {
        response.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        response.set('Pragma', 'no-cache');

        const orders = await populateOrder(
            OrderModel.find({}).sort({ createdAt: -1 })
        );

        const safeOrders = orders.map(toSafeOrder);
        const delivered  = safeOrders.filter((o) => (o.delivery_status || "").toLowerCase() === "delivered");

        const totalSellerEarning = delivered.reduce(
            (acc, o) => acc + o.cartItems.reduce((s, item) => s + item.sellerPrice * item.quantity, 0), 0
        );
        const totalSnapitMargin = delivered.reduce(
            (acc, o) => acc + o.cartItems.reduce((s, item) => s + item.snapitMargin * item.quantity, 0), 0
        );
        const totalDeliveryFees     = delivered.reduce((acc, o) => acc + o.delivery_fee, 0);
        const totalGross            = delivered.reduce((acc, o) => acc + o.totalAmt, 0);
        const totalSells            = delivered.length;
        const totalSalesExDelivery  = totalGross - totalDeliveryFees;

        return response.json({
            message: "Seller earnings fetched.",
            error:   false,
            success: true,
            data:    safeOrders,
            summary: {
                totalSellerEarning:   Number(totalSellerEarning.toFixed(2)),
                totalSnapitMargin:    Number(totalSnapitMargin.toFixed(2)),
                totalDeliveryFees:    Number(totalDeliveryFees.toFixed(2)),
                totalGross:           Number(totalGross.toFixed(2)),
                totalSells,
                totalSalesExDelivery: Number(totalSalesExDelivery.toFixed(2)),
            },
        });
    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// OTHER
// ─────────────────────────────────────────────────────────────────────────────

export async function getOrderDetailsController(request, response) {
    try {
        const userId = request.userId;
        const orders = await OrderModel.find({ userId }).populate("delivery_address").sort({ createdAt: -1 });
        return response.json({ message: "Orders fetched.", error: false, success: true, data: orders });
    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false });
    }
}

export const getRiderLocationController = async (request, response) => {
    try {
        const { orderId } = request.body;
        const order = await OrderModel.findOne({ orderId }).select("riderLocation delivery_status");
        if (!order) return response.status(404).json({ message: "Order not found.", error: true, success: false });
        return response.json({ message: "Location fetched.", error: false, success: true, data: order.riderLocation });
    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false });
    }
};

export const getDailySalesReport = async (req, res) => {
    try {
        const today    = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
        const orders   = await OrderModel.find({ createdAt: { $gte: today, $lt: tomorrow }, delivery_status: { $ne: "Cancelled" } });
        const totalRevenue  = orders.reduce((acc, o) => acc + Number(o.totalAmt    || 0), 0);
        const totalDelivery = orders.reduce((acc, o) => acc + Number(o.delivery_fee || 0), 0);
        return res.json({
            message: "Daily report", error: false, success: true,
            data: {
                totalOrders:       orders.length,
                totalRevenue:      Number(totalRevenue.toFixed(2)),
                totalDeliveryFees: Number(totalDelivery.toFixed(2)),
                deliveredOrders:   orders.filter((o) => o.delivery_status === "Delivered").length,
                pendingOrders:     orders.filter((o) => o.delivery_status !== "Delivered").length,
                orders,
            },
        });
    } catch (error) {
        return res.status(500).json({ message: error.message, error: true, success: false });
    }
};

export const settleRiderCashController = async (req, res) => {
    try {
        const { ordersSettled } = req.body;
        await OrderModel.updateMany({ _id: { $in: ordersSettled } }, { isSettled: true, settledAt: new Date() });
        return res.json({ message: "Cash settled successfully.", error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message, error: true, success: false });
    }
};

export async function getLastOrder(req, res) {
    try {
        const userId = req.userId;
        const order  = await OrderModel.findOne({ userId }).sort({ createdAt: -1 }).populate("delivery_address");
        if (!order) return res.status(404).json({ message: "No orders found.", error: true, success: false });
        return res.json({ message: "Last order fetched.", error: false, success: true, data: order });
    } catch (error) {
        return res.status(500).json({ message: error.message, error: true, success: false });
    }
}

export async function webhookStripe(request, response) {
    return response.json({ message: "Webhook received.", success: true });
}

export const applyCouponController = async (request, response) => {
    try {
        const { couponCode, totalAmt } = request.body;
        const userId = request.userId;
        if (!couponCode || !totalAmt)
            return response.status(400).json({ message: "Coupon code and amount required.", error: true, success: false });
        if (Number(totalAmt) < 149)
            return response.status(400).json({ message: "Minimum order Rs.149 required.", error: true, success: false });
        const user = await UserModel.findById(userId);
        if (!user) return response.status(404).json({ message: "User not found.", error: true, success: false });
        if (couponCode.trim().toUpperCase() === "FIRSTUSER") {
            const previousOrder = await OrderModel.findOne({ userId });
            if (previousOrder)
                return response.status(400).json({ message: "This code is for first-time customers only.", error: true, success: false });
            const discount = Math.floor(Math.random() * 4) + 2;
            return response.json({
                message: `Lucky coupon! You got Rs.${discount} surprise discount.`, error: false, success: true,
                data: { couponCode: "FIRSTUSER", discount_label: "Surprise Discount", discount, newTotal: Number(totalAmt) - discount },
            });
        }
        return response.status(400).json({ message: "Invalid coupon code.", error: true, success: false });
    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false });
    }
};

export const getScratchCardsController = async (request, response) => {
    try {
        return response.json({ message: "Scratch cards ready.", error: false, success: true, data: getRandomScratchCards() });
    } catch (error) {
        return response.status(500).json({ message: error.message, error: true, success: false });
    }
};