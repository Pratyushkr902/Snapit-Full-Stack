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
            landmark, floor_door, delivery_instructions
        } = request.body

        const HIMALAYA_LAT = 25.2639198
        const HIMALAYA_LNG = 84.8545598
        const CHIKASI_LAT = 25.28091606583264
        const CHIKASI_LNG = 84.87069734970407

        const combinedText = `${address_line || ''} ${city || ''} ${landmark || ''}`
        let finalLat = null
        let finalLng = null

        if (/himalaya|hmch|bams|mbbs/i.test(combinedText)) {
            finalLat = HIMALAYA_LAT
            finalLng = HIMALAYA_LNG
        } else if (/chiksi|chikasi/i.test(combinedText)) {
            finalLat = CHIKASI_LAT
            finalLng = CHIKASI_LNG
        } else if (lat != null && !Number.isNaN(Number(lat)) && lng != null && !Number.isNaN(Number(lng))) {
            finalLat = Number(lat)
            finalLng = Number(lng)
        }

        if (finalLat == null || finalLng == null) {
            const geocoded = await geocodeCityFallback(city || address_line)
            if (geocoded) {
                finalLat = geocoded.lat
                finalLng = geocoded.lng
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
            userId,
        })

        const saveAddress = await createAddress.save()

        await UserModel.findByIdAndUpdate(userId, {
            $push: { address_details: saveAddress._id },
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
            landmark, floor_door, delivery_instructions
        } = request.body

        const HIMALAYA_LAT = 25.2639198
        const HIMALAYA_LNG = 84.8545598
        const CHIKASI_LAT = 25.28091606583264
        const CHIKASI_LNG = 84.87069734970407

        const combinedText = `${address_line || ''} ${city || ''} ${landmark || ''}`
        let finalLat = null
        let finalLng = null

        if (/himalaya|hmch|bams|mbbs/i.test(combinedText)) {
            finalLat = HIMALAYA_LAT
            finalLng = HIMALAYA_LNG
        } else if (/chiksi|chikasi/i.test(combinedText)) {
            finalLat = CHIKASI_LAT
            finalLng = CHIKASI_LNG
        } else if (lat != null && !Number.isNaN(Number(lat)) && lng != null && !Number.isNaN(Number(lng))) {
            finalLat = Number(lat)
            finalLng = Number(lng)
        }

        if (!finalLat || !finalLng) {
            const geocoded = await geocodeCityFallback(city || address_line)
            if (geocoded) {
                finalLat = geocoded.lat
                finalLng = geocoded.lng
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
            }
        )

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