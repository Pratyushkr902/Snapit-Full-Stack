// client/src/utils/foodCartStore.js
//
// Persistent, cross-restaurant food cart.
// Cart shape in localStorage:
// {
//   restaurants: {
//     [restaurantId]: {
//       restaurantId, restaurantName, restaurantLat, restaurantLng,
//       items: { [menuItemId]: { item, qty } }
//     }
//   }
// }
//
// Multiple restaurants can coexist in the cart at once — matches the
// multi-restaurant checkout backend (one order doc per restaurant, shared
// groupOrderId), so we deliberately do NOT clear the cart when the customer
// adds items from a second restaurant.

import { useSyncExternalStore, useCallback } from 'react'

const STORAGE_KEY = 'snapit_food_cart_v1'
const listeners = new Set()

let state = loadFromStorage()

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { restaurants: {} }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !parsed.restaurants) return { restaurants: {} }
    return parsed
  } catch (err) {
    console.warn('[foodCartStore] failed to load from storage, starting fresh', err)
    return { restaurants: {} }
  }
}

let saveTimer = null
function persist() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (err) {
      console.warn('[foodCartStore] failed to persist cart', err)
    }
  }, 150)
}

function emit() {
  persist()
  listeners.forEach((l) => l())
}

function setState(updater) {
  state = updater(state)
  emit()
}

// ── Core mutations ───────────────────────────────────────────────────────

/**
 * restaurantMeta: { restaurantId, restaurantName, restaurantLat, restaurantLng }
 * item: the menu item object (must have _id)
 */
function addItem(restaurantMeta, item) {
  const { restaurantId } = restaurantMeta
  if (!restaurantId || !item?._id) return

  setState((prev) => {
    const existingRestaurant = prev.restaurants[restaurantId] || {
      restaurantId,
      restaurantName: restaurantMeta.restaurantName || '',
      restaurantLat: restaurantMeta.restaurantLat ?? null,
      restaurantLng: restaurantMeta.restaurantLng ?? null,
      items: {},
    }

    const currentQty = existingRestaurant.items[item._id]?.qty || 0

    return {
      ...prev,
      restaurants: {
        ...prev.restaurants,
        [restaurantId]: {
          ...existingRestaurant,
          // keep meta fresh in case name/location changed since first add
          restaurantName: restaurantMeta.restaurantName || existingRestaurant.restaurantName,
          restaurantLat: restaurantMeta.restaurantLat ?? existingRestaurant.restaurantLat,
          restaurantLng: restaurantMeta.restaurantLng ?? existingRestaurant.restaurantLng,
          items: {
            ...existingRestaurant.items,
            [item._id]: { item, qty: currentQty + 1 },
          },
        },
      },
    }
  })
}

function increaseQty(restaurantId, item) {
  setState((prev) => {
    const restaurant = prev.restaurants[restaurantId]
    if (!restaurant) return prev
    const currentQty = restaurant.items[item._id]?.qty || 0
    return {
      ...prev,
      restaurants: {
        ...prev.restaurants,
        [restaurantId]: {
          ...restaurant,
          items: {
            ...restaurant.items,
            [item._id]: { item, qty: currentQty + 1 },
          },
        },
      },
    }
  })
}

function decreaseQty(restaurantId, item) {
  setState((prev) => {
    const restaurant = prev.restaurants[restaurantId]
    if (!restaurant) return prev
    const currentQty = restaurant.items[item._id]?.qty || 0

    if (currentQty <= 1) {
      const nextItems = { ...restaurant.items }
      delete nextItems[item._id]

      // if that was the last item for this restaurant, drop the restaurant entry too
      if (Object.keys(nextItems).length === 0) {
        const nextRestaurants = { ...prev.restaurants }
        delete nextRestaurants[restaurantId]
        return { ...prev, restaurants: nextRestaurants }
      }

      return {
        ...prev,
        restaurants: {
          ...prev.restaurants,
          [restaurantId]: { ...restaurant, items: nextItems },
        },
      }
    }

    return {
      ...prev,
      restaurants: {
        ...prev.restaurants,
        [restaurantId]: {
          ...restaurant,
          items: {
            ...restaurant.items,
            [item._id]: { item, qty: currentQty - 1 },
          },
        },
      },
    }
  })
}

