import dotenv from 'dotenv';
dotenv.config();

import { initSubscriptionCron } from './config/cronEngine.js'; 
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
import adminRouter from './route/admin.route.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- PRE-REGISTER MODELS ---
import './models/user.model.js';
import './models/category.model.js';
import './models/subCategory.model.js'; 
import './models/product.model.js';
import './models/store.model.js';
import './models/order.model.js';
import './models/wallet.model.js';
import './models/subscription.model.js';

console.log("RAZORPAY INTEGRITY CHECK:", process.env.RAZORPAY_KEY_ID ? "LOADED" : "NOT LOADED");

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
import paymentRouter from './route/payment.route.js';

const app = express();

// ✅ FIX 1: Enable global reverse proxy awareness to satisfy express-rate-limit validation checks
app.set('trust proxy', 1); 

const server = http.createServer(app); 
const latestPositions = new Map(); 

// --- CORS RULES (STABILIZED FOR NATIVE CAPACITOR & WEBVIEW COOKIE EXCHANGE) ---
const allowedOrigins = [
    "http://localhost:5173",
    "https://localhost:5173",                     
    "https://localhost",                          
    "http://localhost",                           
    "capacitor://localhost",                      
    "android://localhost",                        
    "https://snapit.grocery",                     
    "null",                                       
    "https://snapit-full-stack-2.onrender.com",
    "https://snapit-full-stack-0.onrender.com",
    "https://snapit-ashy.vercel.app",
    "https://snapit-frontend.netlify.app",
    "https://snapit-backend-production.up.railway.app",
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) {
            return callback(null, true);
        }
        
        const lowerOrigin = origin.toLowerCase().trim();
        if (allowedOrigins.includes(lowerOrigin) || lowerOrigin.startsWith('http://localhost') || lowerOrigin.startsWith('capacitor://') || lowerOrigin.startsWith('android://')) {
            callback(null, true);
        } else {
            console.warn(`[CORS Blocked] Unauthorized request attempt from: ${origin}`);
            callback(new Error('Cross-Origin Request rejected by Snapit Engine policies.'));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie", "X-Requested-With", "Accept"]
}));

// --- HELMET CONFIGURATIONS ---
app.use(helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false, 
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            defaultSrc: ["'self'"],
            
            scriptSrc: [
                "'self'", 
                "'unsafe-inline'", 
                "'unsafe-eval'",
                "https://checkout.razorpay.com", 
                "https://*.razorpay.com", 
                "https://cdn.razorpay.com",
                "https://*.googleapis.com", 
                "https://unpkg.com"
            ],
            
            imgSrc: [
                "'self'", 
                "data:", 
                "blob:",
                "https://*.openstreetmap.org", 
                "https://res.cloudinary.com", 
                "https://*.cloudinary.com",    
                "http://res.cloudinary.com",   
                "https://*.googleapis.com", 
                "https://*.gstatic.com", 
                "https://api.qrserver.com"
            ],
            
            frameSrc: [
                "'self'", 
                "https://api.razorpay.com", 
                "https://*.razorpay.com",
                "https://checkout.razorpay.com"
            ],
            
            connectSrc: [
                "'self'",
                "https://api.razorpay.com",
                "https://*.razorpay.com",
                "https://cdn.razorpay.com",
                "https://lumberjack.razorpay.com",
                "https://lumberjack-dx.razorpay.com",
                "https://firebaseremoteconfig.googleapis.com",
                "https://firebaseinstallations.googleapis.com",
                "https://*.firebaseio.com",
                "https://*.googleapis.com",
                "https://snapit-full-stack-2.onrender.com",
                "wss://snapit-full-stack-2.onrender.com",
                "https://snapit-full-stack-0.onrender.com",
    "https://snapit-ashy.vercel.app",
    "https://snapit-frontend.netlify.app",
    "https://snapit-backend-production.up.railway.app",
                "wss://snapit-full-stack-0.onrender.com",
                "http://localhost:5173",
                "https://localhost:5173",
                "ws://localhost:5173",
                "wss://localhost:5173",
                "http://localhost:8080",
                "ws://localhost:8080",
                "capacitor://localhost",
                "android://localhost",
                "https://snapit.grocery",
                "wss://snapit.grocery",
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

// --- SOCKET.IO HANDLING LAYER ---
const io = new Server(server, {
    path: '/socket.io/', 
    cors: { 
        origin: allowedOrigins, 
        methods: ["GET", "POST"], 
        credentials: true 
    },
    // ✅ Restrict transports strictly to websocket to enforce clean persistent handshakes on Render
    transports: ['websocket'], 
    pingTimeout: 60000,        
    pingInterval: 25000,       
    allowEIO3: true 
});

io.on('connection', (socket) => {
    console.log(`Tracking Connected: ${socket.id}`);
    
    socket.on('join_order', (orderId) => {
        if (orderId) {
            socket.join(orderId);
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
        }
    });
    
    socket.on('disconnect', () => {
        console.log(`Client ${socket.id} disconnected`);
    });
});

// --- API ROUTES MOUNTING ---
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
app.use('/api/payment', paymentRouter);
app.use('/api/admin', adminRouter);

// --- HEALTH ROUTE ---
app.get("/health", (req, res) => {
    res.json({ 
        message: "Snapit Server is Live!",
        timestamp: new Date().toISOString(),
        razorpay_status: process.env.RAZORPAY_KEY_ID ? "Configured" : "Missing Keys"
    });
});

app.get('/{*splat}', (req, res) => {
    res.status(404).json({ message: "Route not found.", success: false });
});

// --- KEEP ALIVE ---
const SELF_URL = process.env.RENDER_EXTERNAL_URL || 'https://snapit-full-stack-2.onrender.com';
setInterval(() => {
    fetch(`${SELF_URL}/health`).catch(() => {});
}, 14 * 60 * 1000); 

// --- ENGINE BOOT ---
const PORT = process.env.PORT || 8080;
connectDB().then(() => {
    console.log("✅ Database System Connected Successfully");
    initSubscriptionCron();
    server.listen(PORT, '0.0.0.0', () => { 
        console.log(`🚀 Snapit Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error("❌ Database connection failed", err);
    process.exit(1);
});

export default app;
