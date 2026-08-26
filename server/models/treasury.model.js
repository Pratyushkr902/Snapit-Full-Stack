import mongoose from 'mongoose'

const treasuryTransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['DEPOSIT', 'WITHDRAWAL', 'COD_SETTLEMENT', 'ADJUSTMENT'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'UPI', 'BANK_TRANSFER'],
      default: 'CASH',
    },
    partner: {
      type: String,
      enum: ['SUPER_ADMIN', 'PARTNER_ADMIN', 'GENERAL_TREASURY'],
      default: 'GENERAL_TREASURY',
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    referenceId: {
      type: String,
      default: '',
      trim: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true,
    },
    recordedByName: {
      type: String,
      default: '',
    },
    recordedByEmail: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
)

const TreasuryModel = mongoose.model('Treasury', treasuryTransactionSchema)
export default TreasuryModel
