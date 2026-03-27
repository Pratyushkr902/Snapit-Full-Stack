const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
// UPDATED: Allow the specific frontend origin for API requests (Axios/Fetch)
app.use(cors({
    origin: ["http://localhost:5173", "https://snapit-full-stack.onrender.com", "https://snapit-full-stack-2.onrender.com"],
    credentials: true
})); 

const server = http.createServer(app);

// UPDATED: Added the '-2' origin to the Socket.io CORS settings
const io = new Server(server, {
    cors: { 
        origin: ["http://localhost:5173", "https://snapit-full-stack.onrender.com", "https://snapit-full-stack-2.onrender.com"],
        methods: ["GET", "POST"],
        credentials: true
    }
});

io.on('connection', (socket) => {
    console.log('User Connected:', socket.id);

    // Join a specific order tracking room
    socket.on('join_order', (orderId) => {
        socket.join(orderId);
        console.log(`User joined tracking for Order: ${orderId}`);
    });

    // Receive location from Rider App
    socket.on('update_location', (data) => {
        const { orderId, latitude, longitude } = data;
        // Broadcast to everyone in the order room (The Customer)
        io.to(orderId).emit('rider_moved', { latitude, longitude });
    });

    socket.on('disconnect', () => console.log('Disconnected'));
});

// UPDATED: Render assigns a dynamic port via process.env.PORT. 
// You MUST listen on 0.0.0.0 for Render to detect the open port.
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Tracking Server running on port ${PORT}`);
});