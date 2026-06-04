import React, { useState, useEffect } from 'react'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'

// ── Robust field getters (same as SellerDashboard) ────────────
const getOrderAmount   = (o) => Number(o.totalAmt ?? o.total_amount ?? o.amount ?? o.subTotalAmt ?? 0)
const getDeliveryFee   = (o) => Number(o.delivery_fee ?? o.deliveryFee ?? o.delivery_charge ?? 0)
const getItemSellerPrice = (item) => Number(item.sellerPrice ?? item.seller_price ?? item.price ?? item.unit_price ?? 0)
const getItemSnapitMargin = (item) => Number(item.snapitMargin ?? item.snapit_margin ?? 0)

const getSellerEarning = (order) =>
    (order.cartItems || []).reduce(
        (acc, item) => acc + getItemSellerPrice(item) * (Number(item.quantity) || 1), 0
    )
const getSnapitEarning = (order) =>
    (order.cartItems || []).reduce(
        (acc, item) => acc + getItemSnapitMargin(item) * (Number(item.quantity) || 1), 0
    )

const isDelivered = (o) => (o.delivery_status || '').trim().toLowerCase() === 'delivered'

// ── Bar Chart ─────────────────────────────────────────────────
const BarChart = ({ data }) => {
    const max = Math.max(...data.map(d => d.earnings), 1)
    return (
        <div className="flex items-end gap-2 h-32 mt-2">
            {data.map((d, i) => {
                const pct = (d.earnings / max) * 100
                const isLast = i === data.length - 1
                return (
                    <div key={d.month} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div className="absolute -top-8 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            ₹{d.earnings.toLocaleString('en-IN')}
                        </div>
                        <div
                            className={`w-full rounded-t-md transition-all duration-500 ${isLast ? 'bg-orange-500' : 'bg-orange-200 group-hover:bg-orange-300'}`}
                            style={{ height: `${pct}%`, minHeight: '6px' }}
                        />
                        <span className="text-[10px] text-gray-500">{d.month}</span>
                    </div>
                )
            })}
        </div>
    )
}

