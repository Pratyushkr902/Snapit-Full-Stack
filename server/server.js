import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io'; 
import http from 'http'; 
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import helmet from 'helmet';
import connectDB from './config/connectDB.js';
import fs from 'fs';

// --- DATABASE MODEL MAP REFERENCE EXPLICIT ACCESS ---
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- PRE-REGISTER MODELS ---
import './models/user.model.js';
import './models/category.model.js';
import './models/subCategory.model.js'; 
import './models/product.model.js';
import './models/store.model.js';
import './models/order.model.js';

console.log("RAZORPAY CHECK:", process.env.RAZORPAY_KEY_ID ? "LOADED" : "NOT LOADED");

// --- ROUTE IMPORTS ---
import userRouter from './route/user.route.js';
import categoryRouter from './route/category.route.js';
import uploadRouter from './route/upload.router.js';
import subCategoryRouter from './route/subCategory.route.js';
import productRouter from './route/product.route.js';
import cartRouter from './route/cart.route.js';
import addressRouter from './route/address.route.js';
import orderRouter from './route/order.route.js';
import storeRouter from './route/store.route.js'; 
import walletRouter from './route/wallet.route.js';
import flashSaleRouter from './route/flashSale.route.js';
import referralRouter from './route/referral.route.js';
import reviewRouter from './route/review.route.js';

const app = express();
const server = http.createServer(app); 
const latestPositions = new Map(); 

// --- CORS (FIXED: Added Native Mobile Webview Origins) ---
const allowedOrigins = [
    "http://localhost:5173",                     
    "http://localhost",                          
    "capacitor://localhost",                     
    "https://snapit-full-stack.onrender.com",
    "https://snapit-full-stack-2.onrender.com",
    "https://snapit-full-stack-0.onrender.com"
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie", "X-Requested-With", "Accept"]
}));

// --- HELMET (FIXED: Added http://localhost to connectSrc) ---
app.use(helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false, 
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com", "https://*.googleapis.com", "https://unpkg.com"],
            imgSrc: ["'self'", "data:", "https://*.openstreetmap.org", "https://res.cloudinary.com", "https://*.googleapis.com", "https://*.gstatic.com", "https://api.qrserver.com"],
            frameSrc: ["'self'", "https://api.razorpay.com", "https://*.razorpay.com"],
            connectSrc: [
                "'self'", 
                "https://api.razorpay.com", 
                "https://*.razorpay.com", 
                "https://*.googleapis.com", 
                "ws:", "wss:", "http://*", "https://*", 
                "ws://*", "wss://*", 
                "capacitor://*",
                "http://localhost" 
            ] 
        },
    },
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

// --- SOCKET.IO ---
const io = new Server(server, {
    path: '/socket.io/', 
    cors: { 
        origin: allowedOrigins, 
        methods: ["GET", "POST"], 
        credentials: true 
    },
    transports: ['polling', 'websocket'], 
    pingTimeout: 60000,        
    pingInterval: 25000,       
    allowEIO3: true 
});

io.on('connection', (socket) => {
    console.log(`Tracking Connected: ${socket.id}`);
    
    socket.on('join_order', (orderId) => {
        if (orderId) {
            socket.join(orderId);
            console.log(`Socket ${socket.id} joined order room: ${orderId}`);
            if (latestPositions.has(orderId)) {
                socket.emit('receive_location', latestPositions.get(orderId));
            }
        }
    });
    
    socket.on('send_location', (data) => {
        const { orderId, latitude, longitude } = data;
        if (orderId && latitude && longitude) {
            const movementData = { latitude, longitude, timestamp: Date.now() };
            latestPositions.set(orderId, movementData);
            io.to(orderId).emit('receive_location', movementData);
            console.log(`Location updated for order ${orderId}: ${latitude}, ${longitude}`);
        }
    });
    
    socket.on('disconnect', () => {
        console.log(`Client ${socket.id} disconnected`);
    });
});

