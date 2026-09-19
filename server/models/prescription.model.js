import mongoose from 'mongoose'

const prescriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    contactPhone: {
      type: String,
      required: true,
      trim: true,
    },
    prescriptionImages: {
      type: [String],
      default: [],
      required: true,
    },
    deliveryAddress: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'address',
      default: null,
    },
    deliveryAddressText: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'approved', 'order_created', 'rejected'],
      default: 'pending',
      index: true,
    },
    adminNotes: {
      type: String,
      default: '',
    },
    estimatedBill: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
)

// Index for fast query of user prescriptions sorted by latest
prescriptionSchema.index({ userId: 1, createdAt: -1 })
prescriptionSchema.index({ status: 1, createdAt: -1 })

const PrescriptionModel =
  mongoose.models.Prescription || mongoose.model('Prescription', prescriptionSchema)

export default PrescriptionModel

