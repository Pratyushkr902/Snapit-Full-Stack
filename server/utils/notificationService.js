// ============================================================
//  notificationService.js  —  Snapit Notification Engine
//  Push: Firebase FCM (unlimited, free)
//  DB:   MongoDB (stores all notifications)
//  Covers: Seller | User | Rider
// ============================================================
//
//  npm install firebase-admin
//
//  .env:
//    FIREBASE_PROJECT_ID=your_project_id
//    FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@project.iam.gserviceaccount.com
//    FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nXXX\n-----END PRIVATE KEY-----\n"
//
// ============================================================
import mongoose from "mongoose";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const admin = require("firebase-admin");
const { getMessaging } = require("firebase-admin/messaging");

// ─────────────────────────────────────────────
//  FIREBASE INIT  (runs once, safe to import anywhere)
//  Reuses the app already initialized in firebaseNotify.js if present.
// ─────────────────────────────────────────────
let fcm = null;
function getFcm() {
  if (fcm) return fcm;
  try {
    if (admin.getApps().length === 0) {
      const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
      if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
        throw new Error("Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in .env");
      }
      admin.initializeApp({
        credential: admin.cert({
          projectId: FIREBASE_PROJECT_ID,
          clientEmail: FIREBASE_CLIENT_EMAIL,
          privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      });
    }
    fcm = getMessaging();
  } catch (error) {
    console.error("❌ notificationService Firebase init failed — push disabled:", error.message);
  }
  return fcm;
}

// ─────────────────────────────────────────────
//  MONGODB SCHEMA
// ─────────────────────────────────────────────

const notificationSchema = new mongoose.Schema(
  {
    recipientId:   { type: String, required: true },
    recipientType: { type: String, enum: ["user", "seller", "rider"], required: true },
    type:          { type: String, required: true },
    title:         { type: String, required: true },
    shayari:       { type: String, required: true },
    body:          { type: String, required: true },
    metadata:      { type: mongoose.Schema.Types.Mixed, default: {} },
    isRead:        { type: Boolean, default: false },
    fcmToken:      { type: String, default: null },   // saved for reference
    fcmMessageId:  { type: String, default: null },   // FCM response message ID
    deliveredAt:   { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Notification =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);

// ─────────────────────────────────────────────
//  SHAYARI BANK
// ─────────────────────────────────────────────

const SHAYARI = {

  // ── SELLER ──────────────────────────────────
  LOW_STOCK: (product, qty) => ({
    title:   `⚠️ ${product} ka stock kam ho raha hai!`,
    shayari: `"${product} keh raha hai — bas ${qty} bacha hoon main,\nJaldi restock karo, warna order kho doge tum." 📦`,
    body:    `${product} has only ${qty} units left. Restock soon!`,
  }),

  OUT_OF_STOCK: (product) => ({
    title:   `🚨 ${product} bilkul khatam!`,
    shayari: `"Shelf khali hai, customer udaas hai,\n${product} bina toh dukaan bepas hai!" 😟`,
    body:    `${product} is out of stock. Add inventory immediately.`,
  }),

  NEW_ORDER: (orderId, amount) => ({
    title:   `🎉 Naya order aa gaya! #${orderId}`,
    shayari: `"Ding! ding! koi aaya hai dukaan pe,\n₹${amount} ki umeed leke, tere armaan pe!" 🛒`,
    body:    `New order #${orderId} for ₹${amount}. Start packing!`,
  }),

  ORDER_CANCELLED_SELLER: (orderId) => ({
    title:   `❌ Order #${orderId} cancel ho gaya`,
    shayari: `"Ek baar aaya tha, phir chala gaya,\n#${orderId} cancel hua — par agli baar zaroor aayega." 🙏`,
    body:    `Order #${orderId} was cancelled by the customer.`,
  }),

  PAYMENT_RECEIVED: (amount) => ({
    title:   `💰 Payment aa gayi — ₹${amount}!`,
    shayari: `"Mehnat ka phal mitha hota hai,\n₹${amount} ka transfer, sach sachcha hota hai!" 💸`,
    body:    `₹${amount} has been credited to your account.`,
  }),

  // ── USER ────────────────────────────────────
   ORDER_CONFIRMED: (orderId) => ({
    title:   `✅ Order confirm ho gaya! #${orderId}`,
    shayari: `"Tayyari shuru, packing ka waqt,\n#${orderId} ab surakshit haathon mein rakht!" 📦`,
    body:    `Your order #${orderId} has been confirmed and is being prepared.`,
  }),
  ORDER_PLACED: (orderId) => ({
    title:   `✅ Order place ho gaya! #${orderId}`,
    shayari: `"Tumne kaha, humne suna,\nOrder #${orderId} ki kahani shuru ho gayi!" 🚀`,
    body:    `Your order #${orderId} is confirmed. Sit back and relax!`,
  }),

  ORDER_PACKED: (orderId) => ({
    title:   `📦 Pack ho gaya tera saamaan!`,
    shayari: `"Haath se bandha, pyaar se paacha,\n#${orderId} ka dabba aa raha hai sacha!" 🎁`,
    body:    `Order #${orderId} is packed and ready for pickup.`,
  }),

  RIDER_ASSIGNED: (riderName, eta) => ({
    title:   `🛵 ${riderName} aa rahe hain!`,
    shayari: `"Raahon mein hain hum, dil mein tumhare,\n${riderName} pahunchenge bas ${eta} min mein tere dwaare!" 🏠`,
    body:    `${riderName} picked up your order. ETA: ${eta} minutes.`,
  }),

  OUT_FOR_DELIVERY: (riderName, eta) => ({
    title:   `🚴 Bas ${eta} min! Rider nikal pada!`,
    shayari: `"Sabr ka phal meetha hota hai jaana,\n${riderName} bhaag rahe hain tera saamaan laana!" 😄`,
    body:    `${riderName} is ${eta} minutes away. Please be available.`,
  }),

  ORDER_DELIVERED: (orderId) => ({
    title:   `🎊 Deliver ho gaya! #${orderId}`,
    shayari: `"Manzil pe pahunche, khushiyan le aaye,\nSnapit ne wada kiya tha, wo nibhaaye!" ✨`,
    body:    `Order #${orderId} delivered. Enjoy! Please rate your experience.`,
  }),

  ORDER_CANCELLED_USER: (orderId, refund) => ({
    title:   `Order #${orderId} cancel — refund on the way`,
    shayari: `"Ruka tha safar, par umeed nahi gayi,\n₹${refund} wapas aayega, fikar nahi bhai!" 💙`,
    body:    `Order #${orderId} cancelled. ₹${refund} refund in 24–48 hrs.`,
  }),

  REORDER_REMINDER: (product) => ({
    title:   `🧠 ${product} khatam hone wala hai!`,
    shayari: `"Yaadaasht teri, zimmedari hamari,\n${product} maangwaao abhi — warna subah bhaari!" ⏰`,
    body:    `You usually reorder ${product} around this time. Order before it runs out!`,
  }),

  // ── RIDER ────────────────────────────────────
  NEW_DELIVERY: (orderId, address, distance) => ({
    title:   `📍 Naya delivery order! #${orderId}`,
    shayari: `"Safar ka bulawa aaya hai bhai,\n${distance}km door hai manzil, nikal jao abhi!" 🛵`,
    body:    `Delivery #${orderId} at ${address} (${distance} km). Accept now!`,
  }),

  DELIVERY_COMPLETED: (orderId, earnings) => ({
    title:   `💵 Delivery complete! ₹${earnings} earned`,
    shayari: `"Ek aur manzil par teri jeet hui,\n₹${earnings} ki kamaai, mehnat safal hui!" 🏆`,
    body:    `Order #${orderId} delivered. ₹${earnings} added to your wallet.`,
  }),

  RIDER_INCENTIVE: (bonus, target) => ({
    title:   `🎯 Bas ${target} delivery aur — bonus pakka!`,
    shayari: `"Himmat rakho, raah mein chalo,\n${target} delivery kar lo, ₹${bonus} apna karo!" 💪`,
    body:    `${target} more deliveries = ₹${bonus} bonus today!`,
  }),
};

// ─────────────────────────────────────────────
//  CORE: saveAndSend  (MongoDB + FCM)
// ─────────────────────────────────────────────

/**
 * @param {Object}  params
 * @param {string}  params.recipientId
 * @param {"user"|"seller"|"rider"} params.recipientType
 * @param {string}  params.type
 * @param {Object}  params.payload        { title, shayari, body }
 * @param {Object}  [params.metadata]
 * @param {string}  [params.fcmToken]     device FCM token — push only if provided
 */
const saveAndSend = async ({
  recipientId,
  recipientType,
  type,
  payload,
  metadata = {},
  fcmToken,
}) => {
  let fcmMessageId = null;

  // ── 1. Firebase FCM push ──────────────────────
  if (fcmToken) {
    try {
      const message = {
        token: fcmToken,

        // Android — high priority, custom sound
        android: {
          priority: "high",
          notification: {
            title:       payload.title,
            body:        payload.shayari,   // shayari as push body
            sound:       "default",
            channelId:   "snapit_orders",   // create this channel in React Native app
            clickAction: "OPEN_NOTIFICATION_SCREEN",
          },
        },

        // iOS (APNs via FCM)
        apns: {
          payload: {
            aps: {
              alert: { title: payload.title, body: payload.shayari },
              sound: "default",
              badge: 1,
            },
          },
        },

        // Web push
        webpush: {
          notification: {
            title: payload.title,
            body:  payload.shayari,
            icon:  "/icons/snapit-logo.png",
          },
        },

        // Extra data — accessible in app via getInitialNotification / onMessage
        data: {
          type,
          recipientId: String(recipientId),
          body:        payload.body,         // plain English in data payload
          ...Object.fromEntries(
            Object.entries(metadata).map(([k, v]) => [k, String(v)])
          ),
        },
      };

      const response = await getFcm().send(message);
      fcmMessageId = response;
      console.log(`[FCM ✅] ${recipientType.toUpperCase()} | ${type} | messageId: ${response}`);

    } catch (fcmErr) {
      // Token expired / unregistered — log but don't crash
      console.warn(`[FCM ⚠️] Push failed for ${recipientId}: ${fcmErr.message}`);

      // If token is invalid, optionally clear it from your User model:
      // if (fcmErr.code === "messaging/registration-token-not-registered") {
      //   await User.findByIdAndUpdate(recipientId, { fcmToken: null });
      // }
    }
  }

  // ── 2. Save to MongoDB (always) ───────────────
  try {
    const doc = await Notification.create({
      recipientId,
      recipientType,
      type,
      title:        payload.title,
      // FIX: schema requires `message` — it was never being set, so every
      // notification failed validation and was silently never saved.
      message:      payload.body || payload.shayari || payload.title,
      shayari:      payload.shayari,
      body:         payload.body,
      // FIX: schema field is `data`, not `metadata` — was being silently
      // dropped by Mongoose strict mode (orderId etc. never persisted).
      data:         metadata,
      fcmToken:     fcmToken || null,
      fcmMessageId: fcmMessageId || null,
    });

    return doc;

  } catch (dbErr) {
    console.error(`[Snapit DB Error] ${dbErr.message}`);
    return null;
  }
};

// ─────────────────────────────────────────────
//  SELLER  NOTIFICATIONS
// ─────────────────────────────────────────────

export const notifySellerLowStock = (sellerId, productName, currentStock, fcmToken) =>
  saveAndSend({
    recipientId: sellerId, recipientType: "seller", type: "LOW_STOCK",
    payload: SHAYARI.LOW_STOCK(productName, currentStock),
    metadata: { productName, currentStock }, fcmToken,
  });

export const notifySellerOutOfStock = (sellerId, productName, fcmToken) =>
  saveAndSend({
    recipientId: sellerId, recipientType: "seller", type: "OUT_OF_STOCK",
    payload: SHAYARI.OUT_OF_STOCK(productName),
    metadata: { productName }, fcmToken,
  });

export const notifySellerNewOrder = (sellerId, orderId, amount, fcmToken) =>
  saveAndSend({
    recipientId: sellerId, recipientType: "seller", type: "NEW_ORDER",
    payload: SHAYARI.NEW_ORDER(orderId, amount),
    metadata: { orderId, amount }, fcmToken,
  });

// Looks up every SELLER whose store_name is one of the order's
// involved_stores and fires notifySellerNewOrder() for each of them.
// Fire-and-forget from the caller's side (wrap in .catch(() => {})).
export const notifySellersOfNewOrder = async (order) => {
  try {
    const { default: UserModel } = await import("../models/user.model.js");
    const storeNames = order?.involved_stores || [];
    if (storeNames.length === 0) return;

    const sellers = await UserModel.find({
      role: { $in: ["SELLER", "RESTO_SELLER"] },
      store_name: { $in: storeNames },
      fcmToken: { $exists: true, $ne: null, $ne: "" },
    }).select("fcmToken store_name").lean();

    if (sellers.length === 0) {
      console.log(`[notifySellersOfNewOrder] No sellers with fcmToken for stores: ${storeNames.join(", ")}`);
      return;
    }

    await Promise.allSettled(
      sellers.map(seller =>
        notifySellerNewOrder(seller._id, order.orderId, order.totalAmt, seller.fcmToken)
      )
    );
  } catch (error) {
    console.error("[notifySellersOfNewOrder] failed:", error.message);
  }
};


export const notifySellerPayment = (sellerId, amount, fcmToken) =>
  saveAndSend({
    recipientId: sellerId, recipientType: "seller", type: "PAYMENT_RECEIVED",
    payload: SHAYARI.PAYMENT_RECEIVED(amount),
    metadata: { amount }, fcmToken,
  });

export const notifySellerOrderCancelled = (sellerId, orderId, fcmToken) =>
  saveAndSend({
    recipientId: sellerId, recipientType: "seller", type: "ORDER_CANCELLED_SELLER",
    payload: SHAYARI.ORDER_CANCELLED_SELLER(orderId),
    metadata: { orderId }, fcmToken,
  });

// ─────────────────────────────────────────────
//  USER  NOTIFICATIONS
// ─────────────────────────────────────────────

export const notifyUserOrderPlaced = (userId, orderId, fcmToken) =>
  saveAndSend({
    recipientId: userId, recipientType: "user", type: "ORDER_PLACED",
    payload: SHAYARI.ORDER_PLACED(orderId),
    metadata: { orderId }, fcmToken,
  });
export const notifyUserOrderConfirmed = (userId, orderId, fcmToken) =>
  saveAndSend({
    recipientId: userId, recipientType: "user", type: "ORDER_CONFIRMED",
    payload: SHAYARI.ORDER_CONFIRMED(orderId),
    metadata: { orderId }, fcmToken,
  });
export const notifyUserOrderPacked = (userId, orderId, fcmToken) =>
  saveAndSend({
    recipientId: userId, recipientType: "user", type: "ORDER_PACKED",
    payload: SHAYARI.ORDER_PACKED(orderId),
    metadata: { orderId }, fcmToken,
  });

export const notifyUserRiderAssigned = (userId, riderName, eta, fcmToken) =>
  saveAndSend({
    recipientId: userId, recipientType: "user", type: "RIDER_ASSIGNED",
    payload: SHAYARI.RIDER_ASSIGNED(riderName, eta),
    metadata: { riderName, eta }, fcmToken,
  });

export const notifyUserOutForDelivery = (userId, riderName, eta, fcmToken) =>
  saveAndSend({
    recipientId: userId, recipientType: "user", type: "OUT_FOR_DELIVERY",
    payload: SHAYARI.OUT_FOR_DELIVERY(riderName, eta),
    metadata: { riderName, eta }, fcmToken,
  });

export const notifyUserOrderDelivered = (userId, orderId, fcmToken) =>
  saveAndSend({
    recipientId: userId, recipientType: "user", type: "ORDER_DELIVERED",
    payload: SHAYARI.ORDER_DELIVERED(orderId),
    metadata: { orderId }, fcmToken,
  });

export const notifyUserOrderCancelled = (userId, orderId, refundAmount, fcmToken) =>
  saveAndSend({
    recipientId: userId, recipientType: "user", type: "ORDER_CANCELLED_USER",
    payload: SHAYARI.ORDER_CANCELLED_USER(orderId, refundAmount),
    metadata: { orderId, refundAmount }, fcmToken,
  });

export const notifyUserReorder = (userId, productName, fcmToken) =>
  saveAndSend({
    recipientId: userId, recipientType: "user", type: "REORDER_REMINDER",
    payload: SHAYARI.REORDER_REMINDER(productName),
    metadata: { productName }, fcmToken,
  });

// ─────────────────────────────────────────────
//  RIDER  NOTIFICATIONS
// ─────────────────────────────────────────────

export const notifyRiderNewDelivery = (riderId, orderId, address, distanceKm, fcmToken) =>
  saveAndSend({
    recipientId: riderId, recipientType: "rider", type: "NEW_DELIVERY",
    payload: SHAYARI.NEW_DELIVERY(orderId, address, distanceKm),
    metadata: { orderId, address, distanceKm }, fcmToken,
  });

export const notifyRiderDeliveryComplete = (riderId, orderId, earnings, fcmToken) =>
  saveAndSend({
    recipientId: riderId, recipientType: "rider", type: "DELIVERY_COMPLETED",
    payload: SHAYARI.DELIVERY_COMPLETED(orderId, earnings),
    metadata: { orderId, earnings }, fcmToken,
  });

export const notifyRiderIncentive = (riderId, bonusAmount, remainingDeliveries, fcmToken) =>
  saveAndSend({
    recipientId: riderId, recipientType: "rider", type: "RIDER_INCENTIVE",
    payload: SHAYARI.RIDER_INCENTIVE(bonusAmount, remainingDeliveries),
    metadata: { bonusAmount, remainingDeliveries }, fcmToken,
  });

// ─────────────────────────────────────────────
//  MULTI-CAST  (send to many tokens at once)
//  e.g. broadcast deal to all users
// ─────────────────────────────────────────────

/**
 * @param {string[]} fcmTokens   — array of device tokens (max 500 per call)
 * @param {Object}   payload     — { title, shayari, body }
 * @param {string}   type        — notification type string
 * @param {Object}   [metadata]
 */
export const sendMulticast = async (fcmTokens, payload, type, metadata = {}) => {
  if (!fcmTokens?.length) return;

  const message = {
    tokens: fcmTokens,
    android: {
      priority: "high",
      notification: {
        title: payload.title,
        body:  payload.shayari,
        sound: "default",
        channelId: "snapit_orders",
      },
    },
    apns: {
      payload: { aps: { alert: { title: payload.title, body: payload.shayari }, sound: "default" } },
    },
    data: {
      type,
      body: payload.body,
      ...Object.fromEntries(Object.entries(metadata).map(([k, v]) => [k, String(v)])),
    },
  };

  try {
    const res = await getFcm().sendEachForMulticast(message);
    console.log(`[FCM Multicast] ✅ ${res.successCount} sent, ❌ ${res.failureCount} failed`);
    return res;
  } catch (err) {
    console.error("[FCM Multicast Error]", err.message);
  }
};

// ─────────────────────────────────────────────
//  HOW TO GET FCM TOKEN  (React Native)
// ─────────────────────────────────────────────
//
//  npm install @react-native-firebase/app @react-native-firebase/messaging
//
//  // In App.js on login:
//  import messaging from "@react-native-firebase/messaging";
//
//  const getFcmToken = async () => {
//    await messaging().requestPermission();
//    const token = await messaging().getToken();
//    // Save to your backend:
//    await fetch("/api/users/fcm-token", {
//      method: "PATCH",
//      headers: { "Content-Type": "application/json" },
//      body: JSON.stringify({ fcmToken: token }),
//    });
//  };
//
//  // Listen while app is open:
//  messaging().onMessage(async remoteMessage => {
//    console.log("FCM foreground message:", remoteMessage);
//  });
//
//  // Background / quit state:
//  messaging().setBackgroundMessageHandler(async remoteMessage => {
//    console.log("FCM background message:", remoteMessage);
//  });
//
// ─────────────────────────────────────────────
//  USAGE IN ORDER CONTROLLER
// ─────────────────────────────────────────────
//
//  import { notifySellerNewOrder, notifyUserOrderPlaced } from "./notificationService.js";
//
//  // After order created:
//  await Promise.all([
//    notifySellerNewOrder(seller._id, order._id, order.totalAmount, seller.fcmToken),
//    notifyUserOrderPlaced(user._id, order._id, user.fcmToken),
//  ]);
//
//  // Rider assigned:
//  await Promise.all([
//    notifyUserRiderAssigned(user._id, rider.name, eta, user.fcmToken),
//    notifyRiderNewDelivery(rider._id, order._id, order.address, distance, rider.fcmToken),
//  ]);