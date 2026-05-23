import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import compression from 'compression'
import connectDB from './config/connectDB.js'
import productRouter from './routes/product.route.js'

dotenv.config()

const app = express()

// ============================================
// MIDDLEWARE - Optimized for Render Free Tier
// ============================================

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}))

// Compression middleware - Reduces response size by ~70%
app.use(compression({
    level: 6, // Balance between speed and compression
    threshold: 1024, // Only compress responses larger than 1KB
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false
        }
        return compression.filter(req, res)
    }
}))

// Body parsers with size limits to prevent memory issues
app.use(express.json({ 
    limit: '10mb' // Limit JSON payload size
}))
app.use(express.urlencoded({ 
    extended: true,
    limit: '10mb'
}))

app.use(cookieParser())

// Request logging (only in development)
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.path}`)
        next()
    })
}

// ============================================
// ROUTES
// ============================================

app.get('/', (req, res) => {
    res.json({
        message: "SnapIt API is running",
        status: "healthy",
        environment: process.env.NODE_ENV || 'production'
    })
})

// API routes
app.use('/api/product', productRouter)

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        message: "Route not found",
        error: true,
        success: false
    })
})

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err)
    
    res.status(err.status || 500).json({
        message: err.message || "Internal server error",
        error: true,
        success: false,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    })
})

// ============================================
// SERVER STARTUP
// ============================================

const PORT = process.env.PORT || 8080

// Connect to MongoDB first, then start server
connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`)
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`)
            console.log(`💾 Memory Limit: 400MB (--max-old-space-size=400)`)
            console.log(`📦 Compression: Enabled`)
        })
    })
    .catch((error) => {
        console.error('Failed to start server:', error)
        process.exit(1)
    })

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully')
    process.exit(0)
})

export default app