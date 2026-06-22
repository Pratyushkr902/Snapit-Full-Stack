import mongoose from 'mongoose'

const scheduledOrderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    addressId: { type: mongoose.Schema.ObjectId, ref: 'address', required: true },
    cartItems: { type: Array, required: true },     // snapshot of items to reorder
    frequency: { type: String, enum: ['DAILY', 'WEEKLY'], required: true },
    paymentMode: { type: String, enum: ['COD', 'WALLET'], default: 'COD' },
    nextRunAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
}, { timestamps: true })

export default mongoose.model('ScheduledOrder', scheduledOrderSchema)