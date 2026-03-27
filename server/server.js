const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
// UPDATED: Allow all origins for the express middleware to avoid CORS blocks
app.use(cors()); 

const server = http.createServer(app);

// UPDATED: Dynamic CORS and Port for Deployment
const io = new Server(server, {
    cors: { 
        // Allow your local Vite dev server AND your deployed Snapit frontend
        origin: ["http://localhost:5173", "https://snapit-full-stack.onrender.com"],
        methods: ["GET", "POST"]
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