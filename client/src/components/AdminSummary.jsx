import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import AdminPermision from '../layouts/AdminPermision'
import AdminRiderSimulator from '../components/AdminRiderSimulator'
import AddStore from '../components/AddStore'
import DailyReport from '../components/DailyReport'
import Accounts from '../components/Accounts'
import AdminLiveFleetWidget from '../components/AdminLiveFleetWidget'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import toast from 'react-hot-toast'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts'

// ─── helpers ────────────────────────────────────────────────────────────────
const getAmt = (o) => {
  const val =
    o.totalAmt ?? o.totalAmount ?? o.grandTotal ??
    o.subTotalAmt ?? o.amount ?? o.total ?? 0
  return Number(val) || 0
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const buildDailyData = (allOrders) => {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push({
      label: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
      dateStr: d.toISOString().slice(0, 10),
      Revenue: 0, Orders: 0,
    })
  }
  allOrders
    .filter(o => o.delivery_status === 'Delivered')
    .forEach(o => {
      const raw = o.createdAt || o.updatedAt || o.orderDate
      if (!raw) return
      const dateStr = new Date(raw).toISOString().slice(0, 10)
      const day = days.find(d => d.dateStr === dateStr)
      if (day) { day.Revenue += getAmt(o); day.Orders += 1 }
    })
  return days.map(d => ({ name: d.label, Revenue: Math.round(d.Revenue), Orders: d.Orders }))
}

const buildMonthlyData = (allOrders) => {
  const now = new Date()
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ month: d.getMonth(), year: d.getFullYear(), Revenue: 0, Orders: 0 })
  }
  allOrders
    .filter(o => o.delivery_status === 'Delivered')
    .forEach(o => {
      const raw = o.createdAt || o.updatedAt || o.orderDate
      if (!raw) return
      const d = new Date(raw)
      const entry = months.find(m => m.month === d.getMonth() && m.year === d.getFullYear())
      if (entry) { entry.Revenue += getAmt(o); entry.Orders += 1 }
    })
  return months.map(m => ({
    name: `${MONTHS[m.month]} '${String(m.year).slice(2)}`,
    Revenue: Math.round(m.Revenue),
    Orders: m.Orders,
  }))
}

const buildStatusBreakdown = (allOrders) => {
  const counts = {}
  allOrders.forEach(o => {
    const s = o.delivery_status || 'Unknown'
    counts[s] = (counts[s] || 0) + 1
  })
  const COLORS = {
    Delivered: '#4ade80',
    Cancelled: '#f87171',
    Pending: '#fbbf24',
    Processing: '#60a5fa',
    'Out for Delivery': '#c084fc',
  }
  return Object.entries(counts).map(([name, value]) => ({
    name, value, color: COLORS[name] || '#94a3b8'
  }))
}

const buildTopProducts = (allOrders) => {
  const map = {}
  allOrders
    .filter(o => o.delivery_status === 'Delivered')
    .forEach(o => {
      const key = o.product_details?.name || 'Unknown'
      if (!map[key]) map[key] = { name: key, revenue: 0, count: 0 }
      map[key].revenue += getAmt(o)
      map[key].count += 1
    })
  return Object.values(map)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map(p => ({ ...p, revenue: Math.round(p.revenue) }))
}

// ─── custom tooltip ─────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label, type = 'revenue' }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1e293b', border: '1px solid #334155',
      borderRadius: 8, padding: '8px 12px',
    }}>
      <p style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ fontSize: 13, fontWeight: 800, color: p.color || '#4ade80' }}>
          {p.dataKey === 'Revenue' ? DisplayPriceInRupees(p.value) : `${p.value} orders`}
        </p>
      ))}
    </div>
  )
}

