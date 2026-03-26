import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom'; 
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import { socket } from '../utils/socket'; 
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { FaPhoneAlt, FaWhatsapp } from "react-icons/fa"; // Added FaWhatsapp
import Axios from '../utils/Axios'; 
import SummaryApi from '../common/SummaryApi'; 

// 1. Haversine Distance Helper Function
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(2); 
};

// GEOFENCING LANDMARKS FOR PALIGANJ ROUTE
const LANDMARKS = [
    { name: "Akhtiyarpur Market", lat: 25.3621, lon: 84.8165 },
    { name: "Achhua (P.N.K College)", lat: 25.3509, lon: 84.8178 }
];

const riderIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/71/71422.png',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
});

const houseIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/1239/1239525.png',
    iconSize: [35, 35],
    iconAnchor: [17, 35],
});

function RecenterMap({ coords }) {
    const map = useMap();
    useEffect(() => {
        if (coords) {
            map.setView(coords, map.getZoom());
        }
    }, [coords, map]);
    return null;
}

const RiderTracking = () => {
    const { id: orderId } = useParams(); 
    const destination = [25.2921, 84.8170]; 
    const [riderPos, setRiderPos] = useState([25.3600, 84.8160]); // Starts near Akhtiyarpur
    const [distance, setDistance] = useState(null);
    const [currentStatus, setCurrentStatus] = useState("Locating Rider...");
    const [riderData, setRiderData] = useState({
        name: "Pratyush Sharma",
        contact: "9472026580"
    });

    const fetchOrderDetails = async () => {
        try {
            const response = await Axios({
                ...SummaryApi.getOrderDetails, 
                data: { orderId: orderId }
            });
            if (response.data.success) {
                setRiderData({
                    name: response.data.data.rider_name || "Pratyush Sharma",
                    contact: response.data.data.rider_contact || "9472026580"
                });
            }
        } catch (error) {
            console.log("Error fetching rider details", error);
        }
    };

    useEffect(() => {
        if (!orderId) return;
        fetchOrderDetails();
        
        const joinRoom = () => {
            console.log("Joining Order Room:", orderId);
            socket.emit('join_order', orderId);
        };

        if (socket.connected) {
            joinRoom();
        } else {
            socket.on("connect", joinRoom);
        }

        const handleMovement = (data) => {
            if (data.latitude && data.longitude) {
                const newPos = [data.latitude, data.longitude];
                setRiderPos(newPos);
                
                const d = calculateDistance(
                    data.latitude, data.longitude, 
                    destination[0], destination[1]
                );
                setDistance(d);

                LANDMARKS.forEach(landmark => {
                    const distToLandmark = calculateDistance(
                        data.latitude, data.longitude,
                        landmark.lat, landmark.lon
                    );
                    if (parseFloat(distToLandmark) < 0.4) {
                        setCurrentStatus(`Rider is passing ${landmark.name}`);
                    }
                });

                if (parseFloat(d) <= 0.05) {
                    setCurrentStatus("Rider has arrived!");
                    toast.success("Rider is at your doorstep!", { id: "arrival", duration: 5000 });
                } else {
                    setCurrentStatus(`On the way (${d} km left)`);
                }
            }
        };

        socket.on('rider_moved', handleMovement);
        
        return () => {
            socket.off('rider_moved', handleMovement);
            socket.emit('leave_order', orderId);
            socket.off("connect", joinRoom);
        };
    }, [orderId]);

    return (
        <div className='p-4 lg:p-6 bg-white min-h-screen'>
            <div className='mb-4 flex justify-between items-end'>
                <div>
                    <h2 className='text-2xl font-black text-neutral-800 tracking-tight italic'>SNAPIT LIVE</h2>
                    <p className='text-[10px] font-bold text-blue-600 uppercase tracking-widest'>ID: {orderId}</p>
                </div>
                <div className='text-right hidden md:block'>
                    <p className='text-[10px] text-neutral-400 font-bold uppercase'>Delivery Status</p>
                    <p className='text-sm font-bold text-green-600'>{currentStatus}</p>
                </div>
            </div>

            <div className='relative w-full rounded-3xl overflow-hidden shadow-2xl border-8 border-white bg-neutral-200'>
                {/* STATUS BAR OVERLAY */}
                <div className='absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-[90%] md:w-auto'>
                    <div className='bg-white/95 backdrop-blur-md px-6 py-3 rounded-2xl shadow-xl flex items-center justify-center gap-4 border border-white'>
                        <div className='flex items-center gap-2'>
                            <span className='relative flex h-3 w-3'>
                                <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75'></span>
                                <span className='relative inline-flex rounded-full h-3 w-3 bg-red-600'></span>
                            </span>
                            <span className='font-black text-neutral-800 text-sm md:text-lg'>
                                {distance ? `${distance} KM` : "---"}
                            </span>
                        </div>
                        <div className='h-6 w-[1px] bg-neutral-300'></div>
                        <p className='text-[11px] md:text-xs font-bold text-neutral-500 uppercase tracking-tighter'>
                            {currentStatus}
                        </p>
                    </div>
                </div>

                {/* --- IMPROVED RIDER CONTACT CARD --- */}
                <div className='absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[92%] md:w-96'>
                    <div className='bg-white/95 backdrop-blur-lg p-4 rounded-2xl shadow-2xl flex items-center justify-between border border-white'>
                        <div className='flex items-center gap-3'>
                            <div className='w-12 h-12 bg-neutral-900 rounded-full flex items-center justify-center text-white font-black text-sm shadow-lg'>
                                {riderData.name.split(" ").map(n => n[0]).join("")}
                            </div>
                            <div>
                                <p className='text-[10px] text-neutral-400 font-black uppercase tracking-[0.2em]'>Valued Rider</p>
                                <p className='text-sm font-black text-neutral-800'>{riderData.name}</p>
                            </div>
                        </div>
                        
                        <div className='flex gap-2'>
                            {/* WHATSAPP ACTION */}
                            <a 
                                href={`https://wa.me/91${riderData.contact}?text=Hi ${riderData.name}, I'm tracking my Snapit order ${orderId}. See you soon!`}
                                target="_blank"
                                rel="noreferrer"
                                className='bg-[#25D366] hover:bg-[#128C7E] w-11 h-11 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-90'
                            >
                                <FaWhatsapp size={20} />
                            </a>
                            {/* CALL ACTION */}
                            <a 
                                href={`tel:${riderData.contact}`} 
                                className='bg-blue-600 hover:bg-blue-700 w-11 h-11 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-90'
                            >
                                <FaPhoneAlt size={16} />
                            </a>
                        </div>
                    </div>
                </div>

                <div className='h-[500px] md:h-[750px] w-full'>
                    <MapContainer center={riderPos} zoom={14} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                        <TileLayer 
                            attribution='&copy; OpenStreetMap'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                        />
                        <Marker position={destination} icon={houseIcon}><Popup>Home (Paliganj)</Popup></Marker>
                        <Marker position={riderPos} icon={riderIcon}><Popup>{riderData.name}</Popup></Marker>
                        <Polyline positions={[riderPos, destination]} color="#3b82f6" dashArray="10, 10" weight={4} opacity={0.6} />
                        <RecenterMap coords={riderPos} />
                    </MapContainer>
                </div>
            </div>
        </div>
    );
};

export default RiderTracking;