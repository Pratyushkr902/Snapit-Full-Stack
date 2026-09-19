// Snapit delivery charge + ETA based on straight-line distance from store
// Store location: Paliganj, Bihar (25.33107548756642, 84.80066055528225)

const STORE_LAT = 25.33121156659458
const STORE_LNG = 84.8006737574818

// Road circuity multiplier (1.25x) converts Haversine straight-line distance to
// actual driving road distance, matching Google Maps / Zomato / Zepto road routing.
export const ROAD_FACTOR = 1.25

// Haversine formula with road circuity — returns real road distance in km
export const getDistanceKm = (lat1, lng1, lat2, lng2) => {
  const nLat1 = Number(lat1), nLng1 = Number(lng1)
  const nLat2 = Number(lat2), nLng2 = Number(lng2)
  if (isNaN(nLat1) || isNaN(nLng1) || isNaN(nLat2) || isNaN(nLng2)) return 0
  const R    = 6371
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

// Base charge by distance (for cartTotal >= 499 or standard brackets)
// 0–3 km   → ₹12
// 3–6 km   → ₹29
// 6–14 km:
//   - below ₹499  → ₹7/km (Math.round(distance * 7))
//   - ₹499 & above → Flat ₹60
// >14 km   → not serviceable
export const getDeliveryCharge = (distanceKm, cartTotal = 0, isGrocery = false) => {
  const numTotal = Number(cartTotal) || 0
  // Campus special (> 7 km, e.g. Himalaya Medical College):
  // Grocery: Always Flat ₹12 (no free delivery waiver)
  // Food: Flat ₹12 (FREE on ₹199+)
  if (distanceKm > 7 && distanceKm <= 16) {
    if (!isGrocery && numTotal >= 199) return 0
    return 12
  }
  // Free delivery up to 5 km on orders ₹149+
  if (distanceKm <= 5 && numTotal >= 149) return 0
  if (distanceKm <= 3) return 12
  if (distanceKm <= 7) return 29
  return 12
}

export const getDeliveryETA = (distanceKm) => {
  if (distanceKm <= 5)  return '15 min'
  if (distanceKm <= 7)  return '20–25 min'
  if (distanceKm <= 16) return '30–40 min'
  return null
}

// 8:00 PM IST cutoff rule: After 8:00 PM (20:00 IST), delivery beyond 5 km is closed for rider safety.
export const isAfterEveningCutoff = () => {
  const now = new Date()
  const istMs = now.getTime() + 5.5 * 3600000
  const istDate = new Date(istMs)
  const hours = istDate.getUTCHours()
  return hours >= 20
}
// Generalized version — computes delivery info from ANY origin point
// (grocery store OR a restaurant's own location).
export const getDeliveryInfoFromOrigin = (originLat, originLng, customerLat, customerLng, cartTotal = 0, isSnapitPlus = false, isGrocery = false) => {
  const dist = getDistanceKm(originLat, originLng, customerLat, customerLng)
  const isEvening = isAfterEveningCutoff()

  const numCartTotal = Number(cartTotal) || 0
  const daytimeCharge = (dist <= 5 && numCartTotal >= 149) 
    ? 0 
    : dist <= 3 ? 12 : dist <= 7 ? 29 : (!isGrocery && numCartTotal >= 199) ? 0 : 12

  // After 8:00 PM, deliveries beyond 5km are closed for rider night safety
  if (dist > 5 && isEvening) {
    return {
      serviceable: false,
      distanceKm: Math.round(dist * 10) / 10,
      charge: daytimeCharge,
      originalCharge: daytimeCharge,
      eta: null,
      label: 'Closed (>5km after 8:00 PM)',
      isEveningClosed: true,
      reason: 'EVENING_DISTANCE_LIMIT',
      isLongDistance: dist > 7,
      minOrder: 0
    }
  }

  if (dist > 16) {
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

  const isLongDistance = dist > 7
  let charge = 12
  let longDistanceTier = null // 'FLAT_12' | 'FREE_CAMPUS'
  let amountNeededForFlatRate = 0
  let amountNeededForFreeDelivery = 0

  if (dist <= 5) {
    if (numCartTotal >= 149) {
      charge = 0
    } else {
      charge = dist <= 3 ? 12 : 29
      amountNeededForFreeDelivery = Math.max(0, 149 - numCartTotal)
    }
  } else if (dist <= 7) {
    charge = 29
  } else {
    // 7.0 – 16.0 km (Campus / Himalaya Medical College / Long distance)
    if (isGrocery) {
      // ONLY in grocery it applies delivery charge (Always Flat ₹12, no free delivery beyond 7 km)
      charge = 12
      longDistanceTier = 'FLAT_12'
      amountNeededForFreeDelivery = 0
    } else {
      // Food orders: FREE on orders ₹199+
      if (numCartTotal >= 199) {
        charge = 0
        longDistanceTier = 'FREE_CAMPUS'
      } else {
        charge = 12
        longDistanceTier = 'FLAT_12'
        amountNeededForFreeDelivery = Math.max(0, 199 - numCartTotal)
      }
    }
  }

  let finalCharge = charge
  if (isSnapitPlus) {
    if (dist <= 7 && numCartTotal >= 149) {
      finalCharge = 0
    } else if (!isGrocery && dist > 7 && numCartTotal >= 149) {
      finalCharge = 0
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
    flatAbove499Fee: 12,
    amountNeededForFlatRate,
    amountNeededForFreeDelivery,
    minOrder: isGrocery ? (isLongDistance ? 199 : 49) : 0,
  }
}

// Grocery entry point — always measures from the fixed Snapit store location.
export const getDeliveryInfo = (customerLat, customerLng, cartTotal = 0, isSnapitPlus = false) =>
  getDeliveryInfoFromOrigin(STORE_LAT, STORE_LNG, customerLat, customerLng, cartTotal, isSnapitPlus, true)

// Dynamic Weather & Late Night Surge Helpers
export const isLateNightSurgeTime = () => {
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000
  const istDate = new Date(now.getTime() + istOffset)
  const hours = istDate.getUTCHours()
  const minutes = istDate.getUTCMinutes()
  const timeInMins = hours * 60 + minutes
  // 10:30 PM (22:30 = 1350 mins) to 6:00 AM (06:00 = 360 mins)
  return timeInMins >= 1350 || timeInMins < 360
}

export const getSurgeFeeDetails = () => {
  if (isLateNightSurgeTime()) {
    return { fee: 15, reason: 'Late Night Surcharge', description: 'Supports delivery partners during late hours' }
  }
  return { fee: 0, reason: '', description: '' }
}

