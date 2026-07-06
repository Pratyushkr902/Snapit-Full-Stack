"""
Fixes the partial state left by the earlier fix_seller_order_notifications.py run:
  1. notifySellersOfNewOrder() was accidentally duplicated in notificationService.js
     (two identical export blocks) — this removes the second copy.
  2. The import in order.controller.js already includes notifySellersOfNewOrder,
     but it was never actually CALLED anywhere — this wires it into all 3
     order-creation paths (COD, Wallet, Razorpay-verify).

Run from repo root:
    python3 fix_seller_notifications_cleanup.py
"""

# ── Part 1: remove duplicate notifySellersOfNewOrder() block ────────────────
path1 = "server/utils/notificationService.js"

with open(path1) as f:
    content1 = f.read()

block = """// Looks up every SELLER whose store_name is one of the order's
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

occurrences = content1.count(block)
assert occurrences == 2, f"[Part 1] expected exactly 2 duplicate blocks, found {occurrences} — inspect manually"

# Replace the first occurrence of "block + block" with just one "block"
double = block + "\n\n" + block
assert content1.count(double) == 1, "[Part 1] the two blocks aren't adjacent as expected — inspect manually"
content1 = content1.replace(double, block)

with open(path1, "w") as f:
    f.write(content1)
print(f"[Part 1] Removed duplicate notifySellersOfNewOrder() block from {path1}")


# ── Part 2: wire notifySellersOfNewOrder() into the 3 order-creation paths ──
path2 = "server/controllers/order.controller.js"

with open(path2) as f:
    content2 = f.read()

# Call site 1: COD order creation
old_cod = """        notifyUserOrderPlaced(userId, generatedOrder.orderId, currentUser?.fcmToken).catch(() => {})
        notifyAllRiders({"""
new_cod = """        notifyUserOrderPlaced(userId, generatedOrder.orderId, currentUser?.fcmToken).catch(() => {})
        notifySellersOfNewOrder(generatedOrder).catch(() => {})
        notifyAllRiders({"""

cod_count = content2.count(old_cod)
if cod_count == 1:
    content2 = content2.replace(old_cod, new_cod)
    print("[Part 2] Wired call site 1 (COD)")
elif "notifySellersOfNewOrder(generatedOrder)" in content2:
    print("[Part 2] Call site 1 (COD) already wired — skipping")
else:
    raise AssertionError(f"[Part 2 - COD] expected 1 match, found {cod_count} — inspect manually")

# Call sites 2 & 3: Wallet and Razorpay-verify share this exact snippet twice
old_shared = """        sendOrderInvoiceEmail(newOrder, user).catch(()=>{})
        notifyUserOrderPlaced(userId, newOrder.orderId, user?.fcmToken).catch(() => {})
        await updateStreak(userId)"""
new_shared = """        sendOrderInvoiceEmail(newOrder, user).catch(()=>{})
        notifyUserOrderPlaced(userId, newOrder.orderId, user?.fcmToken).catch(() => {})
        notifySellersOfNewOrder(newOrder).catch(() => {})
        await updateStreak(userId)"""

shared_count = content2.count(old_shared)
already_wired_count = content2.count(new_shared)

if shared_count == 2:
    content2 = content2.replace(old_shared, new_shared)
    print("[Part 2] Wired call sites 2 & 3 (Wallet, Razorpay)")
elif shared_count == 0 and already_wired_count == 2:
    print("[Part 2] Call sites 2 & 3 (Wallet, Razorpay) already wired — skipping")
else:
    raise AssertionError(
        f"[Part 2 - Wallet/Razorpay] unexpected state: "
        f"unwired matches={shared_count}, already-wired matches={already_wired_count} — inspect manually"
    )

with open(path2, "w") as f:
    f.write(content2)

print("\nAll cleanup + wiring complete.")
