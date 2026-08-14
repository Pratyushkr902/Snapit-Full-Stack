import mongoose from 'mongoose'

const withdrawalSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 50
    },
    upiId: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING'
    },
    adminNote: {
        type: String,
        default: ''
    },
    processedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
})

const WithdrawalModel = mongoose.model('Withdrawal', withdrawalSchema)
export default WithdrawalModel
