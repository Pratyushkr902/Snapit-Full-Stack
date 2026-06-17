import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux'; // ⚠️ adjust import if you don't use redux for auth state
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import { io } from 'socket.io-client';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { FaPhoneAlt, FaWhatsapp } from 'react-icons/fa';
import { MdGpsFixed, MdOutlineDeliveryDining, MdCheckCircle } from 'react-icons/md';
import Axios from '../utils/Axios';

// ─── Haversine distance ───────────────────────────────────────────────────────
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
};

// ─── Landmarks ────────────────────────────────────────────────────────────────
const LANDMARKS = [
    { name: 'Akhtiyarpur Market', lat: 25.3621, lon: 84.8165 },
    { name: 'Achhua (P.N.K College)', lat: 25.3509, lon: 84.8178 },
];

// ─── Map icons ────────────────────────────────────────────────────────────────
const riderIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/71/71422.png',
    iconSize: [42, 42],
    iconAnchor: [21, 42],
});

const houseIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/1239/1239525.png',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
});

// ─── Smooth map re-center ─────────────────────────────────────────────────────
function RecenterMap({ coords }) {
    const map = useMap();
    useEffect(() => {
        if (coords) map.panTo(coords, { animate: true, duration: 0.8 });
    }, [coords, map]);
    return null;
}

// ─── ETA estimate (very rough, assuming ~20 km/h avg speed) ──────────────────
const getETA = (distKm) => {
    if (!distKm) return null;
    const minutes = Math.round((parseFloat(distKm) / 20) * 60);
    if (minutes <= 1) return '< 1 min';
    return `~${minutes} min`;
};

