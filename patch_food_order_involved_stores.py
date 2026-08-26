path = "server/controllers/foodOrder.controller.js"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """  store_details: {
    name:     group.restaurantName || 'Restaurant',
    address:  '',
    location: {
      lat: fields.deliveryLocation?.lat || 25.2921,
      lng: fields.deliveryLocation?.lng || 84.817,
    },
  },
  delivery_status:   'Pending',
  isRestaurantOrder: true,
  ...extra,
})"""

new = """  store_details: {
    name:     group.restaurantName || 'Restaurant',
    address:  '',
    location: {
      lat: fields.deliveryLocation?.lat || 25.2921,
      lng: fields.deliveryLocation?.lng || 84.817,
    },
  },
  // FIX: was never set, so notifySellersOfNewOrder() always found zero matching
  // stores for food orders and silently skipped notifying the restaurant owner
  // of every single new order.
  involved_stores:  [group.restaurantName || 'Restaurant'],
  delivery_status:   'Pending',
  isRestaurantOrder: true,
  ...extra,
})"""

assert content.count(old) == 1, f"expected 1 match, found {content.count(old)}"
content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("patched", path)
