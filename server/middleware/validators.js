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
        .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters')
        .matches(/^[a-zA-Z\s]+$/).withMessage('Name can only contain letters'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase and number'),
    handleValidationErrors
]

export const validateLogin = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 1, max: 200 }).withMessage('Invalid password'),
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
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase and number'),
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
