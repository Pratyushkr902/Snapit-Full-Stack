import cron from "node-cron";
import SundayFlashOfferModel from "../models/sundayFlashOffer.model.js";
import { broadcastToAllUsers } from "../utils/marketingCron.js";

/**
 * Sunday Flash Offer Cron
 * Runs every Sunday at 5:00 PM IST (17:00 IST).
 * Triggers the 5-minute flash offer window and broadcasts notification to all users.
 */
let activeCronJob = null;

const runSundayFlashTrigger = async (hour, minute) => {
  console.log(`[SundayFlashCron] 🔔 Auto-triggering Sunday Flash Offer at ${hour}:${String(minute).padStart(2, '0')} IST...`);
  try {
    const offerDoc = await SundayFlashOfferModel.findOne().sort({ updatedAt: -1 });
    const durationMinutes = offerDoc?.durationMinutes || 5;
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    let offer = offerDoc;
    if (!offer) {
      offer = new SundayFlashOfferModel();
    }

    offer.isActive = true;
    offer.startTime = startTime;
    offer.endTime = endTime;
    offer.durationMinutes = durationMinutes;
    offer.maxFoodValue = offer.maxFoodValue || 149;
    offer.deliveryRules = offer.deliveryRules || { baseKm: 3, baseCharge: 29, perKmRate: 9, maxKm: 14 };
    offer.claimedUserIds = [];
    offer.claimedMobiles = [];

    await offer.save();

    console.log(`[SundayFlashCron] ✅ Flash offer is LIVE until ${endTime.toLocaleTimeString("en-IN")}`);

    // Broadcast notification to all customers
    await broadcastToAllUsers({
      title: "SUNDAY FLASH OFFER 🔥",
      shayari: `${durationMinutes} MINUTES. ₹${offer.maxFoodValue || 149} FOOD. ₹0 FOOD COST.`,
      body: `Order food up to ₹${offer.maxFoodValue || 149} FREE! ⏰ Only for ${durationMinutes} minutes! 🚴 0–3km: ₹29, 3–14km: ₹9/km`,
      type: "SUNDAY_FLASH_OFFER",
      promoTag: "SUNDAY_FLASH",
    });
  } catch (err) {
    console.error("[SundayFlashCron] error triggering flash offer:", err);
  }
};

/**
 * Reschedule the Sunday Flash Cron to a new hour & minute in IST
 */
export const rescheduleSundayFlashCron = async (hour = 17, minute = 0, day = 0) => {
  if (activeCronJob) {
    activeCronJob.stop();
    activeCronJob = null;
  }

  const cronPattern = `${minute} ${hour} * * ${day}`;
  activeCronJob = cron.schedule(
    cronPattern,
    () => runSundayFlashTrigger(hour, minute),
    { timezone: "Asia/Kolkata" }
  );

  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const timeFormatted = `${h12}:${String(minute).padStart(2, '0')} ${ampm}`;
  console.log(`[SundayFlashCron] Rescheduled to every Sunday at ${timeFormatted} IST (${cronPattern}).`);
};

/**
 * Sunday Flash Offer Cron
 * Initializes schedule from database settings (default 17:00 IST).
 */
export const startSundayFlashCron = async () => {
  try {
    const offer = await SundayFlashOfferModel.findOne().sort({ updatedAt: -1 });
    const hour = offer?.scheduledHourIST !== undefined ? offer.scheduledHourIST : 17;
    const minute = offer?.scheduledMinuteIST !== undefined ? offer.scheduledMinuteIST : 0;
    await rescheduleSundayFlashCron(hour, minute, 0);
  } catch (e) {
    console.warn("[SundayFlashCron] fallback to default 17:00 IST:", e.message);
    await rescheduleSundayFlashCron(17, 0, 0);
  }
};