function clearRestaurant(restaurantId) {
  setState((prev) => {
    if (!prev.restaurants[restaurantId]) return prev
    const nextRestaurants = { ...prev.restaurants }
    delete nextRestaurants[restaurantId]
    return { ...prev, restaurants: nextRestaurants }
  })
}

function clearAll() {
  setState(() => ({ restaurants: {} }))
}

// ── Subscription plumbing (useSyncExternalStore) ────────────────────────

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return state
}

// ── Derived helpers ──────────────────────────────────────────────────────

const priceOf = (item) => (item.discountedPrice > 0 ? item.discountedPrice : item.price)

function restaurantSubtotal(restaurant) {
  return Object.values(restaurant.items).reduce((s, e) => s + priceOf(e.item) * e.qty, 0)
}

function restaurantCount(restaurant) {
  return Object.values(restaurant.items).reduce((s, e) => s + e.qty, 0)
}

// ── Public hooks ──────────────────────────────────────────────────────────

/**
 * Drop-in replacement for the local `foodCart` state used in
 * RestaurantMenuPage.jsx today. Same return shape: { foodCart, cartCount,
 * cartTotal, handleAdd, handleIncrease, handleDecrease }, but now scoped to
 * ONE restaurant and backed by the persistent cross-restaurant store.
 */
export function useRestaurantCart(restaurantMeta) {
  const restaurantId = restaurantMeta?.restaurantId

  const getRestaurantSnapshot = useCallback(
    () => getSnapshot().restaurants[restaurantId] || null,
    [restaurantId]
  )

  const restaurant = useSyncExternalStore(subscribe, getRestaurantSnapshot)

  const foodCart = restaurant
    ? Object.fromEntries(Object.entries(restaurant.items).map(([id, e]) => [id, e]))
    : {}

  const cartCount = restaurant ? restaurantCount(restaurant) : 0
  const cartTotal = restaurant ? restaurantSubtotal(restaurant) : 0

  const handleAdd = useCallback((item) => addItem(restaurantMeta, item), [restaurantMeta])
  const handleIncrease = useCallback((item) => increaseQty(restaurantId, item), [restaurantId])
  const handleDecrease = useCallback((item) => decreaseQty(restaurantId, item), [restaurantId])
  const clearThisRestaurant = useCallback(() => clearRestaurant(restaurantId), [restaurantId])

  return { foodCart, cartCount, cartTotal, handleAdd, handleIncrease, handleDecrease, clearThisRestaurant }
}

/**
 * Whole-cart view for the checkout page / global cart badge — every
 * restaurant currently in the cart, plus grand totals and a flattened
 * items array shaped for the multi-restaurant checkout API
 * (menuItemId, quantity — restaurantId is derived server-side from the DB,
 * but we send it too as a hint/fallback).
 */
export function useFullCart() {
  const fullState = useSyncExternalStore(subscribe, getSnapshot)

  const restaurantList = Object.values(fullState.restaurants).map((r) => ({
    restaurantId: r.restaurantId,
    restaurantName: r.restaurantName,
    restaurantLat: r.restaurantLat,
    restaurantLng: r.restaurantLng,
    items: Object.values(r.items),
    subtotal: restaurantSubtotal(r),
    count: restaurantCount(r),
  }))

  const grandTotal = restaurantList.reduce((s, r) => s + r.subtotal, 0)
  const grandCount = restaurantList.reduce((s, r) => s + r.count, 0)
  const isEmpty = restaurantList.length === 0

  // Flattened for POSTing straight to /api/restaurant/food-order/*
  const toCheckoutItems = useCallback(() => {
    return restaurantList.flatMap((r) =>
      r.items.map((e) => ({
        menuItemId: e.item._id,
        restaurantId: r.restaurantId, // fallback hint only; backend re-derives from DB
        name: e.item.name,
        image: e.item.image,
        price: priceOf(e.item),
        quantity: e.qty,
      }))
    )
  }, [restaurantList])

  return { restaurants: restaurantList, grandTotal, grandCount, isEmpty, toCheckoutItems, clearAll }
}

// Non-hook accessors, for use outside React (e.g. logging, debugging)
export const foodCartStore = { getSnapshot, subscribe, addItem, increaseQty, decreaseQty, clearRestaurant, clearAll }