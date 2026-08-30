import mongoose from 'mongoose'

const deviceTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  platform: {
    type: String,
    enum: ['android', 'ios', 'web', 'unknown'],
    default: 'unknown',
  },
  appVersion: {
    type: String,
    default: '',
  },
  lastActiveAt: {
    type: Date,
    default: Date.now,
    index: true,
  }
}, {
  timestamps: true,
})

const DeviceTokenModel = mongoose.models.DeviceToken || mongoose.model('DeviceToken', deviceTokenSchema)

export default DeviceTokenModel
