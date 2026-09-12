// Snapit delivery charge logic — server-side port of client/src/utils/getDeliveryInfo.js
// Store location: Paliganj, Bihar
// Must stay in sync with client/src/utils/getDeliveryInfo.js — same coords, same tiers.
// NOTE: free-delivery waivers intentionally NOT ported here (server no longer waives
// delivery fee based on cart total / Snapit Plus membership).

const STORE_LAT = 25.33121156659458
const STORE_LNG = 84.8006737574818

export const MAX_DELIVERY_RADIUS_KM = 16
export const EXPRESS_DELIVERY_FEE = 25

// Standard GPS coordinates for landmark matching
export const CHIKASI_LAT = 25.28091606583264
export const CHIKASI_LNG = 84.87069734970407
export const HIMALAYA_LAT = 25.2639198
export const HIMALAYA_LNG = 84.8545598

// All zones, including Chikasi & Himalaya, use standard kilometer-based pricing:
// 0–3 km: ₹12 | 3–6 km: ₹29 | 6–14 km: ₹7/km (Chikasi ~9km: ₹63, Himalaya ~9.2km: ₹65)


// Road circuity multiplier (1.25x) converts Haversine straight-line distance to
// actual driving road distance, matching Google Maps / Zomato / Zepto road routing.
export const ROAD_FACTOR = 1.25

// Haversine formula with road circuity — returns real road distance in km
export const getDistanceKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const aerialKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(aerialKm * ROAD_FACTOR * 10) / 10
}

export const getDistanceFromStore = (customerLat, customerLng) =>
  getDistanceKm(STORE_LAT, STORE_LNG, customerLat, customerLng)

// Generalized origin-aware distance — used for restaurant orders where the
// "store" is the restaurant's own location instead of the fixed Snapit store.
export const getDistanceFromOrigin = (originLat, originLng, customerLat, customerLng) =>
  getDistanceKm(originLat, originLng, customerLat, customerLng)

// // 0–3 km   → ₹12
// 3–7 km   → ₹29 (Paliganj town + residential outskirts)
// 7–16 km:
//   - below ₹499  → ₹7/km (Math.round(distance * 7))
//   - ₹499 & above → Flat ₹60
// >16 km   → not serviceable
export const getDeliveryChargeByDistance = (distanceKm, subTotalAmt = 0) => {
  const amount = Number(subTotalAmt) || 0

  // 1. Long distance (> 7 km, e.g. Himalaya Medical College Campus):
  // Special Flat ₹12 delivery fee, and FREE delivery on orders ₹199+!
  if (distanceKm > 7 && distanceKm <= 16) {
    if (amount >= 199) return 0
    return 12
  }

  // 2. Free delivery up to 5 km on orders of ₹149 and above!
  if (distanceKm <= 5 && amount >= 149) return 0

  // 3. Standard distance charges for orders below ₹149 (or within 7 km)
  if (distanceKm <= 3) return 12
  if (distanceKm <= 7) return 29
  return 12
}

// 8:00 PM IST cutoff rule: After 8:00 PM (20:00 IST), delivery beyond 5 km is closed.
export const isAfterEveningCutoff = () => {
  const now = new Date()
  const istMs = now.getTime() + 5.5 * 3600000
  const istDate = new Date(istMs)
  const hours = istDate.getUTCHours()
  return hours >= 20
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
    if (dist > 7 && Number(subTotalAmt) >= 399) return 0
    if (dist <= 7 && Number(subTotalAmt) >= 149) return 0
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
    if (dist > 7 && Number(subTotalAmt) >= 399) return 0
    if (dist <= 7 && Number(subTotalAmt) >= 149) return 0
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