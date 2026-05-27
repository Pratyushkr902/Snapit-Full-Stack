import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_URL || 'https://snapit-full-stack-2.onrender.com', {
    path: '/socket.io/',
    withCredentials: true,
    transports: ['polling', 'websocket'],
    autoConnect: true,
});

export default socket;
