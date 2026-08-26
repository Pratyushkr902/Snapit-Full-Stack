import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import { io } from 'socket.io-client'
import { FaMotorcycle, FaPhone, FaMapMarkerAlt, FaClock, FaCheckCircle, FaMoneyBillWave } from 'react-icons/fa'
import { IoArrowBack, IoRefresh } from 'react-icons/io5'

const fmtINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const formatDutyTime = (minutes) => {
  const m = Number(minutes || 0)
  const hrs = Math.floor(m / 60)
  const mins = m % 60
  if (hrs === 0) return `${mins}m`
  return `${hrs}h ${mins}m`
}

const AdminRiderFleet = () => {
  const navigate = useNavigate()
  const [fleet, setFleet] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [selectedRider, setSelectedRider] = useState(null)
  const [filter, setFilter] = useState('ALL') // 'ALL' | 'ON_DUTY' | 'OFF_DUTY' | 'DELIVERING'
  const socketRef = useRef(null)

  const fetchFleet = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const res = await Axios({ ...SummaryApi.getAdminLiveRiderFleet })
      if (res.data?.success && res.data?.data) {
        setFleet(res.data.data.fleet || [])
        setLastUpdated(new Date())
      }
    } catch (err) {
      if (!silent) toast.error('Failed to load rider fleet')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── WebSockets for Live Real-Time Fleet Updates ────────────────────────────
  useEffect(() => {
    fetchFleet()
    const pollInterval = setInterval(() => fetchFleet(true), 15000)

    const socket = io(
      import.meta.env.VITE_API_URL || 'https://snapit-full-stack-production.up.railway.app',
      {
        path: '/socket.io/',
        transports: ['websocket', 'polling'],
        withCredentials: true
      }
    )
    socketRef.current = socket

    socket.emit('join_admin_fleet')

    socket.on('rider_fleet_updated', (data) => {
      if (!data?.riderId) return
      setFleet(prev => {
        return prev.map(r => {
          if (String(r.riderId) === String(data.riderId)) {
            return {
              ...r,
              isDutyOn: data.isDutyOn !== undefined ? data.isDutyOn : r.isDutyOn,
              lastLocation: {
                latitude: data.latitude,
                longitude: data.longitude,
                heading: data.heading,
                speed: data.speed,
                battery: data.battery,
                updatedAt: new Date(data.timestamp || Date.now())
              }
            }
          }
          return r
        })
      })
      setLastUpdated(new Date())
    })

    return () => {
      socket.emit('leave_admin_fleet')
      socket.off('rider_fleet_updated')
      socket.disconnect()
      clearInterval(pollInterval)
    }
  }, [fetchFleet])

  const totalRiders = fleet.length
  const onDutyCount = fleet.filter(r => r.isDutyOn).length
  const deliveringCount = fleet.filter(r => r.activeOrder).length
  const totalCashInHand = fleet.reduce((sum, r) => sum + (Number(r.cashInHand) || 0), 0)

  const filteredFleet = fleet.filter(r => {
    if (filter === 'ON_DUTY') return r.isDutyOn
    if (filter === 'OFF_DUTY') return !r.isDutyOn
    if (filter === 'DELIVERING') return Boolean(r.activeOrder)
    return true
  })

  return (
    <div className='min-h-screen bg-slate-950 text-white pb-12'>
      
      {/* ── HEADER ── */}
      <div className='sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-3'>
        <div className='max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-3'>
          <div className='flex items-center gap-3 min-w-0'>
            <button
              onClick={() => navigate(-1)}
              className='w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition active:scale-95'
            >
              <IoArrowBack size={18} />
            </button>
            <div>
              <div className='flex items-center gap-2'>
                <h1 className='text-lg font-black tracking-tight text-white'>🛵 LIVE RIDER FLEET</h1>
                <span className='px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider animate-pulse'>
                  ● Live Realtime
                </span>
              </div>
              <p className='text-[10px] text-slate-500'>
                {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString('en-IN')}` : 'Connecting…'}
              </p>
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <button
              onClick={() => fetchFleet(true)}
              className='p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition active:scale-95'
              title='Refresh Fleet'
            >
              <IoRefresh size={16} />
            </button>
            <button
              onClick={() => navigate('/dashboard/treasury')}
              className='px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs hover:bg-amber-500/20 transition flex items-center gap-1.5'
            >
              <FaMoneyBillWave size={12} />
              <span>Remittance Approvals</span>
            </button>
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 py-6'>

        {/* ── METRIC STATS ── */}
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6'>
          <div className='bg-slate-900/90 border border-slate-800/80 rounded-3xl p-4.5 flex flex-col justify-between'>
            <span className='text-[10px] font-black uppercase text-slate-500 tracking-wider'>Total Fleet</span>
            <div className='flex items-baseline gap-2 mt-2'>
              <span className='text-3xl font-black text-white'>{totalRiders}</span>
              <span className='text-xs text-slate-400 font-medium'>riders</span>
            </div>
          </div>

          <div className='bg-emerald-950/40 border border-emerald-800/40 rounded-3xl p-4.5 flex flex-col justify-between'>
            <div className='flex items-center justify-between'>
              <span className='text-[10px] font-black uppercase text-emerald-400 tracking-wider'>On Duty Now</span>
              <span className='w-2 h-2 rounded-full bg-emerald-400 animate-ping'></span>
            </div>
            <div className='flex items-baseline gap-2 mt-2'>
              <span className='text-3xl font-black text-emerald-400'>{onDutyCount}</span>
              <span className='text-xs text-emerald-200/60 font-medium'>active</span>
            </div>
          </div>

          <div className='bg-blue-950/40 border border-blue-800/40 rounded-3xl p-4.5 flex flex-col justify-between'>
            <span className='text-[10px] font-black uppercase text-blue-400 tracking-wider'>Delivering Now</span>
            <div className='flex items-baseline gap-2 mt-2'>
              <span className='text-3xl font-black text-blue-400'>{deliveringCount}</span>
              <span className='text-xs text-blue-200/60 font-medium'>orders</span>
            </div>
          </div>

          <div className='bg-amber-950/40 border border-amber-800/40 rounded-3xl p-4.5 flex flex-col justify-between'>
            <span className='text-[10px] font-black uppercase text-amber-400 tracking-wider'>Total Cash in Hand</span>
            <div className='flex items-baseline gap-2 mt-2'>
              <span className='text-2xl font-black text-amber-400'>{fmtINR(totalCashInHand)}</span>
            </div>
          </div>
        </div>

        {/* ── FILTER CHIPS ── */}
        <div className='flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide'>
          {[
            { id: 'ALL', label: `All Riders (${totalRiders})` },
            { id: 'ON_DUTY', label: `🟢 On Duty (${onDutyCount})` },
            { id: 'DELIVERING', label: `🛵 Delivering (${deliveringCount})` },
            { id: 'OFF_DUTY', label: `🔴 Off Duty (${totalRiders - onDutyCount})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition border whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-white text-slate-950 border-white shadow-lg'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── FLEET CARDS GRID ── */}
        {loading ? (
          <div className='py-20 text-center flex flex-col items-center justify-center'>
            <div className='w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4'></div>
            <p className='text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse'>
              Tracking Paliganj Fleet…
            </p>
          </div>
        ) : filteredFleet.length === 0 ? (
          <div className='py-16 text-center bg-slate-900/50 rounded-3xl border border-slate-800 p-8'>
            <p className='text-4xl mb-2'>🛵</p>
            <p className='text-slate-300 font-bold text-sm'>No riders in this view</p>
          </div>
        ) : (
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {filteredFleet.map(rider => {
              const hasGps = Boolean(rider.lastLocation?.latitude && rider.lastLocation?.longitude)
              const mapsUrl = hasGps
                ? `https://www.google.com/maps?q=${rider.lastLocation.latitude},${rider.lastLocation.longitude}`
                : null

              return (
                <div
                  key={rider.riderId}
                  className={`bg-slate-900 border rounded-3xl p-5 transition-all flex flex-col justify-between ${
                    rider.isDutyOn
                      ? 'border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                      : 'border-slate-800 opacity-90'
                  }`}
                >
                  {/* Top: Rider Info & Duty Badge */}
                  <div>
                    <div className='flex items-start justify-between gap-3 mb-3'>
                      <div className='flex items-center gap-3 min-w-0'>
                        <div className='w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-600 flex items-center justify-center text-xl flex-shrink-0'>
                          {rider.avatar ? (
                            <img src={rider.avatar} alt={rider.name} className='w-full h-full object-cover rounded-2xl' />
                          ) : (
                            '🛵'
                          )}
                        </div>
                        <div className='min-w-0'>
                          <h3 className='font-black text-white text-base truncate'>{rider.name}</h3>
                          <p className='text-xs text-slate-400 font-medium truncate'>{rider.mobile || rider.email}</p>
                        </div>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex-shrink-0 flex items-center gap-1.5 ${
                          rider.isDutyOn
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${rider.isDutyOn ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                        {rider.isDutyOn ? 'ON DUTY' : 'OFF DUTY'}
                      </span>
                    </div>

                    {/* Duty Time & Cash in Hand Row */}
                    <div className='grid grid-cols-2 gap-2 my-3 p-3 bg-slate-950/60 rounded-2xl border border-slate-800/60'>
                      <div>
                        <p className='text-[9px] font-black text-slate-500 uppercase flex items-center gap-1'>
                          <FaClock size={10} /> Duty Today
                        </p>
                        <p className='text-sm font-black text-slate-200 mt-0.5'>
                          {formatDutyTime(rider.todayDutyMinutes)}
                        </p>
                      </div>
                      <div>
                        <p className='text-[9px] font-black text-slate-500 uppercase flex items-center gap-1'>
                          <FaMoneyBillWave size={10} /> Cash in Hand
                        </p>
                        <p className='text-sm font-black text-amber-400 mt-0.5'>
                          {fmtINR(rider.cashInHand)}
                        </p>
                      </div>
                    </div>

                    {/* Active Order Card (if delivering) */}
                    {rider.activeOrder && (
                      <div className='mb-3 p-3 bg-blue-950/40 border border-blue-800/50 rounded-2xl'>
                        <div className='flex items-center justify-between gap-2 mb-1'>
                          <span className='text-[10px] font-black text-blue-400 uppercase tracking-wider'>
                            🚀 {rider.activeOrder.delivery_status}
                          </span>
                          <span className='text-[10px] font-mono text-slate-400'>
                            #{rider.activeOrder.orderId?.slice(-6)}
                          </span>
                        </div>
                        <p className='text-xs text-slate-300 font-medium truncate'>
                          {rider.activeOrder.delivery_address?.address_line || 'Customer Address'}
                        </p>
                        <p className='text-xs font-black text-blue-300 mt-1'>
                          Order Value: {fmtINR(rider.activeOrder.totalAmt)}
                        </p>
                      </div>
                    )}

                    {/* Live Location Coordinates & Speed */}
                    {hasGps && (
                      <div className='text-[11px] text-slate-400 flex items-center justify-between mb-3 px-1'>
                        <span className='flex items-center gap-1.5'>
                          <FaMapMarkerAlt size={12} className='text-rose-400' />
                          {rider.lastLocation.latitude.toFixed(4)}, {rider.lastLocation.longitude.toFixed(4)}
                        </span>
                        {rider.lastLocation.speed !== null && rider.lastLocation.speed > 0 && (
                          <span className='font-bold text-slate-300'>
                            {Math.round(rider.lastLocation.speed * 3.6)} km/h
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Buttons */}
                  <div className='flex gap-2 pt-3 border-t border-slate-800/80 mt-2'>
                    {rider.mobile && (
                      <a
                        href={`tel:${rider.mobile}`}
                        className='flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition'
                      >
                        <FaPhone size={11} className='text-emerald-400' />
                        <span>Call</span>
                      </a>
                    )}

                    {mapsUrl ? (
                      <a
                        href={mapsUrl}
                        target='_blank'
                        rel='noreferrer'
                        className='flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-600/20'
                      >
                        <FaMapMarkerAlt size={12} />
                        <span>Live Map</span>
                      </a>
                    ) : (
                      <button
                        disabled
                        className='flex-1 py-2.5 px-3 bg-slate-800/50 text-slate-600 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed'
                      >
                        <FaMapMarkerAlt size={12} />
                        <span>No GPS</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminRiderFleet
