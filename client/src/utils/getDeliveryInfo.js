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

// Base charge by distance (for cartTotal >= 499 or standard brackets)
// 0–3 km   → ₹12
// 3–6 km   → ₹29
// 6–14 km:
//   - below ₹499  → ₹7/km (Math.round(distance * 7))
//   - ₹499 & above → Flat ₹60
// >14 km   → not serviceable
export const getDeliveryCharge = (distanceKm, cartTotal = 0) => {
  if (distanceKm <= 3) return 12
  if (distanceKm <= 6) return 29
  if (distanceKm <= 14) {
    if (Number(cartTotal) >= 499) return 60
    return Math.round(distanceKm * 7)
  }
  return null
}

export const getDeliveryETA = (distanceKm) => {
  if (distanceKm <= 5)  return '15 min'
  if (distanceKm <= 7)  return '20–25 min'
  if (distanceKm <= 14) return '30–40 min'
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
// Generalized version — computes delivery info from ANY origin point
// (grocery store OR a restaurant's own location).
export const getDeliveryInfoFromOrigin = (originLat, originLng, customerLat, customerLng, cartTotal = 0, isSnapitPlus = false) => {
  const dist = getDistanceKm(originLat, originLng, customerLat, customerLng)
  const isEvening = isAfterEveningCutoff()

  const numCartTotal = Number(cartTotal) || 0
  const daytimeCharge = dist <= 3 ? 12 : dist <= 6 ? 29 : numCartTotal >= 499 ? 60 : Math.round(dist * 7)

  // After 7:30 PM, deliveries beyond 5km are closed for rider night safety
  if (dist > 5 && isEvening) {
    return {
      serviceable: false,
      distanceKm: Math.round(dist * 10) / 10,
      charge: daytimeCharge,
      originalCharge: daytimeCharge,
      eta: null,
      label: 'Closed (>5km after 7:30 PM)',
      isEveningClosed: true,
      reason: 'EVENING_DISTANCE_LIMIT',
      isLongDistance: dist > 6,
      minOrder: 0
    }
  }

  if (dist > 14) {
    return {
      serviceable: false,
      distanceKm: Math.round(dist * 10) / 10,
      charge: 0,
      eta: null,
      label: 'Outside delivery range',
      isEveningClosed: false,
      isLongDistance: false,
      minOrder: 0
    }
  }

  const isLongDistance = dist > 6
  let charge = 12
  let longDistanceTier = null // 'PER_KM' | 'FLAT_ABOVE_499'
  let amountNeededForFlatRate = 0

  if (dist <= 3) {
    charge = 12
  } else if (dist <= 6) {
    charge = 29
  } else {
    // 6.0 – 14.0 km
    if (numCartTotal >= 499) {
      charge = 60
      longDistanceTier = 'FLAT_ABOVE_499'
    } else {
      charge = Math.round(dist * 7)
      longDistanceTier = 'PER_KM'
      amountNeededForFlatRate = Math.max(0, 499 - numCartTotal)
    }
  }

  let finalCharge = charge
  if (isSnapitPlus) {
    if (dist > 6) {
      if (numCartTotal >= 399) finalCharge = 0
    } else {
      if (numCartTotal >= 149) finalCharge = 0
    }
  }

  const eta = getDeliveryETA(dist)

  return {
    serviceable: true,
    distanceKm: Math.round(dist * 10) / 10,
    charge: finalCharge,
    originalCharge: charge,
    eta,
    label: finalCharge === 0 ? 'FREE' : `₹${finalCharge}`,
    isLongDistance,
    longDistanceTier,
    ratePerKm: 7,
    flatAbove499Fee: 60,
    amountNeededForFlatRate,
    minOrder: 0,
  }
}

// Grocery entry point — always measures from the fixed Snapit store location.
export const getDeliveryInfo = (customerLat, customerLng, cartTotal = 0, isSnapitPlus = false) =>
  getDeliveryInfoFromOrigin(STORE_LAT, STORE_LNG, customerLat, customerLng, cartTotal, isSnapitPlus)

