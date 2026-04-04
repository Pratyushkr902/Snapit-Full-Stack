import dotenv from 'dotenv';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- FIXED DOTENV PATH ---
if (process.env.NODE_ENV !== 'production') {
    dotenv.config(); 
}

// --- CRITICAL: PRE-REGISTER MODELS ---
import './models/user.model.js';
import './models/category.model.js';
import './models/subCategory.model.js'; 
import './models/product.model.js';
import './models/store.model.js';
import './models/order.model.js';

console.log("RAZORPAY CHECK:", process.env.RAZORPAY_KEY_ID ? "LOADED" : "NOT LOADED");

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

// --- 1. CORS CONFIGURATION ---
app.use(cors({
    origin: true,        
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie", "X-Requested-With", "Accept"]
}));

app.options(/(.*)/, cors());

// --- 2. SECURITY & UTILITY MIDDLEWARE ---
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

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// --- 3. SOCKET.IO CONFIGURATION ---
const io = new Server(server, {
    path: '/socket.io/', 
    cors: {
        origin: true,
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
            if (latestPositions.has(orderId)) {
                socket.emit('receive_location', latestPositions.get(orderId));
            }
            console.log(`User joined tracking for: ${orderId}`);
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

// --- 4. API ROUTES ---
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

// --- 5. STATIC FILE SERVING (FIXES MIME TYPE & 404 ERRORS) ---
const clientBuildPath = path.resolve(__dirname, '..', 'client', 'dist'); 
app.use(express.static(clientBuildPath));

// FIXED: Express 5.x Wildcard Fix. Using (.*) regex instead of '*' string.
app.get('(.*)', (req, res) => {
    // Prevent accidental HTML responses for broken API calls
    if (req.url.startsWith('/api')) {
        return res.status(404).json({ message: "API endpoint not found", success: false });
    }
    res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// --- 6. KEEP RENDER AWAKE (Updated to -0 server) ---
setInterval(() => {
    fetch('https://snapit-full-stack-0.onrender.com/')
        .catch(() => {})
}, 14 * 60 * 1000)

// --- 7. START SERVER ---
const PORT = process.env.PORT || 8080;
connectDB().then(() => {
    console.log("Database Connected Successfully");
    server.listen(PORT, () => { 
        console.log(`Snapit Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error("Database connection failed", err);
});

export default app;