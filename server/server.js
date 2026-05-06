import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/connectDB.js';

// 1. INITIALIZE ENV
dotenv.config(); // Must be at the very top to prevent Razorpay 401 errors

const app = express();

// 2. MIDDLEWARE (Crucial for data parsing)
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// 3. THE PERMANENT CORS FIX
const allowedOrigins = [
    "http://localhost:5173",
    "https://snapit-full-stack.onrender.com",
    "https://snapit-full-stack-2.onrender.com",
    "https://snapit-full-stack-0.onrender.com"
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
};

app.use(cors(corsOptions));

// 4. HEALTH CHECK
app.get("/", (req, res) => {
    res.json({ 
        message: "Snapit Server is Live!", 
        razorpay_status: process.env.RAZORPAY_KEY_ID ? "Configured" : "Missing Keys" 
    });
});

// 5. SERVER & SOCKET.IO
const server = http.createServer(app);
const io = new Server(server, {
    cors: corsOptions 
});

// --- IMPORT YOUR ROUTES HERE ---
// import orderRouter from './route/order.route.js';
// app.use('/api/order', orderRouter);

// 6. START SERVER
const PORT = process.env.PORT || 8080;

connectDB().then(() => {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`✅ Razorpay ID: ${process.env.RAZORPAY_KEY_ID ? 'LOADED' : 'NOT FOUND'}`);
    });
}).catch(err => {
    console.error("Database connection failed", err);
});