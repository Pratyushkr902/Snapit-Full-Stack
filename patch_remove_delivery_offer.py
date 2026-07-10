path = "client/src/pages/RestaurantDetailPage.jsx"
content = open(path).read()

# 1. Remove "₹0 delivery" span
anchor1 = """                <div className="text-sm">
                  <span className="text-gray-600">₹{restaurant.deliveryFee} delivery</span>
                </div>
"""
if anchor1 not in content:
    print("❌ deliveryFee anchor not found. Aborting.")
    exit(1)
assert content.count(anchor1) == 1
content = content.replace(anchor1, "", 1)
print("✅ Removed ₹{deliveryFee} delivery span.")

# 2. Remove <OfferStrip /> call
anchor2 = """            <OfferStrip offers={restaurant.offers} />
"""
if anchor2 not in content:
    print("❌ OfferStrip call anchor not found. Aborting.")
    exit(1)
assert content.count(anchor2) == 1
content = content.replace(anchor2, "", 1)
print("✅ Removed <OfferStrip /> call.")

open(path, "w").write(content)
print("🎉 Done.")
