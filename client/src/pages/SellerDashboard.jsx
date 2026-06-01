import React, { useEffect, useState } from 'react';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';

const SellerDashboard = () => {
    const [allOrders, setAllOrders] = useState([]);
    const [activeTab, setActiveTab] = useState('packing');
    const [earningFilter, setEarningFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [historySearch, setHistorySearch] = useState('');
    const [historyFilter, setHistoryFilter] = useState('all'); // all | delivered | pending | cancelled

    const user = useSelector(state => state.user);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await Axios({ ...SummaryApi.getSellerOrders });
            if (response.data.success) {
                const data = Array.isArray(response.data.data) ? response.data.data : [];
                setAllOrders(data);
            }
        } catch (error) {
            toast.error('Failed to fetch orders');
        } finally {
            setLoading(false);
        }
    };

    const markAsReady = async (orderId) => {
        try {
            const response = await Axios({
                ...SummaryApi.updateSellerStatus,
                data: { orderId, sellerStatus: 'Ready for Pickup' }
            });
            if (response.data.success) {
                toast.success('Rider Notified! Order ready for pickup.');
                fetchOrders();
            }
        } catch (error) {
            toast.error('Failed to update order');
        }
    };

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 30000);
        return () => clearInterval(interval);
    }, []);

    const now = new Date();

    const isDelivered = (order) =>
        (order.delivery_status || '').trim().toLowerCase() === 'delivered';

    const packingOrders = allOrders.filter(o =>
        o.seller_status !== 'Ready for Pickup' &&
        o.delivery_status !== 'Delivered' &&
        o.delivery_status !== 'Cancelled'
    );

    const pendingCount = allOrders.filter(o =>
        o.delivery_status === 'Pending' &&
        o.seller_status !== 'Ready for Pickup'
    ).length;

    const packingCount = allOrders.filter(o => o.seller_status === 'Packing').length;

    const filterByDate = (list) => {
        return list.filter(o => {
            if (!isDelivered(o)) return false;
            const created = new Date(o.createdAt);
            if (earningFilter === 'today') return created.toDateString() === now.toDateString();
            if (earningFilter === 'week') {
                const w = new Date(now); w.setDate(now.getDate() - 7); return created >= w;
            }
            if (earningFilter === 'month') {
                return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
            }
            return true;
        });
    };

    const filteredEarnings = filterByDate(allOrders);

    const getOrderAmount = (o) =>
        Number(o.totalAmt ?? o.total_amount ?? o.amount ?? o.subTotalAmt ?? 0);

    const getDeliveryFee = (o) =>
        Number(o.delivery_fee ?? o.deliveryFee ?? o.delivery_charge ?? 0);

    const getSellerEarning = (order) => {
        return (order.cartItems || []).reduce((acc, item) => {
            const sellerPrice = Number(item.sellerPrice ?? item.price ?? 0);
            return acc + sellerPrice * (Number(item.quantity) || 1);
        }, 0);
    };

    const getSnapitEarning = (order) => {
        return (order.cartItems || []).reduce((acc, item) => {
            return acc + Number(item.snapitMargin ?? 0) * (Number(item.quantity) || 1);
        }, 0);
    };

    const totalGross         = filteredEarnings.reduce((a, o) => a + getOrderAmount(o), 0);
    const totalDelivery      = filteredEarnings.reduce((a, o) => a + getDeliveryFee(o), 0);
    const totalSellerEarning = filteredEarnings.reduce((a, o) => a + getSellerEarning(o), 0);
    const totalSnapitEarning = filteredEarnings.reduce((a, o) => a + getSnapitEarning(o), 0);
    const totalOrders        = filteredEarnings.length;
    const avgNet             = totalOrders > 0 ? Math.round(totalSellerEarning / totalOrders) : 0;

    const productEarnings = filteredEarnings.reduce((acc, order) => {
        (order.cartItems || []).forEach(item => {
            const name = item.productId?.name || item.name || 'Unknown Product';
            const qty  = Number(item.quantity) || 1;
            const sellerPrice = Number(item.sellerPrice ?? item.price ?? 0);
            if (!acc[name]) acc[name] = { qty: 0, revenue: 0 };
            acc[name].qty     += qty;
            acc[name].revenue += sellerPrice * qty;
        });
        return acc;
    }, {});

    const productList = Object.entries(productEarnings)
        .sort((a, b) => b[1].revenue - a[1].revenue);

    const byDate = filteredEarnings.reduce((acc, o) => {
        const d = new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        if (!acc[d]) acc[d] = { gross: 0, sellerNet: 0, snapit: 0, delivery: 0, count: 0 };
        acc[d].gross    += getOrderAmount(o);
        acc[d].delivery += getDeliveryFee(o);
        acc[d].sellerNet += getSellerEarning(o);
        acc[d].snapit   += getSnapitEarning(o);
        acc[d].count    += 1;
        return acc;
    }, {});

    // ── History filtering ──────────────────────────────────────
    const allSorted = [...allOrders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const historyFiltered = allSorted.filter(order => {
        // Status filter
        if (historyFilter === 'delivered' && !isDelivered(order)) return false;
        if (historyFilter === 'pending' && (order.delivery_status || '').toLowerCase() !== 'pending') return false;
        if (historyFilter === 'cancelled' && (order.delivery_status || '').toLowerCase() !== 'cancelled') return false;

        // Search filter — match order ID or product name
        if (historySearch.trim()) {
            const q = historySearch.trim().toLowerCase();
            const matchesOrderId = (order.orderId || '').toLowerCase().includes(q);
            const matchesProduct = (order.cartItems || []).some(item =>
                (item.productId?.name || item.name || '').toLowerCase().includes(q)
            );
            return matchesOrderId || matchesProduct;
        }
        return true;
    });

    // Summary counts for history tab badges
    const deliveredCount  = allOrders.filter(o => isDelivered(o)).length;
    const cancelledCount  = allOrders.filter(o => (o.delivery_status || '').toLowerCase() === 'cancelled').length;

    const statusColor = (s) => {
        const st = (s || '').toLowerCase();
        if (st === 'delivered')        return 'bg-green-100 text-green-700';
        if (st === 'out for delivery') return 'bg-blue-100 text-blue-700';
        if (st === 'confirmed')        return 'bg-purple-100 text-purple-700';
        if (st === 'cancelled')        return 'bg-red-100 text-red-700';
        return 'bg-orange-100 text-orange-700';
    };

    if (loading) return (
        <div className='p-4 bg-orange-50 min-h-screen flex items-center justify-center'>
            <div className='text-center'><p className='text-4xl mb-3'>⏳</p><p className='font-black text-slate-600'>Loading orders...</p></div>
        </div>
    );

    return (
        <div className='p-4 bg-orange-50 min-h-screen max-w-4xl mx-auto'>

            {/* Header */}
            <div className='flex items-center justify-between mb-6'>
                <div>
                    <h1 className='text-2xl font-black text-slate-900'>STORE PANEL</h1>
                    <p className='text-xs text-slate-500 font-bold uppercase tracking-widest'>Snapit — Paliganj</p>
                </div>
                <div className='flex gap-2 items-center'>
                    <button onClick={fetchOrders} className='bg-white rounded-2xl px-3 py-2 shadow-sm border border-orange-100 text-lg'>🔄</button>
                    <div className='bg-white rounded-2xl px-4 py-2 shadow-sm border border-orange-100 text-center'>
                        <p className='text-[10px] font-black text-slate-400 uppercase'>Pending</p>
                        <p className='text-xl font-black text-orange-500'>{pendingCount}</p>
                    </div>
                    <div className='bg-white rounded-2xl px-4 py-2 shadow-sm border border-orange-100 text-center'>
                        <p className='text-[10px] font-black text-slate-400 uppercase'>Packing</p>
                        <p className='text-xl font-black text-blue-500'>{packingCount}</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className='flex gap-2 mb-6 bg-white rounded-2xl p-1 shadow-sm border border-slate-100'>
                {[
                    { key: 'packing',  label: '📦 Packing',  active: 'bg-orange-500' },
                    { key: 'history',  label: '🧾 History',  active: 'bg-slate-800' },
                    { key: 'earnings', label: '💰 Earnings', active: 'bg-green-600' },
                ].map(t => (
                    <button key={t.key} onClick={() => setActiveTab(t.key)}
                        className={`flex-1 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab === t.key ? t.active + ' text-white shadow' : 'text-slate-500'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── PACKING TAB ── */}
            {activeTab === 'packing' && (
                <div className='grid gap-4'>
                    {packingOrders.length === 0 ? (
                        <div className='bg-white rounded-3xl p-12 text-center border-2 border-dashed border-orange-200'>
                            <p className='text-4xl mb-3'>🎉</p>
                            <p className='font-black text-slate-700'>All orders are packed and with riders! 📦</p>
                            <p className='text-sm text-slate-400 mt-1'>No pending orders right now.</p>
                            <button onClick={fetchOrders} className='mt-4 bg-orange-100 text-orange-600 font-black text-sm px-5 py-2 rounded-full'>Check for new orders</button>
                        </div>
                    ) : packingOrders.map(order => (
                        <div key={order._id} className='bg-white p-6 rounded-3xl shadow-sm border-2 border-orange-100'>
                            <div className='flex justify-between items-center mb-2'>
                                <span className='font-bold text-orange-600 font-mono text-sm'>{order.orderId}</span>
                                <span className='bg-orange-100 px-3 py-1 rounded-full text-xs font-bold'>{order.seller_status || 'New'}</span>
                            </div>
                            {order.store_details?.name && (
                                <div className='flex items-center gap-2 mb-3 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2'>
                                    <span>🏪</span>
                                    <div>
                                        <p className='text-[10px] font-black text-blue-400 uppercase'>Store</p>
                                        <p className='text-sm font-black text-blue-700'>{order.store_details.name}</p>
                                    </div>
                                </div>
                            )}
                            <div className='mb-4'>
                                {(order.cartItems || []).map((item, i) => (
                                    <p key={i} className='font-bold text-slate-700'>• {item.productId?.name || item.name} (×{item.quantity})</p>
                                ))}
                            </div>
                            <div className='flex justify-between items-center mb-4'>
                                <div>
                                    <p className='text-[10px] font-black text-slate-400 uppercase'>Order Total</p>
                                    <p className='text-xl font-black text-slate-900'>₹{getOrderAmount(order)}</p>
                                </div>
                                <div className='text-right'>
                                    <p className='text-[10px] font-black text-slate-400 uppercase'>Payment</p>
                                    <p className='text-sm font-bold text-slate-700'>{order.payment_status || 'COD'}</p>
                                </div>
                            </div>
                            <button onClick={() => markAsReady(order.orderId)}
                                className='w-full bg-orange-500 text-white py-3 rounded-2xl font-black hover:bg-orange-600 transition-all active:scale-95'>
                                PACKED & READY FOR RIDER
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* ── HISTORY TAB ── */}
            {activeTab === 'history' && (
                <div className='flex flex-col gap-3'>

                    {/* ✅ Summary bar */}
                    <div className='grid grid-cols-3 gap-2'>
                        <div className='bg-white rounded-2xl p-3 text-center shadow-sm border border-slate-100'>
                            <p className='text-xl font-black text-slate-800'>{allSorted.length}</p>
                            <p className='text-[10px] font-black text-slate-400 uppercase'>Total</p>
                        </div>
                        <div className='bg-white rounded-2xl p-3 text-center shadow-sm border border-green-100'>
                            <p className='text-xl font-black text-green-600'>{deliveredCount}</p>
                            <p className='text-[10px] font-black text-slate-400 uppercase'>Delivered</p>
                        </div>
                        <div className='bg-white rounded-2xl p-3 text-center shadow-sm border border-red-100'>
                            <p className='text-xl font-black text-red-500'>{cancelledCount}</p>
                            <p className='text-[10px] font-black text-slate-400 uppercase'>Cancelled</p>
                        </div>
                    </div>

                    {/* ✅ Search bar */}
                    <div className='relative'>
                        <input
                            type='text'
                            value={historySearch}
                            onChange={e => setHistorySearch(e.target.value)}
                            placeholder='Search by order ID or product name...'
                            className='w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-slate-400 pl-10'
                        />
                        <span className='absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400'>🔍</span>
                        {historySearch && (
                            <button onClick={() => setHistorySearch('')} className='absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg leading-none'>×</button>
                        )}
                    </div>

                    {/* ✅ Status filter chips */}
                    <div className='flex gap-2 flex-wrap'>
                        {[
                            { key: 'all',       label: 'All Orders' },
                            { key: 'delivered', label: '✅ Delivered' },
                            { key: 'pending',   label: '⏳ Pending' },
                            { key: 'cancelled', label: '❌ Cancelled' },
                        ].map(f => (
                            <button key={f.key} onClick={() => setHistoryFilter(f.key)}
                                className={`px-3 py-1.5 rounded-full text-xs font-black transition-all border ${historyFilter === f.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* ✅ Results count */}
                    <p className='text-[11px] text-slate-400 font-bold px-1'>
                        Showing {historyFiltered.length} of {allSorted.length} orders
                        {historySearch && ` · matching "${historySearch}"`}
                    </p>

                    {/* ✅ Order cards */}
                    {historyFiltered.length === 0 ? (
                        <div className='bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200'>
                            <p className='text-4xl mb-3'>📭</p>
                            <p className='font-black text-slate-700'>No orders found</p>
                            <p className='text-sm text-slate-400 mt-1'>Try a different search or filter</p>
                        </div>
                    ) : historyFiltered.map(order => (
                        <div key={order._id} className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                            <div className='flex justify-between items-start mb-2'>
                                <div>
                                    <p className='font-mono text-xs font-bold text-slate-500'>{order.orderId}</p>
                                    <p className='text-[10px] text-slate-400 mt-0.5'>
                                        {new Date(order.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${statusColor(order.delivery_status)}`}>
                                    {order.delivery_status}
                                </span>
                            </div>
                            <div className='mb-3 bg-slate-50 rounded-xl p-3'>
                                <p className='text-[10px] font-black text-slate-400 uppercase mb-2'>Items</p>
                                {(order.cartItems || []).map((item, i) => (
                                    <div key={i} className='flex justify-between items-center py-1 border-b border-slate-100 last:border-0'>
                                        <p className='text-xs font-bold text-slate-700'>{item.productId?.name || item.name}</p>
                                        <div className='flex items-center gap-2'>
                                            <span className='text-[10px] text-slate-400'>×{item.quantity}</span>
                                            <span className='text-xs font-bold text-slate-600'>₹{(item.price || 0) * (item.quantity || 1)}</span>
                                            {item.snapitMargin > 0 && (
                                                <span className='text-[10px] text-yellow-600 font-bold'>
                                                    (Snapit +₹{item.snapitMargin * (item.quantity || 1)})
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className='flex justify-between items-center pt-2 border-t border-slate-100'>
                                <div className='flex gap-3 flex-wrap'>
                                    <div>
                                        <p className='text-[10px] text-slate-400 uppercase font-bold'>Subtotal</p>
                                        <p className='font-black text-slate-600'>₹{order.subTotalAmt || getOrderAmount(order)}</p>
                                    </div>
                                    {getDeliveryFee(order) > 0 && (
                                        <div>
                                            <p className='text-[10px] text-slate-400 uppercase font-bold'>Delivery</p>
                                            <p className='font-bold text-red-400'>-₹{getDeliveryFee(order)}</p>
                                        </div>
                                    )}
                                    {isDelivered(order) && (
                                        <div>
                                            <p className='text-[10px] text-slate-400 uppercase font-bold'>Your Earning</p>
                                            <p className='font-black text-emerald-600'>₹{getSellerEarning(order)}</p>
                                        </div>
                                    )}
                                    {isDelivered(order) && getSnapitEarning(order) > 0 && (
                                        <div>
                                            <p className='text-[10px] text-slate-400 uppercase font-bold'>Snapit Cut</p>
                                            <p className='font-black text-yellow-600'>₹{getSnapitEarning(order)}</p>
                                        </div>
                                    )}
                                </div>
                                <span className='text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg'>
                                    {(order.payment_status || '').toUpperCase().includes('CASH') ? '💵 COD' : '✅ Paid'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── EARNINGS TAB ── */}
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
                                className={`px-4 py-2 rounded-full text-xs font-black transition-all border ${earningFilter === f.key ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {filteredEarnings.length === 0 ? (
                        <div className='bg-white rounded-3xl p-10 text-center border-2 border-dashed border-green-200'>
                            <p className='text-4xl mb-3'>💸</p>
                            <p className='font-black text-slate-700'>No delivered orders yet</p>
                            <p className='text-sm text-slate-400 mt-1'>Earnings appear once orders are marked as Delivered.</p>
                            <div className='mt-4 bg-slate-50 rounded-2xl p-3 text-left'>
                                <p className='text-[10px] font-black text-slate-400 uppercase mb-2'>Debug Info</p>
                                <p className='text-xs text-slate-500'>Total orders: {allOrders.length}</p>
                                <p className='text-xs text-slate-500'>
                                    Statuses found: {[...new Set(allOrders.map(o => o.delivery_status))].join(', ') || 'None'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className='bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-5 text-white shadow-lg'>
                                <p className='text-xs font-black uppercase tracking-widest text-green-200 mb-1'>Your Store Earnings</p>
                                <p className='text-4xl font-black'>₹{totalSellerEarning.toLocaleString()}</p>
                                <div className='flex gap-4 mt-3 border-t border-green-500 pt-3 flex-wrap'>
                                    <div>
                                        <p className='text-[10px] text-green-200 uppercase font-bold'>Gross Sales</p>
                                        <p className='text-sm font-bold'>₹{totalGross.toLocaleString()}</p>
                                    </div>
                                    {totalSnapitEarning > 0 && (
                                        <div>
                                            <p className='text-[10px] text-yellow-200 uppercase font-bold'>Snapit Cut</p>
                                            <p className='text-sm font-bold text-yellow-300'>-₹{totalSnapitEarning.toLocaleString()}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className='text-[10px] text-green-200 uppercase font-bold'>Delivery</p>
                                        <p className='text-sm font-bold text-red-300'>-₹{totalDelivery.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className='text-[10px] text-green-200 uppercase font-bold'>Orders</p>
                                        <p className='text-sm font-bold'>{totalOrders}</p>
                                    </div>
                                    <div>
                                        <p className='text-[10px] text-green-200 uppercase font-bold'>Avg/Order</p>
                                        <p className='text-sm font-bold'>₹{avgNet}</p>
                                    </div>
                                </div>
                            </div>

                            <div className='grid grid-cols-2 gap-3'>
                                <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                                    <p className='text-[10px] font-black text-slate-400 uppercase'>Your Earning</p>
                                    <p className='text-2xl font-black text-emerald-600 mt-1'>₹{totalSellerEarning.toLocaleString()}</p>
                                    <p className='text-[10px] text-slate-400 mt-1'>What you actually earn</p>
                                </div>
                                <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                                    <p className='text-[10px] font-black text-slate-400 uppercase'>Gross Sales</p>
                                    <p className='text-2xl font-black text-slate-600 mt-1'>₹{totalGross.toLocaleString()}</p>
                                    <p className='text-[10px] text-slate-400 mt-1'>Customer paid total</p>
                                </div>
                                <div className='bg-white rounded-2xl p-4 shadow-sm border border-yellow-100'>
                                    <p className='text-[10px] font-black text-yellow-500 uppercase'>Snapit Platform Cut</p>
                                    <p className='text-2xl font-black text-yellow-500 mt-1'>₹{totalSnapitEarning.toLocaleString()}</p>
                                    <p className='text-[10px] text-slate-400 mt-1'>Platform margin (markup)</p>
                                </div>
                                <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                                    <p className='text-[10px] font-black text-slate-400 uppercase'>Delivery Fees</p>
                                    <p className='text-2xl font-black text-red-400 mt-1'>₹{totalDelivery.toLocaleString()}</p>
                                    <p className='text-[10px] text-slate-400 mt-1'>Paid to rider</p>
                                </div>
                            </div>

                            {productList.length > 0 && (
                                <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                                    <h3 className='font-black text-slate-800 text-sm uppercase tracking-wider mb-3'>📦 Product Selling Breakdown</h3>
                                    <div className='flex flex-col gap-2'>
                                        {productList.map(([name, data]) => {
                                            const pct = totalSellerEarning > 0 ? Math.round((data.revenue / totalSellerEarning) * 100) : 0;
                                            return (
                                                <div key={name} className='flex items-center gap-3'>
                                                    <div className='flex-1'>
                                                        <div className='flex justify-between items-center mb-1'>
                                                            <p className='text-xs font-bold text-slate-700 truncate max-w-[160px]'>{name}</p>
                                                            <div className='flex items-center gap-2'>
                                                                <span className='text-[10px] text-slate-400'>×{data.qty} sold</span>
                                                                <span className='text-xs font-black text-emerald-600'>₹{data.revenue.toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                        <div className='w-full bg-slate-100 rounded-full h-1.5'>
                                                            <div className='bg-green-500 h-1.5 rounded-full' style={{ width: `${pct}%` }} />
                                                        </div>
                                                    </div>
                                                    <span className='text-[10px] font-bold text-slate-400 w-8 text-right'>{pct}%</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                                <h3 className='font-black text-slate-800 text-sm uppercase tracking-wider mb-3'>📅 Daily Breakdown</h3>
                                <div className='flex flex-col gap-2'>
                                    {Object.entries(byDate).sort((a, b) => new Date(b[0]) - new Date(a[0])).map(([date, data]) => (
                                        <div key={date} className='flex justify-between items-center py-2 border-b border-slate-50 last:border-0'>
                                            <div>
                                                <p className='font-bold text-slate-700 text-sm'>{date}</p>
                                                <p className='text-[10px] text-slate-400'>
                                                    {data.count} order{data.count > 1 ? 's' : ''}
                                                    {data.delivery > 0 ? ` · -₹${data.delivery} delivery` : ''}
                                                    {data.snapit > 0 ? ` · -₹${data.snapit} snapit` : ''}
                                                </p>
                                            </div>
                                            <div className='text-right'>
                                                <p className='font-black text-emerald-600'>₹{data.sellerNet.toLocaleString()}</p>
                                                <p className='text-[10px] text-slate-400 line-through'>₹{data.gross}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                                <h3 className='font-black text-slate-800 text-sm uppercase tracking-wider mb-3'>🧾 Order Breakdown</h3>
                                {filteredEarnings.map(order => (
                                    <div key={order._id} className='py-3 border-b border-slate-50 last:border-0'>
                                        <div className='flex justify-between items-start mb-1'>
                                            <p className='font-mono text-xs font-bold text-slate-500'>{order.orderId}</p>
                                            <div className='text-right'>
                                                <p className='font-black text-emerald-600'>₹{getSellerEarning(order)}</p>
                                                {getSnapitEarning(order) > 0 && (
                                                    <p className='text-[10px] text-yellow-500 font-bold'>-₹{getSnapitEarning(order)} snapit</p>
                                                )}
                                                {getDeliveryFee(order) > 0 && (
                                                    <p className='text-[10px] text-red-400'>-₹{getDeliveryFee(order)} delivery</p>
                                                )}
                                                <p className='text-[10px] text-slate-400 line-through'>₹{getOrderAmount(order)}</p>
                                            </div>
                                        </div>
                                        {(order.cartItems || []).map((item, i) => (
                                            <p key={i} className='text-[10px] text-slate-500'>
                                                • {item.productId?.name || item.name} ×{item.quantity}
                                                {' '}@ ₹{item.sellerPrice ?? item.price}
                                                {item.snapitMargin > 0 && (
                                                    <span className='text-yellow-500'> (+₹{item.snapitMargin} snapit)</span>
                                                )}
                                            </p>
                                        ))}
                                        <p className='text-[10px] text-slate-400 mt-1'>{new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default SellerDashboard;