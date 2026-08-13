"""
Fixes notifySellersOfNewOrder() to also match restaurant owners.

Root cause: the seller lookup filtered strictly on role: "SELLER", but
restaurant owners (e.g. Momos point) are stored with role: "RESTO_SELLER".
So food orders would never notify the restaurant owner, even though grocery
orders correctly notified SELLER-role users.

Run from repo root:
    python3 patch_notify_resto_sellers.py
"""

path = "server/utils/notificationService.js"

with open(path) as f:
    content = f.read()

old = """    const sellers = await UserModel.find({
      role: "SELLER",
      store_name: { $in: storeNames },
      fcmToken: { $exists: true, $ne: null, $ne: "" },
    }).select("fcmToken store_name").lean();"""

new = """    const sellers = await UserModel.find({
      role: { $in: ["SELLER", "RESTO_SELLER"] },
      store_name: { $in: storeNames },
      fcmToken: { $exists: true, $ne: null, $ne: "" },
    }).select("fcmToken store_name").lean();"""

assert content.count(old) == 1, f"expected 1 match, found {content.count(old)} — inspect manually"
content = content.replace(old, new)

with open(path, "w") as f:
    f.write(content)

print("✅ notificationService.js patched — RESTO_SELLER users now included in new-order notifications.")
