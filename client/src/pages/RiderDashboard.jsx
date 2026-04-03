import React, { useEffect, useState } from 'react';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';
import { FaMapMarkedAlt, FaCheckCircle, FaShoppingBasket, FaPhone, FaMotorcycle, FaHistory, FaStore } from "react-icons/fa";
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_URL || "https://snapit-full-stack-2.onrender.com");

const RiderDashboard = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('Confirmed'); // Default to 'Confirmed' (Ready for Pickup)
    const [collectedCash, setCollectedCash] = useState({});
    const [isTracking, setIsTracking] = useState(false);

    const fetchRiderOrders = async () => {
        try {
            if(orders.length === 0) setLoading(true); 
            
            const response = await Axios({ ...SummaryApi.getOrderItems });
            if (response.data.success) {
                setOrders(Array.isArray(response.data.data) ? response.data.data : []);
            }
        } catch (error) {
            toast.error("Failed to sync with server");
        } finally { setLoading(false); }
    };

    useEffect(() => {
        let watchId;
        if (isTracking) {
            watchId = navigator.geolocation.watchPosition((pos) => {
                const activeOrder = orders.find(o => o.delivery_status === "Out for Delivery");
                if (activeOrder) {
                    socket.emit('update_location', {
                        orderId: activeOrder.orderId,
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude
                    });
                }
            }, (err) => console.error(err), { enableHighAccuracy: true });
            toast.success("Live tracking active!");
        }
        return () => navigator.geolocation.clearWatch(watchId);
    }, [isTracking, orders]);

    const handleStatusUpdate = async (order, newStatus) => {
        const orderIdKey = order._id;
        
        if (newStatus === "Delivered") {
            const amount = collectedCash[orderIdKey];
            if (!amount || parseFloat(amount) <= 0) {
                return toast.error("Enter cash amount to finish delivery!");
            }
        }

        try {
            const response = await Axios({
                ...SummaryApi.updateOrderStatus, 
                data: { 
                    orderId: order.orderId, 
                    status: newStatus, 
                    cashReceived: collectedCash[orderIdKey] 
                }
            });

            if (response.data.success) {
                toast.success(`Order status: ${newStatus}`);
                if (newStatus === "Delivered") setIsTracking(false);
                fetchRiderOrders();
            }
        } catch (error) {
            toast.error("Update failed");
        }
    };

    useEffect(() => { 
        fetchRiderOrders(); 

        const interval = setInterval(() => {
            fetchRiderOrders();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const filteredOrders = orders.filter(o => {
        if (filter === 'Delivered') return o.delivery_status === 'Delivered';
        if (o.delivery_status === 'Delivered' || o.delivery_status === 'Cancelled') return false;
        if (filter === 'All') return true;
        return o.delivery_status === filter;
    });

    const totalInHand = orders
        .filter(o => o.delivery_status !== 'Delivered')
        .reduce((acc, curr) => acc + (Number(curr?.totalAmt) || 0), 0);

    if (loading) return <div className='p-20 text-center animate-pulse font-bold text-blue-600'>Syncing Paliganj Orders...</div>;

    return (
        <div className='container mx-auto p-4 min-h-screen bg-slate-50'>
            <div className='flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4'>
                <div>
                    <h1 className='text-3xl font-black text-slate-900'>RIDER COMMAND</h1>
                    <p className='text-slate-500 font-bold text-xs uppercase tracking-widest'>Snapit Logistics - Bihar</p>
                </div>
                
                <div className='flex gap-3'>
                    <div className='bg-white p-3 rounded-2xl shadow-sm border border-slate-200 text-center min-w-[100px]'>
                        <p className='text-[10px] font-bold text-slate-400 uppercase'>Active Load</p>
                        <p className='text-xl font-black text-blue-600'>₹{totalInHand}</p>
                    </div>
                    <button 
                        onClick={() => setIsTracking(!isTracking)}
                        className={`px-6 rounded-2xl font-bold flex items-center gap-2 transition-all ${isTracking ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200' : 'bg-slate-900 text-white'}`}
                    >
                        <FaMotorcycle /> {isTracking ? "STOP TRACKING" : "START TRACKING"}
                    </button>
                </div>
            </div>

            <div className='flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide'>
                {['All', 'Confirmed', 'Out for Delivery', 'Delivered'].map(t => (
                    <button 
                        key={t}
                        onClick={() => setFilter(t)}
                        className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${filter === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                        {t === 'Confirmed' ? 'Ready for Pickup' : t}
                    </button>
                ))}
            </div>
            
            <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
                {filteredOrders.length === 0 ? (
                    <div className='col-span-full py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200'>
                        <p className='text-slate-400 font-bold italic'>No active {filter} orders found.</p>
                        <button onClick={fetchRiderOrders} className='mt-2 text-xs text-blue-600 font-bold underline'>Refresh manually</button>
                    </div>
                ) : (
                    filteredOrders.map((order) => (
                        <div key={order._id} className='bg-white shadow-sm rounded-[2.5rem] p-6 border border-slate-100 flex flex-col hover:shadow-md transition-shadow'>
                            <div className='flex justify-between items-start mb-4'>
                                <div className='flex-1'>
                                    <span className='text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase'>{order.orderId}</span>
                                    <h2 className='text-sm font-bold text-slate-800 mt-3 leading-tight'>
                                        {/* FIXED: Improved Address access logic to prevent "Address not provided" */}
                                        {order.delivery_address?.address_line || order.address_details?.address_line || order.address || "📍 Address not provided"}
                                    </h2>
                                    <p className='text-xs text-slate-500 font-medium mt-1'>
                                        Customer: {order.userId?.name || order.address_details?.name || "Snapit User"}
                                    </p>
                                </div>
                                
                                <div className='flex gap-2'>
                                    <a href={`tel:${order.delivery_address?.mobile || order.userId?.mobile || order.address_details?.mobile}`} className='p-3 bg-green-50 text-green-600 rounded-2xl hover:bg-green-600 hover:text-white transition-all'>
                                        <FaPhone size={18} />
                                    </a>
                                    <a 
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address?.address_line || order.address_details?.address_line || "")}`}
                                        target="_blank" rel="noreferrer"
                                        className='p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all'
                                    >
                                        <FaMapMarkedAlt size={18} />
                                    </a>
                                </div>
                            </div>

                            <div className='bg-orange-50 rounded-2xl p-4 mb-4 border border-orange-100'>
                                <p className='text-[10px] font-black text-orange-600 uppercase flex items-center gap-1 mb-1'>
                                    <FaStore/> Pickup Point
                                </p>
                                <p className='text-xs font-bold text-slate-700'>{order.store_details?.name || "Snapit Main Store - Paliganj"}</p>
                            </div>

                            <div className='bg-slate-50 rounded-2xl p-4 mb-4'>
                                <p className='text-[10px] font-black text-slate-400 uppercase flex items-center gap-1 mb-2'>
                                    <FaShoppingBasket/> Items
                                </p>
                                {order.cartItems?.map((item, i) => (
                                    <div key={i} className='flex justify-between text-xs py-1 font-bold text-slate-700'>
                                        <span className='line-clamp-1 mr-2'>{item.productId?.name || item.name}</span>
                                        <span className='text-blue-600'>x{item.quantity}</span>
                                    </div>
                                ))}
                            </div>

                            <div className='mt-auto'>
                                <div className='flex justify-between items-end mb-4'>
                                    <div>
                                        <p className='text-[10px] font-black text-slate-400 uppercase'>Collection</p>
                                        <p className='text-xl font-black text-slate-900'>₹{order.totalAmt}</p>
                                    </div>
                                    <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${order.delivery_status === 'Confirmed' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {order.delivery_status === 'Confirmed' ? 'Ready' : order.delivery_status}
                                    </div>
                                </div>

                                {order.delivery_status === "Out for Delivery" && (
                                    <div className='mb-4'>
                                        <input 
                                            type="number"
                                            placeholder="Enter Cash Collected"
                                            value={collectedCash[order._id] || ""}
                                            onChange={(e) => setCollectedCash({...collectedCash, [order._id]: e.target.value})}
                                            className='w-full px-4 py-4 rounded-2xl bg-slate-100 border-2 border-transparent focus:border-blue-600 focus:bg-white text-slate-900 font-bold outline-none transition-all'
                                        />
                                    </div>
                                )}

                                {order.delivery_status !== "Delivered" && (
                                    <button 
                                        onClick={() => handleStatusUpdate(order, order.delivery_status === "Confirmed" ? "Out for Delivery" : "Delivered")}
                                        className={`w-full py-4 rounded-2xl font-black text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                                            order.delivery_status === "Confirmed" ? "bg-orange-500 hover:bg-orange-600 shadow-orange-200" : "bg-green-600 hover:bg-green-700 shadow-green-200"
                                        }`}
                                    >
                                        <FaCheckCircle />
                                        {order.delivery_status === "Confirmed" ? "PICKUP FROM STORE" : "MARK DELIVERED"}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default RiderDashboard;