// Snapit delivery charge + ETA based on straight-line distance from store
// Store location: Paliganj, Bihar (25.33107548756642, 84.80066055528225)

const STORE_LAT = 25.33121156659458
const STORE_LNG = 84.8006737574818

// Haversine formula — returns distance in km
export const getDistanceKm = (lat1, lng1, lat2, lng2) => {
  const R    = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export const getDistanceFromStore = (customerLat, customerLng) =>
  getDistanceKm(STORE_LAT, STORE_LNG, customerLat, customerLng)

// 0–3 km   → ₹12   ┐
// 3–6 km   → ₹19   ┘  0–6km zone
// 6–14 km  → ₹49       flat zone
// >14 km   → not serviceable
export const getDeliveryCharge = (distanceKm) => {
  if (distanceKm <= 3)  return 12
  if (distanceKm <= 6)  return 19
  if (distanceKm <= 14) return 49
  return null
}

export const getDeliveryETA = (distanceKm) => {
  if (distanceKm <= 5)  return '15 min'
  if (distanceKm <= 7)  return '20–25 min'
  if (distanceKm <= 14) return '30–40 min'
  return null
}

// Chikasi zone spans across the 6km boundary, which would otherwise cause
// different Chikasi addresses to get charged different fees. Override to a
// flat ₹49 for the whole zone instead (same treatment as 6–14km bracket).
const CHIKASI_LAT = 25.28091606583264
const CHIKASI_LNG = 84.87069734970407
const CHIKASI_RADIUS_KM = 1.78

// Himalaya Medical College & Hospital — own flat-fee zone (same ₹49 treatment
// as Chikasi) plus its own, lower minimum order since it's a captive
// hospital/campus audience likely to place smaller, more frequent orders.
const HIMALAYA_LAT = 25.2639198
const HIMALAYA_LNG = 84.8545598
const HIMALAYA_RADIUS_KM = 0.45
const HIMALAYA_FLAT_FEE = 49
const HIMALAYA_MIN_ORDER = 499

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

// ── Snapit Plus free-delivery rules ─────────────────────────────────────────
// 0–6 km  : non-Plus always pays ₹12/₹19 (distance fee) | Plus free if cart >= ₹149, else pays distance fee
// 6–14 km : non-Plus always pays ₹49                    | Plus free if cart >= ₹399, else pays ₹49
// Chikasi : non-Plus always pays ₹49                    | Plus free if cart >= ₹399, else pays ₹49
// >14 km  : not serviceable
// >5 km after 7:30 PM : delivery closed for rider safety
// Generalized version — computes delivery info from ANY origin point
// (grocery store OR a restaurant's own location). Used by getDeliveryInfo()
// below for grocery, and directly by food checkout for restaurant orders.
export const getDeliveryInfoFromOrigin = (originLat, originLng, customerLat, customerLng, cartTotal = 0, isSnapitPlus = false) => {
  const dist = getDistanceKm(originLat, originLng, customerLat, customerLng)
  const chikasiDist = getDistanceKm(CHIKASI_LAT, CHIKASI_LNG, customerLat, customerLng)
  const isChikasi = chikasiDist <= CHIKASI_RADIUS_KM
  const himalayaDist = getDistanceKm(HIMALAYA_LAT, HIMALAYA_LNG, customerLat, customerLng)
  const isHimalaya = himalayaDist <= HIMALAYA_RADIUS_KM

  const isEvening = isAfterEveningCutoff()

  // After 7:30 PM, deliveries beyond 5km are closed
  if (dist > 5 && isEvening) {
    return {
      serviceable: false,
      distanceKm: Math.round(dist * 10) / 10,
      charge: 0,
      eta: null,
      label: 'Closed (>5km after 7:30 PM)',
      isEveningClosed: true,
      reason: 'EVENING_DISTANCE_LIMIT',
      isChikasi: false,
      isHimalaya: false,
      minOrder: 0
    }
  }

  if (!isChikasi && !isHimalaya && dist > 14) {
    return {
      serviceable: false,
      distanceKm: Math.round(dist * 10) / 10,
      charge: 0,
      eta: null,
      label: 'Outside delivery range',
      isEveningClosed: false,
      isChikasi: false,
      isHimalaya: false,
      minOrder: 0
    }
  }

  const charge = isChikasi ? 49 : isHimalaya ? HIMALAYA_FLAT_FEE : getDeliveryCharge(dist)

  let finalCharge = charge
  if (isSnapitPlus) {
    if (isChikasi || isHimalaya || dist > 6) {
      if (cartTotal >= 399) finalCharge = 0
    } else {
      if (cartTotal >= 149) finalCharge = 0
    }
  }

  const eta = getDeliveryETA(dist)

  // Min order applies to the 6–14km bracket and the Himalaya zone (its own,
  // lower minimum), not Chikasi. Snapit Plus members are exempt from both.
  let minOrder = 0
  if (isHimalaya) minOrder = HIMALAYA_MIN_ORDER
  else if (dist > 6) minOrder = MIN_ORDER_ABOVE_6KM
  if (isSnapitPlus) minOrder = 0

  return {
    serviceable:    true,
    distanceKm:     Math.round(dist * 10) / 10,
    charge:         finalCharge,
    originalCharge: charge,
    eta,
    label: finalCharge === 0 ? 'FREE' : `₹${finalCharge}`,
    isChikasi,
    isHimalaya,
    minOrder,
  }
}

// Grocery entry point — always measures from the fixed Snapit store location.
export const getDeliveryInfo = (customerLat, customerLng, cartTotal = 0, isSnapitPlus = false) =>
  getDeliveryInfoFromOrigin(STORE_LAT, STORE_LNG, customerLat, customerLng, cartTotal, isSnapitPlus)
