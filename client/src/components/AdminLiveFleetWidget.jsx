import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import { io } from 'socket.io-client'
import { FaMotorcycle, FaPhone, FaMapMarkerAlt, FaClock, FaMoneyBillWave, FaExternalLinkAlt, FaSync } from 'react-icons/fa'

const fmtINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const formatDutyTime = (minutes) => {
  const m = Number(minutes || 0)
  const hrs = Math.floor(m / 60)
  const mins = m % 60
  if (hrs === 0) return `${mins}m`
  return `${hrs}h ${mins}m`
}

const AdminLiveFleetWidget = ({ isEmbedded = false }) => {
  const navigate = useNavigate()
  const [fleet, setFleet] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
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
      if (!silent) toast.error('Failed to load live rider fleet')
    } finally {
      setLoading(false)
    }
  }, [])

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

  return (
    <div className='bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 text-white shadow-xl mb-6 w-full max-w-full overflow-hidden box-border'>
      {/* Header Row */}
      <div className='flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-4 pb-3 border-b border-slate-800 w-full'>
        <div className='min-w-0'>
          <div className='flex items-center gap-2'>
            <h2 className='text-sm sm:text-base font-black text-white flex items-center gap-1.5 truncate'>
              <span>🛵</span> Live Rider Fleet & Duty Status
            </h2>
            <span className='px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 flex-shrink-0'>
              <span className='w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping'></span>
              Live
            </span>
          </div>
          <p className='text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5 truncate'>
            Active rider on/off duty shifts, cash in hand & live GPS
          </p>
        </div>
        <div className='flex items-center gap-1.5 flex-shrink-0'>
          <button
            onClick={() => fetchFleet(true)}
            className='p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition'
            title='Refresh'
          >
            <FaSync size={11} />
          </button>
          
          <button
            onClick={() => navigate('/dashboard/rider-fleet')}
            className='px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] sm:text-xs flex items-center gap-1 transition active:scale-95 shadow-md shadow-blue-600/20'
          >
            <span>Full Map</span>
            <FaExternalLinkAlt size={9} />
          </button>
        </div>
      </div>
      {/* Metrics Row */}
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 mb-4 w-full max-w-full'>
        <div className='bg-slate-950/80 border border-slate-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-3'>
          <p className='text-[9px] font-black uppercase text-slate-500'>Total Fleet</p>
          <p className='text-lg sm:text-xl font-black text-white mt-0.5'>{totalRiders} <span className='text-[10px] font-normal text-slate-400'>riders</span></p>
        </div>

        <div className='bg-emerald-950/40 border border-emerald-800/40 rounded-xl sm:rounded-2xl p-2.5 sm:p-3'>
          <p className='text-[9px] font-black uppercase text-emerald-400'>🟢 On Duty</p>
          <p className='text-lg sm:text-xl font-black text-emerald-400 mt-0.5'>{onDutyCount} <span className='text-[10px] font-normal text-emerald-300/70'>active</span></p>
        </div>

        <div className='bg-blue-950/40 border border-blue-800/40 rounded-xl sm:rounded-2xl p-2.5 sm:p-3'>
          <p className='text-[9px] font-black uppercase text-blue-400'>🛵 Delivering</p>
          <p className='text-lg sm:text-xl font-black text-blue-400 mt-0.5'>{deliveringCount} <span className='text-[10px] font-normal text-blue-300/70'>orders</span></p>
        </div>

        <div className='bg-amber-950/40 border border-amber-800/40 rounded-xl sm:rounded-2xl p-2.5 sm:p-3'>
          <p className='text-[9px] font-black uppercase text-amber-400'>Cash in Hand</p>
          <p className='text-base sm:text-xl font-black text-amber-400 mt-0.5 truncate'>{fmtINR(totalCashInHand)}</p>
        </div>
      </div>

      {loading ? (
        <div className='py-8 text-center text-xs text-slate-400 animate-pulse'>
          Syncing Paliganj live riders…
        </div>
      ) : fleet.length === 0 ? (
        <div className='py-8 text-center text-xs text-slate-500 font-bold'>
          No active delivery riders found in fleet
        </div>
      ) : (
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-[420px] overflow-y-auto pr-1'>
          {fleet.map(rider => {
            const hasGps = Boolean(rider.lastLocation?.latitude && rider.lastLocation?.longitude)
            const mapsUrl = hasGps
              ? `https://www.google.com/maps?q=${rider.lastLocation.latitude},${rider.lastLocation.longitude}`
              : null
            return (
              <div
                key={rider.riderId}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                  rider.isDutyOn
                    ? 'bg-slate-950/80 border-emerald-500/30'
                    : 'bg-slate-950/40 border-slate-800/60'
                }`}
              >
                <div>
                  <div className='flex items-center justify-between gap-2 mb-2'>
                    <div className='flex items-center gap-2 min-w-0'>
                      <div className='w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sm flex-shrink-0'>
                        {rider.avatar ? (
                          <img src={rider.avatar} alt={rider.name} className='w-full h-full object-cover rounded-xl' />
                        ) : (
                          '🛵'
                        )}
                      </div>
                      <div className='min-w-0'>
                        <h4 className='font-bold text-white text-xs truncate'>{rider.name}</h4>
                        <p className='text-[10px] text-slate-400 truncate'>{rider.mobile || 'No phone'}</p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 flex-shrink-0 ${
                        rider.isDutyOn
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${rider.isDutyOn ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                      {rider.isDutyOn ? 'ON DUTY' : 'OFF DUTY'}
                    </span>
                  </div>

                  <div className='flex items-center justify-between text-[11px] bg-slate-900/80 rounded-xl px-2.5 py-1.5 mb-2'>
                    <span className='text-slate-400 flex items-center gap-1 font-medium'>
                      <FaClock size={9} className='text-slate-500' />
                      Duty Today: <strong className='text-white'>{formatDutyTime(rider.todayDutyMinutes)}</strong>
                    </span>
                    <span className='text-amber-400 font-bold'>
                      {fmtINR(rider.cashInHand)}
                    </span>
                  </div>

                  {rider.activeOrder && (
                    <div className='text-[10px] bg-blue-950/40 border border-blue-800/40 rounded-xl px-2.5 py-1.5 mb-2 text-blue-300'>
                      <span className='font-bold text-blue-400'>🚀 Delivering #{rider.activeOrder.orderId?.slice(-6)}</span>
                      <p className='truncate text-slate-400 mt-0.5'>{rider.activeOrder.delivery_address?.address_line || 'Customer Address'}</p>
                    </div>
                  )}

                  {/* Exact Lat / Long Coordinates & Speed */}
                  {hasGps && (
                    <div className='flex items-center justify-between text-[10px] text-slate-400 bg-slate-950/60 border border-slate-800/60 rounded-xl px-2.5 py-1.5 mb-2'>
                      <span className='flex items-center gap-1.5 font-mono text-slate-300'>
                        <FaMapMarkerAlt size={10} className='text-rose-400 flex-shrink-0' />
                        <span>{rider.lastLocation.latitude.toFixed(5)}, {rider.lastLocation.longitude.toFixed(5)}</span>
                      </span>
                      {rider.lastLocation.speed !== null && rider.lastLocation.speed > 0 ? (
                        <span className='font-bold text-emerald-400'>
                          {Math.round(rider.lastLocation.speed * 3.6)} km/h
                        </span>
                      ) : (
                        <span className='text-[9px] text-slate-500 font-bold'>GPS Live</span>
                      )}
                    </div>
                  )}
                </div>

                <div className='flex items-center gap-1.5 pt-2 border-t border-slate-900'>
                  {rider.mobile && (
                    <a
                      href={`tel:${rider.mobile}`}
                      className='flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] rounded-lg flex items-center justify-center gap-1 transition'
                    >
                      <FaPhone size={9} className='text-emerald-400' />
                      <span>Call</span>
                    </a>
                  )}

                  {mapsUrl ? (
                    <a
                      href={mapsUrl}
                      target='_blank'
                      rel='noreferrer'
                      className='flex-1 py-1.5 px-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 font-bold text-[10px] rounded-lg flex items-center justify-center gap-1 transition'
                    >
                      <FaMapMarkerAlt size={9} />
                      <span>Live GPS</span>
                    </a>
                  ) : (
                    <span className='flex-1 text-center py-1.5 text-[10px] text-slate-600 font-medium'>
                      No GPS fix
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default AdminLiveFleetWidget
