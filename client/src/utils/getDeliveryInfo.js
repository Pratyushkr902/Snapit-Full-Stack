// Snapit delivery charge + ETA based on straight-line distance from store
// Store location: Paliganj, Bihar (25.33107548756642, 84.80066055528225)

const STORE_LAT = 25.33107548756642
const STORE_LNG = 84.80066055528225

// Haversine formula — returns distance in km
export const getDistanceKm = (lat1, lng1, lat2, lng2) => {
  const R    = 6371
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
// 10–12 km → ₹59
// >12 km   → not serviceable
export const getDeliveryCharge = (distanceKm) => {
  if (distanceKm <= 4)  return 12
  if (distanceKm <= 8)  return 19
  if (distanceKm <= 10) return 49
  if (distanceKm <= 12) return 59
  return null
}

export const getDeliveryETA = (distanceKm) => {
  if (distanceKm <= 5)  return '15 min'
  if (distanceKm <= 7)  return '20–25 min'
  if (distanceKm <= 12) return '30–40 min'
  return null
}

export const getDeliveryInfo = (customerLat, customerLng, cartTotal = 0, isSnapitPlus = false) => {
  const dist   = getDistanceFromStore(customerLat, customerLng)
  const charge = getDeliveryCharge(dist)

  if (charge === null) {
    return { serviceable: false, distanceKm: dist, charge: 0, eta: null, label: 'Outside delivery range' }
  }

  let finalCharge = charge
  if (dist <= 4 && cartTotal >= 399) finalCharge = 0
  else if (dist <= 4 && isSnapitPlus && cartTotal >= 149) finalCharge = 0

  const eta = getDeliveryETA(dist)

  return {
    serviceable:    true,
    distanceKm:     Math.round(dist * 10) / 10,
    charge:         finalCharge,
    originalCharge: charge,
    eta,
    label: finalCharge === 0 ? 'FREE' : `₹${finalCharge}`,
  }
}