import React, { useState, useEffect } from 'react'
import { socket } from '../utils/socket'; // Use the shared socket connection

const RiderSimulator = ({ orderId }) => {
    // Starting at Paliganj center
    const [coords, setCoords] = useState({ lat: 25.4775, lng: 84.7344 });

    // Join the room as a rider too, so the server knows where to broadcast FROM
    useEffect(() => {
        if (orderId) {
            socket.emit("join_order", orderId);
            console.log("Rider Simulator joined room:", orderId);
        }
    }, [orderId]);

    const simulateMove = () => {
        if (!orderId) {
            console.error("No Order ID provided to Simulator");
            return;
        }

        // Move the rider slightly (approx 10 meters)
        const newCoords = {
            lat: coords.lat + 0.0001, 
            lng: coords.lng + 0.0001
        };

        setCoords(newCoords);

        // CRITICAL: Ensure the keys match exactly what index.js is listening for
        const payload = {
            orderId: orderId,
            latitude: newCoords.lat,
            longitude: newCoords.lng
        };

        console.log("EMITTING MOVEMENT:", payload);
        socket.emit("update_location", payload);
    };

    return (
        <div className='p-4 bg-white shadow-md rounded-lg border border-green-200 mt-4'>
            <h3 className='font-bold text-green-700 mb-2'>Rider Simulator</h3>
            <p className='text-[10px] text-neutral-400 mb-2'>ID: {orderId}</p>
            
            <div className='flex items-center gap-4'>
                <button 
                    onClick={simulateMove}
                    className='bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 active:scale-95 transition-all font-semibold text-sm'
                >
                    Simulate 10m Move
                </button>
                
                <div className='text-xs font-mono bg-neutral-100 p-2 rounded'>
                    {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </div>
            </div>
        </div>
    )
}

export default RiderSimulator;