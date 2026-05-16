// Snapit delivery zones — center coordinates + radius in km
// Villages: Paliganj, Sarsi, Kurkuri, Acchua, Chandos, Chiksi, Milki

const DELIVERY_ZONES = [
  { name: 'Paliganj',  lat: 25.2921, lng: 84.8170, radiusKm: 4 },
  { name: 'Sarsi',     lat: 25.3050, lng: 84.8320, radiusKm: 3 },
  { name: 'Kurkuri',   lat: 25.2780, lng: 84.8050, radiusKm: 3 },
  { name: 'Acchua',    lat: 25.3120, lng: 84.7980, radiusKm: 3 },
  { name: 'Chandos',   lat: 25.2650, lng: 84.8400, radiusKm: 3 },
  { name: 'Chiksi',    lat: 25.2850, lng: 84.7850, radiusKm: 3 },
  { name: 'Milki',     lat: 25.3200, lng: 84.8100, radiusKm: 3 },
]

// Haversine formula — distance between 2 coords in km
function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Check if a lat/lng is within any delivery zone
export function isInDeliveryZone(lat, lng) {
  for (const zone of DELIVERY_ZONES) {
    const dist = getDistanceKm(lat, lng, zone.lat, zone.lng)
    if (dist <= zone.radiusKm) {
      return { serviceable: true, zone: zone.name, distanceKm: dist.toFixed(1) }
    }
  }
  return { serviceable: false, zone: null }
}

// Get user's current location
export function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => reject(err),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  })
}