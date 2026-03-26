import React, { useState } from 'react'
import { io } from "socket.io-client"

// Connect to your 8080 Tracking Server
const socket = io("https://snapit-full-stack.onrender.com");

const RiderSimulator = ({ orderId }) => {
    // Starting at Paliganj center
    const [coords, setCoords] = useState({ lat: 25.4775, lng: 84.7344 });

    const simulateMove = () => {
        if (!orderId) return alert("Select an Order ID first!");

        // Move the rider slightly (approx 10-20 meters)
        const newCoords = {
            lat: coords.lat + 0.0001, 
            lng: coords.lng + 0.0001
        };

        setCoords(newCoords);

        // EMIT: Tell the server the rider moved
        socket.emit("update_location", {
            orderId: orderId,
            latitude: newCoords.lat,
            longitude: newCoords.lng
        });

        console.log("Simulated Move Sent:", newCoords);
    };

    return (
        <div className='p-4 bg-white shadow-md rounded-lg border border-green-200 mt-4'>
            <h3 className='font-bold text-green-700 mb-2'>Rider Simulator (Testing)</h3>
            <p className='text-xs text-neutral-500 mb-3'>Order ID: {orderId || "Not Selected"}</p>
            
            <div className='flex items-center gap-4'>
                <button 
                    onClick={simulateMove}
                    className='bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 active:scale-95 transition-all font-semibold'
                >
                    Move Rider +10m
                </button>
                
                <div className='text-xs font-mono bg-neutral-100 p-2 rounded'>
                    {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </div>
            </div>
        </div>
    )
}

export default RiderSimulator