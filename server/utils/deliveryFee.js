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

// 0–3 km   → ₹12
// 3–6 km   → ₹19
// 6–14 km  → ₹49
// >14 km   → not serviceable
const getDeliveryChargeByDistance = (distanceKm) => {
  if (distanceKm <= 3) return 12
  if (distanceKm <= 6) return 19
  if (distanceKm <= 14) return 49
  return null
}

const isChikasiZone = (lat, lng) => {
  const chikasiDist = getDistanceKm(CHIKASI_LAT, CHIKASI_LNG, lat, lng)
  return chikasiDist <= CHIKASI_RADIUS_KM
}

const isHimalayaZone = (lat, lng) => {
  const himalayaDist = getDistanceKm(HIMALAYA_LAT, HIMALAYA_LNG, lat, lng)
  return himalayaDist <= HIMALAYA_RADIUS_KM
}

// Minimum order value required for deliveries in the 6–14km bracket.
// Does NOT apply to the Chikasi flat-fee zone or the 0–6km zone.
const MIN_ORDER_ABOVE_6KM = 499

// 7:30 PM IST cutoff rule: After 7:30 PM (19:30 IST), delivery beyond 5 km is closed.
export const isAfterEveningCutoff = () => {
  const now = new Date()
  const istMs = now.getTime() + 5.5 * 3600000
  const istDate = new Date(istMs)
  const hours = istDate.getUTCHours()
  const minutes = istDate.getUTCMinutes()
  return hours > 19 || (hours === 19 && minutes >= 30)
}

// Returns the minimum cart subtotal required to place an order at this
// location. 0 means no extra minimum beyond normal checkout rules.
// isSnapitPlus exempts the customer from both the 6-14km and Himalaya minimums.
export const getMinOrderAmount = (lat, lng, isSnapitPlus = false) => {
  if (isSnapitPlus) return 0
  if (isHimalayaZone(lat, lng)) return HIMALAYA_MIN_ORDER
  const dist = getDistanceFromStore(lat, lng)
  return dist > 6 ? MIN_ORDER_ABOVE_6KM : 0
}

// Returns true if the coordinates fall outside the serviceable delivery radius.
// Deliveries >5km are also unserviceable after 7:30 PM IST.
export const isOutOfDeliveryRange = (lat, lng) => {
  const dist = getDistanceFromStore(lat, lng)
  if (dist > MAX_DELIVERY_RADIUS_KM) return true
  if (dist > 5 && isAfterEveningCutoff()) return true
  return false
}

// Returns the flat delivery fee (number) for an order.
// subTotalAmt and user are accepted for call-site compatibility but are NOT
// currently used to waive the fee — see note at top of file.
export const calcDeliveryFee = (subTotalAmt, lat, lng, user) => {
  if (isChikasiZone(lat, lng)) return 49
  if (isHimalayaZone(lat, lng)) return HIMALAYA_FLAT_FEE

  const dist = getDistanceFromStore(lat, lng)
  const charge = getDeliveryChargeByDistance(dist)

  // Out-of-range coordinates shouldn't reach here (callers check
  // isOutOfDeliveryRange first), but fall back to the max-tier fee
  // rather than silently returning a falsy/undefined charge.
  return charge === null ? 49 : charge
}

// Restaurant/food orders — same tier logic, but measured from the
// restaurant's own location instead of the fixed grocery store.
export const calcDeliveryFeeFromOrigin = (originLat, originLng, customerLat, customerLng) => {
  if (isChikasiZone(customerLat, customerLng)) return 49
  if (isHimalayaZone(customerLat, customerLng)) return HIMALAYA_FLAT_FEE

  const dist = getDistanceFromOrigin(originLat, originLng, customerLat, customerLng)
  const charge = getDeliveryChargeByDistance(dist)

  return charge === null ? 49 : charge
}

// Restaurant/food orders — minimum order amount, measured from the
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
}

// Restaurant/food orders — is this customer within serviceable range of
// this specific restaurant (not the grocery store)?
export const isOutOfDeliveryRangeFromOrigin = (originLat, originLng, customerLat, customerLng) => {
  const dist = getDistanceFromOrigin(originLat, originLng, customerLat, customerLng)
  if (dist > MAX_DELIVERY_RADIUS_KM) return true
  if (dist > 5 && isAfterEveningCutoff()) return true
  return false
}