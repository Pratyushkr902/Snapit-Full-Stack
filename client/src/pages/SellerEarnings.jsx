import React, { useState, useEffect } from 'react'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_SUMMARY = {
  totalEarnings: 48750,
  pendingPayout: 7200,
  paidOut: 41550,
  thisMonthEarnings: 12400,
  lastMonthEarnings: 10800,
  totalOrders: 38,
  avgOrderValue: 1283,
}

const MOCK_TRANSACTIONS = [
  { _id: 'TXN001', orderId: 'ORD-20240601-001', date: '2024-06-01T10:30:00Z', gross: 1250, commission: 125, net: 1125, status: 'paid', customer: 'Rahul Sharma' },
  { _id: 'TXN002', orderId: 'ORD-20240602-002', date: '2024-06-02T14:15:00Z', gross: 780,  commission: 78,  net: 702,  status: 'paid', customer: 'Priya Singh' },
  { _id: 'TXN003', orderId: 'ORD-20240603-003', date: '2024-06-03T09:00:00Z', gross: 540,  commission: 54,  net: 486,  status: 'pending', customer: 'Amit Kumar' },
  { _id: 'TXN004', orderId: 'ORD-20240604-005', date: '2024-06-04T11:20:00Z', gross: 1890, commission: 189, net: 1701, status: 'pending', customer: 'Vikram Yadav' },
  { _id: 'TXN005', orderId: 'ORD-20240528-010', date: '2024-05-28T16:00:00Z', gross: 2100, commission: 210, net: 1890, status: 'paid', customer: 'Neha Gupta' },
  { _id: 'TXN006', orderId: 'ORD-20240525-008', date: '2024-05-25T13:45:00Z', gross: 960,  commission: 96,  net: 864,  status: 'paid', customer: 'Ravi Tiwari' },
  { _id: 'TXN007', orderId: 'ORD-20240520-006', date: '2024-05-20T08:30:00Z', gross: 3400, commission: 340, net: 3060, status: 'paid', customer: 'Pooja Mishra' },
]

const MOCK_MONTHLY = [
  { month: 'Jan', earnings: 5200 },
  { month: 'Feb', earnings: 6800 },
  { month: 'Mar', earnings: 4900 },
  { month: 'Apr', earnings: 8200 },
  { month: 'May', earnings: 10800 },
  { month: 'Jun', earnings: 12400 },
]

