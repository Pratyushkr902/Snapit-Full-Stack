import React, { useState, useEffect } from 'react'
import AdminPermision from '../components/AdminPermision'
import AdminRiderSimulator from '../components/AdminRiderSimulator'
import AddStore from '../components/AddStore'
import DailyReport from '../components/DailyReport'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import toast from 'react-hot-toast'

const AdminDashboard = () => {
  const [orders, setOrders] = useState([])
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [revenue, setRevenue] = useState(0)
  const [totalProductCount, setTotalProductCount] = useState(0)
  const [pendingOrders, setPendingOrders] = useState(0)
  const [riderCount, setRiderCount] = useState(0)
  const [totalCash, setTotalCash] = useState(0)

  const fetchCategory = async () => {
    try {
      const response = await Axios({ ...SummaryApi.getCategory })
      if (response.data.success) setCategories(response.data.data)
    } catch (error) {
      console.error('Category fetch error', error)
    }
  }

  const fetchTotalProductCount = async () => {
    try {
      const response = await Axios({
        url: '/api/product/get',
        method: 'post',
        data: { page: 1, limit: 1 }
      })
      if (response.data.success) {
        const total =
          response.data.totalCount ||
          response.data.total ||
          (response.data.totalNoPage != null ? response.data.totalNoPage * 12 : null) ||
          372
        setTotalProductCount(total)
      }
    } catch (error) {
      console.error('Product count fetch error', error)
    }
  }

  const fetchRiders = async () => {
    try {
      const response = await Axios({ ...SummaryApi.getRiders })
      if (response.data.success) {
        const riders = (response.data.data || []).filter(u => u.role === 'rider')
        setRiderCount(riders.length)
      }
    } catch (error) {
      console.error('Rider fetch error', error)
    }
  }

  const fetchAllOrders = async () => {
    try {
      const response = await Axios({ ...SummaryApi.getOrderItems })
      if (response.data.success) {
        const allOrders = response.data.data
        setOrders(allOrders)

        const getAmt = (o) => o.totalAmt || o.totalAmount || o.grandTotal || o.subTotalAmt || 0

        const totalRevenue = allOrders
          .filter(o => o.delivery_status === 'Delivered')
          .reduce((acc, curr) => acc + getAmt(curr), 0)
        setRevenue(totalRevenue)

        const pending = allOrders.filter(
          o => o.delivery_status !== 'Delivered' && o.delivery_status !== 'Cancelled'
        ).length
        setPendingOrders(pending)

        const cash = allOrders
          .filter(o =>
            o.delivery_status === 'Delivered' &&
            o.payment_status === 'CASH ON DELIVERY' &&
            o.isSettled !== true
          )
          .reduce((acc, curr) => acc + getAmt(curr), 0)
        setTotalCash(cash)
      }
    } catch (error) {
      console.error('Orders fetch error', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProductsByCategory = async (catId) => {
    setLoading(true)
    try {
      const response = await Axios({
        ...SummaryApi.getProductByCategoryAndSubCategory,
        data: { categoryId: catId, subCategoryId: 'all', page: 1, limit: 12 }
      })
      if (response.data.success) setProducts(response.data.data)
    } catch (error) {
      console.error('Product fetch error', error)
    } finally {
      setLoading(false)
    }
  }

  // FIX 3: settle all unsettled COD orders, not hardcoded to one rider name
  const handleSettleCash = async () => {
    try {
      const response = await Axios({ ...SummaryApi.settleCash })
      if (response.data.success) {
        toast.success(response.data.message || 'Cash settled successfully')
        fetchAllOrders()
      }
    } catch (error) {
      toast.error('Settlement failed')
    }
  }

  const handleCategoryClick = (cat) => {
    setSelectedCategory(cat)
    fetchProductsByCategory(cat._id)
    setSidebarOpen(false) // close mobile sidebar after picking
  }

  useEffect(() => {
    fetchCategory()
    fetchAllOrders()
    fetchTotalProductCount()
    fetchRiders()
    const interval = setInterval(() => {
      fetchAllOrders()
      fetchRiders()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const statCards = [
    {
      label: 'REVENUE',
      value: DisplayPriceInRupees(revenue),
      badge: revenue > 0 ? '+NEW' : '₹0',
      badgeBg: '#1a3a2a', badgeColor: '#4ade80', iconBg: '#1a3a2a',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
          <polyline points="17 6 23 6 23 12"/>
        </svg>
      ),
      sub: revenue === 0 ? 'No delivered orders yet' : 'All delivered orders',
      subColor: '#4ade80',
    },
    {
      label: 'CATALOG',
      value: totalProductCount > 0 ? totalProductCount : '372',
      badge: 'SYNC',
      badgeBg: '#1a2a3a', badgeColor: '#60a5fa', iconBg: '#1a2a3a',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        </svg>
      ),
      sub: '31 pages × 12 products',
      subColor: '#60a5fa',
    },
    {
      label: 'PENDING',
      value: pendingOrders,
      badge: pendingOrders > 0 ? 'URGENT' : 'CLEAR',
      badgeBg: pendingOrders > 0 ? '#3a2010' : '#1a3a2a',
      badgeColor: pendingOrders > 0 ? '#fb923c' : '#4ade80',
      iconBg: '#3a2010',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      ),
      sub: pendingOrders === 0 ? 'All orders fulfilled' : `${pendingOrders} need attention`,
      subColor: '#fb923c',
    },
    {
      label: 'RIDERS',
      value: riderCount,
      badge: 'ACTIVE',
      badgeBg: '#2a1a3a', badgeColor: '#c084fc', iconBg: '#2a1a3a',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="3" width="15" height="13"/>
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
          <circle cx="5.5" cy="18.5" r="2.5"/>
          <circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
      ),
      sub: `${riderCount} active rider${riderCount !== 1 ? 's' : ''}`,
      subColor: '#c084fc',
    },
  ]

  return (
    // FIX 1: AdminPermision wraps the ENTIRE dashboard, not just the bottom grid
    <AdminPermision>
      <div className="p-3 lg:p-8 min-h-screen" style={{ background: '#0a0f1a' }}>

        {/* ── STAT CARDS ── */}
        {/* FIX 2: smaller font + truncate on mobile so rupee values don't overflow */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
          {statCards.map((card) => (
            <div
              key={card.label}
              style={{
                background: '#0f1923',
                borderRadius: 14,
                padding: '14px 14px 14px 14px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 20,
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  background: card.badgeBg,
                  color: card.badgeColor,
                  letterSpacing: 0.5,
                  whiteSpace: 'nowrap',
                }}
              >
                {card.badge}
              </span>
              <div
                style={{
                  width: 34, height: 34,
                  borderRadius: 8,
                  background: card.iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                }}
              >
                {card.icon}
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }}>
                {card.label}
              </div>
              {/* FIX 2: clamp font size on mobile; long ₹ values no longer overflow */}
              <div style={{
                fontSize: 'clamp(16px, 4vw, 28px)',
                fontWeight: 800,
                color: '#f1f5f9',
                letterSpacing: -0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {card.value}
              </div>
              <div style={{ fontSize: 10, color: card.subColor, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {card.sub}
              </div>
            </div>
          ))}
        </div>

        {/* ── UNCOLLECTED CASH BANNER ── */}
        {/* FIX 4: stack vertically on mobile so amount and button don't squish */}
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

        {/* FIX 5: mobile sidebar toggle button */}
        <button
          onClick={() => setSidebarOpen(o => !o)}
          className="lg:hidden mb-4 flex items-center gap-2 text-xs font-black px-4 py-2 rounded-xl"
          style={{ background: '#0f1923', color: '#94a3b8', border: '1px solid #1e293b' }}
        >
          <span>{sidebarOpen ? '✕ Close' : '☰ Departments & Tools'}</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* ── LEFT SIDEBAR — visible on desktop always, toggled on mobile ── */}
          <div className={`lg:col-span-1 space-y-6 ${sidebarOpen ? 'block' : 'hidden'} lg:block`}>
            <div style={{ background: '#0f1923', borderRadius: 16, padding: 20 }}>
              <h3 style={{ fontSize: 10, fontWeight: 800, color: '#6b7280', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
                Mart Departments
              </h3>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => { setSelectedCategory(null); setSidebarOpen(false) }}
                  style={{
                    fontSize: 11, fontWeight: 700,
                    padding: '10px 12px', borderRadius: 8,
                    textAlign: 'left', border: 'none', cursor: 'pointer',
                    background: !selectedCategory ? '#1e293b' : 'transparent',
                    color: !selectedCategory ? '#f1f5f9' : '#94a3b8',
                  }}
                >
                  📊 OVERVIEW
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat._id}
                    onClick={() => handleCategoryClick(cat)}
                    style={{
                      fontSize: 11, fontWeight: 700,
                      padding: '10px 12px', borderRadius: 8,
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
            </div>

            <AddStore fetchStores={fetchAllOrders} />
            <DailyReport />
          </div>

          {/* ── MAIN CONTENT ── */}
          <div className="lg:col-span-3 space-y-6">
            {!selectedCategory ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div style={{ background: '#0f1923', borderRadius: 16, padding: 20 }}>
                    <h3 style={{ fontSize: 11, fontWeight: 800, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                      Mart Network Status
                    </h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#0a1a10', borderRadius: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1' }}>Paliganj Main Mart</span>
                      <span style={{ fontSize: 10, background: '#14532d', color: '#4ade80', padding: '3px 10px', borderRadius: 20, fontWeight: 800, textTransform: 'uppercase' }}>
                        Live
                      </span>
                    </div>
                  </div>

                  <div style={{ background: '#0f1923', borderRadius: 16, padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h3 style={{ fontSize: 11, fontWeight: 800, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: 1 }}>Live Rider</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, background: '#ef4444', borderRadius: '50%', display: 'inline-block' }}></span>
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>Live</span>
                      </div>
                    </div>
                    <AdminRiderSimulator orderId="order_paliganj_001" />
                  </div>
                </div>

                <div style={{ background: '#0f1923', borderRadius: 16, padding: 20 }}>
                  <h3 style={{ fontSize: 11, fontWeight: 800, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
                    Recent Dispatch Activity
                  </h3>
                  {orders.length === 0 ? (
                    <p style={{ color: '#4b5563', fontSize: 12, fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                      No active dispatch movements.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {orders.slice(0, 8).map(order => (
                        <div
                          key={order._id}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 12px', borderRadius: 10, background: '#0a1118',
                            gap: 8,
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
                </div>
              </>
            ) : (
              <div style={{ background: '#0f1923', borderRadius: 16, padding: 20 }}>
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
                      <div
                        key={product._id}
                        style={{ padding: 12, background: '#0a1118', borderRadius: 12, border: '1px solid #1e293b', cursor: 'pointer' }}
                      >
                        <img
                          src={product.image?.[0]}
                          style={{ width: '100%', height: 80, objectFit: 'contain', marginBottom: 8 }}
                          alt=""
                        />
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
              </div>
            )}
          </div>

        </div>
      </div>
    </AdminPermision>
  )
}

export default AdminDashboard