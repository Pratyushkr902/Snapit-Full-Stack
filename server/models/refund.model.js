import mongoose from "mongoose";

const refundSchema = new mongoose.Schema(
    {
        orderId: { type: mongoose.Schema.ObjectId, ref: "order", required: true },
        userId:  { type: mongoose.Schema.ObjectId, ref: "User",  required: true },

        reason: {
            type: String,
            enum: [
                "wrong_product",    // received a different item
                "expired_product",  // product was past expiry date
                "damaged_product",  // product arrived physically damaged
                "missing_item",     // item was not in the package
                "quality_issue",    // product received but quality is bad (stale, spoiled, etc.)
                "other",            // anything else — description required
            ],
            required: true,
        },

        description:   { type: String, default: "" },

        // Photos are proof of the issue — required for damage/quality/expired reasons
        photos: [{ type: String }],

        affectedItems: [
            {
                productId: { type: mongoose.Schema.ObjectId, ref: "product" },
                name:      { type: String },
                quantity:  { type: Number },
                price:     { type: Number },
            }
        ],

        refundAmount: { type: Number, default: 0 },

        status: {
            type:    String,
            enum:    ["Pending", "Under Review", "Approved", "Rejected", "Refunded"],
            default: "Pending",
        },

        adminNote:    { type: String, default: "" },
        refundMethod: { type: String, enum: ["wallet", "original", ""], default: "" },
        resolvedAt:   { type: Date,   default: null },
    },
    { timestamps: true }
);

const RefundModel = mongoose.model("refund", refundSchema);
export default RefundModel;