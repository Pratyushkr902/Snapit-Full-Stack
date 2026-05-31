import React, { useEffect, useState } from 'react';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';

const SellerDashboard = () => {
    const [orders, setOrders] = useState([]);
    const [allOrders, setAllOrders] = useState([]);
    const [activeTab, setActiveTab] = useState('packing');
    const [earningFilter, setEarningFilter] = useState('all'); // ✅ 'all' so history shows immediately

    const fetchNewOrders = async () => {
        try {
            const response = await Axios({ ...SummaryApi.getOrderItems });
            if (response.data.success) {
                const data = Array.isArray(response.data.data) ? response.data.data : [];
                setAllOrders(data);
                setOrders(data.filter(o => o.seller_status !== 'Ready for Pickup'));
            }
        } catch (error) {
            toast.error('Failed to fetch orders');
        }
    };

    const markAsReady = async (orderId) => {
        const response = await Axios({
            url: '/api/order/update-seller-status',
            method: 'post',
            data: { orderId, sellerStatus: 'Ready for Pickup' }
        });
        if (response.data.success) {
            toast.success('Rider Notified! Order ready for pickup.');
            fetchNewOrders();
        }
    };

    useEffect(() => { fetchNewOrders(); }, []);

    const now = new Date();

    const filterByDate = (ordersList) => {
        return ordersList.filter(o => {
            // ✅ Show ALL delivered orders regardless of delivery_fee
            if (o.delivery_status !== 'Delivered') return false;
            const created = new Date(o.createdAt);
            if (earningFilter === 'today') return created.toDateString() === now.toDateString();
            if (earningFilter === 'week') {
                const weekAgo = new Date(now);
                weekAgo.setDate(now.getDate() - 7);
                return created >= weekAgo;
            }
            if (earningFilter === 'month') {
                return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
            }
            return true;
        });
    };

    const filteredEarnings = filterByDate(allOrders);

    // ✅ Net = totalAmt - delivery_fee (delivery_fee defaults to 0 for old orders)
    const getNetEarning = (o) => (Number(o.totalAmt) || 0) - (Number(o.delivery_fee) || 0);

    const totalGross       = filteredEarnings.reduce((acc, o) => acc + (Number(o.totalAmt) || 0), 0);
    const totalDeliveryFees = filteredEarnings.reduce((acc, o) => acc + (Number(o.delivery_fee) || 0), 0);
    const totalNet         = filteredEarnings.reduce((acc, o) => acc + getNetEarning(o), 0);
    const totalOrders      = filteredEarnings.length;
    const avgNet           = totalOrders > 0 ? Math.round(totalNet / totalOrders) : 0;

    const earningsByDate = filteredEarnings.reduce((acc, o) => {
        const date = new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        if (!acc[date]) acc[date] = { gross: 0, net: 0, delivery: 0, count: 0 };
        acc[date].gross    += Number(o.totalAmt) || 0;
        acc[date].delivery += Number(o.delivery_fee) || 0;
        acc[date].net      += getNetEarning(o);
        acc[date].count    += 1;
        return acc;
    }, {});

    const pendingOrders = orders.filter(o => o.delivery_status === 'Pending').length;
    const packingOrders = orders.filter(o => o.delivery_status === 'Packing').length;

    // ✅ ALL orders history (not just delivered) for order history tab
    const allOrdersSorted = [...allOrders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const statusColor = (status) => {
        if (status === 'Delivered')        return 'bg-green-100 text-green-700';
        if (status === 'Out for Delivery') return 'bg-blue-100 text-blue-700';
        if (status === 'Confirmed')        return 'bg-purple-100 text-purple-700';
        if (status === 'Cancelled')        return 'bg-red-100 text-red-700';
        return 'bg-orange-100 text-orange-700';
    };

    return (
        <div className='p-4 bg-orange-50 min-h-screen max-w-4xl mx-auto'>

            {/* Header */}
            <div className='flex items-center justify-between mb-6'>
                <div>
                    <h1 className='text-2xl font-black text-slate-900'>STORE PANEL</h1>
                    <p className='text-xs text-slate-500 font-bold uppercase tracking-widest'>Snapit — Paliganj</p>
                </div>
                <div className='flex gap-2 text-center'>
                    <div className='bg-white rounded-2xl px-4 py-2 shadow-sm border border-orange-100'>
                        <p className='text-[10px] font-black text-slate-400 uppercase'>Pending</p>
                        <p className='text-xl font-black text-orange-500'>{pendingOrders}</p>
                    </div>
                    <div className='bg-white rounded-2xl px-4 py-2 shadow-sm border border-orange-100'>
                        <p className='text-[10px] font-black text-slate-400 uppercase'>Packing</p>
                        <p className='text-xl font-black text-blue-500'>{packingOrders}</p>
                    </div>
                </div>
            </div>

            {/* Tabs — 3 tabs now */}
            <div className='flex gap-2 mb-6 bg-white rounded-2xl p-1 shadow-sm border border-slate-100'>
                <button onClick={() => setActiveTab('packing')}
                    className={`flex-1 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab === 'packing' ? 'bg-orange-500 text-white shadow' : 'text-slate-500'}`}>
                    📦 Packing
                </button>
                <button onClick={() => setActiveTab('history')}
                    className={`flex-1 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab === 'history' ? 'bg-slate-800 text-white shadow' : 'text-slate-500'}`}>
                    🧾 History
                </button>
                <button onClick={() => setActiveTab('earnings')}
                    className={`flex-1 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab === 'earnings' ? 'bg-green-600 text-white shadow' : 'text-slate-500'}`}>
                    💰 Earnings
                </button>
            </div>

            {/* ── PACKING LIST TAB ── */}
            {activeTab === 'packing' && (
                <div className='grid gap-4'>
                    {orders.length === 0 ? (
                        <div className='bg-white rounded-3xl p-12 text-center border-2 border-dashed border-orange-200'>
                            <p className='text-4xl mb-3'>🎉</p>
                            <p className='font-black text-slate-700'>All orders packed!</p>
                            <p className='text-sm text-slate-400 mt-1'>No pending orders right now.</p>
                        </div>
                    ) : (
                        orders.map(order => (
                            <div key={order._id} className='bg-white p-6 rounded-3xl shadow-sm border-2 border-orange-100'>
                                <div className='flex justify-between items-center mb-2'>
                                    <span className='font-bold text-orange-600 font-mono text-sm'>{order.orderId}</span>
                                    <span className='bg-orange-100 px-3 py-1 rounded-full text-xs font-bold'>{order.seller_status || 'New'}</span>
                                </div>

                                {/* Store badge */}
                                {order.store_details?.name && (
                                    <div className='flex items-center gap-2 mb-3 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2'>
                                        <span className='text-base'>🏪</span>
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
                                        <p className='text-xl font-black text-slate-900'>₹{order.totalAmt}</p>
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
                        ))
                    )}
                </div>
            )}

            {/* ── ORDER HISTORY TAB ── */}
            {activeTab === 'history' && (
                <div className='flex flex-col gap-3'>
                    <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                        <div className='flex justify-between items-center mb-1'>
                            <h3 className='font-black text-slate-800 text-sm uppercase tracking-wider'>All Orders</h3>
                            <span className='text-xs font-bold text-slate-400'>{allOrdersSorted.length} total</span>
                        </div>
                        <p className='text-[10px] text-slate-400'>Every order placed — all statuses</p>
                    </div>

                    {allOrdersSorted.length === 0 ? (
                        <div className='bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200'>
                            <p className='text-4xl mb-3'>📭</p>
                            <p className='font-black text-slate-700'>No orders yet</p>
                        </div>
                    ) : (
                        allOrdersSorted.map(order => (
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

                                {/* Items */}
                                <div className='mb-2'>
                                    {(order.cartItems || []).slice(0, 3).map((item, i) => (
                                        <p key={i} className='text-xs font-bold text-slate-700'>• {item.productId?.name || item.name} ×{item.quantity}</p>
                                    ))}
                                    {(order.cartItems || []).length > 3 && (
                                        <p className='text-xs text-slate-400'>+{order.cartItems.length - 3} more items</p>
                                    )}
                                </div>

                                <div className='flex justify-between items-center pt-2 border-t border-slate-50'>
                                    <div className='flex gap-3'>
                                        <div>
                                            <p className='text-[10px] text-slate-400 uppercase font-bold'>Total</p>
                                            <p className='font-black text-slate-800'>₹{order.totalAmt}</p>
                                        </div>
                                        {order.delivery_fee > 0 && (
                                            <div>
                                                <p className='text-[10px] text-slate-400 uppercase font-bold'>Delivery</p>
                                                <p className='font-bold text-red-400'>-₹{order.delivery_fee}</p>
                                            </div>
                                        )}
                                        <div>
                                            <p className='text-[10px] text-slate-400 uppercase font-bold'>Your Earning</p>
                                            <p className='font-black text-emerald-600'>₹{getNetEarning(order)}</p>
                                        </div>
                                    </div>
                                    <span className='text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg'>
                                        {order.payment_status === 'CASH ON DELIVERY' ? '💵 COD' : '✅ Paid'}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* ── EARNINGS TAB ── */}
            {activeTab === 'earnings' && (
                <div className='flex flex-col gap-4'>

                    {/* Filter Pills */}
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

                    {/* Hero card */}
                    <div className='bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-5 text-white shadow-lg'>
                        <p className='text-xs font-black uppercase tracking-widest text-green-200 mb-1'>Your Earnings (excl. delivery)</p>
                        <p className='text-4xl font-black'>₹{totalNet.toLocaleString()}</p>
                        <div className='flex gap-4 mt-3 border-t border-green-500 pt-3'>
                            <div>
                                <p className='text-[10px] text-green-200 uppercase font-bold'>Gross Sales</p>
                                <p className='text-sm font-bold'>₹{totalGross.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className='text-[10px] text-green-200 uppercase font-bold'>Delivery</p>
                                <p className='text-sm font-bold text-red-300'>-₹{totalDeliveryFees.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className='text-[10px] text-green-200 uppercase font-bold'>Orders</p>
                                <p className='text-sm font-bold'>{totalOrders}</p>
                            </div>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className='grid grid-cols-2 gap-3'>
                        <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                            <p className='text-[10px] font-black text-slate-400 uppercase'>Gross Revenue</p>
                            <p className='text-2xl font-black text-slate-600 mt-1'>₹{totalGross.toLocaleString()}</p>
                            <p className='text-[10px] text-slate-400 mt-1'>Before delivery deduction</p>
                        </div>
                        <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                            <p className='text-[10px] font-black text-slate-400 uppercase'>Delivery Deducted</p>
                            <p className='text-2xl font-black text-red-400 mt-1'>₹{totalDeliveryFees.toLocaleString()}</p>
                            <p className='text-[10px] text-slate-400 mt-1'>Paid to delivery boy</p>
                        </div>
                        <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                            <p className='text-[10px] font-black text-slate-400 uppercase'>Net Earning</p>
                            <p className='text-2xl font-black text-emerald-600 mt-1'>₹{totalNet.toLocaleString()}</p>
                            <p className='text-[10px] text-slate-400 mt-1'>Your actual income</p>
                        </div>
                        <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                            <p className='text-[10px] font-black text-slate-400 uppercase'>Avg Per Order</p>
                            <p className='text-2xl font-black text-blue-600 mt-1'>₹{avgNet}</p>
                            <p className='text-[10px] text-slate-400 mt-1'>Net avg value</p>
                        </div>
                    </div>

                    {/* Daily Breakdown */}
                    <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                        <h3 className='font-black text-slate-800 text-sm uppercase tracking-wider mb-3'>Daily Breakdown (Net)</h3>
                        {Object.keys(earningsByDate).length === 0 ? (
                            <p className='text-slate-400 text-sm text-center py-4'>No delivered orders in this period.</p>
                        ) : (
                            <div className='flex flex-col gap-2'>
                                {Object.entries(earningsByDate)
                                    .sort((a, b) => new Date(b[0]) - new Date(a[0]))
                                    .map(([date, data]) => (
                                        <div key={date} className='flex justify-between items-center py-2 border-b border-slate-50 last:border-0'>
                                            <div>
                                                <p className='font-bold text-slate-700 text-sm'>{date}</p>
                                                <p className='text-[10px] text-slate-400'>
                                                    {data.count} order{data.count > 1 ? 's' : ''} · -₹{data.delivery} delivery
                                                </p>
                                            </div>
                                            <div className='text-right'>
                                                <p className='font-black text-emerald-600'>₹{data.net.toLocaleString()}</p>
                                                <p className='text-[10px] text-slate-400 line-through'>₹{data.gross}</p>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Delivered Orders */}
                    <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                        <h3 className='font-black text-slate-800 text-sm uppercase tracking-wider mb-3'>Recent Deliveries</h3>
                        {filteredEarnings.length === 0 ? (
                            <p className='text-slate-400 text-sm text-center py-4'>No delivered orders in this period.</p>
                        ) : (
                            <div className='flex flex-col gap-2'>
                                {filteredEarnings.slice(0, 10).map(order => (
                                    <div key={order._id} className='flex justify-between items-center py-2 border-b border-slate-50 last:border-0'>
                                        <div>
                                            <p className='font-bold text-slate-700 text-xs font-mono'>{order.orderId}</p>
                                            <p className='text-[10px] text-slate-400 mt-0.5 line-clamp-1'>{order.product_details?.name}</p>
                                            {order.delivery_fee > 0 && (
                                                <p className='text-[10px] text-red-400'>-₹{order.delivery_fee} delivery</p>
                                            )}
                                        </div>
                                        <div className='text-right'>
                                            <p className='font-black text-emerald-600'>₹{getNetEarning(order)}</p>
                                            <p className='text-[10px] text-slate-400 line-through'>₹{order.totalAmt}</p>
                                            <p className='text-[10px] text-slate-400'>{new Date(order.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            )}
        </div>
    );
};

export default SellerDashboard;