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

const app = express();
const server = http.createServer(app); 
const latestPositions = new Map(); 

// --- CORS ---
const allowedOrigins = [
    "http://localhost:5173",
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
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
}));

// --- HELMET ---
app.use(helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false, 
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com", "https://*.googleapis.com", "https://unpkg.com"],
            imgSrc: ["'self'", "data:", "https://*.openstreetmap.org", "https://res.cloudinary.com", "https://*.googleapis.com", "https://*.gstatic.com"],
            frameSrc: ["'self'", "https://api.razorpay.com", "https://*.razorpay.com"],
            connectSrc: ["'self'", "https://api.razorpay.com", "https://*.googleapis.com", "ws:", "wss:", "http://*", "https://*", "ws://*", "wss://*", "capacitor://*"] 
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
    cors: { origin: true, methods: ["GET", "POST"], credentials: true },
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
            if (latestPositions.has(orderId)) {
                socket.emit('receive_location', latestPositions.get(orderId));
            }
        }
    });
    socket.on('send_location', (data) => {
        const { orderId, latitude, longitude } = data;
        if (orderId && latitude && longitude) {
            const movementData = { latitude, longitude };
            latestPositions.set(orderId, movementData);
            io.to(orderId).emit('receive_location', movementData);
        }
    });
    socket.on('disconnect', () => console.log(`Client ${socket.id} disconnected`));
});

// --- API ROUTES ---
app.use('/api/user', userRouter);
app.use("/api/category", categoryRouter);
app.use("/api/file", uploadRouter);
app.use("/api/subcategory", subCategoryRouter);
app.use("/api/product", productRouter);
app.use("/api/cart", cartRouter);
app.use("/api/address", addressRouter);
app.use('/api/order', orderRouter);
app.use('/api/store', storeRouter); 
app.use('/api/wallet', walletRouter);
app.use('/api/flash-sale', flashSaleRouter);
app.use('/api/referral', referralRouter);

// --- STATIC FILE SERVING ---
const possiblePaths = [
    path.join(process.cwd(), '..', 'client', 'dist'),
    path.join(process.cwd(), 'client', 'dist'),
    path.resolve(__dirname, '..', 'client', 'dist')
];

const clientBuildPath = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];
console.log("🚀 Static Assets Path Resolved to:", clientBuildPath);

app.use(express.static(clientBuildPath));

// --- HEALTH CHECK ---
app.get("/health", (req, res) => {
    res.json({ 
        message: "Snapit Server is Live!",
        razorpay_status: process.env.RAZORPAY_KEY_ID ? "Configured" : "Missing Keys"
    });
});

// --- SPA CATCH-ALL ---
app.use((req, res) => {
    if (req.url === '/favicon.ico') return res.status(204).end();
    if (req.url.startsWith('/api')) return res.status(404).json({ message: "API endpoint not found", success: false });
    
    res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
        if (err) {
            console.error("❌ SendFile Error:", err.message);
            res.status(500).json({ error: "Frontend build not found." });
        }
    });
});

// --- RENDER SELF-PING ---
setInterval(() => {
    fetch('https://snapit-full-stack-0.onrender.com/').catch(() => {});
}, 14 * 60 * 1000);

// --- START SERVER ---
const PORT = process.env.PORT || 8080;
connectDB().then(() => {
    console.log("Database Connected Successfully");
    server.listen(PORT, '0.0.0.0', () => { 
        console.log(`🚀 Snapit Server running on port ${PORT}`);
        console.log(`✅ Razorpay Status: ${process.env.RAZORPAY_KEY_ID ? 'LOADED' : 'NOT FOUND — check Render env vars'}`);
    });
}).catch(err => {
    console.error("Database connection failed", err);
});

export default app;