import mongoose from "mongoose";

const sundayFlashOfferSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "SUNDAY FLASH OFFER 🔥",
    },
    subtitle: {
      type: String,
      default: "5 MINUTES. ₹149 FOOD. ₹0 FOOD COST.",
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    // When the current 5-minute flash window started
    startTime: {
      type: Date,
      default: null,
    },
    // When the 5-minute flash window ends (strictly startTime + 5 minutes)
    endTime: {
      type: Date,
      default: null,
    },
    // Maximum food value eligible for ₹0 food cost
    maxFoodValue: {
      type: Number,
      default: 149,
    },
    // Window duration in minutes
    durationMinutes: {
      type: Number,
      default: 5,
    },
    // Delivery pricing rules during the flash offer
    deliveryRules: {
      baseKm: { type: Number, default: 3 },
      baseCharge: { type: Number, default: 29 },
      perKmRate: { type: Number, default: 9 }, // ₹9 per km for 3–14 km
      maxKm: { type: Number, default: 14 },
    },
    // Strict 1 user = 1 order: list of user IDs who claimed in the current/latest flash window
    claimedUserIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Also track mobile numbers to prevent multi-account abuse on same phone
    claimedMobiles: [
      {
        type: String,
      },
    ],
    // Scheduled Sunday trigger time (IST 24-hr format)
    scheduledHourIST: {
      type: Number,
      default: 17, // 5:00 PM IST
    },
    scheduledMinuteIST: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const SundayFlashOfferModel =
  mongoose.models.SundayFlashOffer ||
  mongoose.model("SundayFlashOffer", sundayFlashOfferSchema);

export default SundayFlashOfferModel;

