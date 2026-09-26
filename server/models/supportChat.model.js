import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['user', 'admin', 'bot'],
    required: true,
  },
  senderName: {
    type: String,
    default: '',
  },
  text: {
    type: String,
    required: true,
  },
  cardType: {
    type: String,
    default: '',
  },
  cardData: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

const supportChatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userName: {
      type: String,
      default: 'Customer',
    },
    userEmail: {
      type: String,
      default: '',
    },
    userMobile: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['OPEN', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
      index: true,
    },
    unreadCountAdmin: {
      type: Number,
      default: 0,
    },
    unreadCountUser: {
      type: Number,
      default: 0,
    },
    lastMessage: {
      type: String,
      default: '',
    },
    lastSender: {
      type: String,
      enum: ['user', 'admin', 'bot'],
      default: 'user',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    activeOrderId: {
      type: String,
      default: '',
    },
    messages: [messageSchema],
  },
  {
    timestamps: true,
  }
)

supportChatSchema.index({ status: 1, lastMessageAt: -1 })

const SupportChatModel = mongoose.model('SupportChat', supportChatSchema)

export default SupportChatModel
