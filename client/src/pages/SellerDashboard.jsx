import React, { useEffect, useState } from 'react';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';

const SellerDashboard = () => {
    const [orders, setOrders] = useState([]);
    const [allOrders, setAllOrders] = useState([]);
    const [activeTab, setActiveTab] = useState('packing'); // 'packing' | 'earnings'
    const [earningFilter, setEarningFilter] = useState('today'); // 'today' | 'week' | 'month' | 'all'

    const fetchNewOrders = async () => {
        const response = await Axios({ ...SummaryApi.getOrderItems });
        if (response.data.success) {
            const data = Array.isArray(response.data.data) ? response.data.data : []
            setAllOrders(data)
            setOrders(data.filter(o => o.seller_status !== "Ready for Pickup"))
        }
    };

    const markAsReady = async (orderId) => {
        const response = await Axios({
            url: '/api/order/update-seller-status',
            method: 'post',
            data: { orderId, sellerStatus: "Ready for Pickup" }
        });
        if (response.data.success) {
            toast.success("Rider Notified! Order ready for pickup.");
            fetchNewOrders();
        }
    };

    useEffect(() => { fetchNewOrders(); }, []);

    // ── Earnings Calculations ─────────────────────────────────
    const now = new Date()

    const filterByDate = (ordersList) => {
        return ordersList.filter(o => {
            if (o.delivery_status !== 'Delivered') return false
            const created = new Date(o.createdAt)
            if (earningFilter === 'today') {
                return created.toDateString() === now.toDateString()
            }
            if (earningFilter === 'week') {
                const weekAgo = new Date(now)
                weekAgo.setDate(now.getDate() - 7)
                return created >= weekAgo
            }
            if (earningFilter === 'month') {
                return (
                    created.getMonth() === now.getMonth() &&
                    created.getFullYear() === now.getFullYear()
                )
            }
            return true // 'all'
        })
    }

    const filteredEarnings = filterByDate(allOrders)
    const totalRevenue = filteredEarnings.reduce((acc, o) => acc + (Number(o.totalAmt) || 0), 0)
    const totalOrders = filteredEarnings.length
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0
    const totalDeliveryFees = filteredEarnings.reduce((acc, o) => acc + (Number(o.delivery_fee) || 0), 0)
    const netRevenue = totalRevenue - totalDeliveryFees

    // Group by date for earnings history
    const earningsByDate = filteredEarnings.reduce((acc, o) => {
        const date = new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        if (!acc[date]) acc[date] = { total: 0, count: 0 }
        acc[date].total += Number(o.totalAmt) || 0
        acc[date].count += 1
        return acc
    }, {})

    const pendingOrders = orders.filter(o => o.delivery_status === 'Pending').length
    const packingOrders = orders.filter(o => o.delivery_status === 'Packing').length

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

            {/* Tabs */}
            <div className='flex gap-2 mb-6 bg-white rounded-2xl p-1 shadow-sm border border-slate-100'>
                <button
                    onClick={() => setActiveTab('packing')}
                    className={`flex-1 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab === 'packing' ? 'bg-orange-500 text-white shadow' : 'text-slate-500'}`}
                >
                    📦 Packing List
                </button>
                <button
                    onClick={() => setActiveTab('earnings')}
                    className={`flex-1 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab === 'earnings' ? 'bg-green-600 text-white shadow' : 'text-slate-500'}`}
                >
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
                                <div className='flex justify-between items-center mb-4'>
                                    <span className='font-bold text-orange-600'>{order.orderId}</span>
                                    <span className='bg-orange-100 px-3 py-1 rounded-full text-xs font-bold'>{order.seller_status || 'New'}</span>
                                </div>
                                <div className='mb-4'>
                                    {(order.cartItems || []).map((item, i) => (
                                        <p key={i} className='font-bold text-slate-700'>• {item.productId?.name || item.name} (x{item.quantity})</p>
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
                                <button
                                    onClick={() => markAsReady(order.orderId)}
                                    className='w-full bg-orange-500 text-white py-3 rounded-2xl font-black hover:bg-orange-600 transition-all active:scale-95'
                                >
                                    PACKED & READY FOR RIDER
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* ── EARNINGS TAB ── */}
            {activeTab === 'earnings' && (
                <div className='flex flex-col gap-4'>

                    {/* Filter Pills */}
                    <div className='flex gap-2'>
                        {[
                            { key: 'today', label: 'Today' },
                            { key: 'week', label: 'This Week' },
                            { key: 'month', label: 'This Month' },
                            { key: 'all', label: 'All Time' },
                        ].map(f => (
                            <button
                                key={f.key}
                                onClick={() => setEarningFilter(f.key)}
                                className={`px-4 py-2 rounded-full text-xs font-black transition-all border ${earningFilter === f.key ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200'}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Summary Cards */}
                    <div className='grid grid-cols-2 gap-3'>
                        <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                            <p className='text-[10px] font-black text-slate-400 uppercase'>Total Revenue</p>
                            <p className='text-2xl font-black text-green-600 mt-1'>₹{totalRevenue.toLocaleString()}</p>
                        </div>
                        <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                            <p className='text-[10px] font-black text-slate-400 uppercase'>Orders Delivered</p>
                            <p className='text-2xl font-black text-slate-900 mt-1'>{totalOrders}</p>
                        </div>
                        <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                            <p className='text-[10px] font-black text-slate-400 uppercase'>Avg Order Value</p>
                            <p className='text-2xl font-black text-blue-600 mt-1'>₹{avgOrderValue}</p>
                        </div>
                        <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                            <p className='text-[10px] font-black text-slate-400 uppercase'>Net (after delivery)</p>
                            <p className='text-2xl font-black text-emerald-600 mt-1'>₹{netRevenue.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Daily Breakdown */}
                    <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                        <h3 className='font-black text-slate-800 text-sm uppercase tracking-wider mb-3'>Daily Breakdown</h3>
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
                                                <p className='text-[10px] text-slate-400'>{data.count} order{data.count > 1 ? 's' : ''}</p>
                                            </div>
                                            <p className='font-black text-green-600'>₹{data.total.toLocaleString()}</p>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Delivered Orders */}
                    <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                        <h3 className='font-black text-slate-800 text-sm uppercase tracking-wider mb-3'>Recent Deliveries</h3>
                        {filteredEarnings.length === 0 ? (
                            <p className='text-slate-400 text-sm text-center py-4'>No deliveries yet.</p>
                        ) : (
                            <div className='flex flex-col gap-2'>
                                {filteredEarnings.slice(0, 10).map(order => (
                                    <div key={order._id} className='flex justify-between items-center py-2 border-b border-slate-50 last:border-0'>
                                        <div>
                                            <p className='font-bold text-slate-700 text-xs font-mono'>{order.orderId}</p>
                                            <p className='text-[10px] text-slate-400 mt-0.5 line-clamp-1'>{order.product_details?.name}</p>
                                        </div>
                                        <div className='text-right'>
                                            <p className='font-black text-slate-900'>₹{order.totalAmt}</p>
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