// ─── Bar Chart Component ──────────────────────────────────────────────────────
const BarChart = ({ data }) => {
  const max = Math.max(...data.map(d => d.earnings))
  return (
    <div className="flex items-end gap-2 h-32 mt-2">
      {data.map((d, i) => {
        const pct = (d.earnings / max) * 100
        const isLast = i === data.length - 1
        return (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1 group relative">
            {/* Tooltip */}
            <div className="absolute -top-8 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              ₹{d.earnings.toLocaleString('en-IN')}
            </div>
            <div
              className={`w-full rounded-t-md transition-all duration-500 ${isLast ? 'bg-orange-500' : 'bg-orange-200 group-hover:bg-orange-300'}`}
              style={{ height: `${pct}%`, minHeight: '6px' }}
            ></div>
            <span className="text-[10px] text-gray-500">{d.month}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
const SellerEarnings = () => {
  const [summary, setSummary] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [monthly, setMonthly] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const response = await Axios({ ...SummaryApi.getSellerEarnings })
      if (response.data.success) {
        setSummary(response.data.data.summary)
        setTransactions(response.data.data.transactions)
        setMonthly(response.data.data.monthly)
      } else {
        loadMock()
      }
    } catch {
      loadMock()
    } finally {
      setLoading(false)
    }
  }

  const loadMock = () => {
    setSummary(MOCK_SUMMARY)
    setTransactions(MOCK_TRANSACTIONS)
    setMonthly(MOCK_MONTHLY)
  }

  const formatDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  const filtered = transactions.filter(t => activeTab === 'all' || t.status === activeTab)

  const growthPct = summary
    ? (((summary.thisMonthEarnings - summary.lastMonthEarnings) / (summary.lastMonthEarnings || 1)) * 100).toFixed(1)
    : 0
  const isGrowthPositive = growthPct >= 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Loading earnings…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>💰</span> Earnings & Payouts
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Your revenue overview and transaction history</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-4 col-span-2 lg:col-span-1 shadow-md">
            <p className="text-xs font-medium text-orange-100">Total Earnings</p>
            <p className="text-2xl font-bold mt-1">₹{summary?.totalEarnings?.toLocaleString('en-IN')}</p>
            <p className="text-xs text-orange-200 mt-1">All time</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs text-gray-500">This Month</p>
            <p className="text-xl font-bold text-gray-900 mt-1">₹{summary?.thisMonthEarnings?.toLocaleString('en-IN')}</p>
            <span className={`text-xs font-semibold mt-1 inline-block ${isGrowthPositive ? 'text-green-600' : 'text-red-500'}`}>
              {isGrowthPositive ? '▲' : '▼'} {Math.abs(growthPct)}% vs last month
            </span>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs text-gray-500">Pending Payout</p>
            <p className="text-xl font-bold text-yellow-600 mt-1">₹{summary?.pendingPayout?.toLocaleString('en-IN')}</p>
            <p className="text-xs text-gray-400 mt-1">Awaiting transfer</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs text-gray-500">Paid Out</p>
            <p className="text-xl font-bold text-green-600 mt-1">₹{summary?.paidOut?.toLocaleString('en-IN')}</p>
            <p className="text-xs text-gray-400 mt-1">{summary?.totalOrders} orders total</p>
          </div>
        </div>

        {/* Chart + Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Bar Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold text-gray-700">Monthly Earnings</h2>
              <span className="text-xs text-gray-400">Last 6 months</span>
            </div>
            <BarChart data={monthly} />
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Quick Stats</h2>
            <div className="space-y-4">
              {[
                { label: 'Total Orders', value: summary?.totalOrders, icon: '📦' },
                { label: 'Avg Order Value', value: `₹${summary?.avgOrderValue?.toLocaleString('en-IN')}`, icon: '📊' },
                { label: 'Commission Rate', value: '10%', icon: '🏷️' },
                { label: 'Payout Cycle', value: 'Weekly', icon: '🔄' },
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
            <h2 className="text-sm font-semibold text-gray-700">Transaction History</h2>
            <div className="flex gap-2">
              {['all', 'paid', 'pending'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    activeTab === tab
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {tab === 'all' ? 'All' : tab === 'paid' ? 'Paid' : 'Pending'}
                </button>
              ))}
            </div>
          </div>

          {/* Table Header */}
          <div className="hidden sm:grid grid-cols-5 gap-4 px-5 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <span className="col-span-2">Order / Customer</span>
            <span className="text-right">Gross</span>
            <span className="text-right">Commission</span>
            <span className="text-right">Net Earned</span>
          </div>

          <div className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">No transactions found</div>
            ) : (
              filtered.map(txn => (
                <div key={txn._id} className="grid grid-cols-2 sm:grid-cols-5 gap-4 px-5 py-3.5 items-center hover:bg-gray-50 transition-colors">
                  {/* Order + Customer */}
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-800">{txn.orderId}</p>
                    <div className="flex items-center gap-2 mt-0.5">
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
                  {/* Gross */}
                  <div className="text-right">
                    <p className="text-sm text-gray-700">₹{txn.gross.toLocaleString('en-IN')}</p>
                  </div>
                  {/* Commission */}
                  <div className="text-right">
                    <p className="text-sm text-red-400">-₹{txn.commission.toLocaleString('en-IN')}</p>
                  </div>
                  {/* Net */}
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">₹{txn.net.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payout Info Banner */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-4 flex items-start gap-3">
          <span className="text-2xl">💳</span>
          <div>
            <p className="text-sm font-semibold text-orange-800">Next Payout</p>
            <p className="text-xs text-orange-600 mt-0.5">
              Pending amount of <strong>₹{summary?.pendingPayout?.toLocaleString('en-IN')}</strong> will be transferred to your registered bank account within 3–5 business days after delivery confirmation.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}

export default SellerEarnings