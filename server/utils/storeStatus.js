// server/utils/storeStatus.js
// Server-side source of truth for "is ordering allowed right now".
// Never trust client-sent open/closed state — this recomputes everything.

import mongoose from 'mongoose'
import ProductModel from '../models/product.model.js'
import MenuItemModel from '../models/MenuItem.model.js'
import RestaurantModel from '../models/restaurant.model.js'
import SystemConfigModel from '../models/systemConfig.model.js'

const ADMIN_LIKE_ROLES = ['ADMIN', 'SELLER', 'RESTO_SELLER', 'RIDER', 'SUPER_ADMIN']

// Dynamic in-memory store config synced with MongoDB
let cachedStoreConfig = {
  isClosedForToday: true,
  closedReason: 'Snapit is closed for today. Deliveries will resume tomorrow at 8:30 AM IST!',
  reopenTime: '8:30 AM Tomorrow',
  updatedAt: new Date(),
  updatedByName: 'Super Admin'
}

let isInitialized = false

/**
 * Initializes store closure configuration from database on startup.
 */
export async function initStoreStatus() {
  try {
    const doc = await SystemConfigModel.findOne({ key: 'store_closure_status' }).lean()
    if (doc && doc.value) {
      cachedStoreConfig = {
        isClosedForToday: Boolean(doc.value.isClosedForToday),
        closedReason: doc.value.closedReason || 'Snapit is closed for today. Deliveries will resume tomorrow at 8:30 AM IST!',
        reopenTime: doc.value.reopenTime || '8:30 AM Tomorrow',
        updatedAt: doc.updatedAt || new Date(),
        updatedByName: doc.updatedByName || 'Super Admin'
      }
    } else {
      await SystemConfigModel.create({
        key: 'store_closure_status',
        value: cachedStoreConfig,
        updatedByName: 'Super Admin'
      })
    }
    isInitialized = true
  } catch (err) {
    console.warn('[storeStatus] Warning loading status from DB:', err.message)
  }
}

export function getCachedStoreConfig() {
  return cachedStoreConfig
}

export function setCachedStoreConfig(newConfig) {
  cachedStoreConfig = { ...cachedStoreConfig, ...newConfig }
}

export const IS_STORE_CLOSED_FOR_TODAY = cachedStoreConfig.isClosedForToday

function getISTTime() {
  const now = new Date()
  const istMs = now.getTime() + 5.5 * 3600000
  const istDate = new Date(istMs)
  return {
    hours: istDate.getUTCHours(),
    minutes: istDate.getUTCMinutes()
  }
}

function isWithinGlobalHours() {
  if (cachedStoreConfig.isClosedForToday) return false
  const { hours, minutes } = getISTTime()
  // 8:30 AM – 8:30 PM IST (08:30 - 20:30)
  if (hours < 8 || (hours === 8 && minutes < 30)) return false
  if (hours > 20 || (hours === 20 && minutes >= 30)) return false
  return true
}

const parseBaseId = (rawId) => {
  if (!rawId) return ''
  const str = String(rawId).trim()
  return str.includes('_') ? str.split('_')[0] : str
}

/**
 * Grocery guard: reject if a product has zero available store_inventory entries.
 * Cart items only carry productId — availability is "sellable from ANY store now".
 */
async function assertGroceryItemsAvailable(list_items) {
  const productIds = (list_items || [])
    .map(item => parseBaseId(item.productId?._id || item.productId || item._id))
    .filter(id => id && mongoose.Types.ObjectId.isValid(id))
  if (productIds.length === 0) return

  const products = await ProductModel.find({ _id: { $in: productIds } }).select('name store_inventory publish stock')
  for (const p of products) {
    if (p.publish === false) {
      const err = new Error(`${p.name} is no longer available.`)
      err.statusCode = 400
      throw err
    }
    const hasStoreInventory = Array.isArray(p.store_inventory) && p.store_inventory.length > 0
    const hasAvailableStore = hasStoreInventory
      ? p.store_inventory.some(s => s.isAvailable && (s.stock || 0) > 0)
      : (p.stock || 0) > 0
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
  const menuItemIds = (list_items || [])
    .map(item => parseBaseId(item.menuItemId?._id || item.menuItemId || item._id))
    .filter(id => id && mongoose.Types.ObjectId.isValid(id))
  if (menuItemIds.length === 0) return

  const menuItems = await MenuItemModel.find({ _id: { $in: menuItemIds } }).select('restaurantId isAvailable name')
  const restaurantIds = [...new Set(menuItems.map(m => String(m.restaurantId)).filter(id => mongoose.Types.ObjectId.isValid(id)))]

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
export async function assertStoreOpenForOrder({ list_items = [], userRole, orderType = 'grocery' } = {}) {
  // Ensure DB sync if not already done
  if (!isInitialized) {
    await initStoreStatus()
  }

  // Global operating gate applies to all customer orders
  const isAdmin = ADMIN_LIKE_ROLES.includes(userRole)
  if (!isAdmin && (cachedStoreConfig.isClosedForToday || !isWithinGlobalHours())) {
    const err = new Error(
      cachedStoreConfig.isClosedForToday
        ? (cachedStoreConfig.closedReason || 'Snapit is closed for today. Deliveries will resume tomorrow at 8:30 AM IST!')
        : 'Snapit is closed for the night (8:30 PM – 8:30 AM IST). Orders resume at 8:30 AM tomorrow!'
    )
    err.statusCode = 400
    throw err
  }

  await assertGroceryItemsAvailable(list_items)
  await assertRestaurantItemsAvailable(list_items)
}

export const _isWithinGlobalHours = isWithinGlobalHours
