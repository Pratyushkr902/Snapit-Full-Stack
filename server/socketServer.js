const io = require('socket.io')(8080, {
    cors: { origin: "http://localhost:5173" } // Your Vite port
});

io.on('connection', (socket) => {
    // 1. Join a specific order room (e.g., 'order_123')
    socket.on('join_order', (orderId) => {
        socket.join(orderId);
        console.log(`User joined tracking for: ${orderId}`);
    });

    // 2. Listen for Rider's GPS movement
    socket.on('send_location', (data) => {
        const { orderId, latitude, longitude } = data;
        // 3. Broadcast only to the customer watching THIS order
        io.to(orderId).emit('receive_location', { latitude, longitude });
    });
});