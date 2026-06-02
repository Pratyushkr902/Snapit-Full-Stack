import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import AxiosToastError from '../utils/AxiosToastError'

const STATUS_META = {
  pending:    { label: 'Pending',    bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  confirmed:  { label: 'Confirmed',  bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-400'   },
  processing: { label: 'Processing', bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-400' },
  shipped:    { label: 'Shipped',    bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-400' },
  delivered:  { label: 'Delivered',  bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500'  },
  cancelled:  { label: 'Cancelled',  bg: 'bg-red-100',    text: 'text-red-600',    dot: 'bg-red-400'    },
}

const MOCK_ORDERS = [
  {
    _id: 'ORD-20240601-001',
    createdAt: '2024-06-01T10:30:00Z',
    status: 'delivered',
    totalAmt: 1250,
    items: [
      { name: 'Basmati Rice 5kg', qty: 2, price: 450 },
      { name: 'Mustard Oil 1L', qty: 1, price: 350 },
    ],
    customer: { name: 'Rahul Sharma', mobile: '9876543210' },
  },
  {
    _id: 'ORD-20240602-002',
    createdAt: '2024-06-02T14:15:00Z',
    status: 'shipped',
    totalAmt: 780,
    items: [
      { name: 'Atta 10kg', qty: 1, price: 420 },
      { name: 'Dal Masoor 1kg', qty: 2, price: 180 },
    ],
    customer: { name: 'Priya Singh', mobile: '9123456789' },
  },
  {
    _id: 'ORD-20240603-003',
    createdAt: '2024-06-03T09:00:00Z',
    status: 'processing',
    totalAmt: 540,
    items: [
      { name: 'Sugar 2kg', qty: 3, price: 180 },
    ],
    customer: { name: 'Amit Kumar', mobile: '9988776655' },
  },
  {
    _id: 'ORD-20240603-004',
    createdAt: '2024-06-03T18:45:00Z',
    status: 'cancelled',
    totalAmt: 320,
    items: [
      { name: 'Refined Oil 1L', qty: 2, price: 160 },
    ],
    customer: { name: 'Sunita Devi', mobile: '9871234560' },
  },
  {
    _id: 'ORD-20240604-005',
    createdAt: '2024-06-04T11:20:00Z',
    status: 'pending',
    totalAmt: 1890,
    items: [
      { name: 'Toor Dal 5kg', qty: 1, price: 650 },
      { name: 'Wheat 10kg', qty: 2, price: 620 },
    ],
    customer: { name: 'Vikram Yadav', mobile: '9765432108' },
  },
]

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META['pending']
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${meta.bg} ${meta.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}></span>
      {meta.label}
    </span>
  )
}

const SellerOrders = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      // Try real API first; fall back to mock data
      const response = await Axios({ ...SummaryApi.getSellerOrders })
      if (response.data.success) {
        setOrders(response.data.data)
      } else {
        setOrders(MOCK_ORDERS)
      }
    } catch {
      // Use mock data when API isn't ready
      setOrders(MOCK_ORDERS)
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = orders.filter(o => {
    const matchStatus = filter === 'all' || o.status === filter
    const matchSearch =
      !search ||
      o._id.toLowerCase().includes(search.toLowerCase()) ||
      o.customer?.name?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const formatDate = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const formatTime = (iso) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  }

  const FILTERS = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span>🧾</span> Order History
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">All orders placed at your store</p>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by Order ID or customer…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            />
            <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Orders', value: orders.length, color: 'text-gray-700', bg: 'bg-white' },
            { label: 'Delivered', value: orders.filter(o => o.status === 'delivered').length, color: 'text-green-700', bg: 'bg-green-50' },
            { label: 'Processing', value: orders.filter(o => ['pending','confirmed','processing','shipped'].includes(o.status)).length, color: 'text-blue-700', bg: 'bg-blue-50' },
            { label: 'Cancelled', value: orders.filter(o => o.status === 'cancelled').length, color: 'text-red-600', bg: 'bg-red-50' },
          ].map(stat => (
            <div key={stat.label} className={`${stat.bg} rounded-xl border border-gray-100 px-4 py-3 shadow-sm`}>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                filter === f
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300 hover:text-orange-600'
              }`}
            >
              {f === 'all' ? 'All Orders' : STATUS_META[f]?.label ?? f}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-500 font-medium">No orders found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting the filter or search term</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map(order => (
              <div
                key={order._id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md"
              >
                {/* Order Header */}
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === order._id ? null : order._id)}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{order._id}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDate(order.createdAt)} · {formatTime(order.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-bold text-gray-800">₹{order.totalAmt?.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-gray-400">{order.items?.length} item{order.items?.length !== 1 ? 's' : ''}</p>
                    </div>
                    <StatusBadge status={order.status} />
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${expandedId === order._id ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === order._id && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                    <div className="flex flex-col sm:flex-row gap-5">
                      {/* Customer */}
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Customer</p>
                        <p className="text-sm font-medium text-gray-800">{order.customer?.name || '—'}</p>
                        <p className="text-xs text-gray-500">{order.customer?.mobile || '—'}</p>
                      </div>
                      {/* Items */}
                      <div className="flex-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Items</p>
                        <div className="space-y-1.5">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-gray-700">{item.name} <span className="text-gray-400">×{item.qty}</span></span>
                              <span className="font-medium text-gray-800">₹{(item.price * item.qty).toLocaleString('en-IN')}</span>
                            </div>
                          ))}
                          <div className="pt-1.5 border-t border-gray-200 flex justify-between text-sm font-bold text-gray-900">
                            <span>Total</span>
                            <span>₹{order.totalAmt?.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SellerOrders