import SundayFlashOfferModel from "../models/sundayFlashOffer.model.js";
import UserModel from "../models/user.model.js";
import { broadcastToAllUsers } from "../utils/marketingCron.js";
import { rescheduleSundayFlashCron } from "../cron/sundayFlash.cron.js";

export const formatTimeIST = (hour, minute) => {
  const h = Number(hour) || 0;
  const m = Number(minute) || 0;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
};

/**
 * Calculate delivery charge under Sunday Flash Offer rules:
 * - 0–3 km: ₹29
 * - 3–14 km: ₹9 per km (Math.round(distance * 9))
 * - > 14 km: unserviceable
 */
export const calcSundayFlashDeliveryFee = (distanceKm) => {
  const dist = Number(distanceKm) || 0;
  if (dist <= 0) return 29;
  if (dist <= 3) return 29;
  if (dist <= 14) return Math.round(dist * 9);
  return null; // outside 14 km
};

/**
 * GET /api/sunday-flash/status
 * Returns current live status, remaining countdown seconds, and eligibility.
 */
export const getSundayFlashStatus = async (req, res) => {
  try {
    let offer = await SundayFlashOfferModel.findOne().sort({ updatedAt: -1 });

    if (!offer) {
      offer = await SundayFlashOfferModel.create({
        isActive: false,
        maxFoodValue: 149,
        deliveryRules: { baseKm: 3, baseCharge: 29, perKmRate: 9, maxKm: 14 },
      });
    }

    const now = new Date();
    const isLive = Boolean(
      offer.isActive &&
      offer.startTime &&
      offer.endTime &&
      now >= new Date(offer.startTime) &&
      now <= new Date(offer.endTime)
    );

    const remainingSeconds = isLive
      ? Math.max(0, Math.floor((new Date(offer.endTime).getTime() - now.getTime()) / 1000))
      : 0;

    const userId = req.userId;
    let alreadyClaimed = false;
    if (userId && offer.claimedUserIds?.length) {
      alreadyClaimed = offer.claimedUserIds.some((id) => String(id) === String(userId));
    }

    const hour = offer.scheduledHourIST !== undefined ? offer.scheduledHourIST : 17;
    const minute = offer.scheduledMinuteIST !== undefined ? offer.scheduledMinuteIST : 0;
    const formattedScheduleTime = formatTimeIST(hour, minute);

    return res.json({
      success: true,
      data: {
        isLive,
        isActive: isLive,
        remainingSeconds,
        startTime: offer.startTime,
        endTime: offer.endTime,
        claimedCount: offer.claimedUserIds?.length || 0,
        maxFoodValue: offer.maxFoodValue || 149,
        durationMinutes: offer.durationMinutes || 5,
        scheduledHourIST: hour,
        scheduledMinuteIST: minute,
        scheduledTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
        formattedScheduleTime,
        scheduleText: `Every Sunday at ${formattedScheduleTime}`,
        title: offer.title || "SUNDAY FLASH OFFER 🔥",
        subtitle: offer.subtitle || "5 MINUTES. ₹149 FOOD. ₹0 FOOD COST.",
        deliveryRules: offer.deliveryRules || { baseKm: 3, baseCharge: 29, perKmRate: 9, maxKm: 14 },
        alreadyClaimed,
      },
    });
  } catch (error) {
    console.error("[getSundayFlashStatus] error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/sunday-flash/trigger
 * Triggers a 5-minute flash offer window immediately (Admin / Scheduled Cron).
 */
export const triggerSundayFlashOffer = async (req, res) => {
  try {
    let offer = await SundayFlashOfferModel.findOne().sort({ updatedAt: -1 });
    if (!offer) {
      offer = new SundayFlashOfferModel();
    }

    const durationMinutes = Number(req.body?.durationMinutes) || offer.durationMinutes || 5;
    const maxFoodValue = Number(req.body?.maxFoodValue) || offer.maxFoodValue || 149;
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    offer.isActive = true;
    offer.startTime = startTime;
    offer.endTime = endTime;
    offer.durationMinutes = durationMinutes;
    offer.maxFoodValue = maxFoodValue;
    offer.deliveryRules = offer.deliveryRules || { baseKm: 3, baseCharge: 29, perKmRate: 9, maxKm: 14 };
    // Reset claimed users for this new flash window
    offer.claimedUserIds = [];
    offer.claimedMobiles = [];

    await offer.save();

    console.log(`[SundayFlashOffer] LIVE! Ends at ${endTime.toISOString()}`);

    // Broadcast Push Notification
    try {
      await broadcastToAllUsers({
        title: "SUNDAY FLASH OFFER 🔥",
        shayari: `${durationMinutes} MINUTES. ₹${maxFoodValue} FOOD. ₹0 FOOD COST.`,
        body: `Order food up to ₹${maxFoodValue} FREE! ⏰ Only for ${durationMinutes} minutes! 🚴 0–3km: ₹29, 3–14km: ₹9/km`,
        type: "SUNDAY_FLASH_OFFER",
        promoTag: "SUNDAY_FLASH",
      });
    } catch (notifErr) {
      console.warn("[SundayFlashOffer] notification broadcast warning:", notifErr.message);
    }

    return res.json({
      success: true,
      message: `Sunday Flash Offer is now LIVE for ${durationMinutes} minutes!`,
      data: {
        startTime,
        endTime,
        durationMinutes,
        maxFoodValue,
      },
    });
  } catch (error) {
    console.error("[triggerSundayFlashOffer] error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/sunday-flash/stop
 * Prematurely terminates the flash window (Admin).
 */
export const stopSundayFlashOffer = async (req, res) => {
  try {
    const offer = await SundayFlashOfferModel.findOne().sort({ updatedAt: -1 });
    if (offer) {
      offer.isActive = false;
      offer.endTime = new Date();
      await offer.save();
    }

    return res.json({
      success: true,
      message: "Sunday Flash Offer has been stopped.",
    });
  } catch (error) {
    console.error("[stopSundayFlashOffer] error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Server-side helper to validate and apply Sunday Flash Offer rules to a food order.
 * Strictly enforces:
 * 1. 5-minute window validity
 * 2. subTotalAmt <= ₹149
 * 3. 1 user = 1 order rule (blocks repeated orders by same user or mobile)
 * 4. ₹29 for 0–3 km, ₹9/km for 3–14 km delivery fee
 */
export const validateSundayFlashOrder = async ({ userId, userMobile, subTotalAmt, distanceKm }) => {
  const offer = await SundayFlashOfferModel.findOne().sort({ updatedAt: -1 });
  const now = new Date();

  if (
    !offer ||
    !offer.isActive ||
    !offer.startTime ||
    !offer.endTime ||
    now < new Date(offer.startTime) ||
    now > new Date(offer.endTime)
  ) {
    return {
      valid: false,
      reason: "Sunday Flash Offer is not currently active or the 5-minute window has expired.",
    };
  }

  // 1. One user = One order check
  if (userId && offer.claimedUserIds?.some((id) => String(id) === String(userId))) {
    return {
      valid: false,
      reason: "You have already claimed your 1 free order for this Sunday Flash Offer.",
    };
  }

  if (userMobile && offer.claimedMobiles?.includes(String(userMobile))) {
    return {
      valid: false,
      reason: "An order has already been placed for this mobile number in this Flash Offer.",
    };
  }

  // 2. Food limit check: maximum food value is ₹149
  const foodTotal = Number(subTotalAmt) || 0;
  if (foodTotal <= 0) {
    return {
      valid: false,
      reason: "Your cart is empty.",
    };
  }

  if (foodTotal > (offer.maxFoodValue || 149)) {
    return {
      valid: false,
      reason: `Sunday Flash Offer is valid only for orders up to ₹${offer.maxFoodValue || 149}. Your cart is ₹${foodTotal}. Please keep your order within ₹149 to get free food.`,
    };
  }

  // 3. Delivery fee enforcement: 0–3 km: ₹29, 3–14 km: ₹9/km
  const dist = Number(distanceKm) || 0;
  if (dist > (offer.deliveryRules?.maxKm || 14)) {
    return {
      valid: false,
      reason: `Delivery address is ${dist.toFixed(1)} km away. Sunday Flash Offer is valid up to 14 km only.`,
    };
  }

  const deliveryFee = calcSundayFlashDeliveryFee(dist);

  return {
    valid: true,
    foodDiscount: foodTotal, // 100% food cost waived (customer pays ₹0 for food)
    deliveryFee,             // customer must pay delivery fee
    offerId: offer._id,
  };
};

/**
 * Records that a user/mobile has successfully claimed the flash offer.
 */
export const recordSundayFlashClaim = async (offerId, userId, userMobile) => {
  try {
    const update = {};
    if (userId) update.$addToSet = { claimedUserIds: userId };
    if (userMobile) {
      if (!update.$addToSet) update.$addToSet = {};
      update.$addToSet.claimedMobiles = String(userMobile);
    }

    await SundayFlashOfferModel.findByIdAndUpdate(offerId, update);
  } catch (err) {
    console.error("[recordSundayFlashClaim] error:", err);
  }
};

/**
 * POST /api/sunday-flash/update-schedule
 * Super Admin updates the scheduled day and time (IST) for Sunday Flash Offer.
 */
export const updateSundayFlashSchedule = async (req, res) => {
  try {
    const {
      scheduledTime,
      scheduledHourIST,
      scheduledMinuteIST,
      durationMinutes,
      maxFoodValue,
    } = req.body;

    let hour = scheduledHourIST !== undefined ? Number(scheduledHourIST) : undefined;
    let minute = scheduledMinuteIST !== undefined ? Number(scheduledMinuteIST) : undefined;

    if (scheduledTime && typeof scheduledTime === "string") {
      const parts = scheduledTime.split(":");
      if (parts.length >= 2) {
        hour = parseInt(parts[0], 10);
        minute = parseInt(parts[1], 10);
      }
    }

    if (hour === undefined || isNaN(hour) || hour < 0 || hour > 23) hour = 17;
    if (minute === undefined || isNaN(minute) || minute < 0 || minute > 59) minute = 0;

    let offer = await SundayFlashOfferModel.findOne().sort({ updatedAt: -1 });
    if (!offer) {
      offer = new SundayFlashOfferModel();
    }

    offer.scheduledHourIST = hour;
    offer.scheduledMinuteIST = minute;
    if (durationMinutes) offer.durationMinutes = Number(durationMinutes);
    if (maxFoodValue) offer.maxFoodValue = Number(maxFoodValue);

    await offer.save();

    // Dynamically reschedule background cron task immediately
    await rescheduleSundayFlashCron(hour, minute, 0);

    const formattedTime = formatTimeIST(hour, minute);

    return res.json({
      success: true,
      message: `Sunday Flash Offer successfully scheduled for Every Sunday at ${formattedTime} IST!`,
      data: {
        scheduledHourIST: hour,
        scheduledMinuteIST: minute,
        scheduledTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
        formattedScheduleTime: formattedTime,
        scheduleText: `Every Sunday at ${formattedTime}`,
        durationMinutes: offer.durationMinutes,
        maxFoodValue: offer.maxFoodValue,
      },
    });
  } catch (err) {
    console.error("[updateSundayFlashSchedule] error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
