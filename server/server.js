const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

// --- ADDED MIDDLEWARE (Do not remove) ---
// This fixes the 'ERR_CONNECTION_CLOSED' when sending data
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// --- THE PERMANENT FIX ---
const allowedOrigins = [
    "http://localhost:5173",
    "https://snapit-full-stack.onrender.com",
    "https://snapit-full-stack-2.onrender.com",
    "https://snapit-full-stack-0.onrender.com" // Added the -0 version from your screenshot
];

const corsOptions = {
    origin: function (origin, callback) {
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

// --- ADDED HEALTH CHECK (Fixes the "Not Found" screen) ---
app.get("/", (req, res) => {
    res.json({ message: "Snapit Server is Live!", status: "Ready" });
});

const server = http.createServer(app);

const io = new Server(server, {
    cors: corsOptions 
});

// ... (rest of your socket logic)

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});