import React, { useEffect, useState, useCallback } from 'react';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';
import { FaMapMarkedAlt, FaCheckCircle, FaShoppingBasket, FaPhone, FaMotorcycle, FaStore } from "react-icons/fa";
import { MdPayment } from "react-icons/md";
import { io } from 'socket.io-client';
import CollectPayment from '../components/CollectPayment';

const socket = io(import.meta.env.VITE_API_URL);

const STORE_EMOJI = {
    'Pali Mega Mart':                 '🛒',
    'Monginis':                       '🎂',
    'Fresh Fruits Shop':              '🍎',
    'Egg Shop':                       '🥚',
    'Cold Drink & Energy Drink Shop': '🥤',
};
const storeEmoji = (name) => STORE_EMOJI[name] || '🏪';

const storeMapLink = (store) => {
    if (!store) return null;
    const lat = store.location?.lat;
    const lng = store.location?.lng;
    if (!lat || !lng) return null;
    return `https://www.google.com/maps?q=${lat},${lng}`;
};

const getDeliveryFee = (o) =>
    Number(o.delivery_fee ?? o.deliveryFee ?? o.delivery_charge ?? o.riderFee ?? o.rider_fee ?? 0);

const fmt = (n) => Number(n).toFixed(2);
const fmtINR = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const RiderDashboard = () => {
    const [orders, setOrders]               = useState([]);
    const [loading, setLoading]             = useState(true);
    const [filter, setFilter]               = useState('Confirmed');
    const [isTracking, setIsTracking]       = useState(false);
    const [paymentOrder, setPaymentOrder]   = useState(null);
    const [activeTab, setActiveTab]         = useState('orders');
    const [earningFilter, setEarningFilter] = useState('today');
    const [lastSynced, setLastSynced]       = useState(null);

    // ✅ OPTION 3 FIX: Fetch ALL non-delivered orders directly
    // Rider sees orders as soon as delivery_status = 'Confirmed'
    // regardless of what seller did — no dependency on seller_status
    const fetchRiderOrders = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const response = await Axios({ ...SummaryApi.getOrderItems });
            if (response.data.success) {
                const allOrders = Array.isArray(response.data.data) ? response.data.data : [];

                // ✅ OPTION 3: Also show orders where seller hasn't confirmed but
                // order is old enough (>10 mins) — these will be auto-confirmed by
                // backend cron (Option 1) but rider can see them immediately
                const visibleOrders = allOrders.filter(o => {
                    // Always show confirmed, out-for-delivery, delivered
                    if (['Confirmed', 'Out for Delivery', 'Delivered'].includes(o.delivery_status)) return true;

                    // ✅ Also show Pending orders older than 8 mins
                    // so rider sees it slightly before auto-confirm fires
                    const ageMinutes = (Date.now() - new Date(o.createdAt)) / 60000;
                    if (o.delivery_status === 'Pending' && ageMinutes >= 3) return true;

                    return false;
                });

                setOrders(visibleOrders);
                setLastSynced(new Date());
            }
        } catch {
            if (!silent) toast.error("Failed to sync with server");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRiderOrders();

        // ✅ OPTION 3: Poll every 30 seconds — rider always gets fresh orders
        const interval = setInterval(() => fetchRiderOrders(true), 30000);
        return () => clearInterval(interval);
    }, [fetchRiderOrders]);

    // ✅ Socket: real-time order updates
    useEffect(() => {
        socket.on('new_order', () => {
            fetchRiderOrders(true);
            toast('🛵 New order available!', { icon: '📦' });
        });

        socket.on('order_confirmed', () => {
            fetchRiderOrders(true);
        });

        return () => {
            socket.off('new_order');
            socket.off('order_confirmed');
        };
    }, [fetchRiderOrders]);

    useEffect(() => {
        let watchId;
        if (isTracking) {
            watchId = navigator.geolocation.watchPosition((pos) => {
                const activeOrder = orders.find(o => o.delivery_status === "Out for Delivery");
                if (activeOrder) {
                    socket.emit('update_location', {
                        orderId:   activeOrder.orderId,
                        latitude:  pos.coords.latitude,
                        longitude: pos.coords.longitude
                    });
                }
            }, (err) => console.error(err), { enableHighAccuracy: true });
            toast.success("Live tracking active!");
        }
        return () => navigator.geolocation.clearWatch(watchId);
    }, [isTracking, orders]);

    const handlePickup = async (order) => {
        try {
            const response = await Axios({
                ...SummaryApi.updateOrderStatus,
                data: { orderId: order.orderId, status: 'Out for Delivery' }
            });
            if (response.data.success) {
                toast.success('Order picked up — now Out for Delivery!');
                setIsTracking(true);
                fetchRiderOrders(true);
            }
        } catch {
            toast.error("Update failed");
        }
    };

    // ── Earnings ──────────────────────────────────────────────
    const now = new Date();
    const filterByDate = (list) => list.filter(o => {
        const created = new Date(o.createdAt);
        if (earningFilter === 'today') return created.toDateString() === now.toDateString();
        if (earningFilter === 'week')  { const w = new Date(now); w.setDate(now.getDate()-7); return created >= w; }
        if (earningFilter === 'month') return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
        return true;
    });

    const deliveredOrders  = orders.filter(o => o.delivery_status === 'Delivered');
    const filteredEarnings = filterByDate(deliveredOrders);
    const totalEarned      = filteredEarnings.reduce((acc, o) => acc + getDeliveryFee(o), 0);
    const totalDelivered   = filteredEarnings.length;
    const avgFee           = totalDelivered > 0 ? totalEarned / totalDelivered : 0;

    const earningsByDate = filteredEarnings.reduce((acc, o) => {
        const date = new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        if (!acc[date]) acc[date] = { total: 0, count: 0 };
        acc[date].total += getDeliveryFee(o);
        acc[date].count += 1;
        return acc;
    }, {});

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
        <div className='flex flex-col items-center justify-center min-h-screen bg-slate-950'>
            <div className='relative w-16 h-16 mb-6'>
                <div className='absolute inset-0 border-4 border-blue-500/30 rounded-full'></div>
                <div className='absolute inset-0 border-4 border-t-blue-400 rounded-full animate-spin'></div>
                <span className='absolute inset-0 flex items-center justify-center text-2xl'>🛵</span>
            </div>
            <p className='font-black text-blue-400 tracking-widest text-xs uppercase animate-pulse'>Syncing Paliganj Orders…</p>
        </div>
    );

    return (
        <div className='min-h-screen bg-slate-950 text-white'>

            {/* ── TOP HEADER BAR ── */}
            <div className='sticky top-0 z-30 bg-slate-950/90 backdrop-blur border-b border-slate-800 px-4 py-3'>
                <div className='max-w-5xl mx-auto flex justify-between items-center gap-3'>
                    <div>
                        <p className='text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]'>Snapit Logistics · Bihar</p>
                        <h1 className='text-lg font-black text-white leading-none'>RIDER COMMAND</h1>
                        {/* ✅ Show last synced time */}
                        {lastSynced && (
                            <p className='text-[8px] text-slate-600'>
                                Synced {lastSynced.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </p>
                        )}
                    </div>
                    <div className='flex gap-2 items-center'>
                        <div className='bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-center'>
                            <p className='text-[8px] font-black text-slate-400 uppercase'>Cash in Hand</p>
                            <p className='text-base font-black text-amber-400'>{fmtINR(totalInHand)}</p>
                        </div>
                        {/* Manual refresh */}
                        <button
                            onClick={() => fetchRiderOrders(true)}
                            className='w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-90'>
                            🔄
                        </button>
                        <button
                            onClick={() => setIsTracking(!isTracking)}
                            className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 transition-all ${
                                isTracking
                                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse'
                                    : 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            }`}
                        >
                            <FaMotorcycle size={14}/>
                            {isTracking ? "STOP GPS" : "GPS"}
                        </button>
                    </div>
                </div>
            </div>

            <div className='max-w-5xl mx-auto px-4 py-5'>

                {/* ── TABS ── */}
                <div className='flex gap-2 mb-5 bg-slate-900 rounded-2xl p-1 border border-slate-800'>
                    <button onClick={() => setActiveTab('orders')}
                        className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all ${
                            activeTab === 'orders'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                : 'text-slate-400 hover:text-white'
                        }`}>
                        🛵 Orders ({orders.filter(o => o.delivery_status !== 'Delivered' && o.delivery_status !== 'Cancelled').length})
                    </button>
                    <button onClick={() => setActiveTab('earnings')}
                        className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all ${
                            activeTab === 'earnings'
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                                : 'text-slate-400 hover:text-white'
                        }`}>
                        💰 Earnings
                    </button>
                </div>

                {/* ══════════════ ORDERS TAB ══════════════ */}
                {activeTab === 'orders' && (
                    <>
                        <div className='flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide'>
                            {['All', 'Confirmed', 'Out for Delivery', 'Delivered'].map(t => (
                                <button key={t} onClick={() => setFilter(t)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all border ${
                                        filter === t
                                            ? 'bg-white text-slate-900 border-white'
                                            : 'bg-transparent text-slate-400 border-slate-700 hover:border-slate-500'
                                    }`}>
                                    {t === 'Confirmed' ? '📦 Ready for Pickup' : t === 'Out for Delivery' ? '🛵 Out for Delivery' : t === 'Delivered' ? '✅ Delivered' : '📋 All'}
                                </button>
                            ))}
                        </div>

                        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                            {filteredOrders.length === 0 ? (
                                <div className='col-span-full py-20 text-center bg-slate-900 rounded-3xl border-2 border-dashed border-slate-700'>
                                    <p className='text-5xl mb-3'>🛵</p>
                                    <p className='text-slate-400 font-black'>No {filter === 'Confirmed' ? 'Ready for Pickup' : filter} orders</p>
                                    <p className='text-slate-600 text-xs mt-1'>Auto-refreshes every 30 seconds</p>
                                    <button onClick={() => fetchRiderOrders(true)} className='mt-3 text-xs text-blue-400 font-black underline'>Refresh Now</button>
                                </div>
                            ) : (
                                filteredOrders.map((order) => {
                                    const store          = order.store_details;
                                    const mapLink        = storeMapLink(store);
                                    const hasMultiStores = order.involved_stores?.length > 1;

                                    // ✅ Show warning badge if seller hasn't confirmed but order is old
                                    const ageMinutes = (Date.now() - new Date(order.createdAt)) / 60000;
                                    const isSellerDelayed = order.delivery_status === 'Pending' && ageMinutes >= 3;

                                    return (
                                        <div key={order._id}
                                            className={`bg-slate-900 border rounded-3xl p-5 flex flex-col gap-4 transition-all ${
                                                isSellerDelayed
                                                    ? 'border-amber-500/50 shadow-lg shadow-amber-500/10'
                                                    : 'border-slate-800 hover:border-slate-600'
                                            }`}>

                                            {/* ✅ Seller delayed warning */}
                                            {isSellerDelayed && (
                                                <div className='bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 flex items-center gap-2'>
                                                    <span>⚠️</span>
                                                    <p className='text-[10px] font-black text-amber-400'>
                                                        Seller not responded — auto-confirming soon
                                                    </p>
                                                </div>
                                            )}

                                            {/* Order ID + Customer */}
                                            <div className='flex justify-between items-start'>
                                                <div className='flex-1'>
                                                    <span className='text-[9px] font-black bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full uppercase tracking-wider'>
                                                        {order.orderId}
                                                    </span>
                                                    <h2 className='text-sm font-bold text-white mt-2.5 leading-tight'>
                                                        {order.delivery_address?.address_line || "📍 Address not provided"}
                                                    </h2>
                                                    <p className='text-xs text-slate-500 font-medium mt-0.5'>
                                                        {order.userId?.name || "Snapit User"}
                                                    </p>
                                                </div>
                                                <div className='flex gap-2 ml-3 flex-shrink-0'>
                                                    <a href={`tel:${order.delivery_address?.mobile || order.userId?.mobile}`}
                                                        className='p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl hover:bg-emerald-500 hover:text-white transition-all'>
                                                        <FaPhone size={15}/>
                                                    </a>
                                                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address?.address_line || "")}`}
                                                        target="_blank" rel="noreferrer"
                                                        className='p-2.5 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500 hover:text-white transition-all'>
                                                        <FaMapMarkedAlt size={15}/>
                                                    </a>
                                                </div>
                                            </div>

                                            {/* Store Info */}
                                            <div className='bg-slate-800/60 rounded-2xl p-3 border border-slate-700/50'>
                                                <div className='flex items-center justify-between'>
                                                    <div className='flex items-center gap-2.5'>
                                                        <span className='text-xl'>{storeEmoji(store?.name)}</span>
                                                        <div>
                                                            <p className='text-[9px] font-black text-amber-500/80 uppercase flex items-center gap-1'>
                                                                <FaStore size={7}/> Pickup From
                                                            </p>
                                                            <p className='text-sm font-black text-white'>{store?.name || "Pali Mega Mart"}</p>
                                                            {store?.address && <p className='text-[10px] text-slate-400'>{store.address}</p>}
                                                        </div>
                                                    </div>
                                                    {mapLink && (
                                                        <a href={mapLink} target="_blank" rel="noreferrer"
                                                            className='flex flex-col items-center bg-amber-500 text-slate-900 px-2.5 py-1.5 rounded-xl text-[9px] font-black gap-0.5 hover:bg-amber-400 transition-all'>
                                                            <FaMapMarkedAlt size={12}/>MAP
                                                        </a>
                                                    )}
                                                </div>
                                                {hasMultiStores && (
                                                    <div className='mt-2 pt-2 border-t border-slate-700'>
                                                        <p className='text-[9px] font-black text-purple-400 uppercase mb-1'>⚡ Multi-Store — collect all:</p>
                                                        <div className='flex flex-wrap gap-1'>
                                                            {order.involved_stores.map((s, i) => (
                                                                <span key={i} className='bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[9px] font-bold px-2 py-0.5 rounded-full'>
                                                                    {storeEmoji(s)} {s}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Items */}
                                            <div className='bg-slate-800/40 rounded-2xl p-3'>
                                                <p className='text-[9px] font-black text-slate-500 uppercase flex items-center gap-1 mb-2'>
                                                    <FaShoppingBasket size={9}/> Items
                                                </p>
                                                {order.cartItems?.map((item, i) => (
                                                    <div key={i} className='flex justify-between text-xs py-1 font-bold text-slate-300'>
                                                        <span className='line-clamp-1 mr-2'>
                                                            {hasMultiStores && item.seller_store_name
                                                                ? <span className='text-purple-400'>{storeEmoji(item.seller_store_name)} </span>
                                                                : null}
                                                            {item.productId?.name || item.name}
                                                        </span>
                                                        <span className='text-blue-400 flex-shrink-0'>×{item.quantity}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Amount + Status */}
                                            <div className='flex justify-between items-end'>
                                                <div>
                                                    <p className='text-[9px] font-black text-slate-500 uppercase'>Collect</p>
                                                    <p className='text-2xl font-black text-white'>{fmtINR(order.totalAmt)}</p>
                                                    <p className='text-[9px] text-slate-500 mt-0.5'>
                                                        {order.payment_status === 'CASH ON DELIVERY' ? '💵 Cash' : '✅ Paid Online'}
                                                    </p>
                                                </div>
                                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${
                                                    order.delivery_status === 'Confirmed'        ? 'bg-amber-500/20 text-amber-400' :
                                                    order.delivery_status === 'Out for Delivery' ? 'bg-blue-500/20 text-blue-400'  :
                                                    isSellerDelayed                              ? 'bg-orange-500/20 text-orange-400' :
                                                    'bg-emerald-500/20 text-emerald-400'
                                                }`}>
                                                    {isSellerDelayed ? '⏳ Awaiting Seller' : order.delivery_status === 'Confirmed' ? 'Ready' : order.delivery_status}
                                                </span>
                                            </div>

                                            {/* Action Buttons */}
                                            {(order.delivery_status === 'Confirmed') && (
                                                <button onClick={() => handlePickup(order)}
                                                    className='w-full py-3.5 rounded-2xl font-black text-sm text-white bg-amber-500 hover:bg-amber-400 shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 active:scale-95'>
                                                    <FaCheckCircle/> PICKUP FROM {store?.name?.toUpperCase() || 'STORE'}
                                                </button>
                                            )}
                                            {/* ✅ Allow pickup even if seller delayed (Option 3) */}
                                            {isSellerDelayed && (
                                                <button onClick={() => handlePickup(order)}
                                                    className='w-full py-3.5 rounded-2xl font-black text-sm text-white bg-orange-500 hover:bg-orange-400 shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 active:scale-95'>
                                                    <FaCheckCircle/> PICKUP ANYWAY (Seller Delayed)
                                                </button>
                                            )}
                                            {order.delivery_status === 'Out for Delivery' && (
                                                <button onClick={() => setPaymentOrder(order)}
                                                    className='w-full py-3.5 rounded-2xl font-black text-sm text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 active:scale-95'>
                                                    <MdPayment size={18}/> COLLECT PAYMENT
                                                </button>
                                            )}
                                            {order.delivery_status === 'Delivered' && (
                                                <div className='w-full py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black text-sm text-center'>
                                                    ✅ Delivered
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </>
                )}

                {/* ══════════════ EARNINGS TAB ══════════════ */}
                {activeTab === 'earnings' && (
                    <div className='flex flex-col gap-4'>
                        <div className='flex gap-2 flex-wrap'>
                            {[
                                { key: 'today', label: 'Today' },
                                { key: 'week',  label: 'This Week' },
                                { key: 'month', label: 'This Month' },
                                { key: 'all',   label: 'All Time' },
                            ].map(f => (
                                <button key={f.key} onClick={() => setEarningFilter(f.key)}
                                    className={`px-4 py-2 rounded-full text-xs font-black transition-all border ${
                                        earningFilter === f.key
                                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                                            : 'bg-transparent text-slate-400 border-slate-700 hover:border-slate-500'
                                    }`}>
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        <div className='grid grid-cols-2 gap-3'>
                            <div className='col-span-2 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-5 shadow-xl shadow-emerald-900/40'>
                                <p className='text-[9px] font-black text-emerald-200/80 uppercase tracking-widest mb-1'>Total Earned</p>
                                <p className='text-4xl font-black text-white'>{fmtINR(totalEarned)}</p>
                                <div className='mt-3 pt-3 border-t border-emerald-500/40 flex gap-4 flex-wrap'>
                                    <div>
                                        <p className='text-[9px] text-emerald-200/60 uppercase font-bold'>Deliveries</p>
                                        <p className='text-lg font-black text-white'>{totalDelivered}</p>
                                    </div>
                                    <div>
                                        <p className='text-[9px] text-emerald-200/60 uppercase font-bold'>Avg per Drop</p>
                                        <p className='text-lg font-black text-white'>{fmtINR(avgFee)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                <p className='text-[9px] font-black text-slate-500 uppercase'>Deliveries Done</p>
                                <p className='text-3xl font-black text-white mt-1'>{totalDelivered}</p>
                            </div>
                            <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                <p className='text-[9px] font-black text-slate-500 uppercase'>Avg Fee</p>
                                <p className='text-3xl font-black text-blue-400 mt-1'>{fmtINR(avgFee)}</p>
                            </div>
                        </div>

                        <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                            <h3 className='font-black text-white text-xs uppercase tracking-widest mb-3'>📅 Daily Breakdown</h3>
                            {Object.keys(earningsByDate).length === 0 ? (
                                <p className='text-slate-500 text-sm text-center py-6'>No deliveries in this period.</p>
                            ) : (
                                <div className='flex flex-col divide-y divide-slate-800'>
                                    {Object.entries(earningsByDate)
                                        .sort((a, b) => new Date(b[0]) - new Date(a[0]))
                                        .map(([date, data]) => (
                                            <div key={date} className='flex justify-between items-center py-3'>
                                                <div>
                                                    <p className='font-bold text-white text-sm'>{date}</p>
                                                    <p className='text-[10px] text-slate-500'>{data.count} delivery{data.count > 1 ? 's' : ''}</p>
                                                </div>
                                                <p className='font-black text-emerald-400 text-lg'>{fmtINR(data.total)}</p>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>

                        <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                            <h3 className='font-black text-white text-xs uppercase tracking-widest mb-3'>🛵 Recent Deliveries</h3>
                            {filteredEarnings.length === 0 ? (
                                <p className='text-slate-500 text-sm text-center py-6'>No deliveries yet.</p>
                            ) : (
                                <div className='flex flex-col divide-y divide-slate-800'>
                                    {filteredEarnings.slice(0, 10).map(order => (
                                        <div key={order._id} className='flex justify-between items-center py-3'>
                                            <div>
                                                <p className='font-bold text-slate-300 text-xs font-mono'>{order.orderId}</p>
                                                <p className='text-[10px] text-slate-500 mt-0.5'>
                                                    {storeEmoji(order.store_details?.name)} {order.store_details?.name || 'Store'}
                                                </p>
                                            </div>
                                            <div className='text-right'>
                                                <p className='font-black text-emerald-400'>{fmtINR(getDeliveryFee(order))}</p>
                                                <p className='text-[10px] text-slate-500'>
                                                    {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {paymentOrder && (
                <CollectPayment
                    order={paymentOrder}
                    onClose={() => setPaymentOrder(null)}
                    onSuccess={() => { setPaymentOrder(null); setIsTracking(false); fetchRiderOrders(true); }}
                />
            )}
        </div>
    );
};

export default RiderDashboard;