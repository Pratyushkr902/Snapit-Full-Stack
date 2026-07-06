"""
Riders currently only get a push notification when a customer pays via
Cash on Delivery (notifyAllRiders is called once, only in the COD path).
Orders paid via Snapit Wallet or Razorpay online payment never notify
riders at all -- same class of gap as the seller-notification issue fixed
in the previous patch.

This adds the same notifyAllRiders(...) call, right after
notifySellersOfNewOrder(newOrder), to both the Wallet and Razorpay-verify
order-creation paths.

Run from repo root:  cd ~/Snapit-Full-Stack && python3 fix_rider_notifications.py
"""

path = "server/controllers/order.controller.js"

old = """        notifySellersOfNewOrder(newOrder).catch(() => {})
        await updateStreak(userId)"""

new = """        notifySellersOfNewOrder(newOrder).catch(() => {})
        notifyAllRiders({
            title: '🛵 New Order!',
            body:  `Order ${newOrder.orderId} is ready for pickup — ₹${newOrder.totalAmt}`,
            data:  { orderId: newOrder.orderId, type: 'NEW_ORDER' }
        }).catch(() => {})
        await updateStreak(userId)"""

with open(path) as f:
    content = f.read()

occurrences = content.count(old)
assert occurrences == 2, f"expected 2 matches (Wallet + Razorpay paths), found {occurrences}"
content = content.replace(old, new)

with open(path, "w") as f:
    f.write(content)

print(f"Added notifyAllRiders() to both Wallet and Razorpay order paths in {path}")