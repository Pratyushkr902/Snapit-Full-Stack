import { io } from "socket.io-client";

// --- DYNAMIC PRODUCTION URL FIX ---
// Using your provided Render URL for production
const SOCKET_URL = window.location.hostname === 'localhost' 
    ? "http://localhost:8080" 
    : "https://snapit-full-stack.onrender.com"; 

export const socket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10, // Increased to account for Render's spin-up time
    reconnectionDelay: 2000,
});

// Debugging helper to see connection status in your browser console
socket.on("connect", () => {
    console.log("✅ Snapit Socket Connected:", socket.id);
});

socket.on("connect_error", (err) => {
    // This will now show you if the Render server is waking up
    console.log("❌ Socket Connection Error:", err.message);
});