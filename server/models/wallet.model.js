import mongoose from 'mongoose';

const walletTransactionSchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        enum: ['CREDIT', 'DEBIT'],
        required: true
    },
    description: {
        type: String,
        required: true,
        default: 'Grocery Wallet Transaction'
    },
    referenceId: {
        type: String, // To store Razorpay Order ID / Payment ID
        sparse: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    balance: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    transactions: [walletTransactionSchema]
}, {
    timestamps: true
});

const WalletModel = mongoose.model('Wallet', walletSchema);

export default WalletModel;