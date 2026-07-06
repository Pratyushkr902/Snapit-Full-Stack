"""
Fixes buildTaggedCartItems() in order.controller.js:
  - .select() was missing sellerPrice and snapitMargin
  - The returned cart item never copied those fields over

Without this, every order's cartItems had sellerPrice/snapitMargin as
undefined, which is why seller/admin dashboards showed ₹0.00 and Snapit's
platform cut was silently computed as ₹0 on every order.

Run from repo root:
    python3 patch_order_controller_pricing.py
"""

path = "server/controllers/order.controller.js"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """        const product = await ProductModel.findById(productId)
            .select('name price discount stock unit image store_inventory')
            .lean()
        if (!product) {
            return { ...item, _invalid: true, _reason: 'A product in your cart no longer exists.' }
        }
        if (!product.stock || product.stock <= 0) {
            return { ...item, _invalid: true, _reason: `${product.name} is out of stock.` }
        }
        const requestedQty = Number(item.quantity) || 1
        if (requestedQty > product.stock) {
            return { ...item, _invalid: true, _reason: `Only ${product.stock} left of ${product.name}.` }
        }
        // FIX: use the product's OWN store, not a single order-wide hardcoded storeName.
        const inventoryEntry = product.store_inventory?.find(inv => inv.isAvailable !== false)
            || product.store_inventory?.[0]
        return {
            ...item,
            productId,
            price:      product.price,
            discount:   product.discount || 0,
            quantity:   requestedQty,
            seller_store_name: inventoryEntry?.store_name || storeName,
            sellerId: inventoryEntry?.sellerId || null,
            _invalid: false
        }"""

new = """        const product = await ProductModel.findById(productId)
            .select('name price sellerPrice snapitMargin discount stock unit image store_inventory')
            .lean()
        if (!product) {
            return { ...item, _invalid: true, _reason: 'A product in your cart no longer exists.' }
        }
        if (!product.stock || product.stock <= 0) {
            return { ...item, _invalid: true, _reason: `${product.name} is out of stock.` }
        }
        const requestedQty = Number(item.quantity) || 1
        if (requestedQty > product.stock) {
            return { ...item, _invalid: true, _reason: `Only ${product.stock} left of ${product.name}.` }
        }
        // FIX: use the product's OWN store, not a single order-wide hardcoded storeName.
        const inventoryEntry = product.store_inventory?.find(inv => inv.isAvailable !== false)
            || product.store_inventory?.[0]
        return {
            ...item,
            productId,
            price:        product.price,
            // FIX: snapshot seller price + snapit margin onto the order item —
            // previously missing, causing seller/admin dashboards to show ₹0.00
            // and Snapit's platform cut to silently compute as ₹0 on every order.
            sellerPrice:  product.sellerPrice ?? product.price ?? 0,
            snapitMargin: product.snapitMargin ?? 0,
            discount:     product.discount || 0,
            quantity:     requestedQty,
            seller_store_name: inventoryEntry?.store_name || storeName,
            sellerId: inventoryEntry?.sellerId || null,
            _invalid: false
        }"""

assert content.count(old) == 1, "Anchor not found or not unique — file may have changed"
content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("✅ order.controller.js patched — sellerPrice/snapitMargin now snapshotted on every new order.")
