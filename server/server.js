const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

// --- THE PERMANENT FIX ---
const allowedOrigins = [
    "http://localhost:5173",
    "https://snapit-full-stack.onrender.com",
    "https://snapit-full-stack-2.onrender.com"
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps) or matching our list
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
};

app.use(cors(corsOptions)); 

const server = http.createServer(app);

const io = new Server(server, {
    cors: corsOptions // Use the same options for Socket.io
});

// ... (rest of your socket logic)

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});