// ─── Main component ───────────────────────────────────────────────────────────
const RiderTracking = () => {
    const { id: orderId } = useParams();
    const destination = [25.2921, 84.817];

    // ⚠️ FIX: pull the logged-in user's id from wherever your app stores auth state.
    // This is the value the backend checks against order.userId / order.riderId
    // before allowing join_order to succeed. Adjust the selector path below to
    // match your actual redux store (or swap this for your auth context/hook).
    const user = useSelector((state) => state.user);

    const [riderPos, setRiderPos] = useState([25.36, 84.816]);
    const [distance, setDistance] = useState(null);
    const [currentStatus, setCurrentStatus] = useState('Locating Rider…');
    const [arrived, setArrived] = useState(false);
    const socketRef = useRef(null);
    const [riderData, setRiderData] = useState({
        name: 'Pratyush Sharma',
        contact: '9472026580',
    });

    // ─── Fetch rider info + last known GPS position ───────────────────────────
    const fetchOrderDetails = async () => {
        try {
            const response = await Axios({
                url: `/api/order/rider-location/${orderId}`,
                method: 'GET',
            });

            if (response.data.success) {
                const { rider_name, rider_contact, riderLocation } = response.data.data;

                setRiderData({
                    name:    rider_name    || 'Pratyush Sharma',
                    contact: rider_contact || '9472026580',
                });

                if (riderLocation?.latitude && riderLocation?.longitude) {
                    const lastPos = [riderLocation.latitude, riderLocation.longitude];
                    setRiderPos(lastPos);
                    const d = calculateDistance(
                        riderLocation.latitude, riderLocation.longitude,
                        destination[0], destination[1]
                    );
                    setDistance(d);
                    setCurrentStatus(`Last seen — ${d} km away`);
                }
            }
        } catch (err) {
            console.log('Error fetching rider details', err);
        }
    };

    // ─── Socket setup ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!orderId) return;
        // Wait until we actually have a userId before connecting — connecting
        // too early means join_order fires with auth.userId = undefined and
        // gets silently rejected by the backend.
        if (!user?._id) return;

        fetchOrderDetails();

        const socket = io(
            import.meta.env.VITE_API_URL || 'https://snapit-backend-bn8r.onrender.com',
            {
                path: '/socket.io/',
                transports: ['websocket', 'polling'],
                withCredentials: true,
                auth: { userId: user._id }, // ✅ FIX: required by backend's join_order auth check
            }
        );
        socketRef.current = socket;

        socket.emit('join_order', orderId);
        socket.on('connect', () => socket.emit('join_order', orderId));

        socket.on('error', (err) => {
            console.error('[Socket] server error:', err?.message);
            toast.error(err?.message || 'Tracking connection error');
        });

        const handleMovement = (data) => {
            if (!data.latitude || !data.longitude) return;

            const newPos = [data.latitude, data.longitude];
            setRiderPos(newPos);

            const d = calculateDistance(data.latitude, data.longitude, destination[0], destination[1]);
            setDistance(d);

            LANDMARKS.forEach((landmark) => {
                const distToLandmark = calculateDistance(
                    data.latitude, data.longitude, landmark.lat, landmark.lon
                );
                if (parseFloat(distToLandmark) < 0.4) {
                    setCurrentStatus(`Passing ${landmark.name}`);
                }
            });

            if (parseFloat(d) <= 0.05) {
                setCurrentStatus('Rider has arrived!');
                setArrived(true);
                toast.success('🛵 Rider is at your doorstep!', { id: 'arrival', duration: 6000 });
            } else {
                setCurrentStatus(`On the way — ${d} km left`);
            }
        };

        socket.on('rider_moved', handleMovement);

        return () => {
            socket.emit('leave_order', orderId);
            socket.disconnect();
        };
    }, [orderId, user?._id]);

    // ─── Derived ──────────────────────────────────────────────────────────────
    const initials = riderData.name.split(' ').map((n) => n[0]).join('');
    const eta = getETA(distance);

    return (
        <div className="min-h-screen bg-gray-50">

            {/* ── TOP HEADER BAR ──────────────────────────────────────────── */}
            <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
                <div className="flex items-center gap-2">
                    <MdOutlineDeliveryDining size={26} className="text-blue-600" />
                    <div>
                        <p className="text-base font-black text-gray-900 leading-tight tracking-tight">
                            SNAPIT LIVE
                        </p>
                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest leading-none">
                            {orderId}
                        </p>
                    </div>
                </div>
                {/* Status pill */}
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold
                    ${arrived
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}>
                    {arrived ? (
                        <MdCheckCircle size={14} />
                    ) : (
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
                        </span>
                    )}
                    {arrived ? 'Delivered' : 'En Route'}
                </div>
            </div>

            {/* ── MAP SECTION ─────────────────────────────────────────────── */}
            <div className="relative">
                {/* Floating HUD — distance + ETA + status */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-[calc(100%-32px)] max-w-sm">
                    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-white/60 overflow-hidden">
                        <div className="flex">
                            {/* Distance block */}
                            <div className="flex-1 flex flex-col items-center justify-center py-3 border-r border-gray-100">
                                <div className="flex items-center gap-1.5">
                                    <MdGpsFixed size={14} className="text-red-500" />
                                    <span className="text-xl font-black text-gray-900 tabular-nums">
                                        {distance ? `${distance}` : '—'}
                                    </span>
                                    <span className="text-xs font-bold text-gray-400 mt-1">km</span>
                                </div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-0.5">
                                    Distance
                                </p>
                            </div>
                            {/* ETA block */}
                            <div className="flex-1 flex flex-col items-center justify-center py-3">
                                <span className="text-xl font-black text-gray-900">
                                    {eta || '—'}
                                </span>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-0.5">
                                    ETA
                                </p>
                            </div>
                        </div>
                        {/* Status bar */}
                        <div className={`px-4 py-2 text-center text-[11px] font-bold uppercase tracking-wider
                            ${arrived ? 'bg-green-500 text-white' : 'bg-gray-900 text-white'}`}>
                            {currentStatus}
                        </div>
                    </div>
                </div>

                {/* Map */}
                <div className="h-[480px] md:h-[640px] w-full">
                    <MapContainer
                        center={riderPos}
                        zoom={14}
                        scrollWheelZoom={true}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={false}
                    >
                        <TileLayer
                            attribution="&copy; OpenStreetMap"
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={destination} icon={houseIcon}>
                            <Popup>Your delivery address</Popup>
                        </Marker>
                        <Marker position={riderPos} icon={riderIcon}>
                            <Popup>{riderData.name}</Popup>
                        </Marker>
                        <Polyline
                            positions={[riderPos, destination]}
                            color="#2563eb"
                            dashArray="10, 8"
                            weight={3.5}
                            opacity={0.65}
                        />
                        <RecenterMap coords={riderPos} />
                    </MapContainer>
                </div>
            </div>

            {/* ── RIDER CARD ───────────────────────────────────────────────── */}
            <div className="px-4 pt-4 pb-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    {/* Section label */}
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 mb-3">
                        Your Rider
                    </p>

                    <div className="flex items-center justify-between">
                        {/* Avatar + name */}
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md">
                                {initials}
                            </div>
                            <div>
                                <p className="text-sm font-black text-gray-900 leading-tight">{riderData.name}</p>
                                <p className="text-xs text-gray-400 font-medium mt-0.5">{riderData.contact}</p>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                            <a
                                href={`https://wa.me/91${riderData.contact}?text=Hi ${encodeURIComponent(riderData.name)}, I'm tracking my Snapit order ${orderId}. See you soon!`}
                                target="_blank"
                                rel="noreferrer"
                                className="w-11 h-11 rounded-full bg-[#25D366] hover:bg-[#128C7E] flex items-center justify-center text-white shadow transition-all active:scale-90"
                                aria-label="WhatsApp rider"
                            >
                                <FaWhatsapp size={18} />
                            </a>
                            <a
                                href={`tel:${riderData.contact}`}
                                className="w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white shadow transition-all active:scale-90"
                                aria-label="Call rider"
                            >
                                <FaPhoneAlt size={15} />
                            </a>
                        </div>
                    </div>

                    {/* Divider + progress steps */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                            {[
                                { label: 'Order Placed', done: true },
                                { label: 'Picked Up', done: !!distance },
                                { label: 'On the Way', done: !!distance && !arrived },
                                { label: 'Delivered', done: arrived },
                            ].map((step, i, arr) => (
                                <React.Fragment key={step.label}>
                                    <div className="flex flex-col items-center gap-1">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all
                                            ${step.done ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-300'}`}>
                                            {step.done ? '✓' : i + 1}
                                        </div>
                                        <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400 text-center leading-tight max-w-[52px]">
                                            {step.label}
                                        </p>
                                    </div>
                                    {i < arr.length - 1 && (
                                        <div className={`flex-1 h-[2px] mx-1 rounded-full transition-all
                                            ${step.done ? 'bg-blue-500' : 'bg-gray-100'}`} />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RiderTracking;