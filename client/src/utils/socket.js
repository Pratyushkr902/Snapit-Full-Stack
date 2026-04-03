import { io } from "socket.io-client"

// --- DYNAMIC URL CONFIGURATION ---
const URL = process.env.NODE_ENV === 'production'
    ? "https://snapit-full-stack-0.onrender.com"  // UPDATED: Matches your Render service ID
    : "http://localhost:8080"

export const socket = io(URL, {
    // FIXED: Handshake starts with polling to bypass Render's proxy restrictions
    transports:          ["polling", "websocket"],  
    path:                "/socket.io/",
    withCredentials:     true,
    reconnection:        true,
    reconnectionAttempts: 10,
    reconnectionDelay:   3000,
    timeout:             20000,
    autoConnect:         true,
    forceNew:            true // Ensures a fresh connection on re-renders
})

// --- DEBUGGING LISTENERS ---
socket.on("connect", () => {
    console.log("🚀 Snapit Socket Connected:", socket.id)
})

socket.on("connect_error", (err) => {
    console.log("❌ Socket Connection Error:", err.message)
    // Fallback: If websocket fails, it will automatically stick to polling
})

socket.on("disconnect", (reason) => {
    console.log("📡 Socket Disconnected:", reason)
    if (reason === "io server disconnect") {
        // Reconnect manually if the server kicked us off
        socket.connect();
    }
})

export default socket