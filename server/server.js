import dotenv from 'dotenv';
// --- STEP 1: LOAD ENV AT THE ABSOLUTE TOP ---
dotenv.config(); 

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import helmet from 'helmet';
import connectDB from './config/connectDB.js';

// Import Routes
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

// --- 2. MIDDLEWARE & SECURITY ---
app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// --- 3. CORS CONFIGURATION ---
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

// --- 4. SOCKET.IO (Tracking Logic) ---
const io = new Server(server, {
    cors: { origin: true, credentials: true }
});

const latestPositions = new Map();
io.on('connection', (socket) => {
    socket.on('join_order', (orderId) => {
        socket.join(orderId);
        if (latestPositions.has(orderId)) {
            socket.emit('receive_location', latestPositions.get(orderId));
        }
    });

    socket.on('send_location', (data) => {
        const { orderId, latitude, longitude } = data;
        if (orderId) {
            const movementData = { latitude, longitude };
            latestPositions.set(orderId, movementData);
            io.to(orderId).emit('receive_location', movementData);
        }
    });
});

// --- 5. ROUTES ---
app.use('/api/user', userRouter);
app.use("/api/category", categoryRouter);
app.use("/api/file", uploadRouter);
app.use("/api/subcategory", subCategoryRouter);
app.use("/api/product", productRouter);
app.use("/api/cart", cartRouter);
app.use("/api/address", addressRouter);
app.use('/api/order', orderRouter);
app.use('/api/store', storeRouter);

// Health Check
app.get("/", (req, res) => {
    res.json({ 
        message: "Snapit Server is Live!", 
        razorpay_status: process.env.RAZORPAY_KEY_ID ? "Configured" : "Missing Keys" 
    });
});

// --- 6. START SERVER ---
const PORT = process.env.PORT || 8080;
connectDB().then(() => {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`✅ Razorpay ID Status: ${process.env.RAZORPAY_KEY_ID ? 'LOADED' : 'NOT FOUND'}`);
    });
});