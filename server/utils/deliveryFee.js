// Snapit delivery charge logic — server-side port of client/src/utils/getDeliveryInfo.js
// Store location: Paliganj, Bihar
// Must stay in sync with client/src/utils/getDeliveryInfo.js — same coords, same tiers.
// NOTE: free-delivery waivers intentionally NOT ported here (server no longer waives
// delivery fee based on cart total / Snapit Plus membership).

const STORE_LAT = 25.33121156659458
const STORE_LNG = 84.8006737574818

export const MAX_DELIVERY_RADIUS_KM = 12
export const EXPRESS_DELIVERY_FEE = 25

// Chikasi zone override — spans two distance brackets (~7.2km–10.8km from store),
// which would otherwise charge different fees for different Chikasi addresses.
// Flat ₹49 for the whole zone instead.
const CHIKASI_LAT = 25.28091606583264
const CHIKASI_LNG = 84.87069734970407
const CHIKASI_RADIUS_KM = 1.78

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

// 0–4 km   → ₹12
// 4–8 km   → ₹19
// 8–10 km  → ₹49
// 10–12 km → ₹49
// >12 km   → not serviceable
const getDeliveryChargeByDistance = (distanceKm) => {
  if (distanceKm <= 4) return 12
  if (distanceKm <= 8) return 19
  if (distanceKm <= 12) return 49
  return null
}

const isChikasiZone = (lat, lng) => {
  const chikasiDist = getDistanceKm(CHIKASI_LAT, CHIKASI_LNG, lat, lng)
  return chikasiDist <= CHIKASI_RADIUS_KM
}

// Returns true if the coordinates fall outside the serviceable delivery radius.
export const isOutOfDeliveryRange = (lat, lng) => {
  const dist = getDistanceFromStore(lat, lng)
  return dist > MAX_DELIVERY_RADIUS_KM
}

// Returns the flat delivery fee (number) for an order.
// subTotalAmt and user are accepted for call-site compatibility but are NOT
// currently used to waive the fee — see note at top of file.
export const calcDeliveryFee = (subTotalAmt, lat, lng, user) => {
  if (isChikasiZone(lat, lng)) return 49

  const dist = getDistanceFromStore(lat, lng)
  const charge = getDeliveryChargeByDistance(dist)

  // Out-of-range coordinates shouldn't reach here (callers check
  // isOutOfDeliveryRange first), but fall back to the max-tier fee
  // rather than silently returning a falsy/undefined charge.
  return charge === null ? 49 : charge
}
