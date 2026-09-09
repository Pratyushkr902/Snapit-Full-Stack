import cron from "node-cron";
import SundayFlashOfferModel from "../models/sundayFlashOffer.model.js";
import { broadcastToAllUsers } from "../utils/marketingCron.js";

/**
 * Sunday Flash Offer Cron
 * Runs every Sunday at 5:00 PM IST (17:00 IST).
 * Triggers the 5-minute flash offer window and broadcasts notification to all users.
 */
export const startSundayFlashCron = () => {
  // Every Sunday at 17:00 IST (5:00 PM)
  cron.schedule(
    "0 17 * * 0",
    async () => {
      console.log("[SundayFlashCron] 🔔 Auto-triggering Sunday Flash Offer at 5:00 PM IST...");
      try {
        const durationMinutes = 5;
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

        let offer = await SundayFlashOfferModel.findOne().sort({ updatedAt: -1 });
        if (!offer) {
          offer = new SundayFlashOfferModel();
        }

        offer.isActive = true;
        offer.startTime = startTime;
        offer.endTime = endTime;
        offer.durationMinutes = durationMinutes;
        offer.maxFoodValue = 149;
        offer.deliveryRules = { baseKm: 3, baseCharge: 29, perKmRate: 9, maxKm: 14 };
        offer.claimedUserIds = [];
        offer.claimedMobiles = [];

        await offer.save();

        console.log(`[SundayFlashCron] ✅ Flash offer is LIVE until ${endTime.toLocaleTimeString("en-IN")}`);

        // Broadcast notification to all customers
        await broadcastToAllUsers({
          title: "SUNDAY FLASH OFFER 🔥",
          shayari: "5 MINUTES. ₹149 FOOD. ₹0 FOOD COST.",
          body: "Order food up to ₹149 FREE! ⏰ Only for 5 minutes! 🚴 0–3km: ₹29, 3–14km: ₹9/km",
          type: "SUNDAY_FLASH_OFFER",
          promoTag: "SUNDAY_FLASH",
        });
      } catch (err) {
        console.error("[SundayFlashCron] error triggering flash offer:", err);
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  console.log("[SundayFlashCron] Initialized — Scheduled every Sunday at 5:00 PM IST.");
};
