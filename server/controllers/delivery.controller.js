import mongoose from "mongoose";
import OrderModel from "../models/order.model.js";
import uploadImageClodinary from "../utils/uploadImageClodinary.js";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/delivery/mark-delivered
// Called by the RIDER app when they deliver an order
// Body: { orderId, photo (base64 or file), latitude, longitude }
// ─────────────────────────────────────────────────────────────────────────────
export const markDelivered = async (req, res) => {
    try {
        const riderId = req.userId; // from auth middleware
        const { orderId, photo, latitude, longitude } = req.body;

        if (!orderId) {
            return res.status(400).json({ success: false, message: "orderId is required." });
        }

        // 1. Photo is mandatory — rider cannot mark delivered without it
        if (!photo) {
            return res.status(400).json({
                success: false,
                message: "Delivery proof photo is required to mark order as delivered.",
            });
        }

        const isHexId = mongoose.Types.ObjectId.isValid(orderId);
        const order = await OrderModel.findOne({
            $or: [
                { orderId },
                ...(isHexId ? [{ _id: orderId }] : [])
            ]
        });

        if (!order)
            return res.status(404).json({ success: false, message: "Order not found" });

        // Fleet security: Ensure order is assigned to this rider (or caller is admin)
        const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.userRole);
        if (!isAdmin && order.riderId && order.riderId.toString() !== riderId) {
            return res.status(403).json({ success: false, message: "This order is assigned to another rider." });
        }

        if (order.delivery_status === "Delivered")
            return res.status(400).json({ success: false, message: "Order already marked as delivered" });

        // 2. Upload photo to Cloudinary
        const uploadResult = await uploadImageClodinary(photo, `delivery_proofs/${order.orderId || order._id}`);

        // 3. Save delivery proof + mark delivered (sync both schema fields)
        if (!order.deliveryProof) {
            order.deliveryProof = {};
        }
        order.delivery_status          = "Delivered";
        order.deliveredAt              = new Date();
        order.riderId                  = riderId;
        order.deliveryProofPhoto       = uploadResult.secure_url;
        order.deliveryProof.photo      = uploadResult.secure_url;
        order.deliveryProof.capturedAt = new Date();
        order.deliveryProof.riderId    = riderId;
        order.deliveryProof.latitude   = latitude  || null;
        order.deliveryProof.longitude  = longitude || null;
        order.deliveryProof.isUploaded = true;

        await order.save();

        return res.json({
            success: true,
            message: "Order marked as delivered with proof photo",
            data: {
                orderId:      order.orderId || order._id,
                deliveredAt:  order.deliveredAt,
                proofPhoto:   order.deliveryProof.photo,
            },
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/delivery/proof/:orderId
// Called by admin or order customer — shows the delivery proof photo
// ─────────────────────────────────────────────────────────────────────────────
export const getDeliveryProof = async (req, res) => {
    try {
        const { orderId } = req.params;

        if (!orderId) {
            return res.status(400).json({ success: false, message: "orderId is required." });
        }

        const isHexId = mongoose.Types.ObjectId.isValid(orderId);
        const order = await OrderModel.findOne({
            $or: [
                { orderId },
                ...(isHexId ? [{ _id: orderId }] : [])
            ]
        })
            .select("orderId userId delivery_status deliveredAt deliveryProof deliveryProofPhoto riderId")
            .populate("deliveryProof.riderId", "name mobile");

        if (!order)
            return res.status(404).json({ success: false, message: "Order not found" });

        // RBAC & IDOR guard: Only admin, super admin, assigned rider, or the order customer can view proof
        const isAuthorized = 
            ['ADMIN', 'SUPER_ADMIN'].includes(req.userRole) ||
            order.userId?.toString() === req.userId ||
            order.riderId?.toString() === req.userId;

        if (!isAuthorized) {
            return res.status(403).json({ success: false, message: "Unauthorized access to delivery proof." });
        }

        const proofPhoto = order.deliveryProof?.photo || order.deliveryProofPhoto;
        if (!proofPhoto) {
            return res.status(404).json({
                success: false,
                message: "No delivery proof photo found for this order",
            });
        }

        return res.json({
            success: true,
            data: {
                orderId:     order.orderId,
                status:      order.delivery_status,
                deliveredAt: order.deliveredAt,
                proof: {
                    photo:      order.deliveryProof.photo,
                    capturedAt: order.deliveryProof.capturedAt,
                    rider:      order.deliveryProof.riderId,
                    location: {
                        latitude:  order.deliveryProof.latitude,
                        longitude: order.deliveryProof.longitude,
                    },
                },
            },
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};