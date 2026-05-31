import React, { useEffect, useState } from 'react';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';

const SellerDashboard = () => {
    const [allOrders, setAllOrders] = useState([]);
    const [activeTab, setActiveTab] = useState('packing');
    const [earningFilter, setEarningFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await Axios({ ...SummaryApi.getSellerOrders });
            if (response.data.success) {
                const data = Array.isArray(response.data.data) ? response.data.data : [];
                setAllOrders(data);

                // ✅ DEBUG: Remove this after confirming earnings work
                const delivered = data.filter(o =>
                    (o.delivery_status || '').trim().toLowerCase() === 'delivered'
                );
                console.log('=== SELLER EARNINGS DEBUG ===');
                console.log('Total orders fetched:', data.length);
                console.log('Delivered orders:', delivered.length);
                console.log('All delivery_status values:', [...new Set(data.map(o => o.delivery_status))]);
                console.log('Sample order fields:', data[0] ? Object.keys(data[0]) : 'No orders');
                if (delivered.length > 0) {
                    console.log('Sample delivered order:', delivered[0]);
                }
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

    // ✅ FIX: case-insensitive, trim whitespace comparison
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

    // ✅ FIX: Use isDelivered() instead of string comparison
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
            return true; // 'all'
        });
    };

    const filteredEarnings = filterByDate(allOrders);

    // ✅ FIX: Robust field access — handles totalAmt, total_amount, amount, subTotalAmt
    const getOrderAmount = (o) =>
        Number(o.totalAmt ?? o.total_amount ?? o.amount ?? o.subTotalAmt ?? 0);

    const getDeliveryFee = (o) =>
        Number(o.delivery_fee ?? o.deliveryFee ?? o.delivery_charge ?? 0);

    const getNet = (o) => getOrderAmount(o) - getDeliveryFee(o);

    const totalGross    = filteredEarnings.reduce((a, o) => a + getOrderAmount(o), 0);
    const totalDelivery = filteredEarnings.reduce((a, o) => a + getDeliveryFee(o), 0);
    const totalNet      = filteredEarnings.reduce((a, o) => a + getNet(o), 0);
    const totalOrders   = filteredEarnings.length;
    const avgNet        = totalOrders > 0 ? Math.round(totalNet / totalOrders) : 0;

    // Product-wise earning breakdown
    const productEarnings = filteredEarnings.reduce((acc, order) => {
        (order.cartItems || []).forEach(item => {
            const name = item.productId?.name || item.name || 'Unknown Product';
            const qty  = Number(item.quantity) || 1;
            const price = Number(item.price) || 0;
            if (!acc[name]) acc[name] = { qty: 0, revenue: 0 };
            acc[name].qty     += qty;
            acc[name].revenue += price * qty;
        });
        return acc;
    }, {});

    const productList = Object.entries(productEarnings)
        .sort((a, b) => b[1].revenue - a[1].revenue);

    const byDate = filteredEarnings.reduce((acc, o) => {
        const d = new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        if (!acc[d]) acc[d] = { gross: 0, net: 0, delivery: 0, count: 0 };
        acc[d].gross    += getOrderAmount(o);
        acc[d].delivery += getDeliveryFee(o);
        acc[d].net      += getNet(o);
        acc[d].count    += 1;
        return acc;
    }, {});

    const allSorted = [...allOrders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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

            {/* PACKING TAB */}
            {activeTab === 'packing' && (
                <div className='grid gap-4'>
                    {packingOrders.length === 0 ? (
                        <div className='bg-white rounded-3xl p-12 text-center border-2 border-dashed border-orange-200'>
                            <p className='text-4xl mb-3'>🎉</p>
                            <p className='font-black text-slate-700'>All orders are packed and with riders! 📦</p>
                            <p className='text-sm text-slate-400 mt-1'>No pending orders right now.</p>
                            <button onClick={fetchOrders} className='mt-4 bg-orange-100 text-orange-600 font-black text-sm px-5 py-2 rounded-full'>Check for new orders in seller dashboard</button>
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

            {/* HISTORY TAB */}
            {activeTab === 'history' && (
                <div className='flex flex-col gap-3'>
                    <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex justify-between items-center'>
                        <div>
                            <h3 className='font-black text-slate-800 text-sm uppercase tracking-wider'>All Orders</h3>
                            <p className='text-[10px] text-slate-400'>Complete product & accounting history</p>
                        </div>
                        <span className='text-xs font-bold text-slate-400'>{allSorted.length} total</span>
                    </div>
                    {allSorted.length === 0 ? (
                        <div className='bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200'>
                            <p className='text-4xl mb-3'>📭</p>
                            <p className='font-black text-slate-700'>No orders yet</p>
                        </div>
                    ) : allSorted.map(order => (
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
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className='flex justify-between items-center pt-2 border-t border-slate-100'>
                                <div className='flex gap-3'>
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
                                            <p className='font-black text-emerald-600'>₹{getNet(order)}</p>
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

            {/* EARNINGS TAB */}
            {activeTab === 'earnings' && (
                <div className='flex flex-col gap-4'>

                    {/* Filter buttons */}
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

                    {/* No earnings state */}
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
                            {/* Hero */}
                            <div className='bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-5 text-white shadow-lg'>
                                <p className='text-xs font-black uppercase tracking-widest text-green-200 mb-1'>Net Earnings (after delivery deduction)</p>
                                <p className='text-4xl font-black'>₹{totalNet.toLocaleString()}</p>
                                <div className='flex gap-4 mt-3 border-t border-green-500 pt-3 flex-wrap'>
                                    <div><p className='text-[10px] text-green-200 uppercase font-bold'>Gross Sales</p><p className='text-sm font-bold'>₹{totalGross.toLocaleString()}</p></div>
                                    <div><p className='text-[10px] text-green-200 uppercase font-bold'>Delivery Deducted</p><p className='text-sm font-bold text-red-300'>-₹{totalDelivery.toLocaleString()}</p></div>
                                    <div><p className='text-[10px] text-green-200 uppercase font-bold'>Orders</p><p className='text-sm font-bold'>{totalOrders}</p></div>
                                    <div><p className='text-[10px] text-green-200 uppercase font-bold'>Avg/Order</p><p className='text-sm font-bold'>₹{avgNet}</p></div>
                                </div>
                            </div>

                            {/* Summary grid */}
                            <div className='grid grid-cols-2 gap-3'>
                                <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                                    <p className='text-[10px] font-black text-slate-400 uppercase'>Gross Revenue</p>
                                    <p className='text-2xl font-black text-slate-600 mt-1'>₹{totalGross.toLocaleString()}</p>
                                    <p className='text-[10px] text-slate-400 mt-1'>Before delivery deduction</p>
                                </div>
                                <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                                    <p className='text-[10px] font-black text-slate-400 uppercase'>Delivery Deducted</p>
                                    <p className='text-2xl font-black text-red-400 mt-1'>₹{totalDelivery.toLocaleString()}</p>
                                    <p className='text-[10px] text-slate-400 mt-1'>Paid to delivery rider</p>
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

                            {/* ✅ NEW: Product-wise Earning Breakdown */}
                            {productList.length > 0 && (
                                <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                                    <h3 className='font-black text-slate-800 text-sm uppercase tracking-wider mb-3'>📦 Product Selling Breakdown</h3>
                                    <div className='flex flex-col gap-2'>
                                        {productList.map(([name, data]) => {
                                            const pct = totalGross > 0 ? Math.round((data.revenue / totalGross) * 100) : 0;
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

                            {/* Daily breakdown */}
                            <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                                <h3 className='font-black text-slate-800 text-sm uppercase tracking-wider mb-3'>📅 Daily Breakdown</h3>
                                <div className='flex flex-col gap-2'>
                                    {Object.entries(byDate).sort((a, b) => new Date(b[0]) - new Date(a[0])).map(([date, data]) => (
                                        <div key={date} className='flex justify-between items-center py-2 border-b border-slate-50 last:border-0'>
                                            <div>
                                                <p className='font-bold text-slate-700 text-sm'>{date}</p>
                                                <p className='text-[10px] text-slate-400'>{data.count} order{data.count > 1 ? 's' : ''} · -₹{data.delivery} delivery</p>
                                            </div>
                                            <div className='text-right'>
                                                <p className='font-black text-emerald-600'>₹{data.net.toLocaleString()}</p>
                                                <p className='text-[10px] text-slate-400 line-through'>₹{data.gross}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Per-order breakdown */}
                            <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                                <h3 className='font-black text-slate-800 text-sm uppercase tracking-wider mb-3'>🧾 Order Breakdown</h3>
                                {filteredEarnings.map(order => (
                                    <div key={order._id} className='py-3 border-b border-slate-50 last:border-0'>
                                        <div className='flex justify-between items-start mb-1'>
                                            <p className='font-mono text-xs font-bold text-slate-500'>{order.orderId}</p>
                                            <div className='text-right'>
                                                <p className='font-black text-emerald-600'>₹{getNet(order)}</p>
                                                {getDeliveryFee(order) > 0 && <p className='text-[10px] text-red-400'>-₹{getDeliveryFee(order)} delivery</p>}
                                                <p className='text-[10px] text-slate-400 line-through'>₹{getOrderAmount(order)}</p>
                                            </div>
                                        </div>
                                        {(order.cartItems || []).map((item, i) => (
                                            <p key={i} className='text-[10px] text-slate-500'>• {item.productId?.name || item.name} ×{item.quantity} @ ₹{item.price}</p>
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