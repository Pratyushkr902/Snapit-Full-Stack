import RefundModel from "../models/refund.model.js";
import OrderModel  from "../models/order.model.js";
import UserModel   from "../models/user.model.js";

const PHOTO_REQUIRED_REASONS = ["damaged_product", "expired_product", "quality_issue", "wrong_product"];

export const submitRefund = async (req, res) => {
    try {
        const userId = req.userId;
        const { orderId, reason, description, affectedItems, photos, refundAmount } = req.body;

        const normalizedReason = reason?.trim().toLowerCase().replace(/\s+/g, "_");

        const order = await OrderModel.findOne({ _id: orderId, userId });
        if (!order)
            return res.status(404).json({ success: false, message: "Order not found" });

        if (order.delivery_status !== "Delivered")
            return res.status(400).json({ success: false, message: "Refund only allowed on delivered orders" });

        const existing = await RefundModel.findOne({ orderId, userId });
        if (existing)
            return res.status(400).json({ success: false, message: "Refund already submitted for this order" });

        if (PHOTO_REQUIRED_REASONS.includes(normalizedReason)) {
            if (!photos || photos.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: `Photos are required as proof for reason: "${normalizedReason}". Please upload at least one photo of the product.`,
                });
            }
        }

        if (normalizedReason === "other" && (!description || description.trim().length < 10)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a description (at least 10 characters) when selecting 'Other'.",
            });
        }

        const refund = await RefundModel.create({
            orderId,
            userId,
            reason:        normalizedReason,
            description:   description   || "",
            photos:        photos        || [],
            affectedItems: affectedItems || [],
            refundAmount:  refundAmount  || 0,
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

// GET /api/refund/all
// Returns delivery proof photo alongside refund claim photos so admin can compare both
export const getAllRefunds = async (req, res) => {
    try {
        const refunds = await RefundModel.find()
            .populate("userId",  "name email mobile")
            .populate("orderId", "orderId totalAmt createdAt payment_status cartItems deliveryProof deliveredAt")
            .sort({ createdAt: -1 });

        // Attach delivery proof photo to each refund for easy admin comparison
        const enriched = refunds.map((refund) => {
            const r = refund.toObject();
            r.deliveryProofPhoto = r.orderId?.deliveryProof?.photo || null;
            r.deliveredAt        = r.orderId?.deliveredAt          || null;
            return r;
        });

        return res.json({ success: true, data: enriched });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const resolveRefund = async (req, res) => {
    try {
        const { refundId, status, adminNote, refundMethod } = req.body;

        const refund = await RefundModel.findById(refundId);
        if (!refund)
            return res.status(404).json({ success: false, message: "Refund not found" });

        refund.status     = status;
        refund.adminNote  = adminNote || "";
        refund.resolvedAt = new Date();

        if ((status === "Approved" || status === "Refunded") && refundMethod === "wallet") {
            refund.refundMethod = "wallet";
            await UserModel.findByIdAndUpdate(refund.userId, {
                $inc: { walletBalance: refund.refundAmount },
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