// --- HEALTH CHECK ---
app.get("/health", (req, res) => {
    res.json({ 
        message: "Snapit Server is Live!",
        timestamp: new Date().toISOString(),
        razorpay_status: process.env.RAZORPAY_KEY_ID ? "Configured" : "Missing Keys"
    });
});

// --- FIRST-TIME USER 15% COUPON VERIFICATION API ---
app.post('/api/coupon/apply', async (req, res) => {
    try {
        const { couponCode, subtotal, userId } = req.body;

        if (!couponCode || !subtotal || !userId) {
            return res.status(400).json({ success: false, message: "Missing required compilation arguments." });
        }

        if (couponCode.toUpperCase() !== 'FIRST15') {
            return res.status(400).json({ success: false, message: "Invalid or expired coupon configuration code." });
        }

        // Fetch dynamic reference pointing to your pre-registered order schema collection
        const OrderModel = mongoose.model('order');

        // Query structural records to evaluate order histories matching this user
        const completedOrdersCount = await OrderModel.countDocuments({
            userId: userId,
            status: { $ne: 'Cancelled' }
        });

        if (completedOrdersCount > 0) {
            return res.status(400).json({ 
                success: false, 
                message: "This introductory 15% discount is only applicable on your first purchase profile!" 
            });
        }

        // Apply mathematical matrix discount deduction (15%)
        const discountAmount = Math.round(Number(subtotal) * 0.15);
        const finalTotal = Number(subtotal) - discountAmount;

        return res.status(200).json({
            success: true,
            message: "Success! Flat 15% First Purchase coupon applied safely.",
            discountAmount,
            finalTotal
        });

    } catch (error) {
        console.error("❌ Coupon Engine Error:", error.message);
        return res.status(500).json({ success: false, message: "Internal server validation failure processing assets." });
    }
});

// --- API ROUTES MAP ATTACHMENT ---
app.use('/api/user', userRouter);
app.use('/api/category', categoryRouter);
app.use('/api/file', uploadRouter);
app.use('/api/subcategory', subCategoryRouter);
app.use('/api/product', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/address', addressRouter);
app.use('/api/order', orderRouter);
app.use('/api/store', storeRouter); 
app.use('/api/wallet', walletRouter);
app.use('/api/flash-sale', flashSaleRouter);
app.use('/api/referral', referralRouter);
app.use('/api/review', reviewRouter);

console.log("✅ Registered API Routes (Including Dynamic First15 Coupon Validator)");

// --- STATIC FILE SERVING ---
const possiblePaths = [
    path.join(process.cwd(), '..', 'client', 'dist'),
    path.join(process.cwd(), 'client', 'dist'),
    path.resolve(__dirname, '..', 'client', 'dist')
];

const clientBuildPath = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];
console.log("🚀 Static Assets Path Resolved to:", clientBuildPath);

app.use(express.static(clientBuildPath));

// --- SPA CATCH-ALL ---
app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
        if (err) {
            console.error("❌ SendFile Error:", err.message);
            res.status(500).json({ 
                error: "Frontend build not found.",
                path: clientBuildPath 
            });
        }
    });
});

// --- RENDER SELF-PING ---
const SELF_URL = process.env.RENDER_EXTERNAL_URL || 'https://snapit-full-stack-2.onrender.com';
setInterval(() => {
    fetch(`${SELF_URL}/health`)
        .then(() => console.log('✓ Self-ping successful'))
        .catch(() => console.log('✗ Self-ping failed'));
}, 14 * 60 * 1000); 

// --- START SERVER ---
const PORT = process.env.PORT || 8080;
connectDB().then(() => {
    console.log("✅ Database Connected Successfully");
    server.listen(PORT, '0.0.0.0', () => { 
        console.log(`🚀 Snapit Server running on port ${PORT}`);
        console.log(`🌍 Server URL: ${SELF_URL}`);
        console.log(`✅ Razorpay Status: ${process.env.RAZORPAY_KEY_ID ? 'LOADED' : 'NOT FOUND — check Render env vars'}`);
        console.log(`🔌 Socket.IO enabled on path: /socket.io/`);
    });
}).catch(err => {
    console.error("❌ Database connection failed", err);
    process.exit(1);
});

export default app;