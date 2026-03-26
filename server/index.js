import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io'; 
import http from 'http'; 
// They should look like this now:
import connectDB from './config/connectDB.js';
import './models/user.model.js';
import userRouter from './route/user.route.js';
// ... and so on for all your routes and models

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- FIXED DOTENV PATH ---
// We now check for .env in the same folder, and ONLY if we aren't on Vercel
if (process.env.NODE_ENV !== 'production') {
    dotenv.config(); 
}

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import helmet from 'helmet';
import connectDB from './config/connectDB.js';

// --- CRITICAL FIX: PRE-REGISTER MODELS ---
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

const app = express();
const server = http.createServer(app); 

// Memory cache for latest rider positions
const latestPositions = new Map(); 

// Socket.io initialization
const io = new Server(server, {
    cors: {
        origin: true, 
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000, 
    allowEIO3: true 
});

app.use(cors({
    origin: true, 
    credentials: true
}));

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com", "https://*.googleapis.com", "https://unpkg.com"],
            imgSrc: ["'self'", "data:", "https://*.openstreetmap.org", "https://res.cloudinary.com", "https://*.googleapis.com", "https://*.gstatic.com"],
            frameSrc: ["'self'", "https://api.razorpay.com", "https://*.razorpay.com"],
            connectSrc: ["'self'", "https://api.razorpay.com", "https://*.googleapis.com", "ws:", "wss:", "http://*", "https://*", "ws://*", "wss://*"] 
        },
    },
}));

// --- SOCKET.IO TRACKING LOGIC ---
io.on('connection', (socket) => {
    console.log(`Tracking: Connected [ID: ${socket.id}]`);

    socket.on('join_order', (orderId) => {
        if (orderId) {
            socket.join(orderId);
            if (latestPositions.has(orderId)) {
                socket.emit('rider_moved', latestPositions.get(orderId));
            }
            const roomSize = io.sockets.adapter.rooms.get(orderId)?.size || 0;
            console.log(`Tracking: Socket ${socket.id} joined Order ${orderId}. Total in room: ${roomSize}`);
        }
    });

    socket.on('leave_order', (orderId) => {
        if (orderId) {
            socket.leave(orderId);
            console.log(`Tracking: Socket ${socket.id} left Room: ${orderId}`);
        }
    });

    socket.on('update_location', (data) => {
        const { orderId, latitude, longitude } = data;
        if (orderId && latitude && longitude) {
            const movementData = { 
                latitude, 
                longitude,
                timestamp: new Date().toISOString()
            };
            latestPositions.set(orderId, movementData);
            io.to(orderId).emit('rider_moved', movementData);
        }
    });

    socket.on('error', (err) => console.error("Socket.io Error Log:", err));
    socket.on('disconnect', () => console.log(`Tracking: Client ${socket.id} disconnected`));
});

const PORT = process.env.PORT || 8080;

app.get("/", (request, response) => {
    response.json({
        message: "Snapit Server is Live on " + PORT,
        tracking_enabled: true
    });
});

app.use('/api/user', userRouter);
app.use("/api/category", categoryRouter);
app.use("/api/file", uploadRouter);
app.use("/api/subcategory", subCategoryRouter);
app.use("/api/product", productRouter);
app.use("/api/cart", cartRouter);
app.use("/api/address", addressRouter);
app.use('/api/order', orderRouter);
app.use('/api/store', storeRouter); 

// --- VERCEL & LOCAL LOGIC ---
// Connect DB first. Vercel will handle the 'app' export.
connectDB().then(() => {
    console.log("Database Connected Successfully");
    // Only call .listen() if we are running locally
    if (process.env.NODE_ENV !== 'production') {
        server.listen(PORT, () => { 
            console.log("Snapit Server & Tracking running locally on port " + PORT);
        });
    }
}).catch(err => {
    console.error("Database connection failed", err);
});

// Export the app for Vercel
export default app;