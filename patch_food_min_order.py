path = "server/utils/deliveryFee.js"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """// Restaurant/food orders — minimum order amount for the Himalaya zone.
// (Chikasi and the general 6-14km bracket have no minimum for food orders,
// only for grocery orders measured from the fixed store — see getMinOrderAmount.)
// isSnapitPlus exempts the customer from this minimum.
export const getMinOrderAmountFromOrigin = (customerLat, customerLng, isSnapitPlus = false) => {
  if (isSnapitPlus) return 0
  if (isHimalayaZone(customerLat, customerLng)) return HIMALAYA_MIN_ORDER
  return 0
}"""

new = """// Restaurant/food orders — minimum order amount, measured from the
// restaurant's own location instead of the fixed grocery store.
// FIX: previously always returned 0 outside the Himalaya zone (missing the
// origin coordinates needed to measure distance at all), so the >6km ₹499
// minimum that grocery orders enforce was silently never applied to food
// orders. Now mirrors getMinOrderAmount's logic using origin-aware distance.
// isSnapitPlus exempts the customer from both minimums.
export const getMinOrderAmountFromOrigin = (originLat, originLng, customerLat, customerLng, isSnapitPlus = false) => {
  if (isSnapitPlus) return 0
  if (isHimalayaZone(customerLat, customerLng)) return HIMALAYA_MIN_ORDER
  const dist = getDistanceFromOrigin(originLat, originLng, customerLat, customerLng)
  return dist > 6 ? MIN_ORDER_ABOVE_6KM : 0
}"""

assert content.count(old) == 1, f"expected 1 match, found {content.count(old)}"
content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("patched", path)
