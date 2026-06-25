import OrderModel from "../models/order.model.js";
import { uploadImageClodinary } from "../utils/uploadImageClodinary.js";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/delivery/mark-delivered
// Called by the RIDER app when they deliver an order
// Body: { orderId, photo (base64 or file), latitude, longitude }
// ─────────────────────────────────────────────────────────────────────────────
export const markDelivered = async (req, res) => {
    try {
        const riderId = req.userId; // from auth middleware
        const { orderId, photo, latitude, longitude } = req.body;

        // 1. Photo is mandatory — rider cannot mark delivered without it
        if (!photo) {
            return res.status(400).json({
                success: false,
                message: "Delivery proof photo is required to mark order as delivered.",
            });
        }

        const order = await OrderModel.findById(orderId);
        if (!order)
            return res.status(404).json({ success: false, message: "Order not found" });

        if (order.delivery_status === "Delivered")
            return res.status(400).json({ success: false, message: "Order already marked as delivered" });

        // 2. Upload photo to Cloudinary (or your storage)
        const uploadResult = await uploadImageClodinary(photo, `delivery_proofs/${orderId}`);

        // 3. Save delivery proof + mark delivered
        order.delivery_status         = "Delivered";
        order.deliveredAt             = new Date();
        order.riderId                 = riderId;
        order.deliveryProof.photo     = uploadResult.secure_url;
        order.deliveryProof.capturedAt= new Date();
        order.deliveryProof.riderId   = riderId;
        order.deliveryProof.latitude  = latitude  || null;
        order.deliveryProof.longitude = longitude || null;
        order.deliveryProof.isUploaded= true;

        await order.save();

        return res.json({
            success: true,
            message: "Order marked as delivered with proof photo",
            data: {
                orderId:      order._id,
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
// Called by admin when reviewing a refund — shows the delivery proof photo
// ─────────────────────────────────────────────────────────────────────────────
export const getDeliveryProof = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await OrderModel.findById(orderId)
            .select("orderId delivery_status deliveredAt deliveryProof riderId")
            .populate("deliveryProof.riderId", "name mobile");

        if (!order)
            return res.status(404).json({ success: false, message: "Order not found" });

        if (!order.deliveryProof?.isUploaded) {
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