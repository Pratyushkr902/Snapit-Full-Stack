import mongoose from 'mongoose';

const walletTransactionSchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        // ✅ CHANGED TO LOWERCASE: Matches tab aggregations inside your Wallet.jsx (.filter(t => t.type === 'debit'))
        enum: ['credit', 'debit'], 
        required: true
    },
    description: {
        type: String,
        required: true,
        default: 'Grocery Wallet Transaction'
    },
    referenceId: {
        type: String, // Stores Razorpay Order ID / Payment ID or Order IDs
        sparse: true
    },
    date: {
        type: Date,
        default: Date.now // ✅ CHANGED FROM timestamp TO date: Matches frontend mapping layout (new Date(txn.date))
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