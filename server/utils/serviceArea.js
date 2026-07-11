// server/utils/serviceArea.js
// Server-side mirror of client/src/utils/serviceArea.js — MUST be kept in sync
// with the client zones. This is the source of truth: the client check is for
// UX (instant feedback), this one actually enforces it.

const STORE_LOCATION = { lat: 25.33121156659458, lng: 84.8006737574818 }

const DELIVERY_ZONES = [
  { name: 'Paliganj',  lat: 25.2921, lng: 84.8170, radiusKm: 2.0 },
  { name: 'Sarsi',     lat: 25.3050, lng: 84.8320, radiusKm: 2.0 },
  { name: 'Kurkuri',   lat: 25.2780, lng: 84.8050, radiusKm: 2.0 },
  { name: 'Acchua',    lat: 25.3120, lng: 84.7980, radiusKm: 2.0 },
  { name: 'Chandos',   lat: 25.2650, lng: 84.8400, radiusKm: 2.0 },
  { name: 'Chiksi',    lat: 25.2850, lng: 84.7850, radiusKm: 2.0 },
  { name: 'Milki',     lat: 25.3200, lng: 84.8100, radiusKm: 2.0 },
  { name: 'Akhtiyarpur', lat: 25.2750, lng: 84.8280, radiusKm: 2.0 },
  { name: 'Balipakar',   lat: 25.3010, lng: 84.7920, radiusKm: 2.0 },
  { name: 'Ular More',         lat: 25.361971450391845, lng: 84.83978080090998, radiusKm: 2.18 },
  { name: 'Rampur Nagawa',     lat: 25.298481843473738, lng: 84.7537306481682,  radiusKm: 2.0 },
  { name: 'Nirakhpur Pali',    lat: 25.30966360261287,  lng: 84.76346494046578, radiusKm: 2.0 },
  { name: 'Dariyapur',         lat: 25.332830390539364, lng: 84.79224964406752, radiusKm: 2.0 },
  { name: 'Fatehpur',          lat: 25.344837251618888, lng: 84.78541480320204, radiusKm: 2.0 },
  { name: 'Kalyanpuri Paipura',lat: 25.35483228778216,  lng: 84.79708175239959, radiusKm: 2.0 },
  { name: 'Chikasi',           lat: 25.28091606583264,  lng: 84.87069734970407, radiusKm: 1.78 },
  { name: 'Lalganj Sehra',     lat: 25.292485478533443, lng: 84.82586927749715, radiusKm: 2.0 },
  // Himalaya Medical College & Hospital (HMCH), Chiksi, SH-69, Paliganj — 900-bed hospital + college campus.
  // Falls in the gap between Chandos (1.47km away, radius 1.0) and Chikasi (2.49km away, radius 1.78),
  // so it was unserviceable despite being a real delivery hotspot. Given its own zone instead of
  // stretching a neighbor. Radius kept to 0.45km (< the 0.47km gap to Chandos) to guarantee no overlap.
  { name: 'Himalaya Medical College', lat: 25.2639198, lng: 84.8545598, radiusKm: 0.45 },
  { name: 'Purani Bazar', lat: 25.3273174, lng: 84.8008332, radiusKm: 1.0 },
  { name: 'Indira Nagar', lat: 25.3334727, lng: 84.8003608, radiusKm: 1.0 },
  { name: 'Dharhara',     lat: 25.3375327, lng: 84.8117994, radiusKm: 1.0 },
  { name: 'Rakasiya',     lat: 25.357181306430718, lng: 84.83059257743433, radiusKm: 1.5 },
]

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

export function isInDeliveryZone(lat, lng) {
  if (lat == null || lng == null) return { serviceable: false, zone: null }

  let best = null
  for (const zone of DELIVERY_ZONES) {
    const dist = getDistanceKm(lat, lng, zone.lat, zone.lng)
    if (dist <= zone.radiusKm) {
      if (!best || dist < best.dist) best = { zone: zone.name, dist }
    }
  }

  if (best) {
    const storeDistanceKm = getDistanceKm(lat, lng, STORE_LOCATION.lat, STORE_LOCATION.lng)
    return { serviceable: true, zone: best.zone, distanceKm: Number(storeDistanceKm.toFixed(1)) }
  }
  return { serviceable: false, zone: null }
}
