import mongoose from 'mongoose'

/**
 * MongoDB Connection Configuration
 * Optimized for Render Free Tier with connection pooling
 */

const connectDB = async () => {
    try {
        // Mongoose connection options optimized for free tier
        const options = {
            maxPoolSize: 10,              // Max 10 concurrent connections
            minPoolSize: 2,               // Keep 2 connections alive
            serverSelectionTimeoutMS: 5000, // 5 second timeout for server selection
            socketTimeoutMS: 45000,       // 45 second socket timeout
            family: 4,                    // Use IPv4, skip IPv6
            
            // Retry settings
            retryWrites: true,
            retryReads: true,
            
            // Compression (saves bandwidth)
            compressors: ['zlib'],
        }

        const conn = await mongoose.connect(process.env.MONGODB_URI, options)

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`)
        console.log(`📊 Connection Pool: Max ${options.maxPoolSize} connections`)

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err)
        })

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...')
        })

        mongoose.connection.on('reconnected', () => {
            console.log('✅ MongoDB reconnected')
        })

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close()
            console.log('MongoDB connection closed through app termination')
            process.exit(0)
        })

    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message)
        process.exit(1)
    }
}

export default connectDB