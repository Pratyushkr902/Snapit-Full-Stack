import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { FiPackage, FiTruck, FiTrendingUp, FiAlertCircle, FiClock, FiMoon, FiSun } from 'react-icons/fi'

const AdminSummary = () => {
  const user = useSelector(state => state.user)
  const allProducts = useSelector(state => state.product.allCategory) 
  const allOrders = useSelector(state => state.orders?.allOrders || [])
  
  const [animate, setAnimate] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [darkMode, setDarkMode] = useState(true) // Default to Dark for the "Cool" factor

  useEffect(() => {
    setAnimate(true)
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const totalRevenue = allOrders.reduce((acc, curr) => acc + (curr.totalAmt || 0), 0)
  const pendingOrders = allOrders.filter(o => o.status === 'pending').length

  const stats = [
    { label: 'Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, icon: <FiTrendingUp />, color: 'text-emerald-400', bg: 'bg-emerald-500/10', trend: '+12%' },
    { label: 'Catalog', value: allProducts?.length || 0, icon: <FiPackage />, color: 'text-blue-400', bg: 'bg-blue-500/10', trend: 'Sync' },
    { label: 'Pending', value: pendingOrders, icon: <FiAlertCircle />, color: 'text-rose-400', bg: 'bg-rose-500/10', trend: 'Urgent' },
    { label: 'Riders', value: '3', icon: <FiTruck />, color: 'text-purple-400', bg: 'bg-purple-500/10', trend: 'Active' },
  ]

  return (
    <div className={`${darkMode ? 'bg-[#0f172a] text-slate-200' : 'bg-slate-50 text-slate-900'} min-h-screen p-6 transition-colors duration-500`}>
        
        {/* Top Navigation Bar */}
        <div className='flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4'>
            <div className={`transition-all duration-1000 transform ${animate ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}`}>
                <h2 className='text-3xl font-black tracking-tight'>Snapit <span className='text-green-500'>HQ</span></h2>
                <p className='text-slate-500 font-medium flex items-center gap-2'>
                    <FiClock className='animate-spin-slow' /> {currentTime.toLocaleTimeString()} • {user.name || "Admin"}
                </p>
            </div>

            <div className='flex items-center gap-4'>
                {/* Theme Toggle */}
                <button 
                    onClick={() => setDarkMode(!darkMode)}
                    className={`p-3 rounded-xl border transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-yellow-400' : 'bg-white border-slate-200 text-slate-600 shadow-sm'}`}
                >
                    {darkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
                </button>
                
                <div className={`px-5 py-2 rounded-full font-bold text-xs tracking-widest border transition-all ${darkMode ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-green-50 border-green-100 text-green-600'}`}>
                    <span className='inline-block w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse'></span>
                    SERVER: PRODUCTION
                </div>
            </div>
        </div>
        
        {/* Glassmorphism Stats Grid */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'>
            {stats.map((stat, i) => (
                <div key={i} className={`p-6 rounded-3xl border transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700/50 backdrop-blur-xl' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className='flex justify-between items-center'>
                        <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} text-2xl`}>
                            {stat.icon}
                        </div>
                        <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase ${stat.bg} ${stat.color}`}>
                            {stat.trend}
                        </span>
                    </div>
                    <div className='mt-6'>
                        <p className='text-slate-500 text-xs font-bold uppercase tracking-widest'>{stat.label}</p>
                        <h3 className='text-3xl font-black mt-1'>{stat.value}</h3>
                    </div>
                </div>
            ))}
        </div>

        {/* Dynamic Analytics & Live Log */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8'>
            <div className={`lg:col-span-2 p-8 rounded-3xl border transition-all ${darkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className='flex justify-between items-center mb-6'>
                    <h3 className='font-black text-lg uppercase tracking-tighter'>Revenue Velocity</h3>
                    <div className='flex gap-2'>
                        <div className='w-3 h-3 rounded-full bg-blue-500'></div>
                        <div className='w-3 h-3 rounded-full bg-slate-600'></div>
                    </div>
                </div>
                <div className='h-48 flex items-end gap-3 px-2'>
                    {[30, 45, 35, 60, 55, 80, 95, 70, 85, 65, 75, 90].map((h, i) => (
                        <div key={i} className='group relative flex-1'>
                            <div 
                                className={`w-full rounded-t-lg transition-all duration-1000 ease-out delay-${i * 100} ${darkMode ? 'bg-blue-500/40 group-hover:bg-blue-400' : 'bg-blue-500 group-hover:bg-blue-600'}`}
                                style={{ height: animate ? `${h}%` : '0%' }}
                            ></div>
                        </div>
                    ))}
                </div>
            </div>

            <div className={`p-8 rounded-3xl border flex flex-col items-center text-center justify-center transition-all ${darkMode ? 'bg-gradient-to-br from-green-500/20 to-blue-500/10 border-green-500/20' : 'bg-slate-900 border-slate-800'}`}>
                <div className='relative mb-6'>
                    <div className='absolute -inset-4 bg-green-500/20 rounded-full blur-xl animate-pulse'></div>
                    <FiTrendingUp className='text-5xl text-green-400 relative z-10' />
                </div>
                <h3 className='text-xl font-black text-white'>Scale Operations</h3>
                <p className='text-slate-400 text-sm mt-3 px-2 leading-relaxed'>
                    Real-time monitoring enabled. Ready to process batch orders for the Roorkee sector.
                </p>
                <button 
                    onClick={() => window.location.href = '/dashboard/category'}
                    className='mt-8 w-full py-4 bg-green-500 hover:bg-green-400 text-slate-900 font-black rounded-2xl transition-all shadow-lg shadow-green-500/20 active:scale-95'
                >
                    MANAGE INVENTORY
                </button>
            </div>
        </div>
    </div>
  )
}

export default AdminSummary