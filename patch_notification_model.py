path = "server/models/notification.model.js"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """    recipientType: {
      type: String,
      enum: ["user", "admin", "store"],
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
    type: {
      type: String,
      enum: [
        "order",
        "payment",
        "promotion",
        "review",
        "system",
        "referral",
        "wallet",
        "subscription",
        "flash_sale",
        "general",
      ],
      default: "general",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    data: {
      type: mongoose.Schema.Types.Mixed, // optional extra payload (e.g. orderId)
      default: null,
    },
  },"""

new = """    recipientType: {
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
  },"""

assert content.count(old) == 1, f"expected 1 match, found {content.count(old)}"
content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("patched", path)
