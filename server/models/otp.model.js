import mongoose from 'mongoose'

const otpSchema = new mongoose.Schema({
  email: { type: String, index: true },
  phone: { type: String, index: true }, // reserved for future SMS OTP
  otpHash: { type: String, required: true },
  purpose: { type: String, enum: ['signup', 'login', 'verify'], required: true },
  attempts: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true },
}, { timestamps: true })

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.model('Otp', otpSchema)
