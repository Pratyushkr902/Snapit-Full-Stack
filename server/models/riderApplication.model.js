import mongoose from 'mongoose'

const riderApplicationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true,
    },
    mobile: {
      type: Number,
      required: [true, 'Please provide your 10-digit mobile number'],
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    vehicleType: {
      type: String,
      enum: ['BIKE', 'SCOOTER', 'BICYCLE', 'EV', 'OTHER'],
      default: 'BIKE',
    },
    vehicleNumber: {
      type: String,
      trim: true,
      default: '',
    },
    licenseNumber: {
      type: String,
      trim: true,
      default: '',
    },
    preferredHours: {
      type: String,
      enum: ['FULL_TIME', 'PART_TIME', 'WEEKENDS_ONLY', 'FLEXIBLE'],
      default: 'FULL_TIME',
    },
    area: {
      type: String,
      trim: true,
      default: 'Paliganj',
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    adminNotes: {
      type: String,
      trim: true,
      default: '',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

const RiderApplicationModel = mongoose.model('RiderApplication', riderApplicationSchema)
export default RiderApplicationModel
