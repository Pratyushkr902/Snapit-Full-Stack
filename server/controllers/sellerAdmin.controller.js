import UserModel from "../models/user.model.js";
import OrderModel from "../models/order.model.js";
import ProductModel from "../models/product.model.js";
import mongoose from "mongoose";

export async function listSellersController(req, res) {
    try {
        const sellers = await UserModel.find({ role: "SELLER" })
            .select("name email store_name status createdAt")
            .lean();

        const sellerIds = sellers.map(s => s._id);

        const stats = await OrderModel.aggregate([
            { $unwind: "$cartItems" },
            { $match: { "cartItems.sellerId": { $in: sellerIds } } },
            {
                $group: {
                    _id: "$cartItems.sellerId",
                    totalOrders: { $addToSet: "$_id" },
                    totalRevenue: {
                        $sum: {
                            $add: [
                                { $multiply: ["$cartItems.snapitMargin", "$cartItems.quantity"] },
                                { $ifNull: ["$delivery_fee", 0] }
                            ]
                        }
                    },
                    totalItemsSold: { $sum: "$cartItems.quantity" },
                    lastOrderAt: { $max: "$createdAt" }
                }
            }
        ]);

        const statsMap = {};
        stats.forEach(s => {
            statsMap[s._id.toString()] = {
                totalOrders: s.totalOrders.length,
                totalRevenue: s.totalRevenue,
                totalItemsSold: s.totalItemsSold,
                lastOrderAt: s.lastOrderAt
            };
        });

        const merged = sellers.map(s => ({
            ...s,
            stats: statsMap[s._id.toString()] || { totalOrders: 0, totalRevenue: 0, totalItemsSold: 0, lastOrderAt: null }
        }));

        merged.sort((a, b) => b.stats.totalRevenue - a.stats.totalRevenue);
        merged.forEach((s, i) => (s.rank = i + 1));

        return res.json({ success: true, error: false, data: merged });
    } catch (err) {
        return res.status(500).json({ success: false, error: true, message: err.message });
    }
}

export async function getSellerOrdersController(req, res) {
    try {
        const { sellerId } = req.params;
        const { status, page = 1, limit = 20 } = req.query;
        const sellerObjId = new mongoose.Types.ObjectId(sellerId);

        const match = { "cartItems.sellerId": sellerObjId };
        if (status) match.delivery_status = status;

        const orders = await OrderModel.find(match)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .populate("userId", "name mobile")
            .lean();

        const shaped = orders.map(o => ({
            _id: o._id,
            orderId: o.orderId,
            customer: o.userId,
            delivery_status: o.delivery_status,
            seller_status: o.seller_status,
            createdAt: o.createdAt,
            deliveredAt: o.deliveredAt,
            sellerItems: o.cartItems.filter(ci => ci.sellerId?.toString() === sellerId),
            delivery_fee: o.delivery_fee,
            discount_amount: o.discount_amount,
            walletAmountUsed: o.walletAmountUsed
        }));

        const total = await OrderModel.countDocuments(match);

        return res.json({ success: true, error: false, data: shaped, total, page: Number(page) });
    } catch (err) {
        return res.status(500).json({ success: false, error: true, message: err.message });
    }
}

