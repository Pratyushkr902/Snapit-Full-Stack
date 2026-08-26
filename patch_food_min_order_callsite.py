path = "server/controllers/foodOrder.controller.js"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = "  const minOrderRequired = getMinOrderAmountFromOrigin(lat, lng, isPlusForMinOrder)"
new = "  const minOrderRequired = getMinOrderAmountFromOrigin(restaurant.location.lat, restaurant.location.lng, lat, lng, isPlusForMinOrder)"

assert content.count(old) == 1, f"expected 1 match, found {content.count(old)}"
content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("patched", path)
