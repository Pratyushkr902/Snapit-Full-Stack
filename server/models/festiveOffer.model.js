import mongoose from "mongoose";

const festiveOfferSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "Raksha Bandhan Special — MGD Pizza Point",
    },
    subtitle: {
      type: String,
      default: "10% OFF on all pizzas + FREE Margherita Pizza on orders above ₹599!",
    },
    bannerImage: {
      type: String,
      default: "/mgd_rakhi_banner.jpg",
    },
    targetUrl: {
      type: String,
      default: "/restaurant/6a3963a7e0dd57acb747e405",
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      default: "6a3963a7e0dd57acb747e405",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // When the countdown ends and the offer goes live
    startsAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    },
    // When the 24-hour offer expires
    endsAt: {
      type: Date,
      default: () => new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
    },
    minOrderForFreebie: {
      type: Number,
      default: 599,
    },
    freebieName: {
      type: String,
      default: "Margherita Pizza (Worth ₹99)",
    },
    discountPercentage: {
      type: Number,
      default: 10,
    },
  },
  { timestamps: true }
);

const FestiveOfferModel =
  mongoose.models.FestiveOffer ||
  mongoose.model("FestiveOffer", festiveOfferSchema);

export default FestiveOfferModel;
