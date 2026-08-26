import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';
import { FaMapMarkedAlt, FaCheckCircle, FaShoppingBasket, FaPhone, FaMotorcycle, FaStore, FaClock, FaPowerOff, FaMoneyBillWave } from "react-icons/fa";
import { MdPayment } from "react-icons/md";
import { IoArrowBack } from "react-icons/io5";
import { io } from 'socket.io-client';
import CollectPayment from '../components/CollectPayment';
import RiderCashRemittanceModal from '../components/RiderCashRemittanceModal';

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

const getDeliveryFee = (o) => {
    const fee = o.delivery_fee ?? o.deliveryFee ?? o.delivery_charge ?? o.riderFee ?? o.rider_fee ?? 0;
    return isNaN(Number(fee)) ? 0 : Number(fee);
};

const fmt = (n) => Number(n).toFixed(2);
const fmtINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const formatDutyDuration = (totalMinutes) => {
    const m = Number(totalMinutes || 0);
    const hrs = Math.floor(m / 60);
    const mins = m % 60;
    if (hrs === 0) return `${mins}m`;
    return `${hrs}h ${mins}m`;
};

// e.g. "5 Jul at 12:58 PM" — same format used in the admin History view
const fmtOrderTime = (dateVal) => {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    if (isNaN(d)) return null;
    const datePart = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const timePart = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${datePart} at ${timePart}`;
};

const RiderDashboard = () => {
    const navigate = useNavigate();
    const user = useSelector(state => state.user);
    const [orders, setOrders]               = useState([]);
    const [loading, setLoading]             = useState(true);
    const [filter, setFilter]               = useState('Confirmed');
    const [isTracking, setIsTracking]       = useState(false);
    const [paymentOrder, setPaymentOrder]   = useState(null);
    const [activeTab, setActiveTab]         = useState('orders');
    const [earningFilter, setEarningFilter] = useState('all');
    const [lastSynced, setLastSynced]       = useState(null);
    const [cancellingId, setCancellingId]   = useState(null);

    // ── Duty Shift State ──
    const [isDutyOn, setIsDutyOn]           = useState(false);
    const [dutyMinutes, setDutyMinutes]     = useState(0);
    const [currentShiftStart, setCurrentShiftStart] = useState(null);
    const [togglingDuty, setTogglingDuty]   = useState(false);

    // ── Remittance Modal & Cash in Hand State ──
    const [showRemittanceModal, setShowRemittanceModal] = useState(false);
    const [unremittedCash, setUnremittedCash] = useState(0);

    const socketRef = useRef(null);
    const ordersRef = useRef(orders);
    useEffect(() => { ordersRef.current = orders; }, [orders]);

    // ── Fetch Duty Status ──
    const fetchDutyStatus = useCallback(async () => {
        try {
            const res = await Axios({ ...SummaryApi.getRiderDutyStatus });
            if (res.data?.success && res.data?.data) {
                setIsDutyOn(Boolean(res.data.data.isDutyOn));
                setDutyMinutes(Number(res.data.data.totalDutyMinutes) || 0);
                setCurrentShiftStart(res.data.data.currentShiftStart ? new Date(res.data.data.currentShiftStart) : null);
            }
        } catch (err) {
            console.warn('[RiderDuty] fetch error:', err?.message);
        }
    }, []);

    // ── Fetch Unremitted Cash ──
    const fetchCashSummary = useCallback(async () => {
        try {
            const res = await Axios({ ...SummaryApi.getRiderRemittanceHistory });
            if (res.data?.success && res.data?.data?.cashSummary) {
                setUnremittedCash(Number(res.data.data.cashSummary.cashInHand) || 0);
            }
        } catch (err) {
            console.warn('[RiderRemittance] fetch error:', err?.message);
        }
    }, []);

    // ── Toggle Duty Handler ──
    const handleToggleDuty = async () => {
        try {
            setTogglingDuty(true);
            const target = !isDutyOn;
            const res = await Axios({
                ...SummaryApi.toggleRiderDuty,
                data: { status: target }
            });
            if (res.data?.success && res.data?.data) {
                setIsDutyOn(Boolean(res.data.data.isDutyOn));
                setDutyMinutes(Number(res.data.data.totalDutyMinutes) || 0);
                setCurrentShiftStart(res.data.data.currentShiftStart ? new Date(res.data.data.currentShiftStart) : null);
                if (target) {
                    toast.success('🟢 ON DUTY! You can now accept deliveries and stream live GPS.', { duration: 4000 });
                } else {
                    toast('🔴 OFF DUTY. Shift hours logged successfully.', { icon: '🛑', duration: 4000 });
                }
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to toggle duty');
        } finally {
            setTogglingDuty(false);
        }
    };

    // ── Live Duty Stopwatch Timer ──
    useEffect(() => {
        if (!isDutyOn || !currentShiftStart) return;
        const timer = setInterval(() => {
            const liveMinutes = Math.max(0, Math.round((Date.now() - new Date(currentShiftStart).getTime()) / 60000));
            // Keep timer fresh
        }, 10000);
        return () => clearInterval(timer);
    }, [isDutyOn, currentShiftStart]);

    const fetchRiderOrders = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const response = await Axios({ ...SummaryApi.getOrderItems });
            if (response.data.success) {
                const allOrders = Array.isArray(response.data.data) ? response.data.data : [];

                const visibleOrders = allOrders.filter(o => {
                    if (['Confirmed', 'Out for Delivery', 'Delivered'].includes(o.delivery_status)) return true;
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
        fetchDutyStatus();
        fetchCashSummary();
        const interval = setInterval(() => {
            fetchRiderOrders(true);
            fetchCashSummary();
        }, 30000);
        return () => clearInterval(interval);
    }, [fetchRiderOrders, fetchDutyStatus, fetchCashSummary]);

    // ─── Socket connection ───────────────────────────────────────────────────
    useEffect(() => {
        const socket = io(
            import.meta.env.VITE_API_URL || 'https://snapit-full-stack-production.up.railway.app',
            {
                path: '/socket.io/',
                transports: ['websocket', 'polling'],
                withCredentials: true,
            }
        );
        socketRef.current = socket;

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
            socket.disconnect();
        };
    }, [fetchRiderOrders]);

    // ─── GPS tracking & Fleet broadcasting while ON DUTY ────────────────────
    useEffect(() => {
        let watchId;
        if (isDutyOn) {
            watchId = navigator.geolocation.watchPosition((pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                const heading = pos.coords.heading;
                const speed = pos.coords.speed;

                // 1. Broadcast to Admin Fleet Tracker
                if (socketRef.current) {
                    socketRef.current.emit('rider_live_location', {
                        riderId: user?._id,
                        riderName: user?.name,
                        riderMobile: user?.mobile,
                        latitude: lat,
                        longitude: lng,
                        heading,
                        speed,
                        isDutyOn: true
                    });
                }

                // 2. Broadcast to specific active customer order (if Out for Delivery)
                const activeOrder = ordersRef.current.find(o => o.delivery_status === "Out for Delivery");
                if (activeOrder && socketRef.current) {
                    socketRef.current.emit('send_location', {
                        orderId: activeOrder.orderId,
                        latitude: lat,
                        longitude: lng
                    });
                }
            }, (err) => console.warn('[RiderGPS] watch error:', err.message), { enableHighAccuracy: true });
        }
        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [isDutyOn, user]);

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
        } catch (error) {
            console.error('Pickup update failed:', error?.response?.data || error);
            toast.error(error?.response?.data?.message || "Update failed");
        }
    };

    // Cancel an order still waiting for pickup (Confirmed) or still stuck
    // awaiting seller response (Pending + delayed). Confirms first to avoid
    // accidental taps, guards against duplicate submits while a request is
    // in flight, and routes through the same updateOrderStatus endpoint the
    // backend already supports ('Cancelled' is a valid enum value and the
    // controller already handles refund calc + customer notification for
    // this status). `cancelledBy: 'rider'` is included so the backend can
    // distinguish rider-initiated cancels from admin/customer ones — this
    // only has effect if the controller reads and persists that field.
    const handleCancel = async (order) => {
        if (cancellingId) return; // a cancel is already in flight — ignore extra taps
        const confirmed = window.confirm(`Cancel order ${order.orderId}? This cannot be undone.`);
        if (!confirmed) return;
        setCancellingId(order.orderId);
        try {
            const response = await Axios({
                ...SummaryApi.updateOrderStatus,
                data: { orderId: order.orderId, status: 'Cancelled', cancelledBy: 'rider' }
            });
            if (response.data.success) {
                toast.success('Order cancelled');
                fetchRiderOrders(true);
            }
        } catch {
            toast.error("Cancel failed");
        } finally {
            setCancellingId(null);
        }
    };

    // ── Earnings ──────────────────────────────────────────────
    const now = new Date();
    const filterByDate = (list) => list.filter(o => {
        // FIX: was filtering by createdAt (order placement time) instead of
        // deliveredAt (when the rider actually completed it) — an order placed
        // yesterday but delivered today never counted toward "Today's earnings".
        const deliveryTime = new Date(o.deliveredAt || o.createdAt);
        if (earningFilter === 'today') return deliveryTime.toDateString() === now.toDateString();
        if (earningFilter === 'week')  { const w = new Date(now); w.setDate(now.getDate()-7); return deliveryTime >= w; }
        if (earningFilter === 'month') return deliveryTime.getMonth() === now.getMonth() && deliveryTime.getFullYear() === now.getFullYear();
        return true; // 'all'
    });

    const deliveredOrders  = orders.filter(o => o.delivery_status === 'Delivered');
    const filteredEarnings = filterByDate(deliveredOrders);
    const totalEarned      = filteredEarnings.reduce((acc, o) => acc + getDeliveryFee(o), 0);
    const totalDelivered   = filteredEarnings.length;
    const avgFee           = totalDelivered > 0 ? totalEarned / totalDelivered : 0;

    const earningsByDate = filteredEarnings.reduce((acc, o) => {
        const date = new Date(o.deliveredAt || o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
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
        <div className='min-h-screen bg-slate-950 text-white w-full max-w-full overflow-x-hidden'>

            {/* ── TOP HEADER BAR ── */}
            <div className='sticky top-0 z-30 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-3 sm:px-4 py-3 w-full'>
                <div className='max-w-5xl mx-auto space-y-2.5'>
                    
                    {/* Top Row: Navigation + Duty Switcher + Refresh */}
                    <div className='flex items-center justify-between gap-2'>
                        <div className='flex items-center gap-2.5 min-w-0'>
                            <button
                                onClick={() => navigate(-1)}
                                className='w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-90 flex-shrink-0'
                            >
                                <IoArrowBack size={16}/>
                            </button>
                            <div className='min-w-0'>
                                <p className='text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] truncate'>Snapit Logistics · Bihar</p>
                                <h1 className='text-base sm:text-lg font-black text-white leading-tight truncate'>RIDER COMMAND</h1>
                            </div>
                        </div>

                        <div className='flex items-center gap-1.5 sm:gap-2 flex-shrink-0'>
                            <button
                                onClick={handleToggleDuty}
                                disabled={togglingDuty}
                                className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 shadow-md ${
                                    isDutyOn
                                        ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30 animate-pulse'
                                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                                }`}
                            >
                                <FaPowerOff size={10} />
                                <span>{togglingDuty ? 'Updating…' : isDutyOn ? '🟢 ON DUTY' : '🔴 OFF DUTY'}</span>
                            </button>

                            <button
                                onClick={() => fetchRiderOrders(true)}
                                className='w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-90'
                                title='Refresh'
                            >
                                🔄
                            </button>
                        </div>
                    </div>

                    {/* Secondary Row: Live Shift Hours + Cash in Hand Cards */}
                    <div className='grid grid-cols-2 gap-2 pt-1 w-full'>
                        {/* Duty Shift Card */}
                        <div className='bg-slate-900 border border-slate-800 rounded-2xl p-2.5 flex flex-col justify-between'>
                            <p className='text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1'>
                                <FaClock size={9} className={isDutyOn ? 'text-emerald-400' : 'text-slate-500'} />
                                <span>Duty Today</span>
                            </p>
                            <div className='flex items-baseline justify-between mt-1'>
                                <span className='text-sm sm:text-base font-black text-white'>
                                    {formatDutyDuration(dutyMinutes)}
                                </span>
                                <span className={`text-[9px] font-black ${isDutyOn ? 'text-emerald-400' : 'text-slate-500'}`}>
                                    {isDutyOn ? '● Active' : 'Off'}
                                </span>
                            </div>
                        </div>

                        {/* Cash in Hand & Remit Card */}
                        <div
                            onClick={() => setShowRemittanceModal(true)}
                            className='bg-gradient-to-br from-amber-950/40 to-slate-900 border border-amber-500/40 hover:border-amber-500/70 rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer transition-all active:scale-95 group'
                        >
                            <div className='flex items-center justify-between'>
                                <p className='text-[9px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1'>
                                    <FaMoneyBillWave size={9} />
                                    <span>Cash in Hand</span>
                                </p>
                                <span className='text-[9px] font-black text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded-md'>
                                    Deposit ➔
                                </span>
                            </div>
                            <p className='text-sm sm:text-base font-black text-amber-400 group-hover:text-amber-300 transition mt-1 truncate'>
                                {fmtINR(unremittedCash || totalInHand)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className='max-w-5xl mx-auto px-3 sm:px-4 py-4 w-full max-w-full overflow-x-hidden'>

                {/* ── TABS ── */}
                <div className='flex gap-1.5 sm:gap-2 mb-4 bg-slate-900 rounded-2xl p-1 border border-slate-800 w-full'>
                    <button onClick={() => setActiveTab('orders')}
                        className={`flex-1 py-2 sm:py-2.5 rounded-xl font-black text-[11px] sm:text-xs transition-all truncate ${
                            activeTab === 'orders'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                : 'text-slate-400 hover:text-white'
                        }`}>
                        🛵 Orders ({orders.filter(o => o.delivery_status !== 'Delivered' && o.delivery_status !== 'Cancelled').length})
                    </button>
                    <button onClick={() => setActiveTab('earnings')}
                        className={`flex-1 py-2 sm:py-2.5 rounded-xl font-black text-[11px] sm:text-xs transition-all truncate ${
                            activeTab === 'earnings'
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                                : 'text-slate-400 hover:text-white'
                        }`}>
                        💰 Earnings
                    </button>
                    <button onClick={() => setShowRemittanceModal(true)}
                        className='px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl font-black text-[11px] sm:text-xs bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-all flex items-center gap-1 flex-shrink-0'>
                        <FaMoneyBillWave size={11} />
                        <span>Deposit</span>
                    </button>
                </div>

                {/* ══════════════ ORDERS TAB ══════════════ */}
                {activeTab === 'orders' && (
                    <>
                        {/* Off Duty Notice Banner */}
                        {!isDutyOn && (
                            <div className='mb-4 p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3'>
                                <div className='flex items-center gap-2.5'>
                                    <span className='text-2xl'>🛑</span>
                                    <div>
                                        <p className='font-black text-sm text-white'>You are currently OFF DUTY</p>
                                        <p className='text-xs text-rose-300/80'>Turn ON DUTY to accept orders & stream live GPS.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleToggleDuty}
                                    disabled={togglingDuty}
                                    className='w-full sm:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition'
                                >
                                    Go ON DUTY
                                </button>
                            </div>
                        )}

                        {/* Large Cash Remittance Banner on Top of Orders */}
                        {(unremittedCash > 0 || totalInHand > 0) && (
                            <div className='mb-4 p-4 rounded-3xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg'>
                                <div>
                                    <div className='flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-wider'>
                                        <FaMoneyBillWave size={14} />
                                        <span>Unremitted COD Cash in Hand</span>
                                    </div>
                                    <p className='text-2xl font-black text-amber-400 mt-1'>
                                        {fmtINR(unremittedCash || totalInHand)}
                                    </p>
                                    <p className='text-[11px] text-slate-400 mt-0.5'>
                                        Send online to Super Admin UPI (`00pr1199-1@oksbi`)
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowRemittanceModal(true)}
                                    className='w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 font-black text-xs rounded-2xl shadow-xl shadow-amber-500/20 transition flex items-center justify-center gap-2'
                                >
                                    <FaMoneyBillWave size={13} />
                                    <span>Deposit to Super Admin</span>
                                </button>
                            </div>
                        )}

                        <div className='flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide'>
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

                        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 w-full max-w-full'>
                            {filteredOrders.length === 0 ? (
                                <div className='col-span-full py-16 text-center bg-slate-900 rounded-3xl border-2 border-dashed border-slate-700 p-6'>
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
                                    const ageMinutes     = (Date.now() - new Date(order.createdAt)) / 60000;
                                    const isSellerDelayed = order.delivery_status === 'Pending' && ageMinutes >= 3;
                                    const canCancel      = order.delivery_status === 'Confirmed' || isSellerDelayed;
                                    const isCancelling   = cancellingId === order.orderId;

                                    return (
                                        <div key={order._id}
                                            className={`bg-slate-900 border rounded-3xl p-4 sm:p-5 flex flex-col gap-3.5 transition-all w-full max-w-full overflow-hidden box-border ${
                                                isSellerDelayed
                                                    ? 'border-amber-500/50 shadow-lg shadow-amber-500/10'
                                                    : 'border-slate-800 hover:border-slate-600'
                                            }`}>

                                            {isSellerDelayed && (
                                                <div className='bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 flex items-center gap-2'>
                                                    <span>⚠️</span>
                                                    <p className='text-[10px] font-black text-amber-400'>
                                                        Seller not responded — auto-confirming soon
                                                    </p>
                                                </div>
                                            )}

                                            <div className='flex justify-between items-start'>
                                                <div className='flex-1'>
                                                    <span className='text-[9px] font-black bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full uppercase tracking-wider'>
                                                        {order.orderId}
                                                    </span>
                                                    {fmtOrderTime(order.createdAt) && (
                                                        <p className='text-[9px] text-slate-500 font-bold mt-1'>
                                                            🕒 {fmtOrderTime(order.createdAt)}
                                                        </p>
                                                    )}
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
                                                    <a href={
                                                        order.delivery_lat && order.delivery_lng
                                                            ? `https://www.google.com/maps?q=${order.delivery_lat},${order.delivery_lng}`
                                                            : order.delivery_address?.lat && order.delivery_address?.lng
                                                                ? `https://www.google.com/maps?q=${order.delivery_address.lat},${order.delivery_address.lng}`
                                                                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address?.address_line || "")}`
                                                    }
                                                        target="_blank" rel="noreferrer"
                                                        className='p-2.5 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500 hover:text-white transition-all'>
                                                        <FaMapMarkedAlt size={15}/>
                                                    </a>
                                                </div>
                                            </div>

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
                                                            {item.productId?.unit && (
                                                                <span className='text-slate-500 font-normal'> ({item.productId.unit})</span>
                                                            )}
                                                        </span>
                                                        <span className='text-blue-400 flex-shrink-0'>
                                                            ×{item.quantity}
                                                            {item.productId?.price != null && (
                                                                <span className='text-slate-500 ml-1'>· {fmtINR(item.productId.price)}</span>
                                                            )}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>

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

                                            {(order.delivery_status === 'Confirmed') && (
                                                <button onClick={() => handlePickup(order)}
                                                    className='w-full py-3.5 rounded-2xl font-black text-sm text-white bg-amber-500 hover:bg-amber-400 shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 active:scale-95'>
                                                    <FaCheckCircle/> PICKUP FROM {store?.name?.toUpperCase() || 'STORE'}
                                                </button>
                                            )}
                                            {isSellerDelayed && (
                                                <button onClick={() => handlePickup(order)}
                                                    className='w-full py-3.5 rounded-2xl font-black text-sm text-white bg-orange-500 hover:bg-orange-400 shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 active:scale-95'>
                                                    <FaCheckCircle/> PICKUP ANYWAY (Seller Delayed)
                                                </button>
                                            )}
                                            {canCancel && (
                                                <button
                                                    onClick={() => handleCancel(order)}
                                                    disabled={isCancelling}
                                                    className='w-full py-2.5 rounded-2xl font-black text-xs text-red-400 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 active:scale-95'>
                                                    {isCancelling ? '⏳ CANCELLING…' : '✕ CANCEL ORDER'}
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
                                                    {fmtOrderTime(order.deliveredAt || order.createdAt)}
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
                    onSuccess={() => { setPaymentOrder(null); setIsTracking(false); fetchRiderOrders(true); fetchCashSummary(); }}
                />
            )}

            <RiderCashRemittanceModal
                isOpen={showRemittanceModal}
                onClose={() => setShowRemittanceModal(false)}
                onDepositSuccess={() => {
                    fetchCashSummary();
                    fetchRiderOrders(true);
                }}
            />
        </div>
    );
};

export default RiderDashboard;