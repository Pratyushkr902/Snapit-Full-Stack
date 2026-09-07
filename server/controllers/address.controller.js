import { body, validationResult } from 'express-validator'
import AddressModel from "../models/address.model.js"
import UserModel    from "../models/user.model.js"
import { isInDeliveryZone } from '../utils/serviceArea.js'

// ─── GEOCODE FALLBACK ─────────────────────────────────────────────────────────
// Called when user saves address without clicking "Use My Current Location"
// Uses Nominatim (free, no API key) to get coords from city name

const geocodeCityFallback = async (city) => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city + ', Bihar, India')}&format=json&limit=1&countrycodes=in`
    const res  = await fetch(url, { headers: { 'User-Agent': 'Snapit-Grocery-App/1.0' } })
    const data = await res.json()
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    return null
  } catch {
    return null
  }
}

export const isGenericPaliganjCentroid = (lat, lng) => {
  if (lat == null || lng == null) return false
  const nLat = Number(lat)
  const nLng = Number(lng)
  // Paliganj centroid: 25.2920631, 84.8169694 or 25.2921, 84.8170 (within ~150m)
  return Math.abs(nLat - 25.2920631) < 0.002 && Math.abs(nLng - 84.8169694) < 0.002
}

export const resolveVillageFromText = (text) => {
  if (!text) return null
  const clean = String(text).toLowerCase()
  if (/himalaya|hmch|bams|mbbs/i.test(clean)) {
    return { lat: 25.2639198, lng: 84.8545598, name: 'Himalaya Medical College' }
  }
  if (/chiksi|chikasi/i.test(clean)) {
    return { lat: 25.28091606583264, lng: 84.87069734970407, name: 'Chikasi' }
  }
  if (/purani\s*bazar|purani\s*bazaar/i.test(clean)) {
    return { lat: 25.3273174, lng: 84.8008332, name: 'Purani Bazar' }
  }
  if (/indira\s*nagar/i.test(clean)) {
    return { lat: 25.3334727, lng: 84.8003608, name: 'Indira Nagar' }
  }
  if (/dharhara/i.test(clean)) {
    return { lat: 25.3375327, lng: 84.8117994, name: 'Dharhara' }
  }
  if (/sarsi/i.test(clean)) {
    return { lat: 25.3050, lng: 84.8320, name: 'Sarsi' }
  }
  if (/kurkuri/i.test(clean)) {
    return { lat: 25.2780, lng: 84.8050, name: 'Kurkuri' }
  }
  if (/acchua/i.test(clean)) {
    return { lat: 25.3120, lng: 84.7980, name: 'Acchua' }
  }
  if (/chandos/i.test(clean)) {
    return { lat: 25.2650, lng: 84.8400, name: 'Chandos' }
  }
  if (/milki/i.test(clean)) {
    return { lat: 25.3200, lng: 84.8100, name: 'Milki' }
  }
  if (/akhtiyarpur/i.test(clean)) {
    return { lat: 25.2750, lng: 84.8280, name: 'Akhtiyarpur' }
  }
  if (/balipakar/i.test(clean)) {
    return { lat: 25.3010, lng: 84.7920, name: 'Balipakar' }
  }
  if (/ular\s*more/i.test(clean)) {
    return { lat: 25.361971450391845, lng: 84.83978080090998, name: 'Ular More' }
  }
  if (/rampur\s*nagawa/i.test(clean)) {
    return { lat: 25.298481843473738, lng: 84.7537306481682, name: 'Rampur Nagawa' }
  }
  if (/nirakhpur/i.test(clean)) {
    return { lat: 25.30966360261287, lng: 84.76346494046578, name: 'Nirakhpur Pali' }
  }
  if (/dariyapur/i.test(clean)) {
    return { lat: 25.332830390539364, lng: 84.79224964406752, name: 'Dariyapur' }
  }
  if (/fatehpur/i.test(clean)) {
    return { lat: 25.344837251618888, lng: 84.78541480320204, name: 'Fatehpur' }
  }
  if (/rakasiya/i.test(clean)) {
    return { lat: 25.357181306430718, lng: 84.83059257743433, name: 'Rakasiya' }
  }
  return null
}

// ─── SHARED INPUT VALIDATION ─────────────────────────────────────────────────
//
// SECURITY FIX: The original controller accepted all fields from req.body with
// no type-checking, length limits, or sanitisation.  A user could pass:
//   • Objects/arrays for string fields (prototype pollution via mongoose)
//   • Arbitrarily long strings (DB bloat, potential DoS)
//   • Non-numeric lat/lng (NaN stored silently)
//   • Non-numeric pincode (invalid postal codes pass through)
//   • Short/invalid mobile numbers
//
// express-validator is already installed in server/package.json.
// These validators are exported so address.route.js can use them as middleware.

export const validateCreateAddress = [
    body('address_line')
        .trim()
        .notEmpty().withMessage('Address line is required.')
        .isLength({ min: 3, max: 250 }).withMessage('Address must be 3–250 characters.'),

    body('city')
        .trim()
        .notEmpty().withMessage('City / Village is required.')
        .isLength({ max: 100 }).withMessage('City name too long.'),

    body('state')
        .trim()
        .notEmpty().withMessage('State is required.')
        .isLength({ max: 100 }).withMessage('State name too long.'),

    body('country')
        .trim()
        .notEmpty().withMessage('Country is required.')
        .isLength({ max: 100 }).withMessage('Country name too long.'),

    body('pincode')
        .trim()
        .notEmpty().withMessage('Pincode is required.')
        .matches(/^\d{6}$/).withMessage('Pincode must be exactly 6 digits.'),

    body('mobile')
        .trim()
        .notEmpty().withMessage('Contact mobile number is required.')
        .matches(/^[6-9]\d{9}$/).withMessage('Mobile must be a valid 10-digit Indian number.'),

    body('recipient_name')
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 100 }).withMessage('Recipient name too long.'),

    body('recipient_mobile')
        .optional({ nullable: true })
        .trim()
        .custom(val => !val || /^[6-9]\d{9}$/.test(val)).withMessage('Recipient mobile must be a valid 10-digit number.'),

    body('address_type')
        .optional({ nullable: true })
        .isIn(['HOME', 'WORK', 'FRIENDS_FAMILY', 'OTHER']).withMessage('Invalid address type.'),

    body('landmark')
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 150 }).withMessage('Landmark too long.'),

    body('floor_door')
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 100 }).withMessage('Floor / House detail too long.'),

    body('delivery_instructions')
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 250 }).withMessage('Delivery instructions too long.'),

    body('lat')
        .optional({ nullable: true })
        .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90.'),

    body('lng')
        .optional({ nullable: true })
        .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180.'),
]

export const validateUpdateAddress = [
    body('_id')
        .notEmpty().withMessage('Address ID is required.')
        .isMongoId().withMessage('Invalid address ID.'),

    // Same field rules as create — reuse them
    ...validateCreateAddress,
]

// ─── VALIDATION RESULT HANDLER (shared) ──────────────────────────────────────
const checkValidation = (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: errors.array()[0].msg,
            errors:  errors.array(),
            error:   true,
            success: false,
        })
    }
    return null
}

// ─── CONTROLLERS ─────────────────────────────────────────────────────────────

export const addAddressController = async (request, response) => {
    try {
        const validationError = checkValidation(request, response)
        if (validationError) return validationError

        const userId = request.userId  // set by auth middleware

        const {
            address_line, city, state, pincode,
            country, mobile, lat, lng,
            recipient_name, recipient_mobile, address_type,
            landmark, floor_door, delivery_instructions,
            isExactGps, gpsAccuracy
        } = request.body

        const combinedText = `${address_line || ''} ${city || ''} ${landmark || ''}`
        let finalLat = null
        let finalLng = null
        let exactGpsFlag = Boolean(isExactGps)

        const villageMatch = resolveVillageFromText(combinedText)

        // 1. If user provided coordinates
        if (lat != null && !Number.isNaN(Number(lat)) && lng != null && !Number.isNaN(Number(lng)) && Number(lat) !== 0) {
            const isCentroid = isGenericPaliganjCentroid(lat, lng)
            if (isCentroid && villageMatch) {
                // Default centroid from frontend, but text mentions a specific village
                finalLat = villageMatch.lat
                finalLng = villageMatch.lng
                exactGpsFlag = false
            } else {
                finalLat = Number(lat)
                finalLng = Number(lng)
                if (isCentroid) exactGpsFlag = false
            }
        } else if (villageMatch) {
            finalLat = villageMatch.lat
            finalLng = villageMatch.lng
            exactGpsFlag = false
        }

        if (finalLat == null || finalLng == null) {
            const geocoded = await geocodeCityFallback(city || address_line)
            if (geocoded) {
                finalLat = geocoded.lat
                finalLng = geocoded.lng
                exactGpsFlag = false
            }
        }

        if (finalLat == null || finalLng == null) {
            return response.status(400).json({
                message: "Please pin your exact delivery location on the map or pick your village.",
                error:   true,
                success: false,
            })
        }

        const zoneCheck = isInDeliveryZone(finalLat, finalLng)
        if (!zoneCheck.serviceable) {
            return response.status(400).json({
                message: "Sorry, this address location is outside our 14km delivery service area.",
                error:   true,
                success: false,
            })
        }

        const createAddress = new AddressModel({
            address_line,
            city,
            state,
            country,
            pincode,
            mobile,
            recipient_name: recipient_name || "",
            recipient_mobile: recipient_mobile || "",
            address_type: address_type || (recipient_name ? 'FRIENDS_FAMILY' : 'HOME'),
            landmark: landmark || "",
            floor_door: floor_door || "",
            delivery_instructions: delivery_instructions || "",
            lat: finalLat,
            lng: finalLng,
            isExactGps: exactGpsFlag,
            gpsAccuracy: exactGpsFlag && gpsAccuracy ? Number(gpsAccuracy) : null,
            userId,
        })

        const saveAddress = await createAddress.save()

        await UserModel.findByIdAndUpdate(userId, {
            $push: { address_details: saveAddress._id },
            ...(mobile ? { mobile: Number(mobile) } : {})
        })

        return response.json({
            message: "Address Created Successfully",
            error:   false,
            success: true,
            data:    saveAddress,
        })
    } catch (error) {
        console.error('[addAddressController]', error.message)
        return response.status(500).json({
            message: "Failed to create address.",
            error:   true,
            success: false,
        })
    }
}

export const getAddressController = async (request, response) => {
    try {
        const userId = request.userId  // set by auth middleware

        const data = await AddressModel
            .find({ userId })
            .sort({ createdAt: -1 })

        return response.json({
            data,
            message: "List of addresses",
            error:   false,
            success: true,
        })
    } catch (error) {
        console.error('[getAddressController]', error.message)
        return response.status(500).json({
            message: "Failed to fetch addresses.",
            error:   true,
            success: false,
        })
    }
}

export const updateAddressController = async (request, response) => {
    try {
        const validationError = checkValidation(request, response)
        if (validationError) return validationError

        const userId = request.userId  // set by auth middleware

        const {
            _id, address_line, city, state,
            country, pincode, mobile, lat, lng,
            recipient_name, recipient_mobile, address_type,
            landmark, floor_door, delivery_instructions,
            isExactGps, gpsAccuracy
        } = request.body

        const combinedText = `${address_line || ''} ${city || ''} ${landmark || ''}`
        let finalLat = null
        let finalLng = null
        let exactGpsFlag = Boolean(isExactGps)

        const villageMatch = resolveVillageFromText(combinedText)

        // 1. If user provided coordinates
        if (lat != null && !Number.isNaN(Number(lat)) && lng != null && !Number.isNaN(Number(lng)) && Number(lat) !== 0) {
            const isCentroid = isGenericPaliganjCentroid(lat, lng)
            if (isCentroid && villageMatch) {
                finalLat = villageMatch.lat
                finalLng = villageMatch.lng
                exactGpsFlag = false
            } else {
                finalLat = Number(lat)
                finalLng = Number(lng)
                if (isCentroid) exactGpsFlag = false
            }
        } else if (villageMatch) {
            finalLat = villageMatch.lat
            finalLng = villageMatch.lng
            exactGpsFlag = false
        }

        if (!finalLat || !finalLng) {
            const geocoded = await geocodeCityFallback(city || address_line)
            if (geocoded) {
                finalLat = geocoded.lat
                finalLng = geocoded.lng
                exactGpsFlag = false
                console.log(`[updateAddress] Geocoded "${city}" → ${finalLat}, ${finalLng}`)
            }
        }

        // SECURITY: { _id, userId } filter ensures user can only update their own addresses (IDOR protection)
        const updateAddress = await AddressModel.updateOne(
            { _id, userId },
            {
                address_line,
                city,
                state,
                country,
                mobile,
                pincode,
                recipient_name: recipient_name !== undefined ? recipient_name : "",
                recipient_mobile: recipient_mobile !== undefined ? recipient_mobile : "",
                address_type: address_type || 'HOME',
                landmark: landmark !== undefined ? landmark : "",
                floor_door: floor_door !== undefined ? floor_door : "",
                delivery_instructions: delivery_instructions !== undefined ? delivery_instructions : "",
                lat: finalLat,
                lng: finalLng,
                ...(isExactGps !== undefined ? { isExactGps: exactGpsFlag } : {}),
                ...(gpsAccuracy !== undefined ? { gpsAccuracy: Number(gpsAccuracy) || null } : {}),
            }
        )

        if (mobile && !Number.isNaN(Number(mobile))) {
            await UserModel.findByIdAndUpdate(userId, { mobile: Number(mobile) }).catch(() => {})
        }

        if (updateAddress.matchedCount === 0) {
            return response.status(404).json({
                message: "Address not found or access denied.",
                error:   true,
                success: false,
            })
        }

        return response.json({
            message: "Address Updated",
            error:   false,
            success: true,
            data:    updateAddress,
        })
    } catch (error) {
        console.error('[updateAddressController]', error.message)
        return response.status(500).json({
            message: "Failed to update address.",
            error:   true,
            success: false,
        })
    }
}

export const deleteAddresscontroller = async (request, response) => {
    try {
        const userId = request.userId  // set by auth middleware

        const { _id } = request.body

        // SECURITY FIX: Validate _id is a proper MongoId before DB call
        if (!_id || !/^[a-f\d]{24}$/i.test(_id)) {
            return response.status(400).json({
                message: "Invalid address ID.",
                error:   true,
                success: false,
            })
        }

        // SECURITY: { _id, userId } filter ensures IDOR is impossible
        const disableAddress = await AddressModel.updateOne(
            { _id, userId },
            { status: false }
        )

        if (disableAddress.matchedCount === 0) {
            return response.status(404).json({
                message: "Address not found or access denied.",
                error:   true,
                success: false,
            })
        }

        return response.json({
            message: "Address removed",
            error:   false,
            success: true,
            data:    disableAddress,
        })
    } catch (error) {
        console.error('[deleteAddresscontroller]', error.message)
        return response.status(500).json({
            message: "Failed to remove address.",
            error:   true,
            success: false,
        })
    }
}