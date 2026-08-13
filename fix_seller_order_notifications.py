"""
Wires up seller push notifications for new grocery orders.

Currently: notifySellerNewOrder() exists fully-built in notificationService.js
(shayari template + FCM send + DB log via saveAndSend) but is NEVER called
anywhere -- sellers get zero notification today when an order comes in,
regardless of whether their phone is open or closed.

This patch:
1. Adds notifySellersOfNewOrder(order) to notificationService.js -- looks up
   all SELLER users whose store_name matches order.involved_stores and have
   a saved fcmToken, then fires notifySellerNewOrder() for each.
2. Imports it into order.controller.js and calls it (fire-and-forget, same
   .catch(() => {}) pattern as the existing notifyUserOrderPlaced calls)
   right after all 3 order-creation paths: COD, Wallet, Razorpay-verify.

On background delivery ("phone is closed"): sendPushNotification() in
firebaseNotify.js already sends a top-level `notification` payload (not just
`data`), which Android's FCM SDK auto-displays via the system tray even when
the app is fully closed/killed -- so once sellers actually start receiving
these calls, background delivery should already work via standard FCM
behavior. No firebaseNotify.js changes needed for that part.

Run from repo root:  cd ~/Snapit-Full-Stack && python3 fix_seller_order_notifications.py
"""

# ── Part 1: add notifySellersOfNewOrder() to notificationService.js ─────────
path1 = "server/utils/notificationService.js"

old1 = """export const notifySellerNewOrder = (sellerId, orderId, amount, fcmToken) =>
  saveAndSend({
    recipientId: sellerId, recipientType: "seller", type: "NEW_ORDER",
    payload: SHAYARI.NEW_ORDER(orderId, amount),
    metadata: { orderId, amount }, fcmToken,
  });"""

new1 = """export const notifySellerNewOrder = (sellerId, orderId, amount, fcmToken) =>
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
      role: "SELLER",
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
};"""

with open(path1) as f:
    content1 = f.read()
assert content1.count(old1) == 1, f"[Part 1] expected 1 match in {path1}, found {content1.count(old1)}"
content1 = content1.replace(old1, new1)
with open(path1, "w") as f:
    f.write(content1)
print(f"[Part 1] Added notifySellersOfNewOrder() to {path1}")


# ── Part 2: wire it into order.controller.js ─────────────────────────────────
path2 = "server/controllers/order.controller.js"

old2 = """import {
    notifyUserOrderPlaced,
    notifyUserOrderConfirmed,
    notifyUserOutForDelivery,
    notifyUserOrderDelivered,
    notifyUserOrderCancelled,
} from '../utils/notificationService.js'"""

new2 = """import {
    notifyUserOrderPlaced,
    notifyUserOrderConfirmed,
    notifyUserOutForDelivery,
    notifyUserOrderDelivered,
    notifyUserOrderCancelled,
    notifySellersOfNewOrder,
} from '../utils/notificationService.js'"""

with open(path2) as f:
    content2 = f.read()
assert content2.count(old2) == 1, f"[Part 2a] expected 1 match in {path2}, found {content2.count(old2)}"
content2 = content2.replace(old2, new2)

# Call site 1: COD order creation
old_cod = """        notifyUserOrderPlaced(userId, generatedOrder.orderId, currentUser?.fcmToken).catch(() => {})
        notifyAllRiders({"""
new_cod = """        notifyUserOrderPlaced(userId, generatedOrder.orderId, currentUser?.fcmToken).catch(() => {})
        notifySellersOfNewOrder(generatedOrder).catch(() => {})
        notifyAllRiders({"""
assert content2.count(old_cod) == 1, f"[Part 2b - COD] expected 1 match, found {content2.count(old_cod)}"
content2 = content2.replace(old_cod, new_cod)

# Call site 2 & 3: Wallet and Razorpay-verify order creation share this exact
# snippet twice -- replace both occurrences the same way.
old_shared = """        sendOrderInvoiceEmail(newOrder, user).catch(()=>{})
        notifyUserOrderPlaced(userId, newOrder.orderId, user?.fcmToken).catch(() => {})
        await updateStreak(userId)"""
new_shared = """        sendOrderInvoiceEmail(newOrder, user).catch(()=>{})
        notifyUserOrderPlaced(userId, newOrder.orderId, user?.fcmToken).catch(() => {})
        notifySellersOfNewOrder(newOrder).catch(() => {})
        await updateStreak(userId)"""
occurrences = content2.count(old_shared)
assert occurrences == 2, f"[Part 2c - Wallet/Razorpay] expected 2 matches, found {occurrences}"
content2 = content2.replace(old_shared, new_shared)

with open(path2, "w") as f:
    f.write(content2)
print(f"[Part 2] Wired notifySellersOfNewOrder() into all 3 order-creation paths in {path2}")

print("\nAll patches applied successfully.")
