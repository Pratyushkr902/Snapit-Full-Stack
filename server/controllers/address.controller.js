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
        .isLength({ min: 5, max: 200 }).withMessage('Address must be 5–200 characters.'),

    body('city')
        .trim()
        .notEmpty().withMessage('City is required.')
        .isLength({ max: 100 }).withMessage('City name too long.')
        .matches(/^[a-zA-Z\s\-'.]+$/).withMessage('City contains invalid characters.'),

    body('state')
        .trim()
        .notEmpty().withMessage('State is required.')
        .isLength({ max: 100 }).withMessage('State name too long.')
        .matches(/^[a-zA-Z\s\-'.]+$/).withMessage('State contains invalid characters.'),

    body('country')
        .trim()
        .notEmpty().withMessage('Country is required.')
        .isLength({ max: 100 }).withMessage('Country name too long.')
        .matches(/^[a-zA-Z\s\-'.]+$/).withMessage('Country contains invalid characters.'),

    body('pincode')
        .trim()
        .notEmpty().withMessage('Pincode is required.')
        .matches(/^\d{6}$/).withMessage('Pincode must be exactly 6 digits.'),

    body('mobile')
        .trim()
        .notEmpty().withMessage('Mobile number is required.')
        .matches(/^[6-9]\d{9}$/).withMessage('Mobile must be a valid 10-digit Indian number.'),

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
            country, mobile, lat, lng
        } = request.body

        // Use GPS coords if provided, otherwise geocode from city name
        let finalLat = lat != null ? Number(lat) : null
        let finalLng = lng != null ? Number(lng) : null

        if (!finalLat || !finalLng) {
            const geocoded = await geocodeCityFallback(city)
            if (geocoded) {
                finalLat = geocoded.lat
                finalLng = geocoded.lng
                console.log(`[addAddress] Geocoded "${city}" → ${finalLat}, ${finalLng}`)
            }
        }

        const zoneCheck = isInDeliveryZone(finalLat, finalLng)
        if (!zoneCheck.serviceable) {
            return response.status(400).json({
                message: "Sorry, we don't deliver to this location yet.",
                error:   true,
                success: false,
            })
        }

        const zoneCheck = isInDeliveryZone(finalLat, finalLng)
        if (!zoneCheck.serviceable) {
            return response.status(400).json({
                message: "Sorry, we don't deliver to this location yet.",
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
            country, pincode, mobile, lat, lng
        } = request.body

        // Use GPS coords if provided, otherwise geocode from city name
        let finalLat = lat != null ? Number(lat) : null
        let finalLng = lng != null ? Number(lng) : null

        if (!finalLat || !finalLng) {
            const geocoded = await geocodeCityFallback(city)
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