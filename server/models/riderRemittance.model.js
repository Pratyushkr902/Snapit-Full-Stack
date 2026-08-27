import mongoose from 'mongoose';

const riderRemittanceSchema = new mongoose.Schema({
  riderId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  paymentMethod: {
    type: String,
    enum: ['UPI', 'BANK_TRANSFER', 'CASH'],
    default: 'UPI'
  },
  transactionId: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  receiptImage: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING',
    index: true
  },
  riderNote: {
    type: String,
    default: ''
  },
  adminNote: {
    type: String,
    default: ''
  },
  reviewedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

const RiderRemittanceModel = mongoose.model('RiderRemittance', riderRemittanceSchema);
export default RiderRemittanceModel;
