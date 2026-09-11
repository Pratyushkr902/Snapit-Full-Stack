import { body, validationResult } from 'express-validator'

export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: true,
            message: errors.array()[0].msg
        })
    }
    next()
}

export const validateRegister = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email or 10-digit mobile number is required')
        .custom(value => {
            const clean = String(value || '').trim()
            const digits = clean.replace(/\D/g, '')
            const isPhone = digits.length === 10 || (digits.length === 12 && digits.startsWith('91'))
            const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)
            if (!isPhone && !isEmail) {
                throw new Error('Please enter a valid 10-digit mobile number or email address')
            }
            return true
        }),
    body('password')
        .notEmpty().withMessage('Password or 4-digit PIN is required')
        .isLength({ min: 4 }).withMessage('Password or PIN must be at least 4 characters'),
    handleValidationErrors
]

export const validateLogin = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email or 10-digit mobile number is required')
        .custom(value => {
            const clean = String(value || '').trim()
            const digits = clean.replace(/\D/g, '')
            const isPhone = digits.length === 10 || (digits.length === 12 && digits.startsWith('91'))
            const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)
            if (!isPhone && !isEmail) {
                throw new Error('Please enter a valid 10-digit mobile number or email address')
            }
            return true
        }),
    body('password')
        .notEmpty().withMessage('Password or PIN is required')
        .isLength({ min: 1, max: 200 }).withMessage('Invalid password or PIN'),
    handleValidationErrors
]

export const validateForgotPassword = [
    body('email')
        .trim()
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),
    handleValidationErrors
]

export const validateResetPassword = [
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    handleValidationErrors
]

export const validateAddress = [
    body('address_line').trim().notEmpty().withMessage('Address line is required').isLength({ max: 200 }),
    body('city').trim().notEmpty().withMessage('City is required').isLength({ max: 100 }),
    body('pincode').trim().notEmpty().withMessage('Pincode is required').matches(/^\d{6}$/).withMessage('Invalid pincode'),
    body('mobile').trim().notEmpty().withMessage('Mobile is required').matches(/^\d{10}$/).withMessage('Invalid mobile number'),
    handleValidationErrors
]

export const validateObjectId = (field) => [
    body(field)
        .notEmpty().withMessage(`${field} is required`)
        .matches(/^[a-fA-F0-9]{24}$/).withMessage(`Invalid ${field}`),
    handleValidationErrors
]
