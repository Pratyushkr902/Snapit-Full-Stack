import RefundModel from "../models/refund.model.js";
import OrderModel  from "../models/order.model.js";
import UserModel   from "../models/user.model.js";

export const submitRefund = async (req, res) => {
    try {
        const userId = req.userId;
        const { orderId, reason, description, affectedItems, photos, refundAmount } = req.body;

        const order = await OrderModel.findOne({ _id: orderId, userId });
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        if (order.delivery_status !== "Delivered")
            return res.status(400).json({ success: false, message: "Refund only allowed on delivered orders" });

        const existing = await RefundModel.findOne({ orderId, userId });
        if (existing)
            return res.status(400).json({ success: false, message: "Refund already submitted for this order" });

        const refund = await RefundModel.create({
            orderId, userId, reason,
            description:   description || "",
            photos:        photos       || [],
            affectedItems: affectedItems|| [],
            refundAmount:  refundAmount || 0,
        });

        return res.json({ success: true, message: "Refund request submitted successfully", data: refund });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const getMyRefunds = async (req, res) => {
    try {
        const refunds = await RefundModel.find({ userId: req.userId })
            .populate("orderId", "orderId totalAmt createdAt cartItems")
            .sort({ createdAt: -1 });
        return res.json({ success: true, data: refunds });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const getAllRefunds = async (req, res) => {
    try {
        const refunds = await RefundModel.find()
            .populate("userId",  "name email mobile")
            .populate("orderId", "orderId totalAmt createdAt payment_status cartItems")
            .sort({ createdAt: -1 });
        return res.json({ success: true, data: refunds });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const resolveRefund = async (req, res) => {
    try {
        const { refundId, status, adminNote, refundMethod } = req.body;

        const refund = await RefundModel.findById(refundId);
        if (!refund) return res.status(404).json({ success: false, message: "Refund not found" });

        refund.status     = status;
        refund.adminNote  = adminNote  || "";
        refund.resolvedAt = new Date();

        if ((status === "Approved" || status === "Refunded") && refundMethod === "wallet") {
            refund.refundMethod = "wallet";
            await UserModel.findByIdAndUpdate(refund.userId, {
                $inc: { walletBalance: refund.refundAmount }
            });
        } else if (refundMethod) {
            refund.refundMethod = refundMethod;
        }

        await refund.save();
        return res.json({ success: true, message: `Refund ${status}`, data: refund });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
