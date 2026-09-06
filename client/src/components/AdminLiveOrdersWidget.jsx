import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import toast from 'react-hot-toast'

const getAmt = (o) => {
  const val =
    o.totalAmt ?? o.totalAmount ?? o.grandTotal ??
    o.subTotalAmt ?? o.amount ?? o.total ?? 0
  return Number(val) || 0
}

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return ''
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return new Date(dateStr).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const AdminLiveOrdersWidget = ({ onOrdersLoaded = null, maxInitialDisplay = 50 }) => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [orderFilter, setOrderFilter] = useState('ALL')
  const [orderSearch, setOrderSearch] = useState('')
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [updatingOrderId, setUpdatingOrderId] = useState(null)
  const [lastRefreshed, setLastRefreshed] = useState(null)

  const fetchOrders = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const res = await Axios({ ...SummaryApi.getOrderItems })
      if (res.data?.success) {
        const all = Array.isArray(res.data.data) ? res.data.data : []
        setOrders(all)
        setLastRefreshed(new Date())
        if (typeof onOrdersLoaded === 'function') {
          onOrdersLoaded(all)
        }
      }
    } catch (err) {
      console.warn('[AdminLiveOrdersWidget] fetch error:', err?.message)
      if (!silent) {
        toast.error('Failed to load live orders')
      }
    } finally {
      setLoading(false)
    }
  }, [onOrdersLoaded])

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(() => fetchOrders(true), 15000)
    return () => clearInterval(interval)
  }, [fetchOrders])

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
      if (res.data?.success) {
        toast.success(`Order status updated to ${status}`)
        fetchOrders(true)
      } else {
        toast.error(res.data?.message || 'Status update failed')
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
      if (res.data?.success) {
        toast.success('Order is Ready for Pickup! Rider notified.')
        fetchOrders(true)
      } else {
        toast.error(res.data?.message || 'Failed to update status')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating order')
    } finally {
      setUpdatingOrderId(null)
    }
  }

  // Counts for tabs
  const pendingCount = orders.filter(o => o.delivery_status === 'Pending').length
  const confirmedCount = orders.filter(o => o.delivery_status === 'Confirmed').length
  const outForDeliveryCount = orders.filter(o => o.delivery_status === 'Out for Delivery').length
  const deliveredCount = orders.filter(o => o.delivery_status === 'Delivered').length
  const cancelledCount = orders.filter(o => o.delivery_status === 'Cancelled').length
  const foodCount = orders.filter(o => o.isRestaurantOrder || (o.orderId && o.orderId.startsWith('FOOD-')) || o.store_details?.name).length
  const groceryCount = orders.filter(o => !o.isRestaurantOrder && (!o.orderId || !o.orderId.startsWith('FOOD-')) && !o.store_details?.name).length

  const filteredOrders = orders.filter(order => {
    const isFood = order.isRestaurantOrder || (order.orderId && order.orderId.startsWith('FOOD-')) || Boolean(order.store_details?.name)
    if (orderFilter === 'FOOD') {
      if (!isFood) return false
    } else if (orderFilter === 'GROCERY') {
      if (isFood) return false
    } else if (orderFilter !== 'ALL' && order.delivery_status !== orderFilter) {
      return false
    }

    if (!orderSearch.trim()) return true
    const q = orderSearch.toLowerCase().trim()
    const oid = (order.orderId || order._id || '').toLowerCase()
    const custName = (order.recipient_name || order.userId?.name || order.delivery_address?.recipient_name || order.delivery_address?.name || '').toLowerCase()
    const mobile = String(order.recipient_mobile || order.userId?.mobile || order.delivery_address?.recipient_mobile || order.delivery_address?.mobile || '')
    const store = (order.store_name || order.store_details?.name || (Array.isArray(order.involved_stores) ? order.involved_stores.join(' ') : '')).toLowerCase()
    const rider = (order.rider_name || '').toLowerCase()

    return oid.includes(q) || custName.includes(q) || mobile.includes(q) || store.includes(q) || rider.includes(q)
  })

  return (
    <div
      style={{
        background: '#0d1522',
        border: '1px solid #1e293b',
        borderRadius: 16,
        padding: '18px 20px',
        marginBottom: 24,
        boxShadow: '0 4px 20px -2px rgba(0,0,0,0.4)',
      }}
    >
      {/* Header with Title, Actions & Live Badge */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h3 style={{ fontSize: 14, fontWeight: 900, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: 1 }}>
              ⚡ Live Customer Orders &amp; Town Dispatch
            </h3>
          </div>
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
            Real-time orders stream across Paliganj • Total {orders.length} orders
            {lastRefreshed && (
              <span className="text-slate-500 ml-2">
                (Updated {lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/dashboard/store-orders"
            style={{
              background: '#ea580c', color: '#fff',
              padding: '7px 13px', borderRadius: 8,
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
              padding: '7px 13px', borderRadius: 8,
              fontSize: 11, fontWeight: 800, textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            🚴 Rider Delivery Panel
          </Link>
          <Link
            to="/dashboard/restaurant-admin"
            style={{
              background: '#9333ea', color: '#fff',
              padding: '7px 13px', borderRadius: 8,
              fontSize: 11, fontWeight: 800, textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            🍔 Restaurant Admin
          </Link>
          <button
            onClick={() => fetchOrders(false)}
            disabled={loading}
            style={{
              background: '#1e293b', color: '#94a3b8',
              padding: '7px 12px', borderRadius: 8,
              fontSize: 11, fontWeight: 800, border: '1px solid #334155',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}
          >
            <span className={loading ? 'animate-spin' : ''}>🔄</span> Refresh
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {[
            { id: 'ALL', label: 'All Orders', count: orders.length, color: '#94a3b8', bg: '#1e293b' },
            { id: 'Pending', label: '⏳ Packing', count: pendingCount, color: '#fbbf24', bg: '#2a1f00' },
            { id: 'Confirmed', label: '📦 Ready for Pickup', count: confirmedCount, color: '#60a5fa', bg: '#1a2a3a' },
            { id: 'Out for Delivery', label: '🚚 Out for Delivery', count: outForDeliveryCount, color: '#c084fc', bg: '#2a1a3a' },
            { id: 'Delivered', label: '✅ Delivered', count: deliveredCount, color: '#4ade80', bg: '#1a3a2a' },
            { id: 'Cancelled', label: '❌ Cancelled', count: cancelledCount, color: '#f87171', bg: '#3a1a1a' },
            { id: 'FOOD', label: '🍔 Food Orders', count: foodCount, color: '#f97316', bg: '#3a1e0f' },
            { id: 'GROCERY', label: '🛒 Grocery', count: groceryCount, color: '#34d399', bg: '#0d2b22' },
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
        <div className="relative min-w-[240px]">
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

      {/* Orders List */}
      {loading && orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
          <span className="inline-block animate-spin text-2xl mb-2">🔄</span>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1' }}>Loading town orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1' }}>No orders found</p>
          <p style={{ fontSize: 11, marginTop: 4 }}>
            {orderSearch ? `No matches for "${orderSearch}"` : `No orders currently in ${orderFilter} state.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.slice(0, maxInitialDisplay).map(order => {
            const oid = order.orderId || order._id
            const isExpanded = expandedOrderId === oid
            const isUpdating = updatingOrderId === order.orderId
            const items = order.cartItems || (order.product_details ? [order.product_details] : [])
            const customerName = order.recipient_name || order.delivery_address?.recipient_name || order.userId?.name || order.delivery_address?.name || 'Customer'
            const customerPhone = order.recipient_mobile || order.delivery_address?.recipient_mobile || order.userId?.mobile || order.delivery_address?.mobile || 'N/A'
            const isFood = order.isRestaurantOrder || (order.orderId && order.orderId.startsWith('FOOD-')) || Boolean(order.store_details?.name)
            const storeName = order.store_name || order.store_details?.name || (Array.isArray(order.involved_stores) && order.involved_stores.length > 0 ? order.involved_stores.join(', ') : (isFood ? 'Restaurant Kitchen' : 'Paliganj Main Mart'))
            const isCod = order.payment_status === 'CASH ON DELIVERY' || order.paymentType === 'CASH ON DELIVERY' || order.payment_mode === 'COD'

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
                    <span style={{ fontSize: 10, color: isFood ? '#fb923c' : '#38bdf8', fontWeight: 700 }}>
                      {isFood ? '🍔' : '🏪'} {storeName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Order Type Badge */}
                    <span
                      style={{
                        fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 6,
                        background: isFood ? '#431407' : '#042f2e',
                        color: isFood ? '#fb923c' : '#2dd4bf',
                        border: isFood ? '1px solid #ea580c44' : '1px solid #14b8a644',
                      }}
                    >
                      {isFood ? '🍔 Food' : '🛒 Grocery'}
                    </span>

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

                    {order.delivery_status === 'Out for Delivery' && (
                      <button
                        disabled={isUpdating}
                        onClick={() => handleAdminUpdateStatus(order.orderId, 'Delivered')}
                        style={{
                          background: '#16a34a',
                          color: '#fff',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 800,
                          cursor: isUpdating ? 'not-allowed' : 'pointer',
                        }}
                      >
                        ✅ Mark Delivered
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
                      Delivery Address &amp; Cart Items
                    </p>
                    {order.delivery_address && (
                      <div style={{ background: '#070d14', padding: '8px 12px', borderRadius: 8, marginBottom: 8, fontSize: 11, color: '#cbd5e1' }}>
                        📍 {order.delivery_address.address_line || ''}, {order.delivery_address.city || ''}, {order.delivery_address.state || ''} - {order.delivery_address.pincode || ''}
                      </div>
                    )}
                    {order.delivery_instructions && (
                      <div style={{ background: '#1c1917', border: '1px solid #78350f', padding: '6px 10px', borderRadius: 8, marginBottom: 8, fontSize: 10, color: '#fde047' }}>
                        📝 Delivery Note: {order.delivery_instructions}
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
                              {item.variant ? ` (${item.variant})` : ''}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                            <span style={{ color: '#94a3b8' }}>Qty: {item.quantity || 1}</span>
                            <span style={{ color: '#4ade80', fontWeight: 700 }}>
                              {DisplayPriceInRupees(Number(item.price || item.productId?.price || 0) * (Number(item.quantity) || 1))}
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
    </div>
  )
}

export default AdminLiveOrdersWidget
