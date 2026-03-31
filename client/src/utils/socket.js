import { io } from "socket.io-client";

// --- PRODUCTION SOCKET FIX ---
// FIXED: Vercel/Render work best with forced websocket transports to avoid "Handshake Failed"
const URL = process.env.NODE_ENV === 'production' 
    ? "https://snapit-full-stack-0.onrender.com"  // Updated to match your exact Render URL
    : "http://localhost:8080";                   // Localhost for testing

export const socket = io(URL, {
    // CRITICAL: Force websocket first to bypass Render's polling limitations
    transports: ["websocket"], 
    
    // Ensure this matches the 'path' defined in your server/index.js
    path: "/socket.io/",
    
    // Production stability settings
    secure: true,
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 5000,
});

// --- DEBUGGING LOGS ---
socket.on("connect", () => {
    console.log(`🚀 Snapit Socket Connected: ${socket.id}`);
});

socket.on("connect_error", (err) => {
    console.error("❌ Socket Connection Error:", err.message);
    // If it fails, it will automatically try to reconnect every 5 seconds
});

export default socket;