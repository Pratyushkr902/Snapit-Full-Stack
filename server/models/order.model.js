import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.ObjectId,
            ref: "User",
        },
        orderId: {
            type: String,
            required: [true, "Provide orderId"],
            unique: true,
        },
        productId: {
            type: mongoose.Schema.ObjectId,
            ref: "product",
        },

        // ── Cart items — every monetary field stored at order time ──
        cartItems: [
            {
                productId: { type: mongoose.Schema.ObjectId, ref: "product" },
                quantity:  { type: Number, default: 1 },
                name:      { type: String, default: "" },
                image:     { type: String, default: "" },

                // price the CUSTOMER pays per unit  (sellerPrice + snapitMargin)
                price: { type: Number, default: 0 },

                // price the SELLER earns per unit  ✅ REQUIRED for seller dashboard
                sellerPrice: { type: Number, default: 0 },

                // Snapit's margin per unit          ✅ REQUIRED for earnings breakdown
                snapitMargin: { type: Number, default: 0 },

                seller_store_name: { type: String, default: null },
            },
        ],

        product_details: {
            name:  { type: String, default: "" },
            image: { type: Array,  default: [] },
        },

        paymentId:      { type: String, default: "" },
        payment_status: { type: String, default: "" },

        delivery_address: {
            type: mongoose.Schema.ObjectId,
            ref: "address",
        },

        subTotalAmt: { type: Number, default: 0 },
        totalAmt:    { type: Number, default: 0 },

        // ── Delivery fee — ✅ REQUIRED for rider & seller earnings ──
        delivery_fee: { type: Number, default: 0 },

        invoice_receipt: { type: String, default: "" },

        seller_status: {
            type:    String,
            enum:    ["Pending", "Packing", "Ready for Pickup"],
            default: "Pending",
        },

        store_details: {
            storeId:  { type: mongoose.Schema.ObjectId, ref: "store" },
            name:     { type: String, default: "Pali Mega Mart" },
            address:  { type: String, default: "Paliganj, Bihar" },
            location: {
                lat: { type: Number, default: 25.330951 },
                lng: { type: Number, default: 84.800609 },
            },
        },

        involved_stores: [{ type: String }],

        delivery_status: {
            type:    String,
            enum:    ["Pending", "Confirmed", "Out for Delivery", "Delivered", "Cancelled"],
            default: "Pending",
        },

        rider_name:    { type: String, default: "Pratyush Kumar" },
        rider_contact: { type: String, default: "9472026580" },

        // ── Payment collection ───────────────────────────────────────
        payment_collected: { type: Boolean, default: false },
        payment_mode:      { type: String,  default: null },
        cashReceived:      { type: Number,  default: 0 },

        // ── Settlement ───────────────────────────────────────────────
        isSettled:  { type: Boolean, default: false },
        settledAt:  { type: Date },
        deliveredAt:{ type: Date },

        // ── Promotions ───────────────────────────────────────────────
        coupon_used:     { type: String, default: null },
        discount_amount: { type: Number, default: 0 },
        scratch_cards:   { type: Array,  default: [] },

        // ── Rider location (live tracking) ───────────────────────────
        riderLocation: {
            latitude:  { type: Number, default: null },
            longitude: { type: Number, default: null },
            updatedAt: { type: Date,   default: null },
        },
    },
    { timestamps: true }
);

const OrderModel = mongoose.model("order", orderSchema);
export default OrderModel;