import rateLimit from 'express-rate-limit'
import mongoSanitize from 'mongo-sanitize'

// --- RATE LIMITERS ---

// Auth limiter — login/register
// ✅ FIXED: increased max from 10 → 150 per 15 min window
//    10 was too strict — normal users hit it during testing and repeated
//    failed logins (e.g. wrong password twice) triggered 429s
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 150,
    message: {
        success: false,
        error: true,
        message: "Too many attempts. Please try again after 15 minutes."
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true  // ✅ FIXED: don't count successful logins against the limit
})

// OTP limiter
export const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 10, // ✅ FIXED: raised from 5 → 10 (OTP resend + retry is common)
    message: {
        success: false,
        error: true,
        message: "Too many OTP requests. Please wait 10 minutes."
    }
})

// General API limiter
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 200, // ✅ FIXED: raised from 100 → 200 (app makes many parallel requests on load)
    message: {
        success: false,
        error: true,
        message: "Too many requests. Please slow down."
    }
})

// Upload limiter
export const uploadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: {
        success: false,
        error: true,
        message: "Too many upload requests."
    }
})

// Payment limiter
export const paymentLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: {
        success: false,
        error: true,
        message: "Too many payment requests."
    }
})

// --- INPUT SANITIZER ---
// Manual middleware — express-mongo-sanitize is incompatible with Express 5
// (req.query is read-only in Express 5, causing a TypeError on every request)
export const sanitizeInput = (req, res, next) => {
    if (req.body) req.body = mongoSanitize(req.body)
    if (req.params) req.params = mongoSanitize(req.params)
    next()
}

// --- OWNERSHIP CHECKER ---
export const checkOwnership = (Model, idField = 'id', userField = 'userId') => {
    return async (req, res, next) => {
        try {
            const resourceId = req.params[idField] || req.body[idField]
            if (!resourceId) {
                return res.status(400).json({ success: false, message: "Resource ID required" })
            }
            const resource = await Model.findById(resourceId)
            if (!resource) {
                return res.status(404).json({ success: false, message: "Resource not found" })
            }
            const ownerId = resource[userField]?.toString()
            const requesterId = req.userId?.toString()
            if (ownerId !== requesterId) {
                console.warn(`⚠️ IDOR attempt: user ${requesterId} tried to access resource of ${ownerId}`)
                return res.status(403).json({ success: false, message: "Access denied" })
            }
            req.resource = resource
            next()
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message })
        }
    }
}

// --- AUTH LOGGER ---
export const authLogger = (req, res, next) => {
    const originalJson = res.json.bind(res)
    res.json = (body) => {
        if (req.path.includes('/login') || req.path.includes('/register')) {
            const status = body?.success ? 'SUCCESS' : 'FAILED'
            console.log(`🔐 AUTH ${status} | IP: ${req.ip} | Path: ${req.path} | Time: ${new Date().toISOString()}`)
        }
        return originalJson(body)
    }
    next()
}

// --- SECURITY HEADERS ---
export const securityHeaders = (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('X-XSS-Protection', '1; mode=block')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.setHeader('Permissions-Policy', 'geolocation=(self), camera=()')
    next()
}