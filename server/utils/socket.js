import { io } from "socket.io-client";

// --- PRODUCTION SOCKET FIX ---
// FIXED: Vercel doesn't support WebSockets. 
// We point PRODUCTION to Render and LOCAL to your MacBook.
const URL = process.env.NODE_ENV === 'production' 
    ? "https://snapit-full-stack-0.onrender.com"  // UPDATED: Matches your Render Instance ID
    : "http://localhost:8080";                 // Localhost for testing

export const socket = io(URL, {
    // FIXED: Polling first handles the Render/Vercel handshake more reliably
    transports: ["polling", "websocket"],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    autoConnect: true
});

// --- DEBUG LISTENERS (Professional for Demo) ---
socket.on("connect", () => {
    console.log("🚀 Snapit Socket Connected:", socket.id);
});

socket.on("connect_error", (err) => {
    console.error("❌ Socket Connection Error:", err.message);
});

export default socket;