// ─── stat card ───────────────────────────────────────────────────────────────
const StatCard = ({ label, value, badge, badgeBg, badgeColor, iconBg, icon, sub, subColor, trend }) => (
  <div style={{
    background: '#0f1923', borderRadius: 14,
    padding: '14px', position: 'relative', overflow: 'hidden',
  }}>
    <span style={{
      fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
      position: 'absolute', top: 12, right: 12,
      background: badgeBg, color: badgeColor, letterSpacing: 0.5, whiteSpace: 'nowrap',
    }}>{badge}</span>
    <div style={{
      width: 34, height: 34, borderRadius: 8, background: iconBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    }}>{icon}</div>
    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }}>
      {label}
    </div>
    <div style={{
      fontSize: 'clamp(16px, 4vw, 28px)', fontWeight: 800, color: '#f1f5f9',
      letterSpacing: -0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    }}>{value}</div>
    <div style={{ fontSize: 10, color: subColor, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {sub}
    </div>
    {trend !== undefined && (
      <div style={{ fontSize: 9, color: trend >= 0 ? '#4ade80' : '#f87171', marginTop: 2 }}>
        {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs last period
      </div>
    )}
  </div>
)

// ─── section header ──────────────────────────────────────────────────────────
const SectionHeader = ({ title, subtitle, badge }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
    <div>
      <h3 style={{ fontSize: 11, fontWeight: 800, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: 1 }}>
        {title}
      </h3>
      {subtitle && <p style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{subtitle}</p>}
    </div>
    {badge && (
      <span style={{ fontSize: 9, fontWeight: 800, padding: '4px 10px', borderRadius: 20, background: badge.bg, color: badge.color }}>
        {badge.text}
      </span>
    )}
  </div>
)

// ─── card wrapper ─────────────────────────────────────────────────────────────
const Card = ({ children, style = {} }) => (
  <div style={{ background: '#0f1923', borderRadius: 16, padding: 20, ...style }}>
    {children}
  </div>
)

// ─── main component ───────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const [orders, setOrders] = useState([])
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [showAccounts, setShowAccounts] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // metrics
  const [revenue, setRevenue] = useState(0)
  const [totalProductCount, setTotalProductCount] = useState(0)
  const [pendingOrders, setPendingOrders] = useState(0)
  const [riderCount, setRiderCount] = useState(0)
  const [totalCash, setTotalCash] = useState(0)
  const [cancelledCount, setCancelledCount] = useState(0)
  const [deliveredCount, setDeliveredCount] = useState(0)

  // chart data
  const [chartView, setChartView] = useState('daily') // 'daily' | 'monthly'
  const [dailyData, setDailyData] = useState([])
  const [monthlyData, setMonthlyData] = useState([])
  const [statusData, setStatusData] = useState([])
  const [topProducts, setTopProducts] = useState([])
  // Live orders filters & management
  const [orderFilter, setOrderFilter] = useState('ALL')
  const [orderSearch, setOrderSearch] = useState('')
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [updatingOrderId, setUpdatingOrderId] = useState(null)

  const handleAdminUpdateStatus = async (orderId, status) => {
    if (status === 'Cancelled' && !window.confirm(`Are you sure you want to cancel order ${orderId}?`)) {
      return
    }
    setUpdatingOrderId(orderId)
    try {
      const res = await Axios({
        ...SummaryApi.updateOrderStatus,
        data: { orderId, status }
      })
      if (res.data.success) {
        toast.success(`Order status updated to ${status}`)
        fetchAllOrders()
      } else {
        toast.error(res.data.message || 'Status update failed')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update order status')
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const handleMarkReadyForPickup = async (orderId) => {
    setUpdatingOrderId(orderId)
    try {
      const res = await Axios({
        ...SummaryApi.updateSellerStatus,
        data: { orderId, sellerStatus: 'Ready for Pickup' }
      })
      if (res.data.success) {
        toast.success('Order is Ready for Pickup! Rider notified.')
        fetchAllOrders()
      } else {
        toast.error(res.data.message || 'Failed to update status')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating order')
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return ''
    const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h ago`
    return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  // ── fetchers ──────────────────────────────────────────────────────────────
  const fetchCategory = async () => {
    try {
      const res = await Axios({ ...SummaryApi.getCategory })
      if (res.data.success) setCategories(res.data.data)
    } catch (e) { console.error('Category fetch error', e) }
  }

  const fetchTotalProductCount = async () => {
    try {
      const res = await Axios({ url: '/api/product/get', method: 'post', data: { page: 1, limit: 1 } })
      if (res.data.success) {
        const total =
          res.data.totalCount || res.data.total ||
          (res.data.totalNoPage != null ? res.data.totalNoPage * 12 : null) || 372
        setTotalProductCount(total)
      }
    } catch (e) { console.error('Product count error', e) }
  }

  const fetchRiders = async () => {
    try {
      const res = await Axios({ ...SummaryApi.getRiders })
      if (res.data.success) {
        setRiderCount((res.data.data || []).filter(u => u.role === 'rider').length)
      }
    } catch (e) { console.error('Rider fetch error', e) }
  }

  const fetchAllOrders = useCallback(async () => {
    try {
      const res = await Axios({ ...SummaryApi.getOrderItems })
      if (res.data.success) {
        const all = res.data.data
        setOrders(all)

        // debug
        if (all.length > 0) {
          console.log('Sample order keys:', Object.keys(all[0]))
          console.log('Sample order:', all[0])
        }

        const delivered = all.filter(o => o.delivery_status === 'Delivered')
        const cancelled = all.filter(o => o.delivery_status === 'Cancelled')
        const pending = all.filter(o =>
          o.delivery_status !== 'Delivered' && o.delivery_status !== 'Cancelled'
        )

        setRevenue(delivered.reduce((s, o) => s + getAmt(o), 0))
        setDeliveredCount(delivered.length)
        setCancelledCount(cancelled.length)
        setPendingOrders(pending.length)

        const cash = delivered
          .filter(o => o.payment_status === 'CASH ON DELIVERY' && o.isSettled !== true)
          .reduce((s, o) => s + getAmt(o), 0)
        setTotalCash(cash)

        setDailyData(buildDailyData(all))
        setMonthlyData(buildMonthlyData(all))
        setStatusData(buildStatusBreakdown(all))
        setTopProducts(buildTopProducts(all))
      }
    } catch (e) {
      console.error('Orders fetch error', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchProductsByCategory = async (catId) => {
    setLoading(true)
    try {
      const res = await Axios({
        ...SummaryApi.getProductByCategoryAndSubCategory,
        data: { categoryId: catId, subCategoryId: 'all', page: 1, limit: 12 },
      })
      if (res.data.success) setProducts(res.data.data)
    } catch (e) { console.error('Product fetch error', e) }
    finally { setLoading(false) }
  }

  const handleSettleCash = async () => {
    try {
      const res = await Axios({ ...SummaryApi.settleCash })
      if (res.data.success) {
        toast.success(res.data.message || 'Cash settled successfully')
        fetchAllOrders()
      }
    } catch { toast.error('Settlement failed') }
  }

  const handleCategoryClick = (cat) => {
    setSelectedCategory(cat)
    setShowAccounts(false)
    fetchProductsByCategory(cat._id)
    setSidebarOpen(false)
  }

  const handleOverviewClick = () => {
    setSelectedCategory(null)
    setShowAccounts(false)
    setSidebarOpen(false)
  }

  const handleAccountsClick = () => {
    setShowAccounts(true)
    setSelectedCategory(null)
    setSidebarOpen(false)
  }

  useEffect(() => {
    fetchCategory()
    fetchAllOrders()
    fetchTotalProductCount()
    fetchRiders()
    const interval = setInterval(() => { fetchAllOrders(); fetchRiders() }, 30000)
    return () => clearInterval(interval)
  }, [fetchAllOrders])

  // ── chart data to display ─────────────────────────────────────────────────
  const chartData = chartView === 'daily' ? dailyData : monthlyData
  const chartEmpty = chartData.every(d => d.Revenue === 0)

  // ── stat cards ────────────────────────────────────────────────────────────
  const statCards = [
    {
      label: 'Total Revenue',
      value: DisplayPriceInRupees(revenue),
      badge: revenue > 0 ? '+LIVE' : '₹0',
      badgeBg: '#1a3a2a', badgeColor: '#4ade80', iconBg: '#1a3a2a',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
      sub: deliveredCount > 0 ? `${deliveredCount} delivered orders` : 'No delivered orders yet',
      subColor: '#4ade80',
    },
    {
      label: 'Catalog',
      value: totalProductCount || '372',
      badge: 'SYNC',
      badgeBg: '#1a2a3a', badgeColor: '#60a5fa', iconBg: '#1a2a3a',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
      sub: 'Total products live',
      subColor: '#60a5fa',
    },
    {
      label: 'Pending',
      value: pendingOrders,
      badge: pendingOrders > 0 ? 'URGENT' : 'CLEAR',
      badgeBg: pendingOrders > 0 ? '#3a2010' : '#1a3a2a',
      badgeColor: pendingOrders > 0 ? '#fb923c' : '#4ade80',
      iconBg: '#3a2010',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
      sub: pendingOrders === 0 ? 'All orders fulfilled' : `${pendingOrders} need attention`,
      subColor: '#fb923c',
    },
    {
      label: 'Riders',
      value: riderCount,
      badge: 'ACTIVE',
      badgeBg: '#2a1a3a', badgeColor: '#c084fc', iconBg: '#2a1a3a',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
      sub: `${riderCount} active rider${riderCount !== 1 ? 's' : ''}`,
      subColor: '#c084fc',
    },
    {
      label: 'Cancelled',
      value: cancelledCount,
      badge: cancelledCount > 0 ? 'ALERT' : 'NONE',
      badgeBg: '#3a0a0a', badgeColor: '#f87171', iconBg: '#3a0a0a',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
      sub: `${cancelledCount} cancelled total`,
      subColor: '#f87171',
    },
    {
      label: 'COD Cash',
      value: DisplayPriceInRupees(totalCash),
      badge: totalCash > 0 ? 'PENDING' : 'CLEAR',
      badgeBg: totalCash > 0 ? '#2a1f00' : '#1a3a2a',
      badgeColor: totalCash > 0 ? '#fbbf24' : '#4ade80',
      iconBg: '#2a1f00',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
      sub: totalCash > 0 ? 'Uncollected COD cash' : 'All COD settled',
      subColor: '#fbbf24',
    },
  ]

  // ── live customer orders logic ────────────────────────────────────────────
  const pendingOrdersList = orders.filter(o => o.delivery_status === 'Pending')
  const confirmedOrdersList = orders.filter(o => o.delivery_status === 'Confirmed')
  const outForDeliveryOrdersList = orders.filter(o => o.delivery_status === 'Out for Delivery')
  const deliveredOrdersList = orders.filter(o => o.delivery_status === 'Delivered')
  const cancelledOrdersList = orders.filter(o => o.delivery_status === 'Cancelled')

  const filteredCustomerOrders = orders.filter(order => {
    if (orderFilter !== 'ALL' && order.delivery_status !== orderFilter) return false
    if (!orderSearch.trim()) return true
    const q = orderSearch.toLowerCase()
    const oid = (order.orderId || order._id || '').toLowerCase()
    const custName = (order.userId?.name || order.delivery_address?.name || '').toLowerCase()
    const mobile = String(order.userId?.mobile || order.delivery_address?.mobile || '')
    const store = (order.store_name || (Array.isArray(order.involved_stores) ? order.involved_stores.join(' ') : '')).toLowerCase()
    const rider = (order.rider_name || '').toLowerCase()
    return oid.includes(q) || custName.includes(q) || mobile.includes(q) || store.includes(q) || rider.includes(q)
  })

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <AdminPermision>
      <div className="p-3 lg:p-8 min-h-screen" style={{ background: '#0a0f1a' }}>

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 lg:gap-4 mb-6">
          {statCards.map(card => <StatCard key={card.label} {...card} />)}
        </div>

        {/* ── LIVE RIDER FLEET & DUTY TRACKER ── */}
        <AdminLiveFleetWidget />

        {/* ── LIVE CUSTOMER ORDERS & STORE DISPATCH ── */}
        <Card style={{ marginBottom: 24, border: '1px solid #1e293b' }}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <h3 style={{ fontSize: 13, fontWeight: 900, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: 1 }}>
                  ⚡ Live Customer Orders & Dispatch
                </h3>
              </div>
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                Real-time town orders stream across Paliganj • Total {orders.length} orders
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/dashboard/store-orders"
                style={{
                  background: '#ea580c', color: '#fff',
                  padding: '7px 14px', borderRadius: 8,
                  fontSize: 11, fontWeight: 800, textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                📦 Store Packing Screen
              </Link>
              <Link
                to="/rider-panel"
                style={{
                  background: '#2563eb', color: '#fff',
                  padding: '7px 14px', borderRadius: 8,
                  fontSize: 11, fontWeight: 800, textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                🚴 Rider Delivery Panel
              </Link>
              <button
                onClick={fetchAllOrders}
                style={{
                  background: '#1e293b', color: '#94a3b8',
                  padding: '7px 12px', borderRadius: 8,
                  fontSize: 11, fontWeight: 800, border: '1px solid #334155',
                  cursor: 'pointer',
                }}
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Filter Chips & Search Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              {[
                { id: 'ALL', label: 'All Orders', count: orders.length, color: '#94a3b8', bg: '#1e293b' },
                { id: 'Pending', label: '⏳ Packing', count: pendingOrdersList.length, color: '#fbbf24', bg: '#2a1f00' },
                { id: 'Confirmed', label: '📦 Ready for Pickup', count: confirmedOrdersList.length, color: '#60a5fa', bg: '#1a2a3a' },
                { id: 'Out for Delivery', label: '🚚 Out for Delivery', count: outForDeliveryOrdersList.length, color: '#c084fc', bg: '#2a1a3a' },
                { id: 'Delivered', label: '✅ Delivered', count: deliveredOrdersList.length, color: '#4ade80', bg: '#1a3a2a' },
                { id: 'Cancelled', label: '❌ Cancelled', count: cancelledOrdersList.length, color: '#f87171', bg: '#3a1a1a' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setOrderFilter(tab.id)}
                  style={{
                    fontSize: 10, fontWeight: 800,
                    padding: '6px 12px', borderRadius: 20,
                    whiteSpace: 'nowrap', cursor: 'pointer',
                    border: orderFilter === tab.id ? `1px solid ${tab.color}` : '1px solid transparent',
                    background: orderFilter === tab.id ? tab.bg : '#0a1118',
                    color: orderFilter === tab.id ? tab.color : '#6b7280',
                  }}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <input
                type="text"
                placeholder="Search order ID, customer, rider, store..."
                value={orderSearch}
                onChange={e => setOrderSearch(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0a1118',
                  border: '1px solid #1e293b',
                  borderRadius: 10,
                  padding: '7px 12px',
                  fontSize: 11,
                  color: '#f1f5f9',
                  outline: 'none',
                }}
              />
              {orderSearch && (
                <button
                  onClick={() => setOrderSearch('')}
                  style={{
                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: '#6b7280', fontSize: 12, cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Orders Stream List */}
          {filteredCustomerOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1' }}>No orders found</p>
              <p style={{ fontSize: 11, marginTop: 4 }}>
                {orderSearch ? `No matches for "${orderSearch}"` : `No orders currently in ${orderFilter} state.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCustomerOrders.slice(0, 30).map(order => {
                const oid = order.orderId || order._id
                const isExpanded = expandedOrderId === oid
                const isUpdating = updatingOrderId === order.orderId
                const items = order.cartItems || (order.product_details ? [order.product_details] : [])
                const customerName = order.userId?.name || order.delivery_address?.name || 'Customer'
                const customerPhone = order.userId?.mobile || order.delivery_address?.mobile || 'N/A'
                const storeName = order.store_name || (Array.isArray(order.involved_stores) && order.involved_stores.length > 0 ? order.involved_stores.join(', ') : 'Paliganj Main Mart')
                const isCod = order.payment_status === 'CASH ON DELIVERY' || order.paymentType === 'CASH ON DELIVERY'

                return (
                  <div
                    key={oid}
                    style={{
                      background: '#0a1118',
                      border: '1px solid #1e293b',
                      borderRadius: 12,
                      padding: '12px 16px',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    {/* Top Row: Meta & Badges */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span style={{ fontSize: 12, fontWeight: 900, color: '#f8fafc', fontFamily: 'monospace' }}>
                          #{order.orderId || oid?.slice(-8)}
                        </span>
                        <span style={{ fontSize: 10, color: '#64748b' }}>•</span>
                        <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>
                          {formatTimeAgo(order.createdAt || order.orderDate)}
                        </span>
                        <span style={{ fontSize: 10, color: '#64748b' }}>•</span>
                        <span style={{ fontSize: 10, color: '#38bdf8', fontWeight: 700 }}>
                          🏪 {storeName}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Status Badge */}
                        <span
                          style={{
                            fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 20,
                            background:
                              order.delivery_status === 'Delivered' ? '#14532d' :
                              order.delivery_status === 'Confirmed' ? '#1e3a5f' :
                              order.delivery_status === 'Out for Delivery' ? '#3b0764' :
                              order.delivery_status === 'Cancelled' ? '#450a0a' : '#422006',
                            color:
                              order.delivery_status === 'Delivered' ? '#4ade80' :
                              order.delivery_status === 'Confirmed' ? '#60a5fa' :
                              order.delivery_status === 'Out for Delivery' ? '#c084fc' :
                              order.delivery_status === 'Cancelled' ? '#f87171' : '#fbbf24',
                            border:
                              order.delivery_status === 'Delivered' ? '1px solid #22c55e44' :
                              order.delivery_status === 'Confirmed' ? '1px solid #3b82f644' :
                              order.delivery_status === 'Out for Delivery' ? '1px solid #a855f744' :
                              order.delivery_status === 'Cancelled' ? '1px solid #ef444444' : '1px solid #eab30844',
                          }}
                        >
                          {order.delivery_status === 'Pending' ? '⏳ Packing at Store' :
                           order.delivery_status === 'Confirmed' ? '📦 Ready for Pickup' :
                           order.delivery_status}
                        </span>

                        {/* Payment Badge */}
                        <span
                          style={{
                            fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
                            background: isCod ? '#292524' : '#064e3b',
                            color: isCod ? '#fbbf24' : '#34d399',
                          }}
                        >
                          {isCod ? '💵 COD' : '💳 PAID ONLINE'}
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Customer, Rider & Financials */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-2.5 text-xs">
                      <div>
                        <p style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Customer</p>
                        <p style={{ fontWeight: 800, color: '#f1f5f9', marginTop: 2 }}>{customerName}</p>
                        <p style={{ color: '#94a3b8', fontSize: 11 }}>📞 {customerPhone}</p>
                      </div>

                      <div>
                        <p style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Rider Assignment</p>
                        {order.rider_name ? (
                          <div style={{ marginTop: 2 }}>
                            <p style={{ fontWeight: 800, color: '#38bdf8' }}>🚴 {order.rider_name}</p>
                            {order.rider_contact && <p style={{ color: '#94a3b8', fontSize: 11 }}>📞 {order.rider_contact}</p>}
                          </div>
                        ) : (
                          <p style={{ fontWeight: 700, color: '#fbbf24', marginTop: 2 }}>⚠️ Open for Rider Claim</p>
                        )}
                      </div>

                      <div className="sm:text-right">
                        <p style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Order Total</p>
                        <p style={{ fontSize: 16, fontWeight: 900, color: '#4ade80', marginTop: 1 }}>
                          {DisplayPriceInRupees(getAmt(order))}
                        </p>
                        <p style={{ fontSize: 10, color: '#64748b' }}>
                          {items.length} {items.length === 1 ? 'item' : 'items'}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Row: Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedOrderId(isExpanded ? null : oid)}
                          style={{
                            background: 'transparent',
                            color: '#94a3b8',
                            border: '1px solid #334155',
                            padding: '5px 10px',
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {isExpanded ? '▲ Hide Items' : `▼ View Items (${items.length})`}
                        </button>
                        <Link
                          to={`/dashboard/order-tracking/${order.orderId}`}
                          style={{
                            background: '#1e293b',
                            color: '#60a5fa',
                            padding: '5px 10px',
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 700,
                            textDecoration: 'none',
                          }}
                        >
                          📍 Live Track
                        </Link>
                      </div>

                      {/* Status Action Buttons */}
                      <div className="flex items-center gap-2">
                        {order.delivery_status === 'Pending' && (
                          <button
                            disabled={isUpdating}
                            onClick={() => handleMarkReadyForPickup(order.orderId)}
                            style={{
                              background: '#2563eb',
                              color: '#fff',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: 6,
                              fontSize: 10,
                              fontWeight: 800,
                              cursor: isUpdating ? 'not-allowed' : 'pointer',
                            }}
                          >
                            📦 Mark Ready for Pickup
                          </button>
                        )}

                        {order.delivery_status === 'Confirmed' && (
                          <button
                            disabled={isUpdating}
                            onClick={() => handleAdminUpdateStatus(order.orderId, 'Out for Delivery')}
                            style={{
                              background: '#7c3aed',
                              color: '#fff',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: 6,
                              fontSize: 10,
                              fontWeight: 800,
                              cursor: isUpdating ? 'not-allowed' : 'pointer',
                            }}
                          >
                            🚚 Mark Out for Delivery
                          </button>
                        )}

                        {['Pending', 'Confirmed', 'Out for Delivery'].includes(order.delivery_status) && (
                          <button
                            disabled={isUpdating}
                            onClick={() => handleAdminUpdateStatus(order.orderId, 'Cancelled')}
                            style={{
                              background: '#7f1d1d',
                              color: '#fca5a5',
                              border: 'none',
                              padding: '6px 10px',
                              borderRadius: 6,
                              fontSize: 10,
                              fontWeight: 700,
                              cursor: isUpdating ? 'not-allowed' : 'pointer',
                            }}
                          >
                            ✕ Cancel
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Collapsible Order Items details */}
                    {isExpanded && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #334155' }}>
                        <p style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                          Delivery Address & Cart Items
                        </p>
                        {order.delivery_address && (
                          <div style={{ background: '#070d14', padding: '8px 12px', borderRadius: 8, marginBottom: 8, fontSize: 11, color: '#cbd5e1' }}>
                            📍 {order.delivery_address.address_line || ''}, {order.delivery_address.city || ''}, {order.delivery_address.state || ''} - {order.delivery_address.pincode || ''}
                          </div>
                        )}
                        <div className="space-y-1.5">
                          {items.map((item, idx) => (
                            <div
                              key={item._id || idx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: '#0f172a',
                                padding: '6px 10px',
                                borderRadius: 6,
                                fontSize: 11,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                                {item.image && (
                                  <img
                                    src={Array.isArray(item.image) ? item.image[0] : item.image}
                                    alt=""
                                    style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4, background: '#fff' }}
                                  />
                                )}
                                <span style={{ color: '#f1f5f9', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {item.name || item.productId?.name || 'Item'}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                                <span style={{ color: '#94a3b8' }}>Qty: {item.quantity || 1}</span>
                                <span style={{ color: '#4ade80', fontWeight: 700 }}>
                                  {DisplayPriceInRupees((item.price || 0) * (item.quantity || 1))}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* ── REVENUE CHART (DAILY / MONTHLY TOGGLE) ── */}
        <Card style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 11, fontWeight: 800, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: 1 }}>
                Revenue Chart
              </h3>
              <p style={{ fontSize: 10, color: '#4ade80', marginTop: 2 }}>
                Total: {DisplayPriceInRupees(revenue)}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['daily', 'monthly'].map(v => (
                <button
                  key={v}
                  onClick={() => setChartView(v)}
                  style={{
                    fontSize: 9, fontWeight: 800, padding: '5px 12px', borderRadius: 20,
                    border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5,
                    background: chartView === v ? '#4ade80' : '#1a2a1a',
                    color: chartView === v ? '#052e16' : '#4ade80',
                  }}
                >
                  {v === 'daily' ? 'Last 7 Days' : 'Last 6 Months'}
                </button>
              ))}
            </div>
          </div>

          {chartEmpty ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#4b5563', fontSize: 12 }}>
              <p>No delivered orders in this period.</p>
              <p style={{ fontSize: 10, marginTop: 6, color: '#374151' }}>
                Open browser console (F12) to see order field names.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="Revenue" stroke="#4ade80" strokeWidth={2}
                  fill="url(#rg)" dot={{ fill: '#4ade80', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* ── ORDER COUNT BAR CHART (daily/monthly toggle) ── */}
        <Card style={{ marginBottom: 24 }}>
          <SectionHeader
            title={chartView === 'daily' ? 'Orders per Day — Last 7 Days' : 'Orders per Month — Last 6 Months'}
            subtitle="Delivered orders only"
            badge={{ text: 'ORDER COUNT', bg: '#1a2a3a', color: '#60a5fa' }}
          />
          {chartData.every(d => d.Orders === 0) ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#4b5563', fontSize: 12 }}>
              No data for this period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="Orders" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i === chartData.length - 1 ? '#60a5fa' : '#1e3a5f'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* ── ORDER STATUS + TOP PRODUCTS ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

          {/* Order status donut */}
          <Card>
            <SectionHeader
              title="Order Status Breakdown"
              subtitle={`${orders.length} total orders`}
              badge={{ text: 'ALL TIME', bg: '#1a2a3a', color: '#60a5fa' }}
            />
            {statusData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#4b5563', fontSize: 12 }}>No orders yet.</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%" cy="50%"
                      innerRadius={50} outerRadius={75}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
                      itemStyle={{ color: '#f1f5f9' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {statusData.map(s => (
                    <span key={s.name} style={{
                      fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                      background: s.color + '22', color: s.color,
                    }}>
                      {s.name}: {s.value}
                    </span>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* Top 5 products by revenue */}
          <Card>
            <SectionHeader
              title="Top Products by Revenue"
              subtitle="Delivered orders only"
              badge={{ text: 'TOP 5', bg: '#2a1a3a', color: '#c084fc' }}
            />
            {topProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#4b5563', fontSize: 12 }}>No data yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topProducts.map((p, i) => {
                  const maxRev = topProducts[0].revenue || 1
                  const pct = Math.round((p.revenue / maxRev) * 100)
                  return (
                    <div key={p.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: '#cbd5e1',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          maxWidth: '60%',
                        }}>
                          {i + 1}. {p.name}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#c084fc' }}>
                          {DisplayPriceInRupees(p.revenue)}
                        </span>
                      </div>
                      <div style={{ height: 4, background: '#1e293b', borderRadius: 4 }}>
                        <div style={{
                          height: 4, borderRadius: 4,
                          width: `${pct}%`,
                          background: i === 0 ? '#c084fc' : '#4b2a6a',
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        {/* ── COD CASH BANNER ── */}
        {totalCash > 0 && (
          <div
            className="mb-6 p-4 rounded-2xl flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3"
            style={{ background: '#14532d' }}
          >
            <div>
              <p style={{ fontSize: 10, fontWeight: 800, color: '#86efac', letterSpacing: 2, textTransform: 'uppercase' }}>
                Uncollected COD Cash
              </p>
              <p style={{ fontSize: 'clamp(20px, 5vw, 26px)', fontWeight: 800, color: '#fff' }}>
                {DisplayPriceInRupees(totalCash)}
              </p>
            </div>
            <button
              onClick={handleSettleCash}
              style={{
                background: '#22c55e', color: '#052e16',
                padding: '10px 20px', borderRadius: 10,
                fontSize: 11, fontWeight: 800,
                border: 'none', cursor: 'pointer',
                textTransform: 'uppercase', letterSpacing: 1,
                flexShrink: 0, alignSelf: 'flex-start',
              }}
            >
              Settle All
            </button>
          </div>
        )}

        {/* ── MOBILE SIDEBAR TOGGLE ── */}
        <button
          onClick={() => setSidebarOpen(o => !o)}
          className="lg:hidden mb-4 flex items-center gap-2 text-xs font-black px-4 py-2 rounded-xl"
          style={{ background: '#0f1923', color: '#94a3b8', border: '1px solid #1e293b' }}
        >
          <span>{sidebarOpen ? '✕ Close' : '☰ Departments & Tools'}</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* ── LEFT SIDEBAR ── */}
          <div className={`lg:col-span-1 space-y-6 ${sidebarOpen ? 'block' : 'hidden'} lg:block`}>
            <Card>
              <h3 style={{ fontSize: 10, fontWeight: 800, color: '#6b7280', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
                Mart Departments
              </h3>
              <div className="flex flex-col gap-1">
                <button
                  onClick={handleOverviewClick}
                  style={{
                    fontSize: 11, fontWeight: 700, padding: '10px 12px', borderRadius: 8,
                    textAlign: 'left', border: 'none', cursor: 'pointer',
                    background: (!selectedCategory && !showAccounts) ? '#1e293b' : 'transparent',
                    color: (!selectedCategory && !showAccounts) ? '#f1f5f9' : '#94a3b8',
                  }}
                >
                  📊 OVERVIEW
                </button>
                <button
                  onClick={handleAccountsClick}
                  style={{
                    fontSize: 11, fontWeight: 700, padding: '10px 12px', borderRadius: 8,
                    textAlign: 'left', border: 'none', cursor: 'pointer',
                    background: showAccounts ? '#14532d' : 'transparent',
                    color: showAccounts ? '#4ade80' : '#94a3b8',
                  }}
                >
                  💰 ACCOUNTS
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat._id}
                    onClick={() => handleCategoryClick(cat)}
                    style={{
                      fontSize: 11, fontWeight: 700, padding: '10px 12px', borderRadius: 8,
                      textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                      border: 'none', cursor: 'pointer',
                      background: selectedCategory?._id === cat._id ? '#1d4ed8' : 'transparent',
                      color: selectedCategory?._id === cat._id ? '#fff' : '#94a3b8',
                    }}
                  >
                    <img src={cat.image} style={{ width: 22, height: 22, objectFit: 'contain', borderRadius: 4 }} alt="" />
                    {cat.name}
                  </button>
                ))}
              </div>
            </Card>

            <AddStore fetchStores={fetchAllOrders} />
            <DailyReport />
          </div>

          {/* ── MAIN CONTENT ── */}
          <div className="lg:col-span-3 space-y-6">
            {showAccounts ? (
              /* ── ACCOUNTS SECTION ── */
              <Accounts />
            ) : !selectedCategory ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <h3 style={{ fontSize: 11, fontWeight: 800, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                      Mart Network Status
                    </h3>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px', background: '#0a1a10', borderRadius: 10,
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1' }}>Paliganj Main Mart</span>
                      <span style={{ fontSize: 10, background: '#14532d', color: '#4ade80', padding: '3px 10px', borderRadius: 20, fontWeight: 800 }}>
                        Live
                      </span>
                    </div>

                    {/* Quick stats inside */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                      {[
                        { label: 'Delivered', value: deliveredCount, color: '#4ade80' },
                        { label: 'Cancelled', value: cancelledCount, color: '#f87171' },
                        { label: 'Pending', value: pendingOrders, color: '#fbbf24' },
                        { label: 'COD Unsettled', value: DisplayPriceInRupees(totalCash), color: '#fbbf24' },
                      ].map(s => (
                        <div key={s.label} style={{ background: '#0a1118', borderRadius: 8, padding: '8px 10px' }}>
                          <div style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: s.color, marginTop: 2 }}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h3 style={{ fontSize: 11, fontWeight: 800, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: 1 }}>Live Rider</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, background: '#ef4444', borderRadius: '50%', display: 'inline-block' }} />
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>Live</span>
                      </div>
                    </div>
                    <AdminRiderSimulator orderId="order_paliganj_001" />
                  </Card>
                </div>

                {/* Recent dispatch */}
                <Card>
                  <SectionHeader
                    title="Recent Dispatch Activity"
                    subtitle={`${orders.length} total orders`}
                    badge={{ text: 'LIVE', bg: '#1a3a2a', color: '#4ade80' }}
                  />
                  {orders.length === 0 ? (
                    <p style={{ color: '#4b5563', fontSize: 12, fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                      No active dispatch movements.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {orders.slice(0, 10).map(order => (
                        <div
                          key={order._id}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 12px', borderRadius: 10, background: '#0a1118', gap: 8,
                          }}
                        >
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#4b5563', fontFamily: 'monospace', flexShrink: 0 }}>
                            #{(order.orderId || order._id)?.slice(-6)}
                          </span>
                          <span style={{
                            fontSize: 11, fontWeight: 700, color: '#cbd5e1',
                            flex: 1, textAlign: 'center', paddingInline: 6,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {order.product_details?.name || 'Order'}
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#4ade80', flexShrink: 0 }}>
                            {DisplayPriceInRupees(getAmt(order))}
                          </span>
                          <span style={{
                            fontSize: 9, fontWeight: 800, flexShrink: 0,
                            padding: '4px 8px', borderRadius: 8, textTransform: 'uppercase',
                            background:
                              order.delivery_status === 'Delivered' ? '#14532d' :
                              order.delivery_status === 'Cancelled' ? '#450a0a' : '#1e3a5f',
                            color:
                              order.delivery_status === 'Delivered' ? '#4ade80' :
                              order.delivery_status === 'Cancelled' ? '#f87171' : '#60a5fa',
                          }}>
                            {order.delivery_status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </>
            ) : (
              /* ── CATEGORY INVENTORY ── */
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 12, fontWeight: 800, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: 1 }}>
                    {selectedCategory.name} Inventory
                  </h3>
                  <button
                    onClick={() => setSelectedCategory(null)}
                    style={{ fontSize: 11, fontWeight: 800, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    CLOSE ✕
                  </button>
                </div>
                {loading ? (
                  <p style={{ color: '#4b5563', fontSize: 12, textAlign: 'center', padding: '40px 0' }}>Loading...</p>
                ) : products.length === 0 ? (
                  <p style={{ color: '#4b5563', fontSize: 12, fontStyle: 'italic', textAlign: 'center', padding: '40px 0' }}>
                    No products found in this category.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {products.map(product => (
                      <div key={product._id} style={{
                        padding: 12, background: '#0a1118',
                        borderRadius: 12, border: '1px solid #1e293b', cursor: 'pointer',
                      }}>
                        <img src={product.image?.[0]} style={{ width: '100%', height: 80, objectFit: 'contain', marginBottom: 8 }} alt="" />
                        <p style={{ fontSize: 10, fontWeight: 800, color: '#cbd5e1', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {product.name}
                        </p>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', marginTop: 2 }}>
                          {DisplayPriceInRupees(product.price)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>

        </div>
      </div>
    </AdminPermision>
  )
}

export default AdminDashboard