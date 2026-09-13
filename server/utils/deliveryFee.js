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
  const nLat1 = Number(lat1), nLng1 = Number(lng1)
  const nLat2 = Number(lat2), nLng2 = Number(lng2)
  if (isNaN(nLat1) || isNaN(nLng1) || isNaN(nLat2) || isNaN(nLng2)) return 0
  const R = 6371
  const dLat = ((nLat2 - nLat1) * Math.PI) / 180
  const dLng = ((nLng2 - nLng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((nLat1 * Math.PI) / 180) *
      Math.cos((nLat2 * Math.PI) / 180) *
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
export const getDeliveryChargeByDistance = (distanceKm, subTotalAmt = 0, isGrocery = false) => {
  const amount = Number(subTotalAmt) || 0

  // 1. Long distance (> 7 km, e.g. Himalaya Medical College Campus):
  // Grocery: Always Flat ₹12 delivery fee (NO free delivery waiver)
  // Food: FREE delivery on orders ₹199+ (food has distance markup)
  if (distanceKm > 7 && distanceKm <= 16) {
    if (!isGrocery && amount >= 199) return 0
    return 12
  }

  // 2. Free delivery up to 5 km on orders of ₹149 and above!
  if (distanceKm <= 5 && amount >= 149) return 0

  // 3. Standard distance charges for orders below ₹149 (or within 7 km)
  if (distanceKm <= 3) return 12
  if (distanceKm <= 7) return 29
  return 12
}

// 8:00 PM IST cutoff rule: After 8:00 PM (20:00 IST), delivery beyond 5 km is closed for rider safety.
export const isAfterEveningCutoff = () => {
  const now = new Date()
  const istMs = now.getTime() + 5.5 * 3600000
  const istDate = new Date(istMs)
  const hours = istDate.getUTCHours()
  return hours >= 20
}

// Returns the minimum cart subtotal required to place an order at this location.
// Within 7 km: ₹49 minimum order.
// Beyond 7 km (Campus / Himalaya Medical College): ₹199 minimum order.
export const getMinOrderAmount = (lat, lng, isSnapitPlus = false) => {
  if (lat == null || lng == null || lat === '' || lng === '') return 49
  const nLat = Number(lat)
  const nLng = Number(lng)
  if (isNaN(nLat) || isNaN(nLng)) return 49
  const dist = getDistanceFromStore(nLat, nLng)
  if (dist > 7) {
    return 199
  }
  return 49
}

// Returns true if the coordinates fall outside the serviceable delivery radius.
// Deliveries >5km are also unserviceable after 7:30 PM IST.
export const isOutOfDeliveryRange = (lat, lng) => {
  if (lat == null || lng == null || lat === '' || lng === '') return false
  const nLat = Number(lat), nLng = Number(lng)
  if (isNaN(nLat) || isNaN(nLng)) return false
  const dist = getDistanceFromStore(nLat, nLng)
  if (dist > MAX_DELIVERY_RADIUS_KM) return true
  if (dist > 5 && isAfterEveningCutoff()) return true
  return false
}

// Returns the delivery fee (number) for an order.
export const calcDeliveryFee = (subTotalAmt, lat, lng, user) => {
  if (lat == null || lng == null || lat === '' || lng === '') return 12
  const nLat = Number(lat), nLng = Number(lng)
  if (isNaN(nLat) || isNaN(nLng)) return 12
  const dist = getDistanceFromStore(nLat, nLng)
  const isPlus = Boolean(
    user?.isSnapitPlusMember && user?.snapitPlusExpiresAt &&
    new Date() < new Date(user.snapitPlusExpiresAt)
  )

  if (isPlus) {
    if (dist <= 7 && Number(subTotalAmt) >= 149) return 0
  }

  const charge = getDeliveryChargeByDistance(dist, subTotalAmt, true)
  return charge === null ? 12 : charge
}

// Restaurant/food orders — same tier logic, measured from restaurant's location.
export const calcDeliveryFeeFromOrigin = (originLat, originLng, customerLat, customerLng, subTotalAmt = 0, user = null) => {
  const dist = getDistanceFromOrigin(originLat, originLng, customerLat, customerLng)
  const isPlus = Boolean(
    user?.isSnapitPlusMember && user?.snapitPlusExpiresAt &&
    new Date() < new Date(user.snapitPlusExpiresAt)
  )

  if (isPlus) {
    if (dist > 7 && Number(subTotalAmt) >= 149) return 0
    if (dist <= 7 && Number(subTotalAmt) >= 149) return 0
  }

  const charge = getDeliveryChargeByDistance(dist, subTotalAmt, false)
  return charge === null ? 12 : charge
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