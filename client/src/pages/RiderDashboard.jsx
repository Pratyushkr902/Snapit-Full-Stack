import React, { useEffect, useState } from 'react';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';
import { FaMapMarkedAlt, FaCheckCircle, FaShoppingBasket, FaPhone, FaMotorcycle, FaStore } from "react-icons/fa";
import { MdPayment } from "react-icons/md";
import { io } from 'socket.io-client';
import CollectPayment from '../components/CollectPayment';

const socket = io(import.meta.env.VITE_API_URL || "https://snapit-full-stack-2.onrender.com");

const RiderDashboard = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('Confirmed');
    const [isTracking, setIsTracking] = useState(false);
    const [paymentOrder, setPaymentOrder] = useState(null); // order for payment modal

    const fetchRiderOrders = async () => {
        try {
            if (orders.length === 0) setLoading(true);
            const response = await Axios({ ...SummaryApi.getOrderItems });
            if (response.data.success) {
                setOrders(Array.isArray(response.data.data) ? response.data.data : []);
            }
        } catch (error) {
            toast.error("Failed to sync with server");
        } finally {
            setLoading(false);
        }
    };

    // Live GPS tracking
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

    // Pickup from store (Confirmed → Out for Delivery)
    const handlePickup = async (order) => {
        try {
            const response = await Axios({
                ...SummaryApi.updateOrderStatus,
                data: {
                    orderId: order.orderId,
                    status: 'Out for Delivery',
                }
            });
            if (response.data.success) {
                toast.success('Order picked up — now Out for Delivery!')
                setIsTracking(true)
                fetchRiderOrders();
            }
        } catch (error) {
            toast.error("Update failed");
        }
    };

    useEffect(() => {
        fetchRiderOrders();
        const interval = setInterval(fetchRiderOrders, 30000);
        return () => clearInterval(interval);
    }, []);

    const filteredOrders = orders.filter(o => {
        if (filter === 'Delivered') return o.delivery_status === 'Delivered';
        if (o.delivery_status === 'Delivered' || o.delivery_status === 'Cancelled') return false;
        if (filter === 'All') return true;
        return o.delivery_status === filter;
    });

    const totalInHand = orders
        .filter(o => o.delivery_status === 'Out for Delivery')
        .reduce((acc, curr) => acc + (Number(curr?.totalAmt) || 0), 0);

    if (loading) return (
        <div className='p-20 text-center'>
            <div className='w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
            <p className='font-bold text-blue-600 animate-pulse'>Syncing Paliganj Orders...</p>
        </div>
    );

    return (
        <div className='container mx-auto p-4 min-h-screen bg-slate-50'>

            {/* Header */}
            <div className='flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4'>
                <div>
                    <h1 className='text-3xl font-black text-slate-900'>RIDER COMMAND</h1>
                    <p className='text-slate-500 font-bold text-xs uppercase tracking-widest'>Snapit Logistics - Bihar</p>
                </div>

                <div className='flex gap-3'>
                    <div className='bg-white p-3 rounded-2xl shadow-sm border border-slate-200 text-center min-w-[100px]'>
                        <p className='text-[10px] font-bold text-slate-400 uppercase'>Cash in Hand</p>
                        <p className='text-xl font-black text-blue-600'>₹{totalInHand}</p>
                    </div>
                    <button
                        onClick={() => setIsTracking(!isTracking)}
                        className={`px-6 rounded-2xl font-bold flex items-center gap-2 transition-all ${isTracking ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200' : 'bg-slate-900 text-white'}`}
                    >
                        <FaMotorcycle /> {isTracking ? "STOP GPS" : "START GPS"}
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
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

            {/* Order Cards */}
            <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
                {filteredOrders.length === 0 ? (
                    <div className='col-span-full py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200'>
                        <p className='text-slate-400 font-bold italic'>No {filter === 'Confirmed' ? 'Ready for Pickup' : filter} orders.</p>
                        <button onClick={fetchRiderOrders} className='mt-2 text-xs text-blue-600 font-bold underline'>Refresh</button>
                    </div>
                ) : (
                    filteredOrders.map((order) => (
                        <div key={order._id} className='bg-white shadow-sm rounded-[2.5rem] p-6 border border-slate-100 flex flex-col hover:shadow-md transition-shadow'>

                            {/* Order ID + Contact Buttons */}
                            <div className='flex justify-between items-start mb-4'>
                                <div className='flex-1'>
                                    <span className='text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase'>
                                        {order.orderId}
                                    </span>
                                    <h2 className='text-sm font-bold text-slate-800 mt-3 leading-tight'>
                                        {order.delivery_address?.address_line || order.address_details?.address_line || "📍 Address not provided"}
                                    </h2>
                                    <p className='text-xs text-slate-500 font-medium mt-1'>
                                        {order.userId?.name || order.address_details?.name || "Snapit User"}
                                    </p>
                                </div>
                                <div className='flex gap-2'>
                                    <a
                                        href={`tel:${order.delivery_address?.mobile || order.userId?.mobile || order.address_details?.mobile}`}
                                        className='p-3 bg-green-50 text-green-600 rounded-2xl hover:bg-green-600 hover:text-white transition-all'
                                    >
                                        <FaPhone size={18} />
                                    </a>
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address?.address_line || "")}`}
                                        target="_blank" rel="noreferrer"
                                        className='p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all'
                                    >
                                        <FaMapMarkedAlt size={18} />
                                    </a>
                                </div>
                            </div>

                            {/* Store Pickup Info */}
                            <div className='bg-orange-50 rounded-2xl p-3 mb-3 border border-orange-100'>
                                <p className='text-[10px] font-black text-orange-600 uppercase flex items-center gap-1 mb-1'>
                                    <FaStore /> Pickup Point
                                </p>
                                <p className='text-xs font-bold text-slate-700'>
                                    {order.store_details?.name || "Snapit Main Store - Paliganj"}
                                </p>
                            </div>

                            {/* Cart Items */}
                            <div className='bg-slate-50 rounded-2xl p-3 mb-4'>
                                <p className='text-[10px] font-black text-slate-400 uppercase flex items-center gap-1 mb-2'>
                                    <FaShoppingBasket /> Items
                                </p>
                                {order.cartItems?.map((item, i) => (
                                    <div key={i} className='flex justify-between text-xs py-1 font-bold text-slate-700'>
                                        <span className='line-clamp-1 mr-2'>{item.productId?.name || item.name}</span>
                                        <span className='text-blue-600'>×{item.quantity}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Amount + Status */}
                            <div className='flex justify-between items-end mb-4 mt-auto'>
                                <div>
                                    <p className='text-[10px] font-black text-slate-400 uppercase'>Collect</p>
                                    <p className='text-2xl font-black text-slate-900'>₹{order.totalAmt}</p>
                                    <p className='text-[10px] text-slate-400 mt-0.5'>
                                        {order.payment_status === 'CASH ON DELIVERY' ? '💵 Cash' : '✅ Paid Online'}
                                    </p>
                                </div>
                                <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                                    order.delivery_status === 'Confirmed' ? 'bg-orange-100 text-orange-600' :
                                    order.delivery_status === 'Out for Delivery' ? 'bg-blue-100 text-blue-600' :
                                    'bg-green-100 text-green-600'
                                }`}>
                                    {order.delivery_status === 'Confirmed' ? 'Ready' : order.delivery_status}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            {order.delivery_status === 'Confirmed' && (
                                <button
                                    onClick={() => handlePickup(order)}
                                    className='w-full py-4 rounded-2xl font-black text-white bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2 active:scale-95'
                                >
                                    <FaCheckCircle /> PICKUP FROM STORE
                                </button>
                            )}

                            {order.delivery_status === 'Out for Delivery' && (
                                <button
                                    onClick={() => setPaymentOrder(order)}
                                    className='w-full py-4 rounded-2xl font-black text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-2 active:scale-95'
                                >
                                    <MdPayment size={20} /> COLLECT PAYMENT
                                </button>
                            )}

                            {order.delivery_status === 'Delivered' && (
                                <div className='w-full py-3 rounded-2xl bg-green-50 border-2 border-green-200 text-green-700 font-black text-sm text-center'>
                                    ✅ Delivered
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* CollectPayment Modal */}
            {paymentOrder && (
                <CollectPayment
                    order={paymentOrder}
                    onSuccess={() => {
                        setPaymentOrder(null)
                        setIsTracking(false)
                        fetchRiderOrders()
                    }}
                />
            )}
        </div>
    );
};

export default RiderDashboard;