import { isInDeliveryZone } from './serviceArea'

/**
 * High-accuracy reverse geocoder tailored for Indian towns/villages
 * Cascades OpenStreetMap Nominatim with BigDataCloud and local zone matching.
 */
export async function reverseGeocode(lat, lng) {
  const zoneInfo = isInDeliveryZone(lat, lng)
  let road = ''
  let locality = ''
  let city = zoneInfo.zone || 'Paliganj'
  let state = 'Bihar'
  let pincode = '801110'
  let formattedAddress = ''

  // Helper with timeout
  const fetchWithTimeout = async (url, options = {}, timeoutMs = 3000) => {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(url, { ...options, signal: controller.signal })
      clearTimeout(id)
      return response
    } catch (err) {
      clearTimeout(id)
      throw err
    }
  }

  // 1. Try OpenStreetMap Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    const res = await fetchWithTimeout(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Snapit-Delivery-App/2.0'
      }
    }, 2800)

    if (res.ok) {
      const data = await res.json()
      if (data && data.address) {
        const a = data.address
        road = a.road || a.street || a.neighbourhood || a.suburb || a.residential || a.hamlet || ''
        locality = a.village || a.town || a.suburb || a.neighbourhood || a.locality || ''
        city = a.city || a.town || a.village || a.county || a.city_district || zoneInfo.zone || 'Paliganj'
        state = a.state || 'Bihar'
        pincode = a.postcode || '801110'

        const parts = [road, locality, city].filter(Boolean)
        formattedAddress = [...new Set(parts)].join(', ')
      }
    }
  } catch (err) {
    // Silently proceed to fallback
  }

  // 2. Fallback to BigDataCloud if road/locality is still empty
  if (!formattedAddress) {
    try {
      const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      const res = await fetchWithTimeout(bdcUrl, {}, 2500)
      if (res.ok) {
        const bdc = await res.json()
        if (bdc) {
          locality = bdc.locality || bdc.city || ''
          city = bdc.locality || zoneInfo.zone || 'Paliganj'
          state = bdc.principalSubdivision || 'Bihar'
          pincode = bdc.postcode || pincode || '801110'
          formattedAddress = [bdc.locality, bdc.principalSubdivision].filter(Boolean).join(', ')
        }
      }
    } catch (err) {
      // Fallback to local zone
    }
  }

  // 3. Fallback to nearest local delivery zone
  if (!formattedAddress) {
    formattedAddress = `${zoneInfo.zone}, Paliganj, Bihar`
  }

  return {
    formattedAddress,
    road: road || locality || '',
    locality: locality || zoneInfo.zone || '',
    city: city || zoneInfo.zone || 'Paliganj',
    state: state || 'Bihar',
    pincode: pincode || '801110',
    zone: zoneInfo.zone,
    serviceable: zoneInfo.serviceable,
    distanceKm: zoneInfo.distanceKm,
  }
}
