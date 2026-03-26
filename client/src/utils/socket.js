import { io } from "socket.io-client";

// --- PRODUCTION SOCKET FIX ---
// We use the Vercel URL for production, but keep the logic for local testing
const URL = process.env.NODE_ENV === 'production' 
    ? "https://snapit-full-stack.vercel.app" 
    : "http://localhost:8080";

export const socket = io(URL, {
    transports: ["websocket", "polling"],
    withCredentials: true
});