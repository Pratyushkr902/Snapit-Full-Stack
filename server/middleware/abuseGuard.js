import FrozenIpModel from '../models/frozenIp.model.js'

const WINDOW_MS = 60 * 1000
const AUTH_LIMIT = 15      // login/otp hits per minute per IP
const GENERAL_LIMIT = 60  // general API hits per minute per IP
const FREEZE_MINUTES = 30

const hitLog = new Map()
const frozenCache = new Map()

function getClientIp(request) {
    const cfIp = request.headers['cf-connecting-ip']
    if (cfIp) return cfIp.trim()
    const forwarded = request.headers['x-forwarded-for']
    if (forwarded) return forwarded.split(',')[0].trim()
    return request.socket?.remoteAddress || request.ip
}

async function isFrozen(ip) {
    const cached = frozenCache.get(ip)
    if (cached && cached > Date.now()) return true
    if (cached) frozenCache.delete(ip)

    const doc = await FrozenIpModel.findOne({ ip })
    if (doc && doc.expiresAt > new Date()) {
        frozenCache.set(ip, doc.expiresAt.getTime())
        return true
    }
    return false
}

async function freezeIp(ip, reason) {
    const expiresAt = new Date(Date.now() + FREEZE_MINUTES * 60 * 1000)
    await FrozenIpModel.findOneAndUpdate(
        { ip },
        { ip, reason, expiresAt, $inc: { hitCount: 1 } },
        { upsert: true, new: true }
    )
    frozenCache.set(ip, expiresAt.getTime())
}

function recordHit(ip, bucket) {
    const now = Date.now()
    const entry = hitLog.get(ip) || { authHits: [], generalHits: [] }
    entry[bucket] = entry[bucket].filter(ts => now - ts < WINDOW_MS)
    entry[bucket].push(now)
    hitLog.set(ip, entry)
    return entry[bucket].length
}

// type: 'auth' for login/otp routes, 'general' for everything else
export const abuseGuard = (type = 'general') => async (request, response, next) => {
    try {
        const ip = getClientIp(request)

        if (await isFrozen(ip)) {
            return response.status(429).json({
                message: "Too many requests from this IP. Try again later.",
                error: true,
                success: false
            })
        }

        const bucket = type === 'auth' ? 'authHits' : 'generalHits'
        const limit = type === 'auth' ? AUTH_LIMIT : GENERAL_LIMIT
        const count = recordHit(ip, bucket)

        if (count > limit) {
            await freezeIp(ip, `Exceeded ${type} rate limit (${count} hits/min)`)
            return response.status(429).json({
                message: "Abnormal activity detected. This IP has been temporarily frozen.",
                error: true,
                success: false
            })
        }

        next()
    } catch (error) {
        // fail-open: never let guard errors block legit traffic
        next()
    }
}

// ── Order velocity check ──────────────────────────────────────
// Not a block — just flags whether this user should be queued instead
// of auto-confirmed. Fail-open: any error means "not abnormal".
const orderLog = new Map()
const ORDER_WINDOW_MS = 5 * 60 * 1000   // 5 min window
const ORDER_LIMIT = 3                   // more than 3 orders/5min = queue it

export function shouldQueueOrder(userId) {
    try {
        const now = Date.now()
        const key = String(userId)
        const hits = (orderLog.get(key) || []).filter(ts => now - ts < ORDER_WINDOW_MS)
        hits.push(now)
        orderLog.set(key, hits)
        return hits.length > ORDER_LIMIT
    } catch (error) {
        return false
    }
}

export const listFrozenIps = () => FrozenIpModel.find().sort({ frozenAt: -1 })

export const unfreezeIpByAddress = async (ip) => {
    frozenCache.delete(ip)
    return FrozenIpModel.deleteOne({ ip })
}
