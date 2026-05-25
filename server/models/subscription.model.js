import mongoose from 'mongoose';

const subscriptionItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product', // Make sure this matches your exact Product model registration string
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 1,
        min: [1, "Quantity cannot be less than 1"]
    }
});

const subscriptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [subscriptionItemSchema], // Array of items included in this recurring plan
    frequency: {
        type: String,
        enum: ['DAILY', 'WEEKLY', 'ALTERNATIVE'], // ALTERNATIVE: Every other day delivery
        required: true
    },
    delivery_address: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'address', // Links to the customer's saved address document
        required: true
    },
    nextDeliveryDate: {
        type: Date,
        required: true // Used by the automation engine to know when to run this order next
    },
    status: {
        type: String,
        enum: ['Active', 'Paused', 'Cancelled'],
        default: 'Active'
    },
    payment_method: {
        type: String,
        enum: ['WALLET', 'COD'], // Automatically charges wallet or marks order as Cash on Delivery
        default: 'WALLET'
    }
}, {
    timestamps: true
});

// Indexing nextDeliveryDate and status for rapid daily cron engine lookups
subscriptionSchema.index({ nextDeliveryDate: 1, status: 1 });

const SubscriptionModel = mongoose.model('GrocerySubscription', subscriptionSchema);

export default SubscriptionModel;