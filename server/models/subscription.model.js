import mongoose from 'mongoose';

const subscriptionItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product',
        required: false   // ✅ FIXED: not required for Snapit Plus membership plans
    },
    name: {
        type: String,     // ✅ NEW: used for Snapit Plus plan name display
    },
    quantity: {
        type: Number,
        required: true,
        default: 1,
        min: [1, "Quantity cannot be less than 1"]
    },
    price: {
        type: Number,     // ✅ NEW: plan price for display in MySubscriptions
    }
});

const subscriptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [subscriptionItemSchema],
    frequency: {
        type: String,
        enum: ['DAILY', 'WEEKLY', 'ALTERNATIVE', 'monthly', 'yearly'],  // ✅ FIXED: added monthly/yearly for Snapit Plus
        required: true
    },
    delivery_address: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'address',
        required: false   // ✅ FIXED: Snapit Plus has no delivery address
    },
    nextDeliveryDate: {
        type: Date,
        required: false   // ✅ FIXED: not applicable for Snapit Plus
    },
    status: {
        type: String,
        enum: ['Active', 'Paused', 'Cancelled'],
        default: 'Active'
    },
    payment_method: {
        type: String,
        enum: ['WALLET', 'COD', 'Online'],  // ✅ FIXED: added Online for Razorpay payments
        default: 'WALLET'
    },

    // ✅ NEW: Snapit Plus membership fields
    planType: {
        type: String,
        enum: ['monthly', 'yearly'],
    },
    expiresAt: {
        type: Date,       // When the Snapit Plus membership expires
    },
    paymentId: {
        type: String,     // Razorpay payment ID for reference
    },
    orderId: {
        type: String,     // Razorpay order ID for reference
    },
    isSnapitPlus: {
        type: Boolean,
        default: false,   // true = this is a Snapit Plus membership, not a grocery subscription
    }
}, {
    timestamps: true
});

subscriptionSchema.index({ nextDeliveryDate: 1, status: 1 });

const SubscriptionModel = mongoose.model('GrocerySubscription', subscriptionSchema);
export default SubscriptionModel;