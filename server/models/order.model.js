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
                 sellerId: { type: mongoose.Schema.ObjectId, ref: "User", default: null },
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

        // ── Actual checkout-time coords — used for rider Maps link (NOT the saved Address doc, which can go stale) ──
        delivery_lat: { type: Number, default: null },
        delivery_lng: { type: Number, default: null },

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

        // FIX: previously hardcoded to a specific real rider's name + personal
        // phone number as the schema default. Any order that never went through
        // explicit rider-assignment logic (e.g. every food order, before that was
        // fixed in foodOrder.controller.js) silently displayed that person's real
        // contact info to customers, whether or not they were actually assigned.
        rider_name:    { type: String, default: "Unassigned" },
        rider_contact: { type: String, default: "" },

        // ── Assigned rider for this order (top-level, used for rider dashboard
        // filtering, pickup/delivery ownership checks, and tracking) ──
        riderId: { type: mongoose.Schema.ObjectId, ref: "User", default: null },

        // ── Payment collection ───────────────────────────────────────
        payment_collected: { type: Boolean, default: false },
        payment_mode:      { type: String,  default: null },
        cashReceived:      { type: Number,  default: 0 },

        // ── Delivery OTP verification ──────────────────────────────
        deliveryOtp:        { type: String, default: null },
        otpAttempts:        { type: Number, default: 0 },
        otpLockedUntil:     { type: Date,   default: null },
        deliveryProofPhoto: { type: String, default: null },
        otpVerifiedAt:      { type: Date,   default: null },

        // ── Settlement ───────────────────────────────────────────────
        isSettled:   { type: Boolean, default: false },
        settledAt:   { type: Date },
        deliveredAt: { type: Date },

        // ── Promotions ───────────────────────────────────────────────
        coupon_used:     { type: String, default: null },
        discount_amount: { type: Number, default: 0 },
        scratch_cards:   { type: Array,  default: [] },

        // ── Food order extras ────────────────────────────────────────
        tip:                  { type: Number,  default: 0 },
        walletAmountUsed:     { type: Number,  default: 0 },
        deliveryInstructions: { type: String,  default: "" },
        scheduledTime:        { type: Date,    default: null },
        isRestaurantOrder:    { type: Boolean, default: false },

        // ── Rider location (live tracking) ───────────────────────────
        riderLocation: {
            latitude:  { type: Number, default: null },
            longitude: { type: Number, default: null },
            updatedAt: { type: Date,   default: null },
        },

        // ── Delivery Proof Photo (like Blinkit / Zepto / Zomato) ─────
        // Rider MUST upload a photo when marking order as delivered.
        // This photo is shown to admin when reviewing refund claims
        // so they can compare: "what was delivered" vs "what customer claims".
        deliveryProof: {
            photo:      { type: String,  default: null },  // Cloudinary URL
            capturedAt: { type: Date,    default: null },  // when photo was taken
            riderId:    { type: mongoose.Schema.ObjectId, ref: "User", default: null },
            latitude:   { type: Number,  default: null },  // GPS at moment of delivery
            longitude:  { type: Number,  default: null },
            isUploaded: { type: Boolean, default: false }, // false = rider skipped (not allowed)
        },
        // ─────────────────────────────────────────────────────────────
    },
    { timestamps: true }
);

// ── Campus Ambassador referral tracking ─────────────────────────────────────
// On order creation: bump totalOrders (and firstOrders if this is the buyer's
// very first order ever) for whichever ambassador referred this buyer, if any.
// On delivery: bump completedOrders. Both are no-ops if the buyer wasn't
// referred by an ambassador (referredByAmbassador is null for most users).
orderSchema.post('save', async function (doc) {
    try {
        const UserModel = mongoose.model('User')
        const buyer = await UserModel.findById(doc.userId).select('referredByAmbassador')
        if (!buyer || !buyer.referredByAmbassador) return

        if (doc.wasNew) {
            const priorOrderCount = await mongoose.model('order').countDocuments({
                userId: doc.userId,
                _id: { $ne: doc._id }
            })
            const inc = { 'campusAmbassador.referralStats.totalOrders': 1, 'campusAmbassador.performance.points': 2 }
            if (priorOrderCount === 0) {
                inc['campusAmbassador.referralStats.firstOrders'] = 1
                inc['campusAmbassador.performance.points'] += 10
            }
            await UserModel.updateOne({ _id: buyer.referredByAmbassador }, { $inc: inc })
        }

        if (doc.delivery_status === 'Delivered' && doc.wasModifiedDeliveryStatus) {
            await UserModel.updateOne(
                { _id: buyer.referredByAmbassador },
                { $inc: { 'campusAmbassador.referralStats.completedOrders': 1, 'campusAmbassador.performance.points': 15 } }
            )
        }
    } catch (err) {
        console.error('[ambassador referral tracking] failed:', err.message)
    }
})

// Track isNew / isModified state BEFORE save completes, since post('save')
// runs after Mongoose has already reset these flags to false.
orderSchema.pre('save', function () {
    this.wasNew = this.isNew
    this.wasModifiedDeliveryStatus = this.isModified('delivery_status')
})

const OrderModel = mongoose.model("order", orderSchema);
export default OrderModel;