import React, { useEffect, useState, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { FiPackage, FiTruck, FiTrendingUp, FiAlertCircle, FiClock, FiMoon, FiSun } from 'react-icons/fi'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'

const AdminSummary = () => {
  const user = useSelector(state => state.user)
  const [animate, setAnimate] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [darkMode, setDarkMode] = useState(true)
  const [allOrders, setAllOrders] = useState([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalProductCount, setTotalProductCount] = useState(0)
  const [pendingOrders, setPendingOrders] = useState(0)
  const [riderCount, setRiderCount] = useState(0)

  useEffect(() => {
    setAnimate(true)
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    fetchAllData()
    const dataInterval = setInterval(fetchAllData, 30000)
    return () => { clearInterval(timer); clearInterval(dataInterval) }
  }, [])

  const fetchAllData = async () => {
    await Promise.all([fetchOrders(), fetchProductCount(), fetchRiders()])
  }

  const fetchOrders = async () => {
    try {
      const response = await Axios({ ...SummaryApi.getOrderItems })
      if (response.data.success) {
        const orders = response.data.data || []
        setAllOrders(orders)
        const revenue = orders
          .filter(o => o.delivery_status === 'Delivered')
          .reduce((acc, curr) => acc + (curr.totalAmt || curr.totalAmount || 0), 0)
        setTotalRevenue(revenue)
        const pending = orders.filter(
          o => o.delivery_status !== 'Delivered' && o.delivery_status !== 'Cancelled'
        ).length
        setPendingOrders(pending)
      }
    } catch (error) { console.error('Orders fetch error', error) }
  }

  const fetchProductCount = async () => {
    try {
      const response = await Axios({ ...SummaryApi.getProduct, data: { page: 1, limit: 1 } })
      if (response.data.success) {
        const total = response.data.totalCount || response.data.total ||
          (response.data.totalNoPage != null ? response.data.totalNoPage * 12 : 0)
        setTotalProductCount(total)
      }
    } catch (error) { console.error('Product count error', error) }
  }

  const fetchRiders = async () => {
    try {
      const response = await Axios({ ...SummaryApi.getRiders })
      if (response.data.success) setRiderCount(response.data.data?.length ?? 0)
    } catch (error) { console.error('Rider fetch error', error) }
  }

  const monthlyRevenueData = useMemo(() => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const currentYear = new Date().getFullYear()
    const map = {}
    months.forEach(m => { map[m] = 0 })
    allOrders
      .filter(o => o.delivery_status === 'Delivered')
      .forEach(o => {
        const date = new Date(o.createdAt)
        if (date.getFullYear() === currentYear) {
          const month = months[date.getMonth()]
          map[month] += o.totalAmt || o.totalAmount || 0
        }
      })
    return months.map(month => ({ month, revenue: Math.round(map[month]) }))
  }, [allOrders])

  const stats = [
    { label: 'Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, icon: <FiTrendingUp />, color: 'text-emerald-400', bg: 'bg-emerald-500/10', trend: totalRevenue > 0 ? '+new' : '₹0' },
    { label: 'Catalog', value: totalProductCount || '...', icon: <FiPackage />, color: 'text-blue-400', bg: 'bg-blue-500/10', trend: 'Sync' },
    { label: 'Pending', value: pendingOrders, icon: <FiAlertCircle />, color: 'text-rose-400', bg: 'bg-rose-500/10', trend: pendingOrders > 0 ? 'Urgent' : 'Clear' },
    { label: 'Riders', value: riderCount, icon: <FiTruck />, color: 'text-purple-400', bg: 'bg-purple-500/10', trend: 'Active' },
  ]

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: darkMode ? '#1e293b' : '#fff', border: '1px solid #334155', borderRadius: 10, padding: '8px 14px' }}>
          <p style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, marginBottom: 2 }}>{label}</p>
          <p style={{ color: '#4ade80', fontSize: 16, fontWeight: 800 }}>₹{payload[0].value.toLocaleString('en-IN')}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className={`${darkMode ? 'bg-[#0f172a] text-slate-200' : 'bg-slate-50 text-slate-900'} min-h-screen p-6 transition-colors duration-500`}>

      <div className='flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4'>
        <div className={`transition-all duration-1000 transform ${animate ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}`}>
          <h2 className='text-3xl font-black tracking-tight'>Snapit <span className='text-green-500'>HQ</span></h2>
          <p className='text-slate-500 font-medium flex items-center gap-2'>
            <FiClock /> {currentTime.toLocaleTimeString()} • {user.name || 'Admin'}
          </p>
        </div>
        <div className='flex items-center gap-4'>
          <button onClick={() => setDarkMode(!darkMode)} className={`p-3 rounded-xl border transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-yellow-400' : 'bg-white border-slate-200 text-slate-600 shadow-sm'}`}>
            {darkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
          </button>
          <div className={`px-5 py-2 rounded-full font-bold text-xs tracking-widest border transition-all ${darkMode ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-green-50 border-green-100 text-green-600'}`}>
            <span className='inline-block w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse'></span>
            SERVER: PRODUCTION
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'>
        {stats.map((stat, i) => (
          <div key={i} className={`p-6 rounded-3xl border transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700/50 backdrop-blur-xl' : 'bg-white border-slate-100 shadow-sm'}`}>
            <div className='flex justify-between items-center'>
              <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} text-2xl`}>{stat.icon}</div>
              <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase ${stat.bg} ${stat.color}`}>{stat.trend}</span>
            </div>
            <div className='mt-6'>
              <p className='text-slate-500 text-xs font-bold uppercase tracking-widest'>{stat.label}</p>
              <h3 className='text-3xl font-black mt-1'>{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8'>
        <div className={`lg:col-span-2 p-6 rounded-3xl border transition-all ${darkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-100 shadow-sm'}`}>
          <div className='flex justify-between items-center mb-6'>
            <div>
              <h3 className='font-black text-lg uppercase tracking-tighter'>Revenue Velocity</h3>
              <p className='text-xs text-slate-500 mt-0.5'>{new Date().getFullYear()} — Monthly breakdown</p>
            </div>
            <div className='text-right'>
              <p className='text-[10px] text-slate-500 uppercase font-bold'>Total</p>
              <p className='text-lg font-black text-green-400'>₹{totalRevenue.toLocaleString('en-IN')}</p>
            </div>
          </div>
          {allOrders.filter(o => o.delivery_status === 'Delivered').length === 0 ? (
            <div className='h-48 flex items-center justify-center flex-col gap-2'>
              <p className='text-4xl'>📊</p>
              <p className='text-slate-500 text-sm italic text-center'>Revenue chart will populate as orders are delivered.</p>
            </div>
          ) : (
            <ResponsiveContainer width='100%' height={200}>
              <BarChart data={monthlyRevenueData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray='3 3' stroke={darkMode ? '#1e293b' : '#f1f5f9'} vertical={false} />
                <XAxis dataKey='month' tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v > 0 ? `₹${(v/1000).toFixed(0)}k` : '0'} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey='revenue' fill='#22c55e' radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className={`p-8 rounded-3xl border flex flex-col items-center text-center justify-center transition-all ${darkMode ? 'bg-gradient-to-br from-green-500/20 to-blue-500/10 border-green-500/20' : 'bg-slate-900 border-slate-800'}`}>
          <div className='relative mb-6'>
            <div className='absolute -inset-4 bg-green-500/20 rounded-full blur-xl animate-pulse'></div>
            <FiTrendingUp className='text-5xl text-green-400 relative z-10' />
          </div>
          <h3 className='text-xl font-black text-white'>Scale Operations</h3>
          <p className='text-slate-400 text-sm mt-3 px-2 leading-relaxed'>Real-time monitoring enabled. Ready to process batch orders.</p>
          <button onClick={() => window.location.href = '/dashboard/category'} className='mt-8 w-full py-4 bg-green-500 hover:bg-green-400 text-slate-900 font-black rounded-2xl transition-all shadow-lg shadow-green-500/20 active:scale-95'>
            MANAGE INVENTORY
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminSummary