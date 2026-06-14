import dotenv from 'dotenv'
dotenv.config()

import { initSubscriptionCron } from './config/cronEngine.js'
import path from 'path'
import { fileURLToPath } from 'url'
import { Server } from 'socket.io'
import http from 'http'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import connectDB from './config/connectDB.js'
import cron from 'node-cron'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

// ─── PRE-REGISTER MODELS ──────────────────────────────────────────────────────
import './models/user.model.js'
import './models/category.model.js'
import './models/subCategory.model.js'
import ProductModel from './models/product.model.js'
import './models/store.model.js'
import './models/order.model.js'
import './models/wallet.model.js'
import './models/subscription.model.js'
import './models/notification.model.js'
import './models/Restaurant.model.js'
import './models/MenuItem.model.js'

import { startAutoConfirmCron } from './utils/autoConfirmOrders.js'

console.log("RAZORPAY INTEGRITY CHECK:", process.env.RAZORPAY_KEY_ID ? "LOADED" : "NOT LOADED")

// ─── ROUTE IMPORTS ────────────────────────────────────────────────────────────
import userRouter         from './route/user.route.js'
import categoryRouter     from './route/category.route.js'
import uploadRouter       from './route/upload.router.js'
import subCategoryRouter  from './route/subCategory.route.js'
import productRouter      from './route/product.route.js'
import cartRouter         from './route/cart.route.js'
import addressRouter      from './route/address.route.js'
import orderRouter        from './route/order.route.js'
import storeRouter        from './route/store.route.js'
import walletRouter       from './route/wallet.route.js'
import flashSaleRouter    from './route/flashSale.route.js'
import referralRouter     from './route/referral.route.js'
import reviewRouter       from './route/review.route.js'
import paymentRouter      from './route/payment.route.js'
import adminRouter        from './route/admin.route.js'
import streakRouter       from './route/streak.route.js'
import subscriptionRouter from './route/subscription.route.js'
import notificationRouter from './route/notification.route.js'
import restaurantRouter   from './route/restaurant.route.js'

import './utils/subscriptionCron.js'
import OrderModel from './models/order.model.js'
import UserModel  from './models/user.model.js'

const app = express()
app.set('trust proxy', 1)

const server = http.createServer(app)

// In-memory cache: latest GPS fix per orderId
const latestPositions = new Map()

// ─── CORS RULES ───────────────────────────────────────────────────────────────
// SECURITY FIX: Removed "null" from allowed origins.
//   "null" as Origin is sent by sandboxed iframes and file:// pages.
//   Allowing it lets a malicious page in a sandboxed <iframe> make credentialed
//   API requests — bypassing same-origin protections entirely.
const allowedOrigins = [
    "http://localhost:5173",
    "https://localhost:5173",
    "https://localhost",
    "http://localhost",
    "capacitor://localhost",
    "android://localhost",
    "https://snapit.grocery",
    // Production deployments
    "https://snapit-backend-bn8r.onrender.com",
    "https://snapit-client.vercel.app",
    "https://snapit.pages.dev",
    "https://snapit-ashy.vercel.app",
    "https://snapit-full-stack.vercel.app",
    "https://snapit-full-stack-pratyushkr902s-projects.vercel.app",
    "https://snapit-backend-production.up.railway.app",
]

app.use(cors({
    origin: (origin, callback) => {
        // Allow server-to-server requests (no origin header)
        if (!origin) return callback(null, true)
        const lowerOrigin = origin.toLowerCase().trim()
        if (
            allowedOrigins.includes(lowerOrigin) ||
            /\.vercel\.app$/.test(lowerOrigin) ||
            lowerOrigin.startsWith('http://localhost') ||
            lowerOrigin.startsWith('capacitor://') ||
            lowerOrigin.startsWith('android://')
        ) {
            callback(null, true)
        } else {
            console.warn(`[CORS Blocked] Unauthorized request from: ${origin}`)
            callback(new Error('Cross-Origin Request rejected by Snapit Engine policies.'))
        }
    },
    credentials: true,
    methods:        ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie", "X-Requested-With", "Accept"],
}))

// ─── HELMET / CSP ─────────────────────────────────────────────────────────────
// SECURITY FIX: Removed 'unsafe-inline' and 'unsafe-eval' from scriptSrc.
//   'unsafe-inline' nullifies XSS protection (allows injected <script> tags).
//   'unsafe-eval'   allows eval() which can execute attacker-controlled strings.
//   Razorpay and Firebase scripts are allowed via specific src values.
//
//   If your React build still requires inline scripts, add a nonce via your
//   build tool (vite-plugin-csp) rather than re-enabling unsafe-inline.
app.use(helmet({
    crossOriginResourcePolicy:  false,
    crossOriginEmbedderPolicy:  false,
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                // Specific allowed script sources — no unsafe-inline, no unsafe-eval
                "https://checkout.razorpay.com",
                "https://*.razorpay.com",
                "https://cdn.razorpay.com",
                "https://*.googleapis.com",
                "https://unpkg.com",
                "https://*.gstatic.com",
                "https://www.gstatic.com",
                "https://*.firebaseapp.com",
            ],
            workerSrc: ["'self'", "blob:", "https://*.gstatic.com", "https://www.gstatic.com"],
            imgSrc: [
                "'self'", "data:", "blob:",
                "https://*.openstreetmap.org",
                "https://res.cloudinary.com",
                "https://*.cloudinary.com",
                "https://*.googleapis.com",
                "https://*.gstatic.com",
                "https://api.qrserver.com",
                "https://cdn-icons-png.flaticon.com",
                "https://images.unsplash.com",
            ],
            frameSrc: [
                "'self'",
                "https://api.razorpay.com",
                "https://*.razorpay.com",
                "https://checkout.razorpay.com",
            ],
            connectSrc: [
                "'self'",
                "https://api.razorpay.com", "https://*.razorpay.com",
                "https://cdn.razorpay.com", "https://lumberjack.razorpay.com",
                "https://lumberjack-dx.razorpay.com",
                "https://firebaseremoteconfig.googleapis.com",
                "https://firebaseinstallations.googleapis.com",
                "https://*.firebaseio.com", "https://*.googleapis.com",
                "https://snapit-backend-bn8r.onrender.com",
                "wss://snapit-backend-bn8r.onrender.com",
                "https://snapit-client.vercel.app",
                "https://snapit-ashy.vercel.app",
                "https://snapit-full-stack.vercel.app",
                "https://snapit-backend-production.up.railway.app",
                "http://localhost:5173", "https://localhost:5173",
                "ws://localhost:5173",   "wss://localhost:5173",
                "http://localhost:8080", "ws://localhost:8080",
                "capacitor://localhost", "android://localhost",
                "https://snapit.grocery", "wss://snapit.grocery",
            ],
        },
    },
}))

// ─── RATE LIMITING ────────────────────────────────────────────────────────────
// SECURITY FIX: express-rate-limit was installed but never applied.
// Strict limits on auth endpoints prevent brute-force, OTP enumeration, and
// credential stuffing.  Financial endpoints get a moderate limit.

// Auth endpoints: 5 attempts per 15 minutes per IP
const authLimiter = rateLimit({
    windowMs:         15 * 60 * 1000,
    max:              5,
    standardHeaders:  true,
    legacyHeaders:    false,
    message: { message: 'Too many attempts. Please try again in 15 minutes.', error: true, success: false },
})

// Account creation: 3 registrations per hour per IP (prevents bot signups)
const registerLimiter = rateLimit({
    windowMs:         60 * 60 * 1000,
    max:              3,
    standardHeaders:  true,
    legacyHeaders:    false,
    message: { message: 'Too many accounts created from this IP. Please try again later.', error: true, success: false },
})

