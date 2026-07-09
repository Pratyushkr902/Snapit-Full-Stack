// server/utils/storeStatus.js
// Server-side source of truth for "is ordering allowed right now".
// Never trust client-sent open/closed state — this recomputes everything.

import ProductModel from '../models/product.model.js'
import MenuItemModel from '../models/MenuItem.model.js'
import RestaurantModel from '../models/restaurant.model.js'

const ADMIN_LIKE_ROLES = ['ADMIN', 'SELLER', 'RESTO_SELLER', 'RIDER']

function getISTHour() {
  const now = new Date()
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000
  const istMs = utcMs + 5.5 * 3600000
  return new Date(istMs).getHours()
}

function isWithinGlobalHours() {
  const h = getISTHour()
  return h >= 8 && h < 21
}

/**
 * Grocery guard: reject if a product has zero available store_inventory entries.
 * Cart items only carry productId — availability is "sellable from ANY store now".
 */
async function assertGroceryItemsAvailable(list_items) {
  const productIds = list_items
    .map(item => item.productId?._id || item.productId)
    .filter(Boolean)
  if (productIds.length === 0) return

  const products = await ProductModel.find({ _id: { $in: productIds } }).select('name store_inventory publish')
  for (const p of products) {
    if (p.publish === false) {
      const err = new Error(`${p.name} is no longer available.`)
      err.statusCode = 400
      throw err
    }
    const hasAvailableStore = Array.isArray(p.store_inventory) &&
      p.store_inventory.some(s => s.isAvailable && (s.stock || 0) > 0)
    if (!hasAvailableStore) {
      const err = new Error(`${p.name} is currently out of stock. Please remove it from your cart.`)
      err.statusCode = 400
      throw err
    }
  }
}

/**
 * Food guard: reject if any menuItemId in cart belongs to a restaurant
 * currently toggled isOpen: false. Cart items carry menuItemId, not
 * restaurantId directly — so look up via MenuItemModel first.
 */
async function assertRestaurantItemsAvailable(list_items) {
  const menuItemIds = list_items
    .map(item => item.menuItemId?._id || item.menuItemId)
    .filter(Boolean)
  if (menuItemIds.length === 0) return

  const menuItems = await MenuItemModel.find({ _id: { $in: menuItemIds } }).select('restaurantId isAvailable name')
  const restaurantIds = [...new Set(menuItems.map(m => String(m.restaurantId)))]

  for (const mi of menuItems) {
    if (mi.isAvailable === false) {
      const err = new Error(`${mi.name} is currently unavailable. Please remove it from your cart.`)
      err.statusCode = 400
      throw err
    }
  }

  if (restaurantIds.length > 0) {
    const closed = await RestaurantModel.find({ _id: { $in: restaurantIds }, isOpen: false }).select('name')
    if (closed.length > 0) {
      const err = new Error(`${closed[0].name || 'Restaurant'} is currently closed. Please remove its items or try again later.`)
      err.statusCode = 400
      err.closedStores = closed.map(r => r._id)
      throw err
    }
  }
}

/**
 * Throws an Error with .statusCode if the order cannot be placed.
 * Call this in the controller BEFORE trusting anything else from req.body.
 *
 * @param {Object} opts
 * @param {Array}  opts.list_items - cart items being ordered
 * @param {String} [opts.userRole] - role of the placing user (bypasses global-hours check)
 */
export async function assertStoreOpenForOrder({ list_items = [], userRole } = {}) {
  const roleBypassesHours = userRole && ADMIN_LIKE_ROLES.includes(userRole)
  if (!roleBypassesHours && !isWithinGlobalHours()) {
    const err = new Error('Store is closed. We open at 8 AM!')
    err.statusCode = 400
    throw err
  }

  await assertGroceryItemsAvailable(list_items)
  await assertRestaurantItemsAvailable(list_items)
}

export const _isWithinGlobalHours = isWithinGlobalHours
