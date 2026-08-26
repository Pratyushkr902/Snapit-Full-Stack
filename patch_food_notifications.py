import re

path = "controllers/foodOrder.controller.js"
with open(path, "r") as f:
    content = f.read()

# 1. Import the notification helpers
old_import = "import { assertStoreOpenForOrder } from '../utils/storeStatus.js'\nimport { validateCoupon } from '../utils/couponValidation.js'"
new_import = (
    "import { assertStoreOpenForOrder } from '../utils/storeStatus.js'\n"
    "import { validateCoupon } from '../utils/couponValidation.js'\n"
    "import { notifyAllRiders } from '../utils/firebaseNotify.js'\n"
    "import {\n"
    "    notifyUserOrderPlaced,\n"
    "    notifySellersOfNewOrder,\n"
    "} from '../utils/notificationService.js'"
)
assert old_import in content, "import block not found"
content = content.replace(old_import, new_import)

# 2. Shared helper: fire all three notifications for one saved food order
insertion_point = "// ── Deduct wallet helper (reused across routes) ─────────────────────────────"
notify_helper = """// ── Notify user + seller/restaurant + riders for one saved food order.
// Mirrors the grocery flow in order.controller.js. Fire-and-forget (non-fatal
// on failure) so a push-notification hiccup never blocks order placement. ──
const notifyFoodOrderPlaced = (order, user) => {
  notifyUserOrderPlaced(order.userId, order.orderId, user?.fcmToken).catch(() => {})
  notifySellersOfNewOrder(order).catch(() => {})
  notifyAllRiders({
    title: '🛵 New Order!',
    body:  `Order ${order.orderId} is ready for pickup — ₹${order.totalAmt}`,
    data:  { orderId: order.orderId, type: 'NEW_ORDER' },
  }).catch(() => {})
}

""" + insertion_point

assert insertion_point in content, "insertion point not found"
content = content.replace(insertion_point, notify_helper, 1)

# 3. foodOrderCOD — notify after each order.save()
old_cod = """      await order.save()
      orders.push(order)
    }

    console.log(`[foodOrderCOD] \u2705 group=${groupOrderId} restaurants=${orders.length} orderIds=${orders.map(o => o.orderId).join(',')}`)"""
new_cod = """      await order.save()
      orders.push(order)
      notifyFoodOrderPlaced(order, user)
    }

    console.log(`[foodOrderCOD] \u2705 group=${groupOrderId} restaurants=${orders.length} orderIds=${orders.map(o => o.orderId).join(',')}`)"""
assert old_cod in content, "COD save loop not found"
content = content.replace(old_cod, new_cod)

# foodOrderCOD destructures `{ fields, priced, groupOrderId }` — needs `user` too
old_cod_destructure = "export async function foodOrderCOD(req, res) {\n  try {\n    // COD never touches wallet balance — strip any client-supplied\n    // walletAmountUsed before pricing so it can't fake a discount here.\n    req.body.walletAmountUsed = 0\n    const { fields, priced, groupOrderId } = await prepareMultiRestaurantOrder(req)"
new_cod_destructure = "export async function foodOrderCOD(req, res) {\n  try {\n    // COD never touches wallet balance — strip any client-supplied\n    // walletAmountUsed before pricing so it can't fake a discount here.\n    req.body.walletAmountUsed = 0\n    const { fields, user, priced, groupOrderId } = await prepareMultiRestaurantOrder(req)"
assert old_cod_destructure in content, "COD destructure not found"
content = content.replace(old_cod_destructure, new_cod_destructure)

# 4. foodOrderWallet — notify after each order.save()
old_wallet = """      await order.save()
      orders.push(order)
    }

    console.log(`[foodOrderWallet] \u2705 group=${groupOrderId} walletDeducted=\u20b9${deductAmt} restaurants=${orders.length}`)"""
new_wallet = """      await order.save()
      orders.push(order)
      notifyFoodOrderPlaced(order, user)
    }

    console.log(`[foodOrderWallet] \u2705 group=${groupOrderId} walletDeducted=\u20b9${deductAmt} restaurants=${orders.length}`)"""
assert old_wallet in content, "wallet save loop not found"
content = content.replace(old_wallet, new_wallet)

# 5. foodOrderVerifyPayment — notify after each order.save()
old_verify = """      await order.save()
      orders.push(order)
    }

    console.log(`[foodOrderVerifyPayment] \u2705 group=${groupOrderId} paymentId=${razorpay_payment_id} restaurants=${orders.length}`)"""
new_verify = """      await order.save()
      orders.push(order)
      notifyFoodOrderPlaced(order, user)
    }

    console.log(`[foodOrderVerifyPayment] \u2705 group=${groupOrderId} paymentId=${razorpay_payment_id} restaurants=${orders.length}`)"""
assert old_verify in content, "verify-payment save loop not found"
content = content.replace(old_verify, new_verify)

# foodOrderVerifyPayment — needs `user` destructured too
old_verify_destructure = "const { fields, priced, groupOrderId } = await prepareMultiRestaurantOrder(req)\n\n    await deductWallet(req.userId, fields.walletAmountUsed, priced[0]?.restaurantName)"
new_verify_destructure = "const { fields, user, priced, groupOrderId } = await prepareMultiRestaurantOrder(req)\n\n    await deductWallet(req.userId, fields.walletAmountUsed, priced[0]?.restaurantName)"
assert old_verify_destructure in content, "verify-payment destructure not found"
content = content.replace(old_verify_destructure, new_verify_destructure)

with open(path, "w") as f:
    f.write(content)

print("Patched:", path)