export async function getSellerEarningsController(req, res) {
    try {
        const { sellerId } = req.params;
        const { from, to } = req.query;
        const sellerObjId = new mongoose.Types.ObjectId(sellerId);

        const dateMatch = {};
        if (from) dateMatch.$gte = new Date(from);
        if (to) dateMatch.$lte = new Date(to);

        const pipeline = [
            { $unwind: "$cartItems" },
            { $match: { "cartItems.sellerId": sellerObjId, ...(from || to ? { createdAt: dateMatch } : {}) } },
            {
                $group: {
                    _id: null,
                    itemMargin: { $sum: { $multiply: ["$cartItems.snapitMargin", "$cartItems.quantity"] } },
                    sellerEarning: { $sum: { $multiply: ["$cartItems.sellerPrice", "$cartItems.quantity"] } },
                    itemsSold: { $sum: "$cartItems.quantity" },
                    orderIds: { $addToSet: "$_id" }
                }
            }
        ];

        const result = await OrderModel.aggregate(pipeline);
        const r = result[0] || { itemMargin: 0, sellerEarning: 0, itemsSold: 0, orderIds: [] };

        return res.json({
            success: true,
            error: false,
            data: {
                totalOrders: r.orderIds.length,
                itemsSold: r.itemsSold,
                sellerEarning: r.sellerEarning,
                snapitMargin: r.itemMargin
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: true, message: err.message });
    }
}

export async function getSellerProductsController(req, res) {
    try {
        const { sellerId } = req.params;
        const products = await ProductModel.find({ "store_inventory.sellerId": sellerId })
            .populate("category subCategory")
            .lean();
        return res.json({ success: true, error: false, data: products });
    } catch (err) {
        return res.status(500).json({ success: false, error: true, message: err.message });
    }
}

export async function updateSellerProductController(req, res) {
    try {
        const { sellerId, productId } = req.params;
        const updates = req.body;

        const product = await ProductModel.findById(productId);
        if (!product) return res.status(404).json({ success: false, error: true, message: "Product not found" });

        const ownsIt = product.store_inventory.some(inv => inv.sellerId?.toString() === sellerId);
        if (!ownsIt) {
            return res.status(403).json({ success: false, error: true, message: "This product doesn't belong to this seller" });
        }

        // stock lives per-seller inside store_inventory, not as a top-level field
        if (updates.stock !== undefined) {
            const inv = product.store_inventory.find(inv => inv.sellerId?.toString() === sellerId);
            if (inv) inv.stock = Number(updates.stock) || 0;
        }

        const allowedFields = ["name", "description", "sellerPrice", "snapitMargin", "publish", "image", "more_details", "unit", "category", "subCategory"];
        for (const key of allowedFields) {
            if (updates[key] !== undefined) product[key] = updates[key];
        }

        await product.save();

        return res.json({ success: true, error: false, message: "Product updated", data: product });
    } catch (err) {
        return res.status(500).json({ success: false, error: true, message: err.message });
    }
}

export async function createSellerProductController(req, res) {
    try {
        const { sellerId } = req.params;
        const {
            name, description = "", image = [], unit = "",
            sellerPrice, snapitMargin = 0, stock = 0,
            category = [], subCategory = [], publish = true
        } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, error: true, message: "Product name is required" });
        }
        if (sellerPrice === undefined || sellerPrice === null || isNaN(Number(sellerPrice))) {
            return res.status(400).json({ success: false, error: true, message: "Valid sellerPrice is required" });
        }

        const seller = await UserModel.findById(sellerId).select("store_name name role").lean();
        if (!seller || seller.role !== "SELLER") {
            return res.status(404).json({ success: false, error: true, message: "Seller not found" });
        }

        const product = new ProductModel({
            name: name.trim(),
            description,
            image,
            unit,
            sellerPrice: Number(sellerPrice),
            snapitMargin: Number(snapitMargin) || 0,
            publish,
            category,
            subCategory,
            store_inventory: [{
                store_name: seller.store_name || seller.name || "Store",
                sellerId,
                stock: Number(stock) || 0,
                isAvailable: true
            }]
        });

        await product.save();

        return res.status(201).json({ success: true, error: false, message: "Product created", data: product });
    } catch (err) {
        return res.status(500).json({ success: false, error: true, message: err.message });
    }
}

export async function deleteSellerProductController(req, res) {
    try {
        const { sellerId, productId } = req.params;

        const product = await ProductModel.findById(productId);
        if (!product) return res.status(404).json({ success: false, error: true, message: "Product not found" });

        const ownsIt = product.store_inventory.some(inv => inv.sellerId?.toString() === sellerId);
        if (!ownsIt) {
            return res.status(403).json({ success: false, error: true, message: "This product doesn't belong to this seller" });
        }

        if (product.store_inventory.length > 1) {
            product.store_inventory = product.store_inventory.filter(inv => inv.sellerId?.toString() !== sellerId);
            await product.save();
            return res.json({ success: true, error: false, message: "Removed from this store's inventory" });
        }

        await ProductModel.findByIdAndDelete(productId);
        return res.json({ success: true, error: false, message: "Product deleted" });
    } catch (err) {
        return res.status(500).json({ success: false, error: true, message: err.message });
    }
}