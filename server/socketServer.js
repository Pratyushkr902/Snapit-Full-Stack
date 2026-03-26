import { Server } from 'socket.io';

// --- INTEGRATED SOCKET.IO FIX ---
// Instead of (8080), we attach to the existing 'server' from your index.js
const io = new Server(server, {
    cors: {
        // Allows both your local testing and your new Vercel frontend
        origin: ["http://localhost:5173", "https://snapit-frontend.vercel.app"], 
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

io.on('connection', (socket) => {
    console.log(`Tracking: Connected [ID: ${socket.id}]`);

    // 1. Join a specific order room (KEEPING YOUR LOGIC)
    socket.on('join_order', (orderId) => {
        if (orderId) {
            socket.join(orderId);
            console.log(`User joined tracking for: ${orderId}`);
        }
    });

    // 2. Listen for Rider's GPS movement (KEEPING YOUR LOGIC)
    socket.on('send_location', (data) => {
        const { orderId, latitude, longitude } = data;
        
        // 3. Broadcast only to the customer watching THIS order
        if (orderId && latitude && longitude) {
            io.to(orderId).emit('receive_location', { 
                latitude, 
                longitude,
                timestamp: new Date().toISOString() 
            });
        }
    });

    socket.on('disconnect', () => {
        console.log("Tracking: User disconnected");
    });
});