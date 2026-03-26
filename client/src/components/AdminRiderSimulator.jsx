import React, { useState, useEffect } from 'react'
import io from 'socket.io-client'

// Connect to your Node.js socket server
const socket = io.connect("http://localhost:8080")

const AdminRiderSimulator = ({ orderId }) => {
    const [isSimulating, setIsSimulating] = useState(false)
    const [coords, setCoords] = useState({ lat: 25.4775, lng: 84.7456 })

    useEffect(() => {
        let interval;
        if (isSimulating && orderId) {
            interval = setInterval(() => {
                setCoords(prev => {
                    const newCoords = {
                        lat: prev.lat + (Math.random() - 0.5) * 0.0005,
                        lng: prev.lng + (Math.random() - 0.5) * 0.0005
                    }
                    
                    // Sending data to the server
                    socket.emit('update_location', {
                        orderId: orderId,
                        latitude: newCoords.lat,
                        longitude: newCoords.lng
                    })
                    
                    return newCoords
                })
            }, 3000)
        }
        return () => clearInterval(interval)
    }, [isSimulating, orderId])

    if (!orderId) return <div className="p-4 bg-red-100 text-red-600">Error: No Order ID provided to Simulator</div>

    return (
        <div className='p-6 my-4 border-4 border-dashed border-secondary-200 bg-white rounded-xl shadow-lg'>
            <h3 className='font-bold text-lg mb-3 text-secondary-100'>🚀 Paliganj Rider Simulator</h3>
            <div className='flex items-center gap-6'>
                <button 
                    onClick={() => setIsSimulating(!isSimulating)}
                    className={`px-6 py-3 rounded-full text-white font-bold transition-all ${isSimulating ? 'bg-red-500 hover:bg-red-600' : 'bg-secondary-200 hover:bg-green-700'}`}
                >
                    {isSimulating ? "STOP RIDER" : "START LIVE DELIVERY"}
                </button>
                <div className='bg-gray-100 p-2 rounded text-xs font-mono text-gray-700'>
                    <p>LAT: {coords.lat.toFixed(5)}</p>
                    <p>LNG: {coords.lng.toFixed(5)}</p>
                </div>
            </div>
            {isSimulating && <p className="text-xs text-green-600 mt-2 animate-pulse">● Sending live GPS pings for Order: {orderId}</p>}
        </div>
    )
}

export default AdminRiderSimulator