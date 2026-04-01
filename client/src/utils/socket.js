import { io } from "socket.io-client"

const URL = process.env.NODE_ENV === 'production'
    ? "https://snapit-full-stack.onrender.com"  // correct Render URL
    : "http://localhost:8080"

export const socket = io(URL, {
    transports:          ["polling", "websocket"],  // polling first = no errors
    path:                "/socket.io/",
    withCredentials:     true,
    reconnection:        true,
    reconnectionAttempts: 10,
    reconnectionDelay:   3000,
    timeout:             20000,
    autoConnect:         true
})

socket.on("connect", () => {
    console.log("Socket Connected:", socket.id)
})

socket.on("connect_error", (err) => {
    console.log("Socket Error:", err.message)
})

socket.on("disconnect", (reason) => {
    console.log("Socket Disconnected:", reason)
})

export default socket