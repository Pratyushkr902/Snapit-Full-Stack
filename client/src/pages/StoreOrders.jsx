import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';
import Loading from '../components/Loading';
import AdminLiveOrdersWidget from '../components/AdminLiveOrdersWidget';
import { playOrderAlertChime } from '../utils/playChime';

const getOrderAmount     = (o) => Number(o.totalAmt ?? o.total_amount ?? o.amount ?? o.subTotalAmt ?? 0);
const getDeliveryFee     = (o) => Number(o.delivery_fee ?? o.deliveryFee ?? o.delivery_charge ?? 0);
const getItemSellerPrice = (item) => Number(item.sellerPrice ?? item.seller_price ?? item.price ?? item.unit_price ?? 0);
const getSellerEarning   = (order) =>
    (order.cartItems || []).reduce(
        (acc, item) => acc + getItemSellerPrice(item) * (Number(item.quantity) || 1), 0
    );

const fmtINR = (n) =>
    `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const StoreOrders = () => {
    // Top-level unified view mode: 'packing' | 'live' | 'both'
    const [viewMode, setViewMode] = useState('packing');
    const [allOrders, setAllOrders] = useState([]);
    const [liveOrders, setLiveOrders] = useState([]);
    const [tabFilter, setTabFilter] = useState('to_pack');
    const [packingSearch, setPackingSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [updating, setUpdating] = useState({});
    const [packedItems, setPackedItems] = useState({});
    const [soundEnabled, setSoundEnabled] = useState(() => {
        const saved = localStorage.getItem('store_orders_sound');
        return saved !== null ? saved === 'true' : true;
    });
    const [lastUpdated, setLastUpdated] = useState(null);

    const prevOrdersCountRef = useRef(0);
    const navigate = useNavigate();

    // Toggle item checklist state for packing staff
    const toggleCheckItem = (orderId, idx) => {
        const key = `${orderId}_${idx}`;
        setPackedItems(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // Toggle sound preference
    const handleToggleSound = () => {
        const nextState = !soundEnabled;
        setSoundEnabled(nextState);
        localStorage.setItem('store_orders_sound', String(nextState));
        if (nextState) {
            playOrderAlertChime();
            toast.success('Audio order chime enabled 🔔');
        } else {
            toast('Audio order chime disabled 🔕');
        }
    };

    const fetchOrdersToPack = useCallback(async (silent = false) => {
        try {
            if (!silent && allOrders.length === 0) setLoading(true);
            setIsRefreshing(true);
            const response = await Axios({ ...SummaryApi.getSellerOrders });
            if (response.data?.success) {
                const incoming = Array.isArray(response.data.data) ? response.data.data : [];
                
                // Sound chime trigger if new orders arrived
                if (prevOrdersCountRef.current > 0 && incoming.length > prevOrdersCountRef.current && soundEnabled) {
                    playOrderAlertChime();
                    toast.success('🚨 New store order received!', { duration: 4000 });
                }
                prevOrdersCountRef.current = incoming.length;

                setAllOrders(incoming);
                setLastUpdated(new Date());
            }
        } catch (error) {
            console.error("Store orders fetch error", error);
            if (!silent) toast.error("Could not load store orders. Please refresh.");
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [allOrders.length, soundEnabled]);

    const handleUpdateStatus = async (orderId, newStatus) => {
        setUpdating(prev => ({ ...prev, [orderId]: newStatus }));
        try {
            const response = await Axios({
                ...SummaryApi.updateSellerStatus,
                data: { orderId, sellerStatus: newStatus }
            });
            if (response.data.success) {
                toast.success(
                    newStatus === "Ready for Pickup"
                        ? "✅ Rider Notified! Order marked Ready for Pickup."
                        : "📦 Packing started..."
                );
                fetchOrdersToPack(true);
            } else {
                toast.error(response.data?.message || "Failed to update store status");
            }
        } catch {
            toast.error("Failed to update store status");
        } finally {
            setUpdating(prev => { const n = { ...prev }; delete n[orderId]; return n; });
        }
    };

    useEffect(() => {
        fetchOrdersToPack();
        const interval = setInterval(() => fetchOrdersToPack(true), 20000);
        return () => clearInterval(interval);
    }, [fetchOrdersToPack]);

    // Callback when live orders widget loads
    const handleLiveOrdersLoaded = (orders) => {
        setLiveOrders(orders || []);
    };

    // Filter calculations for store packing
    const toPackOrders = allOrders.filter(o =>
        o.seller_status !== 'Ready for Pickup' &&
        o.delivery_status !== 'Out for Delivery' &&
        o.delivery_status !== 'Delivered' &&
        o.delivery_status !== 'Cancelled'
    );
    const readyOrders = allOrders.filter(o =>
        o.seller_status === 'Ready for Pickup' &&
        o.delivery_status !== 'Delivered' &&
        o.delivery_status !== 'Cancelled'
    );

    const baseOrders = tabFilter === 'to_pack'
        ? toPackOrders
        : tabFilter === 'ready'
            ? readyOrders
            : allOrders;

    const filteredPackingOrders = baseOrders.filter(o => {
        if (!packingSearch.trim()) return true;
        const q = packingSearch.toLowerCase();
        const oid = (o.orderId || '').toLowerCase();
        const name = (o.recipient_name || o.delivery_address?.recipient_name || o.userId?.name || '').toLowerCase();
        const phone = (o.recipient_mobile || o.delivery_address?.recipient_mobile || o.userId?.mobile || '').toLowerCase();
        const store = (o.store_name || o.store_details?.name || '').toLowerCase();
        return oid.includes(q) || name.includes(q) || phone.includes(q) || store.includes(q);
    });

    const totalEarningInQueue = toPackOrders.reduce((a, o) => a + getSellerEarning(o), 0);
    const packingCount        = toPackOrders.filter(o => o.seller_status === 'Packing').length;
    const pendingCount        = toPackOrders.filter(o => o.seller_status !== 'Packing').length;

    // Additional town metrics from liveOrders
    const outForDeliveryCount = liveOrders.filter(o => o.delivery_status === 'Out for Delivery').length;
    const deliveredTodayCount = liveOrders.filter(o => o.delivery_status === 'Delivered').length;

    if (loading && allOrders.length === 0) return <Loading />;

    return (
        <div className='min-h-screen bg-slate-50 dark:bg-slate-950 pb-28 text-slate-800 dark:text-slate-100 transition-colors'>

            {/* ── TOP STICKY APP HEADER (Native mobile & desktop) ── */}
            <header className='sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm px-3 sm:px-6 py-3'>
                <div className='max-w-7xl mx-auto flex items-center justify-between gap-2'>
                    {/* Back + Title */}
                    <div className='flex items-center gap-2.5 min-w-0'>
                        <button
                            onClick={() => navigate(-1)}
                            className='w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all flex-shrink-0'
                            title='Back'
                        >
                            <IoArrowBack size={20} />
                        </button>
                        <div className='truncate'>
                            <div className='flex items-center gap-2'>
                                <h1 className='font-black text-base sm:text-lg tracking-tight uppercase truncate'>
                                    Store Packing &amp; Live Orders
                                </h1>
                                <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 animate-pulse flex-shrink-0'>
                                    <span className='w-1.5 h-1.5 rounded-full bg-emerald-500'></span>
                                    LIVE
                                </span>
                            </div>
                            <p className='text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate'>
                                Paliganj Hub • Central Dispatch &amp; Store Queue
                            </p>
                        </div>
                    </div>

                    {/* Sound, Refresh & Timestamp Actions */}
                    <div className='flex items-center gap-1.5 flex-shrink-0'>
                        {/* Audio Chime Toggle */}
                        <button
                            onClick={handleToggleSound}
                            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all ${
                                soundEnabled
                                    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                            }`}
                            title={soundEnabled ? 'Mute new order chime' : 'Enable new order chime'}
                        >
                            <span>{soundEnabled ? '🔔' : '🔕'}</span>
                            <span className='hidden md:inline'>{soundEnabled ? 'Chime ON' : 'Chime OFF'}</span>
                        </button>

                        {/* Refresh Button */}
                        <button
                            onClick={() => fetchOrdersToPack(false)}
                            disabled={isRefreshing}
                            className='w-9 h-9 flex items-center justify-center rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-sm transition-all disabled:opacity-50 active:scale-95'
                            title='Refresh data'
                        >
                            <span className={isRefreshing ? 'animate-spin inline-block' : ''}>🔄</span>
                        </button>
                    </div>
                </div>

                {/* ── TOP KPI SUMMARY METRICS STRIP ── */}
                <div className='max-w-7xl mx-auto mt-3 grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80'>
                    <div className='bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 rounded-xl p-2 text-center'>
                        <p className='text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-wider'>⏳ To Pack</p>
                        <p className='text-base sm:text-lg font-black text-orange-600 dark:text-orange-300 leading-tight mt-0.5'>{toPackOrders.length}</p>
                    </div>
                    <div className='bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl p-2 text-center'>
                        <p className='text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider'>📦 Packing</p>
                        <p className='text-base sm:text-lg font-black text-blue-600 dark:text-blue-300 leading-tight mt-0.5'>{packingCount}</p>
                    </div>
                    <div className='bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 rounded-xl p-2 text-center'>
                        <p className='text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider'>🛵 Ready</p>
                        <p className='text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-300 leading-tight mt-0.5'>{readyOrders.length}</p>
                    </div>
                    <div className='bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 rounded-xl p-2 text-center'>
                        <p className='text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider'>🚚 On Route</p>
                        <p className='text-base sm:text-lg font-black text-purple-600 dark:text-purple-300 leading-tight mt-0.5'>{outForDeliveryCount}</p>
                    </div>
                    <div className='bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-2 text-center'>
                        <p className='text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider'>✅ Delivered</p>
                        <p className='text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-300 leading-tight mt-0.5'>{deliveredTodayCount}</p>
                    </div>
                    <div className='bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-2 text-center'>
                        <p className='text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider'>💰 Queue ₹</p>
                        <p className='text-sm sm:text-base font-black text-amber-700 dark:text-amber-300 leading-tight mt-0.5 truncate'>{fmtINR(totalEarningInQueue)}</p>
                    </div>
                </div>

                {/* ── UNIFIED VIEW MODE SWITCHER (Segmented Pill Bar) ── */}
                <div className='max-w-7xl mx-auto mt-3 flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl'>
                    <button
                        onClick={() => setViewMode('packing')}
                        className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                            viewMode === 'packing'
                                ? 'bg-orange-500 text-white shadow-md'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <span>📦</span>
                        <span>Store Packing</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${viewMode === 'packing' ? 'bg-white/30 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                            {toPackOrders.length}
                        </span>
                    </button>

                    <button
                        onClick={() => setViewMode('live')}
                        className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                            viewMode === 'live'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <span>⚡</span>
                        <span>Live Dispatch</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${viewMode === 'live' ? 'bg-white/30 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                            {liveOrders.length || allOrders.length}
                        </span>
                    </button>

                    <button
                        onClick={() => setViewMode('both')}
                        className={`hidden sm:flex flex-1 py-2 rounded-xl text-xs font-black transition-all items-center justify-center gap-1.5 ${
                            viewMode === 'both'
                                ? 'bg-slate-800 dark:bg-slate-900 text-white shadow-md'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <span>📑</span>
                        <span>All-in-One</span>
                    </button>
                </div>
            </header>

            {/* ── MAIN CONTENT CONTAINER ── */}
            <main className='max-w-7xl mx-auto p-3 sm:p-6'>

                {/* ═════════════════════════════════════════════════════════ */}
                {/* 1. STORE PACKING SECTION (Visible in 'packing' or 'both') */}
                {/* ═════════════════════════════════════════════════════════ */}
                {(viewMode === 'packing' || viewMode === 'both') && (
                    <div className={`${viewMode === 'both' ? 'mb-8' : ''}`}>
                        {viewMode === 'both' && (
                            <div className='flex items-center gap-2 mb-3'>
                                <span className='text-lg'>📦</span>
                                <h2 className='text-sm font-black uppercase tracking-wider text-orange-600 dark:text-orange-400'>
                                    Store Item Packing Queue
                                </h2>
                            </div>
                        )}

                        {/* Packing Tabs & Search Bar */}
                        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4'>
                            <div className='flex gap-1.5 overflow-x-auto pb-1 max-w-full'>
                                <button
                                    onClick={() => setTabFilter('to_pack')}
                                    className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                        tabFilter === 'to_pack'
                                            ? 'bg-orange-500 text-white shadow-sm'
                                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                                    }`}
                                >
                                    <span>⏳ To Pack</span>
                                    <span className='px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/20'>
                                        {toPackOrders.length}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setTabFilter('ready')}
                                    className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                        tabFilter === 'ready'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                                    }`}
                                >
                                    <span>🛵 Ready for Pickup</span>
                                    <span className='px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/20'>
                                        {readyOrders.length}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setTabFilter('all')}
                                    className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                        tabFilter === 'all'
                                            ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-sm'
                                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                                    }`}
                                >
                                    <span>📋 All Orders</span>
                                    <span className='px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/20'>
                                        {allOrders.length}
                                    </span>
                                </button>
                            </div>

                            {/* Search box */}
                            <div className='relative min-w-[200px]'>
                                <input
                                    type='text'
                                    placeholder='Search order #, customer, phone...'
                                    value={packingSearch}
                                    onChange={(e) => setPackingSearch(e.target.value)}
                                    className='w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-orange-500 transition-colors shadow-sm'
                                />
                                {packingSearch && (
                                    <button
                                        onClick={() => setPackingSearch('')}
                                        className='absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs'
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Store Orders Grid */}
                        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-2'>
                            {filteredPackingOrders.length === 0 ? (
                                <div className='col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-6'>
                                    <p className='text-5xl mb-3'>🎉</p>
                                    <p className='font-black text-slate-700 dark:text-slate-200 text-base'>
                                        {packingSearch ? `No store orders match "${packingSearch}"` : "All store items packed and with riders!"}
                                    </p>
                                    <p className='text-xs text-slate-400 mt-1'>
                                        {packingSearch ? "Try clearing your search query." : "New orders will appear automatically with sound chime alert."}
                                    </p>
                                    <button
                                        onClick={() => fetchOrdersToPack(false)}
                                        className='mt-4 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs px-5 py-2.5 rounded-2xl shadow-sm transition-all'
                                    >
                                        🔄 Check for New Orders
                                    </button>
                                </div>
                            ) : (
                                filteredPackingOrders.map(order => {
                                    const sellerEarning = getSellerEarning(order);
                                    const orderTotal    = getOrderAmount(order);
                                    const deliveryFee   = getDeliveryFee(order);
                                    const isPacking     = order.seller_status === 'Packing';
                                    const isReady       = order.seller_status === 'Ready for Pickup';
                                    const isUpdating    = updating[order.orderId];
                                    const items         = order.cartItems || [];

                                    const customerName = order.recipient_name || order.delivery_address?.recipient_name || order.userId?.name || order.delivery_address?.name || "Customer";
                                    const customerPhone = order.recipient_mobile || order.delivery_address?.recipient_mobile || order.userId?.mobile || order.delivery_address?.mobile;
                                    const storeLabel = order.store_details?.name || order.store_name || (Array.isArray(order.involved_stores) && order.involved_stores[0]);

                                    return (
                                        <div
                                            key={order._id || order.orderId}
                                            className={`bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl shadow-sm border-2 flex flex-col justify-between transition-all ${
                                                isPacking
                                                    ? 'border-blue-300 dark:border-blue-700/80 shadow-blue-50 dark:shadow-none'
                                                    : isReady
                                                        ? 'border-emerald-200 dark:border-emerald-800'
                                                        : 'border-orange-200 dark:border-slate-800'
                                            }`}
                                        >
                                            {/* Card Top: Order ID, Customer & Status */}
                                            <div>
                                                <div className='flex justify-between items-start gap-2 mb-3'>
                                                    <div>
                                                        <div className='flex items-center gap-1.5 flex-wrap'>
                                                            <span className='text-xs font-black bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 px-2.5 py-1 rounded-full uppercase tracking-wider font-mono'>
                                                                #{order.orderId}
                                                            </span>
                                                            <span className='text-[10px] text-slate-400 font-bold'>
                                                                {formatTimeAgo(order.createdAt)}
                                                            </span>
                                                        </div>

                                                        {/* Customer + Direct Phone Call */}
                                                        <div className='mt-2'>
                                                            <p className='text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1'>
                                                                <span>👤</span> {customerName}
                                                            </p>
                                                            {customerPhone && (
                                                                <a
                                                                    href={`tel:${customerPhone}`}
                                                                    className='inline-flex items-center gap-1 mt-0.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline'
                                                                    title='Tap to call customer'
                                                                >
                                                                    <span>📞</span> {customerPhone}
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Status Badge */}
                                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl flex-shrink-0 ${
                                                        isReady
                                                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                                                            : isPacking
                                                                ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 animate-pulse'
                                                                : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                                                    }`}>
                                                        {isReady ? '🛵 Ready for Rider' : isPacking ? '📦 Packing Now' : '🆕 To Pack'}
                                                    </span>
                                                </div>

                                                {/* Store Badge if applicable */}
                                                {storeLabel && (
                                                    <div className='flex items-center gap-1.5 mb-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl px-2.5 py-1.5 text-xs text-indigo-700 dark:text-indigo-300 font-bold'>
                                                        <span>🏪</span>
                                                        <span className='truncate'>{storeLabel}</span>
                                                    </div>
                                                )}

                                                {/* ── Interactive Packing Checklist ── */}
                                                <div className='mb-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-3 border border-slate-100 dark:border-slate-800'>
                                                    <div className='flex items-center justify-between mb-2'>
                                                        <p className='text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest'>
                                                            📦 Items Checklist ({items.length}):
                                                        </p>
                                                        <span className='text-[9px] font-bold text-slate-400'>
                                                            Tap item to check off
                                                        </span>
                                                    </div>

                                                    <div className='space-y-1.5'>
                                                        {items.map((item, i) => {
                                                            const sp = getItemSellerPrice(item);
                                                            const qty = Number(item.quantity) || 1;
                                                            const total = sp * qty;
                                                            const isChecked = !!packedItems[`${order.orderId}_${i}`];

                                                            return (
                                                                <div
                                                                    key={i}
                                                                    onClick={() => toggleCheckItem(order.orderId, i)}
                                                                    className={`flex justify-between items-center py-1.5 px-2 rounded-xl cursor-pointer transition-colors ${
                                                                        isChecked
                                                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 line-through opacity-75'
                                                                            : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                                                                    }`}
                                                                >
                                                                    <div className='flex items-center gap-2 min-w-0 pr-2'>
                                                                        <span className={`w-4 h-4 rounded-md border flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                                                                            isChecked
                                                                                ? 'bg-emerald-500 text-white border-emerald-500'
                                                                                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-transparent'
                                                                        }`}>
                                                                            ✓
                                                                        </span>
                                                                        <div className='truncate'>
                                                                            <p className={`text-xs font-bold leading-tight truncate ${isChecked ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                                                                {item.productId?.name || item.name}
                                                                            </p>
                                                                            <p className='text-[10px] text-slate-400'>
                                                                                {fmtINR(sp)} × {qty}
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    <div className='flex items-center gap-2 flex-shrink-0'>
                                                                        <span className='bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded-lg text-xs font-black text-slate-700 dark:text-slate-300'>
                                                                            ×{qty}
                                                                        </span>
                                                                        <span className='text-xs font-black text-slate-800 dark:text-slate-200'>
                                                                            {fmtINR(total)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Financial Overview */}
                                                <div className='bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-2.5 mb-3 border border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-center text-xs'>
                                                    <div>
                                                        <p className='text-[9px] font-black text-slate-400 uppercase'>Order Total</p>
                                                        <p className='text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200'>{fmtINR(orderTotal)}</p>
                                                    </div>
                                                    <div>
                                                        <p className='text-[9px] font-black text-slate-400 uppercase'>Payment</p>
                                                        <p className='text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 truncate'>
                                                            {order.payment_status === 'CASH ON DELIVERY' ? '💵 COD' : '💳 Online'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className='text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase'>You Earn</p>
                                                        <p className='text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400'>{fmtINR(sellerEarning)}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Buttons: Start Packing / Ready for Rider */}
                                            <div className='mt-2 flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800'>
                                                {order.seller_status !== 'Packing' && order.seller_status !== 'Ready for Pickup' && (
                                                    <button
                                                        onClick={() => handleUpdateStatus(order.orderId, "Packing")}
                                                        disabled={!!isUpdating}
                                                        className='flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 py-3 rounded-2xl font-black text-xs uppercase tracking-wide transition-all disabled:opacity-50 active:scale-95'
                                                    >
                                                        {isUpdating === 'Packing' ? '⏳ Starting...' : '📦 Start Packing'}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleUpdateStatus(order.orderId, "Ready for Pickup")}
                                                    disabled={!!isUpdating}
                                                    className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-wide shadow-md transition-all disabled:opacity-50 active:scale-95 ${
                                                        isReady
                                                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-default'
                                                            : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-200 dark:shadow-none'
                                                    }`}
                                                >
                                                    {isUpdating === 'Ready for Pickup'
                                                        ? '⏳ Notifying...'
                                                        : isReady
                                                            ? '✅ Ready for Pickup'
                                                            : '🛵 Ready for Rider'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* ═════════════════════════════════════════════════════════ */}
                {/* 2. LIVE DISPATCH SECTION (Visible in 'live' or 'both')    */}
                {/* ═════════════════════════════════════════════════════════ */}
                {(viewMode === 'live' || viewMode === 'both') && (
                    <div>
                        {viewMode === 'both' && (
                            <div className='flex items-center gap-2 mb-3 mt-6'>
                                <span className='text-lg'>⚡</span>
                                <h2 className='text-sm font-black uppercase tracking-wider text-blue-600 dark:text-blue-400'>
                                    Live Town Dispatch &amp; Customer Orders
                                </h2>
                            </div>
                        )}

                        {/* Embed AdminLiveOrdersWidget */}
                        <AdminLiveOrdersWidget
                            hideStoreOrdersLink={true}
                            onOrdersLoaded={handleLiveOrdersLoaded}
                        />
                    </div>
                )}
            </main>
        </div>
    );
};

export default StoreOrders;