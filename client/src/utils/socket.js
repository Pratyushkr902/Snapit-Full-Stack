import { io } from "socket.io-client"
import { baseURL } from "./Axios.js" 

export const socket = io(baseURL, {
    // ✅ FIXED: Prioritize 'websocket' first to bypass Render's proxy handshake stickiness
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
    console.log("🚀 Snapit Socket Connected Successfully! ID:", socket.id)
})

socket.on("connect_error", (err) => {
    console.log("❌ Socket Connection Error:", err.message)
})

export default socket;