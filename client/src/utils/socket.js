import { io } from "socket.io-client"
import { baseURL } from "./Axios.js" // ✅ Dynamically inherits the production target automatically

export const socket = io(baseURL, {
    // ✅ FIXED: Prioritizing 'websocket' bypasses proxy round-robin load balancing limitations on Render
    transports:          ["websocket", "polling"],  
    path:                "/socket.io/",
    withCredentials:     true,
    reconnection:        true,
    reconnectionAttempts: 10,
    reconnectionDelay:   3000,
    timeout:             20000,
    autoConnect:         true,
    forceNew:            true 
})

// --- DEBUGGING LISTENERS ---
socket.on("connect", () => {
    console.log("🚀 Snapit Socket Connected:", socket.id)
})

socket.on("connect_error", (err) => {
    console.log("❌ Socket Connection Error:", err.message)
})

socket.on("disconnect", (reason) => {
    console.log("📡 Socket Disconnected:", reason)
    if (reason === "io server disconnect") {
        socket.connect();
    }
})

export default socket;