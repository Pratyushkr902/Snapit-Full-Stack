const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "http://localhost:5173" } // Your Vite Frontend Port
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

server.listen(8080, () => console.log('Tracking Server running on port 8080'));