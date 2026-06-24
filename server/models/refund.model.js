import mongoose from "mongoose";

const refundSchema = new mongoose.Schema(
    {
        orderId: { type: mongoose.Schema.ObjectId, ref: "order", required: true },
        userId:  { type: mongoose.Schema.ObjectId, ref: "User",  required: true },
        reason: {
            type: String,
            enum: ["wrong_product", "expired_product", "damaged_product", "missing_item", "other"],
            required: true,
        },
        description:   { type: String, default: "" },
        photos:        [{ type: String }],
        affectedItems: [
            {
                productId: { type: mongoose.Schema.ObjectId, ref: "product" },
                name:      { type: String },
                quantity:  { type: Number },
                price:     { type: Number },
            }
        ],
        refundAmount:  { type: Number, default: 0 },
        status: {
            type:    String,
            enum:    ["Pending", "Under Review", "Approved", "Rejected", "Refunded"],
            default: "Pending",
        },
        adminNote:    { type: String, default: "" },
        refundMethod: { type: String, enum: ["wallet", "original", ""], default: "" },
        resolvedAt:   { type: Date, default: null },
    },
    { timestamps: true }
);

const RefundModel = mongoose.model("refund", refundSchema);
export default RefundModel;
