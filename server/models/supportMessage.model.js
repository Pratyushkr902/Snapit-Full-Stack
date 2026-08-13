import mongoose from 'mongoose'

const supportMessageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  name: { type: String, default: 'Guest' },
  phone: { type: String, default: '' },
  orderId: { type: String, default: '' },
  message: { type: String, required: true },
  status: { type: String, enum: ['open', 'resolved'], default: 'open' },
}, { timestamps: true })

export default mongoose.model('SupportMessage', supportMessageSchema)
