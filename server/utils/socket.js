import { io } from "socket.io-client";

// REPLACE '192.168.x.x' with your MacBook's IP address 
// (Find it by typing 'ipconfig getifaddr en0' in Terminal)
const SOCKET_URL = window.location.hostname === 'localhost' 
    ? "http://localhost:8080" 
    : "http://192.168.x.x:8080"; 

export const socket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
});

// Debugging helper to see connection status in your browser console
socket.on("connect", () => {
    console.log("✅ Snapit Socket Connected:", socket.id);
});

socket.on("connect_error", (err) => {
    console.log("❌ Socket Connection Error:", err.message);
});