// General API: 120 req/min per IP
const apiLimiter = rateLimit({
    windowMs:        60 * 1000,
    max:             120,
    standardHeaders: true,
    legacyHeaders:   false,
    message: { message: 'Too many requests. Please slow down.', error: true, success: false },
})

// Financial/wallet: 30 req/min per IP
const financialLimiter = rateLimit({
    windowMs:        60 * 1000,
    max:             30,
    standardHeaders: true,
    legacyHeaders:   false,
    message: { message: 'Too many financial requests. Please slow down.', error: true, success: false },
})

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(morgan('dev'))

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    next()
})

// ─── SOCKET.IO — RIDER TRACKING ──────────────────────────────────────────────
const io = new Server(server, {
    path:         '/socket.io/',
    cors:         { origin: allowedOrigins, methods: ["GET", "POST"], credentials: true },
    transports:   ['polling', 'websocket'],
    pingTimeout:  60000,
    pingInterval: 25000,
    allowEIO3:    true,
})

io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`)

    // SECURITY FIX: Validate order ownership before joining the tracking room.
    // Previously ANY connected socket could join ANY orderId's room and receive
    // real-time GPS coordinates for orders that don't belong to them.
    // Now we verify the userId (passed from the client on socket connect via
    // handshake.auth) actually owns the order before admitting them.
    //
    // Client-side usage:
    //   const socket = io(API_URL, { auth: { userId: user._id } })
    socket.on('join_order', async (orderId) => {
        if (!orderId) return

        try {
            const order = await OrderModel
                .findOne({ orderId })
                .select('userId riderId')
                .lean()

            if (!order) return

            const requestingUserId = socket.handshake.auth?.userId
            if (!requestingUserId) {
                console.warn(`[Socket] join_order rejected — no userId in handshake | orderId=${orderId}`)
                return
            }

            const isOwner = order.userId?.toString()   === requestingUserId
            const isRider = order.riderId?.toString()  === requestingUserId

            // Also allow admins: look up the socket user's role
            let isAdmin = false
            if (!isOwner && !isRider) {
                const user = await UserModel
                    .findById(requestingUserId)
                    .select('role')
                    .lean()
                isAdmin = user?.role === 'ADMIN'
            }

            if (!isOwner && !isRider && !isAdmin) {
                console.warn(`[Socket] join_order IDOR attempt | user=${requestingUserId} | orderId=${orderId} | socketId=${socket.id}`)
                socket.emit('error', { message: 'Access denied.' })
                return
            }

            socket.join(orderId)
            console.log(`[Socket] ${socket.id} joined room: ${orderId}`)

            // Send last known position immediately so the map seeds without waiting
            if (latestPositions.has(orderId)) {
                socket.emit('rider_moved', latestPositions.get(orderId))
            }
        } catch (err) {
            console.error('[Socket] join_order error:', err.message)
        }
    })

    socket.on('send_location', (data) => {
        const { orderId, latitude, longitude } = data
        if (!orderId || !latitude || !longitude) return

        const payload = { latitude, longitude, timestamp: Date.now() }
        latestPositions.set(orderId, payload)
        io.to(orderId).emit('rider_moved', payload)

        OrderModel.findOneAndUpdate(
            { orderId },
            {
                $set: {
                    'riderLocation.latitude':  latitude,
                    'riderLocation.longitude': longitude,
                    'riderLocation.updatedAt': new Date(),
                },
            },
            { new: false }
        ).catch(err => console.error('[Socket] DB persist failed:', err.message))

        console.log(`[Socket] rider_moved → room:${orderId} | lat:${Number(latitude).toFixed(5)} lon:${Number(longitude).toFixed(5)}`)
    })

    socket.on('leave_order', (orderId) => {
        if (!orderId) return
        socket.leave(orderId)
        console.log(`[Socket] ${socket.id} left room: ${orderId}`)
    })

    socket.on('disconnect', () => {
        console.log(`[Socket] Disconnected: ${socket.id}`)
    })
})

// ─── RATE LIMITERS APPLIED ────────────────────────────────────────────────────
app.use('/api/user/login',                     authLimiter)
app.use('/api/user/register',                  registerLimiter)
app.use('/api/user/forgot-password',           authLimiter)
app.use('/api/user/verify-forgot-password-otp', authLimiter)
app.use('/api/user/reset-password',            authLimiter)
app.use('/api/wallet',                         financialLimiter)
app.use('/api/order',                          financialLimiter)
app.use('/api/coins',                          financialLimiter)

// General API limiter on everything else
app.use('/api', apiLimiter)

// ─── API ROUTES ───────────────────────────────────────────────────────────────
app.use('/api/user',         userRouter)
app.use('/api/category',     categoryRouter)
app.use('/api/file',         uploadRouter)
app.use('/api/subcategory',  subCategoryRouter)
app.use('/api/product',      productRouter)
app.use('/api/cart',         cartRouter)
app.use('/api/address',      addressRouter)
app.use('/api/order',        orderRouter)
app.use('/api/store',        storeRouter)
app.use('/api/wallet',       walletRouter)
app.use('/api/flash-sale',   flashSaleRouter)
app.use('/api/referral',     referralRouter)
app.use('/api/review',       reviewRouter)
app.use('/api/streak',       streakRouter)
app.use('/api/subscription', subscriptionRouter)
app.use('/api/payment',      paymentRouter)
app.use('/api/admin',        adminRouter)
app.use('/api/notification', notificationRouter)
app.use('/api/restaurant',   restaurantRouter)

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
    res.json({
        message:               "Snapit Server is Live!",
        timestamp:             new Date().toISOString(),
        razorpay_status:       process.env.RAZORPAY_KEY_ID ? "Configured" : "Missing Keys",
        active_tracking_rooms: latestPositions.size,
    })
})

app.get('/{*splat}', (req, res) => {
    res.status(404).json({ message: "Route not found.", success: false })
})

// ─── KEEP-ALIVE ───────────────────────────────────────────────────────────────
// SECURITY FIX: Use env var only — no hardcoded fallback URL committed to source.
// Set RENDER_EXTERNAL_URL in your Render dashboard environment variables.
const SELF_URL = process.env.RENDER_EXTERNAL_URL
if (SELF_URL) {
    setInterval(() => {
        fetch(`${SELF_URL}/health`).catch(() => {})
    }, 14 * 60 * 1000)
} else {
    console.warn('[Keep-alive] RENDER_EXTERNAL_URL not set — self-ping disabled.')
}

// ─── DAILY MRP RECALCULATION CRON ────────────────────────────────────────────
cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Running daily MRP recalculation...')
    try {
        const products = await ProductModel.find({ sellerPrice: { $ne: null } })
        let updated = 0
        for (const p of products) {
            const newPrice = Number(p.sellerPrice) + Number(p.snapitMargin || 0)
            if (p.price !== newPrice || p.sellingPrice !== newPrice) {
                p.price        = newPrice
                p.sellingPrice = newPrice
                await p.save()
                updated++
            }
        }
        console.log(`[CRON] MRP recalculated for ${updated} products`)
    } catch (err) {
        console.error('[CRON] MRP recalculation failed:', err.message)
    }
}, { timezone: "Asia/Kolkata" })

// ─── ENGINE BOOT ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080
connectDB().then(() => {
    console.log("✅ Database Connected")
    initSubscriptionCron()
    startAutoConfirmCron()
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Snapit running on port ${PORT}`)
        console.log(`⏰ MRP cron: daily midnight IST`)
        console.log(`⏰ Auto-confirm cron: every 2 min`)
    })
}).catch(err => {
    console.error("❌ Database connection failed", err)
    process.exit(1)
})

export default app