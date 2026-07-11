// Snapit delivery zones — center coordinates + radius in km
// Villages: Paliganj, Sarsi, Kurkuri, Acchua, Chandos, Chiksi, Milki

// Actual store location — used for the "X km from our store" distance shown to users
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
  { name: 'Chikasi',           lat: 25.28091606583264,  lng: 84.87069734970407, radiusKm: 1.78 }, // NOTE: ~9km east of existing 'Chiksi' — different location, verify name isn't a duplicate/typo
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
// radiusKm widened to 2.0km for base village zones (previously 1.0km) to reduce false
// "not serviceable" results for users who are genuinely near a village but outside its
// original tight radius. Zone circles now overlap more; isInDeliveryZone() below always
// picks the NEAREST matching zone by distance, not the first match, so overlap is safe.

export const SERVICEABLE_VILLAGES = DELIVERY_ZONES.map(z => z.name)

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

// Check if a lat/lng is within any delivery zone — picks the NEAREST matching zone,
// not just the first one in the array. Zone circles overlap (radii 3-4km, centers
// often <5km apart), so a point can fall inside multiple circles at once. Previously
// this returned the first array match regardless of actual distance, which is why
// points near Indira Nagar were getting labeled "Acchua" instead of whichever zone
// center is truly closest.
//
// distanceKm returned here is the REAL distance from the user to the store
// (STORE_LOCATION), not the distance to the matched village's center. Those are
// two different numbers — zone matching decides "which village name to show",
// store distance decides "how far is delivery actually coming from" — and the
// UI label "X km from our store" should always use the latter.
export function isInDeliveryZone(lat, lng) {
  let best = null

  for (const zone of DELIVERY_ZONES) {
    const dist = getDistanceKm(lat, lng, zone.lat, zone.lng)
    if (dist <= zone.radiusKm) {
      if (!best || dist < best.dist) {
        best = { zone: zone.name, dist }
      }
    }
  }

  if (best) {
    const storeDistanceKm = getDistanceKm(lat, lng, STORE_LOCATION.lat, STORE_LOCATION.lng)
    return { serviceable: true, zone: best.zone, distanceKm: Number(storeDistanceKm.toFixed(1)) }
  }
  return { serviceable: false, zone: null }
}

// Get user's current location
// Uses the Capacitor Geolocation plugin on native (Android/iOS) so the OS
// permission dialog actually fires — raw navigator.geolocation inside a
// Capacitor WebView often fails silently without it, which is why location
// detection was unreliable specifically in the APK (worked fine on web).
// Falls back to navigator.geolocation when running in a plain browser tab.
export async function getUserLocation() {
  try {
    const { Capacitor } = await import('@capacitor/core')
    if (Capacitor.isNativePlatform()) {
      const { Geolocation } = await import('@capacitor/geolocation')
      const permStatus = await Geolocation.checkPermissions()
      if (permStatus.location !== 'granted' && permStatus.coarseLocation !== 'granted') {
        const requested = await Geolocation.requestPermissions()
        if (requested.location !== 'granted' && requested.coarseLocation !== 'granted') {
          throw new Error('Location permission denied')
        }
      }
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000 })
      return { lat: pos.coords.latitude, lng: pos.coords.longitude }
    }
  } catch (nativeErr) {
    // Native path failed (plugin missing, permission denied, etc) — fall
    // through to the browser API below rather than failing outright.
    console.log('Native geolocation failed, falling back to browser API:', nativeErr?.message)
  }

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
