// audit_zone_mismatches.js
//
// Finds addresses whose text mentions "Himalaya" or "Chikasi/Chiksi" but whose
// saved lat/lng don't actually fall inside those flat-fee zones (per the
// radii defined in server/utils/deliveryFee.js). These are almost certainly
// bad GPS fixes captured indoors, same root cause as the MBBS Girls Hostel
// case.
//
// Usage:
//   node audit_zone_mismatches.js            -> just reports mismatches
//   node audit_zone_mismatches.js --fix       -> also snaps mismatched
//                                                addresses to the zone center
//
require('dotenv').config({ path: './server/.env' })
const mongoose = require('mongoose')

const CHIKASI_LAT = 25.28091606583264
const CHIKASI_LNG = 84.87069734970407
const CHIKASI_RADIUS_KM = 1.78

const HIMALAYA_LAT = 25.2639198
const HIMALAYA_LNG = 84.8545598
const HIMALAYA_RADIUS_KM = 0.45

const getDistanceKm = (lat1, lng1, lat2, lng2) => {
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

const shouldFix = process.argv.includes('--fix')

;(async () => {
  await mongoose.connect(process.env.MONGODB_URI)
  const Address = mongoose.connection.collection('addresses')

  const candidates = await Address.find({
    address_line: { $regex: /himalaya|chikasi|chiksi/i },
    lat: { $exists: true, $ne: null },
    lng: { $exists: true, $ne: null },
  }).toArray()

  console.log(`Found ${candidates.length} address(es) mentioning Himalaya/Chikasi in the text.\n`)

  const mismatches = []

  for (const addr of candidates) {
    const mentionsHimalaya = /himalaya/i.test(addr.address_line)
    const mentionsChikasi = /chikasi|chiksi/i.test(addr.address_line)

    const distHimalaya = getDistanceKm(HIMALAYA_LAT, HIMALAYA_LNG, addr.lat, addr.lng)
    const distChikasi = getDistanceKm(CHIKASI_LAT, CHIKASI_LNG, addr.lat, addr.lng)

    const inHimalayaZone = distHimalaya <= HIMALAYA_RADIUS_KM
    const inChikasiZone = distChikasi <= CHIKASI_RADIUS_KM

    const looksWrong =
      (mentionsHimalaya && !inHimalayaZone && !inChikasiZone) ||
      (mentionsChikasi && !inChikasiZone && !inHimalayaZone)

    if (looksWrong) {
      mismatches.push({ addr, distHimalaya, distChikasi, mentionsHimalaya, mentionsChikasi })
      console.log('---')
      console.log(`_id: ${addr._id}`)
      console.log(`address_line: ${addr.address_line}`)
      console.log(`saved lat/lng: ${addr.lat}, ${addr.lng}`)
      console.log(`distance from Himalaya zone center: ${distHimalaya.toFixed(2)}km (radius ${HIMALAYA_RADIUS_KM}km)`)
      console.log(`distance from Chikasi zone center: ${distChikasi.toFixed(2)}km (radius ${CHIKASI_RADIUS_KM}km)`)
      console.log(`=> MISMATCH: text mentions a zone but coordinates fall outside it`)
    }
  }

  console.log(`\n${mismatches.length} mismatch(es) found out of ${candidates.length} candidate(s).`)

  if (shouldFix && mismatches.length > 0) {
    console.log('\nApplying fixes (snapping to nearest mentioned zone center)...')
    for (const { addr, mentionsHimalaya } of mismatches) {
      const targetLat = mentionsHimalaya ? HIMALAYA_LAT : CHIKASI_LAT
      const targetLng = mentionsHimalaya ? HIMALAYA_LNG : CHIKASI_LNG
      await Address.updateOne(
        { _id: addr._id },
        { $set: { lat: targetLat, lng: targetLng } }
      )
      console.log(`Fixed ${addr._id} -> ${targetLat}, ${targetLng}`)
    }
    console.log('\nDone.')
  } else if (mismatches.length > 0) {
    console.log('\nRun again with --fix to snap these addresses to the correct zone center.')
  }

  process.exit(0)
})().catch(err => {
  console.error(err)
  process.exit(1)
})
