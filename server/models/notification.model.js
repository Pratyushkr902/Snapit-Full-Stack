import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    recipientType: {
      type: String,
      // FIX: seller and rider notifications were being sent (notificationService.js)
      // but every save failed validation because this enum didn't include them.
      enum: ["user", "admin", "store", "seller", "rider"],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    // FIX: previously a closed enum of generic categories ("order", "payment", etc.)
    // that never matched any of the specific event names actually passed in by
    // notificationService.js (e.g. "ORDER_DELIVERED", "NEW_ORDER", "LOW_STOCK") —
    // every single notification save was failing validation. Opened up to a plain
    // string so specific event types persist and new ones don't silently break saving.
    type: {
      type: String,
      default: "general",
    },
    shayari: {
      type: String,
      default: "",
    },
    body: {
      type: String,
      default: "",
    },
    fcmToken: {
      type: String,
      default: null,
    },
    fcmMessageId: {
      type: String,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    data: {
      type: mongoose.Schema.Types.Mixed, // optional extra payload (e.g. orderId)
      default: null,
    },
  },
  { timestamps: true }
);

// Auto-delete notifications older than 60 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
