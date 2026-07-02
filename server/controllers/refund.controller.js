import RefundModel from "../models/refund.model.js";
import OrderModel  from "../models/order.model.js";
import UserModel   from "../models/user.model.js";

// Reasons that REQUIRE at least one photo as proof
const PHOTO_REQUIRED_REASONS = ["damaged_product", "expired_product", "quality_issue", "wrong_product"];

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/refund/submit
// ─────────────────────────────────────────────────────────────────────────────
export const submitRefund = async (req, res) => {
    try {
        const userId = req.userId;
        const { orderId, reason, description, affectedItems, photos, refundAmount } = req.body;

        // ── 1. Map frontend label to the schema's actual enum value.
        // FIX: generic slugify (lowercase + underscore) silently broke 4 of 5
        // reasons — e.g. "Item damaged" → "item_damaged", but the schema enum
        // is "damaged_product". Only "Other" ever happened to match. Explicit
        // map avoids relying on label wording matching the schema by coincidence.
        const REASON_LABEL_TO_ENUM = {
            "wrong item delivered": "wrong_product",
            "item damaged":         "damaged_product",
            "item missing":         "missing_item",
            "poor quality":         "quality_issue",
            "other":                "other",
        };
        const normalizedReason = REASON_LABEL_TO_ENUM[reason?.trim().toLowerCase()];
        if (!normalizedReason) {
            return res.status(400).json({ success: false, message: "Invalid refund reason." });
        }

        // ── 2. Find order
        const order = await OrderModel.findOne({ _id: orderId, userId });
        if (!order)
            return res.status(404).json({ success: false, message: "Order not found" });

        if (order.delivery_status !== "Delivered")
            return res.status(400).json({ success: false, message: "Refund only allowed on delivered orders" });

        // ── 3. TIME LIMIT — must raise refund within 2 hours of delivery
        if (order.deliveredAt) {
            const hoursSinceDelivery = (Date.now() - new Date(order.deliveredAt)) / (1000 * 60 * 60);
            if (hoursSinceDelivery > 2) {
                return res.status(400).json({
                    success: false,
                    message: "Refund window expired. Refunds must be raised within 2 hours of delivery.",
                });
            }
        }

        // ── 4. No duplicate refund
        const existing = await RefundModel.findOne({ orderId, userId });
        if (existing)
            return res.status(400).json({ success: false, message: "Refund already submitted for this order" });

        // ── 5. FRAUD SCORE — flag users with >30% refund rate (after 5+ orders)
        const [previousRefunds, totalOrders] = await Promise.all([
            RefundModel.find({ userId }),
            OrderModel.countDocuments({ userId, delivery_status: "Delivered" }),
        ]);

        if (totalOrders >= 5) {
            const approvedRefunds = previousRefunds.filter(r => r.status === "Approved").length;
            const refundRate      = approvedRefunds / totalOrders;

            if (refundRate > 0.3) {
                return res.status(400).json({
                    success: false,
                    message: "Your account has been flagged for unusual refund activity. Please contact support.",
                });
            }
        }

        // ── 6. RESTAURANT ORDER — stricter rules (hair/foreign object fraud)
        if (order.isRestaurantOrder) {
            if (!photos || photos.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Photo proof is required for restaurant order refunds.",
                });
            }
            if (!description || description.trim().length < 50) {
                return res.status(400).json({
                    success: false,
                    message: "Please describe the issue in detail (minimum 50 characters) for restaurant refunds.",
                });
            }
            if (!affectedItems || affectedItems.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Please specify which item had the issue.",
                });
            }
        }

        // ── 7. PHOTO PROOF — required for damage/quality/expired/wrong product
        if (PHOTO_REQUIRED_REASONS.includes(normalizedReason)) {
            if (!photos || photos.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: `Photo proof is required for "${normalizedReason}". Please upload at least one photo.`,
                });
            }
        }

        // ── 8. DESCRIPTION — required for "other"
        if (normalizedReason === "other" && (!description || description.trim().length < 10)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a description (minimum 10 characters) when selecting 'Other'.",
            });
        }

        // ── 9. PARTIAL REFUND ONLY — cap at affected items value, never full order
        if (affectedItems && affectedItems.length > 0) {
            const maxAllowedRefund = affectedItems.reduce(
                (sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)),
                0
            );
            if (Number(refundAmount) > maxAllowedRefund) {
                return res.status(400).json({
                    success: false,
                    message: `Refund amount ₹${refundAmount} exceeds the value of affected items ₹${maxAllowedRefund}. You can only claim refund for affected items.`,
                });
            }
        }

        // ── 10. Create refund
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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/refund/my  — Customer sees their own refunds
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/refund/all  — Admin sees all refunds
// Returns delivery proof photo + customer claim photos side by side
// Admin can compare: "what rider delivered" vs "what customer is claiming"
// ─────────────────────────────────────────────────────────────────────────────
export const getAllRefunds = async (req, res) => {
    try {
        const refunds = await RefundModel.find()
            .populate("userId",  "name email mobile")
            .populate("orderId", "orderId totalAmt createdAt payment_status cartItems deliveryProof deliveredAt isRestaurantOrder")
            .sort({ createdAt: -1 });

        // Enrich each refund with delivery proof + user fraud score for admin
        const enriched = await Promise.all(
            refunds.map(async (refund) => {
                const r = refund.toObject();

                // Attach delivery proof photo for comparison
                r.deliveryProofPhoto = r.orderId?.deliveryProof?.photo || null;
                r.deliveredAt        = r.orderId?.deliveredAt          || null;

                // Attach user fraud score so admin knows if this user is a repeat claimer
                const [userRefunds, userTotalOrders] = await Promise.all([
                    RefundModel.countDocuments({ userId: r.userId?._id }),
                    OrderModel.countDocuments({ userId: r.userId?._id, delivery_status: "Delivered" }),
                ]);
                r.userFraudScore = {
                    totalRefundsClaimed: userRefunds,
                    totalDeliveredOrders: userTotalOrders,
                    refundRate: userTotalOrders > 0
                        ? ((userRefunds / userTotalOrders) * 100).toFixed(1) + "%"
                        : "0%",
                    isSuspicious: userTotalOrders >= 5 && (userRefunds / userTotalOrders) > 0.3,
                };

                return r;
            })
        );

        return res.json({ success: true, data: enriched });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/refund/resolve  — Admin approves / rejects
// ─────────────────────────────────────────────────────────────────────────────
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