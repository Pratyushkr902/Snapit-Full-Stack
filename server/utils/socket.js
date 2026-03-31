import { io } from "socket.io-client";

// --- PRODUCTION SOCKET FIX ---
// FIXED: Vercel doesn't support WebSockets. 
// We point PRODUCTION to Render and LOCAL to your MacBook.
const URL = process.env.NODE_ENV === 'production' 
    ? "https://snapit-full-stack.onrender.com"  // Render for live site
    : "http://localhost:8080";                 // Localhost for testing

export const socket = io(URL, {
    transports: ["websocket", "polling"],
    withCredentials: true
}); 