// ── Main Component ────────────────────────────────────────────
const SellerEarnings = () => {
    const [orders, setOrders]       = useState([])
    const [loading, setLoading]     = useState(true)
    const [activeTab, setActiveTab] = useState('all')

    useEffect(() => { fetchOrders() }, [])

    const fetchOrders = async () => {
        try {
            const response = await Axios({ ...SummaryApi.getSellerOrders })
            if (response.data.success) {
                setOrders(Array.isArray(response.data.data) ? response.data.data : [])
            }
        } catch {
            // orders stays []
        } finally {
            setLoading(false)
        }
    }

    // ── Derived stats from real orders ────────────────────────
    const now           = new Date()
    const deliveredAll  = orders.filter(isDelivered)

    const thisMonth = deliveredAll.filter(o => {
        const d = new Date(o.createdAt)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const lastMonth = deliveredAll.filter(o => {
        const d    = new Date(o.createdAt)
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        return d.getMonth() === prev.getMonth() && d.getFullYear() === prev.getFullYear()
    })

    const totalSellerEarning    = deliveredAll.reduce((a, o) => a + getSellerEarning(o), 0)
    const thisMonthEarnings     = thisMonth.reduce((a, o) => a + getSellerEarning(o), 0)
    const lastMonthEarnings     = lastMonth.reduce((a, o) => a + getSellerEarning(o), 0)
    const totalSnapit           = deliveredAll.reduce((a, o) => a + getSnapitEarning(o), 0)
    const totalGross            = deliveredAll.reduce((a, o) => a + getOrderAmount(o), 0)
    const totalOrders           = deliveredAll.length
    const avgOrderValue         = totalOrders > 0 ? Math.round(totalSellerEarning / totalOrders) : 0

    // Pending = Out for Delivery orders (not yet delivered)
    const pendingOrders  = orders.filter(o => (o.delivery_status || '').toLowerCase() === 'out for delivery')
    const pendingPayout  = pendingOrders.reduce((a, o) => a + getSellerEarning(o), 0)

    const growthPct         = lastMonthEarnings > 0
        ? (((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100).toFixed(1)
        : thisMonthEarnings > 0 ? 100 : 0
    const isGrowthPositive  = Number(growthPct) >= 0

    // ── Monthly chart (last 6 months) ─────────────────────────
    const monthlyData = Array.from({ length: 6 }, (_, i) => {
        const d     = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
        const label = d.toLocaleDateString('en-IN', { month: 'short' })
        const earnings = deliveredAll
            .filter(o => {
                const od = new Date(o.createdAt)
                return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear()
            })
            .reduce((a, o) => a + getSellerEarning(o), 0)
        return { month: label, earnings }
    })

    // ── Transaction list (delivered orders as transactions) ───
    const transactions = [...deliveredAll]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(o => ({
            _id        : o._id,
            orderId    : o.orderId,
            date       : o.createdAt,
            gross      : getOrderAmount(o),
            snapitCut  : getSnapitEarning(o),
            delivery   : getDeliveryFee(o),
            net        : getSellerEarning(o),
            status     : 'paid',
            customer   : o.userId?.name || o.delivery_address?.name || 'Customer',
            items      : (o.cartItems || []).length,
        }))

    // Also include pending (out for delivery) as pending transactions
    const pendingTxns = [...pendingOrders]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(o => ({
            _id        : o._id,
            orderId    : o.orderId,
            date       : o.createdAt,
            gross      : getOrderAmount(o),
            snapitCut  : getSnapitEarning(o),
            delivery   : getDeliveryFee(o),
            net        : getSellerEarning(o),
            status     : 'pending',
            customer   : o.userId?.name || o.delivery_address?.name || 'Customer',
            items      : (o.cartItems || []).length,
        }))

    const allTxns  = [...pendingTxns, ...transactions]
    const filtered = activeTab === 'all' ? allTxns
        : activeTab === 'paid'    ? transactions
        : pendingTxns

    const formatDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <div className="w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Loading earnings…</p>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-5">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <span>💰</span> Earnings & Payouts
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">Your revenue overview and transaction history</p>
                    </div>
                    <button onClick={fetchOrders} className="text-sm text-orange-500 font-bold hover:underline">🔄 Refresh</button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

                {/* No orders state */}
                {orders.length === 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4 text-sm text-yellow-800 font-medium">
                        ⚠️ No orders found yet. Earnings will appear once you receive and deliver orders.
                    </div>
                )}

                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-4 col-span-2 lg:col-span-1 shadow-md">
                        <p className="text-xs font-medium text-orange-100">Total Earnings</p>
                        <p className="text-2xl font-bold mt-1">₹{totalSellerEarning.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-orange-200 mt-1">From {totalOrders} delivered orders</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                        <p className="text-xs text-gray-500">This Month</p>
                        <p className="text-xl font-bold text-gray-900 mt-1">₹{thisMonthEarnings.toLocaleString('en-IN')}</p>
                        <span className={`text-xs font-semibold mt-1 inline-block ${isGrowthPositive ? 'text-green-600' : 'text-red-500'}`}>
                            {isGrowthPositive ? '▲' : '▼'} {Math.abs(growthPct)}% vs last month
                        </span>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                        <p className="text-xs text-gray-500">Pending Payout</p>
                        <p className="text-xl font-bold text-yellow-600 mt-1">₹{pendingPayout.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-gray-400 mt-1">{pendingOrders.length} orders in transit</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                        <p className="text-xs text-gray-500">Total Gross Sales</p>
                        <p className="text-xl font-bold text-green-600 mt-1">₹{totalGross.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-gray-400 mt-1">Before Snapit cut</p>
                    </div>
                </div>

                {/* Chart + Quick Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-1">
                            <h2 className="text-sm font-semibold text-gray-700">Monthly Earnings</h2>
                            <span className="text-xs text-gray-400">Last 6 months</span>
                        </div>
                        <BarChart data={monthlyData} />
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between">
                        <h2 className="text-sm font-semibold text-gray-700 mb-4">Quick Stats</h2>
                        <div className="space-y-4">
                            {[
                                { label: 'Delivered Orders',  value: totalOrders,                                    icon: '📦' },
                                { label: 'Avg Order Earning', value: `₹${avgOrderValue.toLocaleString('en-IN')}`,    icon: '📊' },
                                { label: 'Snapit Cut (total)',value: `₹${totalSnapit.toLocaleString('en-IN')}`,      icon: '🏷️' },
                                { label: 'Payout Cycle',      value: 'Weekly',                                        icon: '🔄' },
                            ].map(stat => (
                                <div key={stat.label} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <span>{stat.icon}</span>
                                        {stat.label}
                                    </div>
                                    <span className="text-sm font-semibold text-gray-800">{stat.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Transactions */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-gray-700">
                            Transaction History
                            <span className="ml-2 text-xs text-gray-400 font-normal">({filtered.length})</span>
                        </h2>
                        <div className="flex gap-2">
                            {['all', 'paid', 'pending'].map(tab => (
                                <button key={tab} onClick={() => setActiveTab(tab)}
                                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                                        activeTab === tab ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}>
                                    {tab === 'all' ? 'All' : tab === 'paid' ? '✅ Paid' : '⏳ Pending'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Table Header */}
                    <div className="hidden sm:grid grid-cols-6 gap-3 px-5 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <span className="col-span-2">Order / Customer</span>
                        <span className="text-right">Gross</span>
                        <span className="text-right">Snapit Cut</span>
                        <span className="text-right">Delivery</span>
                        <span className="text-right">You Earn</span>
                    </div>

                    <div className="divide-y divide-gray-50">
                        {filtered.length === 0 ? (
                            <div className="py-10 text-center text-gray-400 text-sm">No transactions found</div>
                        ) : (
                            filtered.map(txn => (
                                <div key={txn._id} className="grid grid-cols-2 sm:grid-cols-6 gap-3 px-5 py-3.5 items-center hover:bg-gray-50 transition-colors">
                                    <div className="col-span-2">
                                        <p className="text-sm font-medium text-gray-800 font-mono">{txn.orderId}</p>
                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            <p className="text-xs text-gray-400">{txn.customer} · {formatDate(txn.date)}</p>
                                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                                txn.status === 'paid'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {txn.status === 'paid' ? '✓ Paid' : '⏳ Pending'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-700">₹{txn.gross.toLocaleString('en-IN')}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-red-400">
                                            {txn.snapitCut > 0 ? `-₹${txn.snapitCut.toLocaleString('en-IN')}` : '—'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-red-400">
                                            {txn.delivery > 0 ? `-₹${txn.delivery.toLocaleString('en-IN')}` : '—'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-green-600">₹{txn.net.toLocaleString('en-IN')}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Payout Info Banner */}
                {pendingPayout > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-4 flex items-start gap-3">
                        <span className="text-2xl">💳</span>
                        <div>
                            <p className="text-sm font-semibold text-orange-800">Next Payout</p>
                            <p className="text-xs text-orange-600 mt-0.5">
                                Pending amount of <strong>₹{pendingPayout.toLocaleString('en-IN')}</strong> will be transferred to your registered bank account within 3–5 business days after delivery confirmation.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default SellerEarnings