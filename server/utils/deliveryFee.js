// Snapit delivery charge logic — server-side port of client/src/utils/getDeliveryInfo.js
// Store location: Paliganj, Bihar
// Must stay in sync with client/src/utils/getDeliveryInfo.js — same coords, same tiers.
// NOTE: free-delivery waivers intentionally NOT ported here (server no longer waives
// delivery fee based on cart total / Snapit Plus membership).

const STORE_LAT = 25.33121156659458
const STORE_LNG = 84.8006737574818

export const MAX_DELIVERY_RADIUS_KM = 14
export const EXPRESS_DELIVERY_FEE = 25

// Chikasi zone override — spans across the 6km boundary, which would otherwise
// charge different fees for different Chikasi addresses.
// Flat ₹49 for the whole zone instead.
const CHIKASI_LAT = 25.28091606583264
const CHIKASI_LNG = 84.87069734970407
const CHIKASI_RADIUS_KM = 1.78

// Himalaya Medical College & Hospital — own flat-fee zone (same treatment
// as Chikasi) with its own, lower minimum order. Must stay in sync with
// client/src/utils/getDeliveryInfo.js.
const HIMALAYA_LAT = 25.2639198
const HIMALAYA_LNG = 84.8545598
const HIMALAYA_RADIUS_KM = 0.45
const HIMALAYA_FLAT_FEE = 49
const HIMALAYA_MIN_ORDER = 499

// Haversine formula — returns distance in km
export const getDistanceKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export const getDistanceFromStore = (customerLat, customerLng) =>
  getDistanceKm(STORE_LAT, STORE_LNG, customerLat, customerLng)

// Generalized origin-aware distance — used for restaurant orders where the
// "store" is the restaurant's own location instead of the fixed Snapit store.
export const getDistanceFromOrigin = (originLat, originLng, customerLat, customerLng) =>
  getDistanceKm(originLat, originLng, customerLat, customerLng)

// // 0–3 km   → ₹12
// 3–6 km   → ₹29
// 6–14 km:
//   - below ₹499  → ₹7/km (Math.round(distance * 7))
//   - ₹499 & above → Flat ₹60
// >14 km   → not serviceable
const getDeliveryChargeByDistance = (distanceKm, subTotalAmt = 0) => {
  if (distanceKm <= 3) return 12
  if (distanceKm <= 6) return 29
  if (distanceKm <= 14) {
    if (Number(subTotalAmt) >= 499) return 60
    return Math.round(distanceKm * 7)
  }
  return null
}

// 7:30 PM IST cutoff rule: After 7:30 PM (19:30 IST), delivery beyond 5 km is closed.
export const isAfterEveningCutoff = () => {
  const now = new Date()
  const istMs = now.getTime() + 5.5 * 3600000
  const istDate = new Date(istMs)
  const hours = istDate.getUTCHours()
  const minutes = istDate.getUTCMinutes()
  return hours > 19 || (hours === 19 && minutes >= 30)
}

// Returns the minimum cart subtotal required to place an order at this location.
// (With ₹7/km pricing, customers can place orders below ₹499 by paying distance fee).
export const getMinOrderAmount = (lat, lng, isSnapitPlus = false) => {
  return 0
}

// Returns true if the coordinates fall outside the serviceable delivery radius.
// Deliveries >5km are also unserviceable after 7:30 PM IST.
export const isOutOfDeliveryRange = (lat, lng) => {
  const dist = getDistanceFromStore(lat, lng)
  if (dist > MAX_DELIVERY_RADIUS_KM) return true
  if (dist > 5 && isAfterEveningCutoff()) return true
  return false
}

// Returns the delivery fee (number) for an order.
export const calcDeliveryFee = (subTotalAmt, lat, lng, user) => {
  const dist = getDistanceFromStore(lat, lng)
  const isPlus = Boolean(
    user?.isSnapitPlusMember && user?.snapitPlusExpiresAt &&
    new Date() < new Date(user.snapitPlusExpiresAt)
  )

  if (isPlus) {
    if (dist > 6 && Number(subTotalAmt) >= 399) return 0
    if (dist <= 6 && Number(subTotalAmt) >= 149) return 0
  }

  const charge = getDeliveryChargeByDistance(dist, subTotalAmt)
  return charge === null ? 60 : charge
}

// Restaurant/food orders — same tier logic, measured from restaurant's location.
export const calcDeliveryFeeFromOrigin = (originLat, originLng, customerLat, customerLng, subTotalAmt = 0, user = null) => {
  const dist = getDistanceFromOrigin(originLat, originLng, customerLat, customerLng)
  const isPlus = Boolean(
    user?.isSnapitPlusMember && user?.snapitPlusExpiresAt &&
    new Date() < new Date(user.snapitPlusExpiresAt)
  )

  if (isPlus) {
    if (dist > 6 && Number(subTotalAmt) >= 399) return 0
    if (dist <= 6 && Number(subTotalAmt) >= 149) return 0
  }

  const charge = getDeliveryChargeByDistance(dist, subTotalAmt)
  return charge === null ? 60 : charge
}

// Restaurant/food orders — minimum order amount.
export const getMinOrderAmountFromOrigin = (originLat, originLng, customerLat, customerLng, isSnapitPlus = false) => {
  return 0
}

// Restaurant/food orders — is this customer within serviceable range of
// this specific restaurant (not the grocery store)?
export const isOutOfDeliveryRangeFromOrigin = (originLat, originLng, customerLat, customerLng) => {
  const dist = getDistanceFromOrigin(originLat, originLng, customerLat, customerLng)
  if (dist > MAX_DELIVERY_RADIUS_KM) return true
  if (dist > 5 && isAfterEveningCutoff()) return true
  return false
}