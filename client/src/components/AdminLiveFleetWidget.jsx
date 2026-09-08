import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import { io } from 'socket.io-client'
import { FaMotorcycle, FaPhone, FaMapMarkerAlt, FaClock, FaMoneyBillWave, FaExternalLinkAlt, FaSync, FaCrosshairs } from 'react-icons/fa'
import { IoMapOutline, IoListOutline } from 'react-icons/io5'

const DEFAULT_CENTER = [25.3286, 84.7997]

const fmtINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const formatDutyTime = (minutes) => {
  const m = Number(minutes || 0)
  const hrs = Math.floor(m / 60)
  const mins = m % 60
  if (hrs === 0) return `${mins}m`
  return `${hrs}h ${mins}m`
}

const formatGpsAge = (date) => {
  if (!date) return 'No fix'
  const diffSec = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 1000))
  if (diffSec < 60) return 'Live (Just now)'
  const mins = Math.floor(diffSec / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// ── Auto Center / Bound Controller for Widget ──
function WidgetMapController({ ridersWithGps, centerTrigger }) {
  const map = useMap()
  const initialFitDone = useRef(false)

  const fitFleet = useCallback(() => {
    if (!map) return
    if (ridersWithGps && ridersWithGps.length > 0) {
      const validPoints = ridersWithGps
        .map(r => [r.lastLocation.latitude, r.lastLocation.longitude])
        .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng))

      if (validPoints.length === 1) {
        map.flyTo(validPoints[0], 15, { animate: true, duration: 1 })
      } else if (validPoints.length > 1) {
        const bounds = L.latLngBounds(validPoints)
        map.fitBounds(bounds, { padding: [35, 35], maxZoom: 16 })
      }
    } else {
      map.setView(DEFAULT_CENTER, 14)
    }
  }, [ridersWithGps, map])

  useEffect(() => {
    if (!initialFitDone.current && ridersWithGps.length > 0) {
      fitFleet()
      initialFitDone.current = true
    }
  }, [ridersWithGps, fitFleet])

  useEffect(() => {
    if (centerTrigger > 0) {
      fitFleet()
    }
  }, [centerTrigger, fitFleet])

  return null
}

const createWidgetRiderIcon = (rider) => {
  const isDelivering = Boolean(rider.activeOrder)
  const isOnDuty = rider.isDutyOn
  const isFresh = rider.lastLocation?.isFreshGps || (rider.lastLocation?.updatedAt && (Date.now() - new Date(rider.lastLocation.updatedAt).getTime() < 15 * 60 * 1000))
  const bgColor = isDelivering ? '#2563eb' : (isOnDuty ? '#16a34a' : '#475569')
  const ringColor = isDelivering ? '#93c5fd' : (isOnDuty ? '#86efac' : '#94a3b8')

  return new L.DivIcon({
    className: 'snapit-osm-widget-marker',
    html: `
      <div style="position:relative; display:flex; flex-direction:column; align-items:center; cursor:pointer; filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5));">
        <div style="background:${bgColor}; border:2px solid ${ringColor}; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 0 10px ${ringColor}80; color:#fff; font-size:15px; position:relative;">
          🛵
          ${isFresh ? '<span style="position:absolute; top:-2px; right:-2px; width:8px; height:8px; background:#22c55e; border-radius:50%; border:1.5px solid #0f172a;"></span>' : ''}
        </div>
        <div style="background:rgba(15,23,42,0.95); color:#fff; font-weight:800; font-size:9px; padding:1px 5px; border-radius:4px; margin-top:2px; white-space:nowrap; border:1px solid rgba(255,255,255,0.2);">
          ${(rider.name || 'Rider').split(' ')[0]}
        </div>
      </div>
    `,
    iconSize: [36, 46],
    iconAnchor: [18, 40],
    popupAnchor: [0, -40]
  })
}

const AdminLiveFleetWidget = ({ isEmbedded = false }) => {
  const navigate = useNavigate()
  const [fleet, setFleet] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [widgetView, setWidgetView] = useState('LIST') // 'LIST' | 'MAP'
  const [centerTrigger, setCenterTrigger] = useState(0)
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

    // Initial snapshot from in-memory positions
    socket.on('admin_fleet_snapshot', (snapshots) => {
      if (!Array.isArray(snapshots) || snapshots.length === 0) return
      setFleet(prev => {
        const snapMap = new Map(snapshots.map(s => [String(s.riderId), s]))
        return prev.map(r => {
          const s = snapMap.get(String(r.riderId))
          if (s) {
            return {
              ...r,
              isDutyOn: s.isDutyOn !== undefined ? s.isDutyOn : r.isDutyOn,
              lastLocation: {
                latitude: Number(s.latitude),
                longitude: Number(s.longitude),
                heading: s.heading,
                speed: s.speed,
                battery: s.battery,
                updatedAt: new Date(s.timestamp || Date.now()),
                isFreshGps: true
              }
            }
          }
          return r
        })
      })
    })

    socket.on('rider_fleet_updated', (data) => {
      if (!data?.riderId) return
      setFleet(prev => {
        return prev.map(r => {
          if (String(r.riderId) === String(data.riderId)) {
            return {
              ...r,
              isDutyOn: data.isDutyOn !== undefined ? data.isDutyOn : r.isDutyOn,
              lastLocation: {
                latitude: Number(data.latitude),
                longitude: Number(data.longitude),
                heading: data.heading,
                speed: data.speed,
                battery: data.battery,
                updatedAt: new Date(data.timestamp || Date.now()),
                isFreshGps: true
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
      socket.off('admin_fleet_snapshot')
      socket.off('rider_fleet_updated')
      socket.disconnect()
      clearInterval(pollInterval)
    }
  }, [fetchFleet])

  const totalRiders = fleet.length
  const onDutyCount = fleet.filter(r => r.isDutyOn).length
  const deliveringCount = fleet.filter(r => r.activeOrder).length
  const totalCashInHand = fleet.reduce((sum, r) => sum + (Number(r.cashInHand) || 0), 0)
  const ridersWithGps = fleet.filter(r => r.lastLocation?.latitude && r.lastLocation?.longitude)

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
              Live OpenStreetMap
            </span>
          </div>
          <p className='text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5 truncate'>
            Active rider on/off duty shifts, cash in hand & live GPS on OpenStreetMap
          </p>
        </div>
        <div className='flex items-center gap-1.5 flex-shrink-0'>
          {/* List vs Map Switcher */}
          <div className='bg-slate-950 border border-slate-800 rounded-xl p-0.5 flex items-center gap-0.5'>
            <button
              onClick={() => setWidgetView('LIST')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                widgetView === 'LIST' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <IoListOutline size={12} />
              <span className='hidden sm:inline'>List</span>
            </button>
            <button
              onClick={() => setWidgetView('MAP')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                widgetView === 'MAP' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <IoMapOutline size={12} />
              <span className='hidden sm:inline'>Map</span>
            </button>
          </div>

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

      {/* Widget Content: List or Map */}
      {loading ? (
        <div className='py-8 text-center text-xs text-slate-400 animate-pulse'>
          Syncing Paliganj live riders on OpenStreetMap…
        </div>
      ) : widgetView === 'MAP' ? (
        <div className='h-[320px] rounded-2xl overflow-hidden border border-slate-800 relative'>
          {/* Quick Center Button */}
          <button
            onClick={() => setCenterTrigger(c => c + 1)}
            className='absolute top-3 right-3 z-[400] bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl shadow flex items-center gap-1.5 backdrop-blur transition'
            title='Recenter on active riders'
          >
            <FaCrosshairs size={11} className='text-emerald-400' />
            <span>Center Fleet</span>
          </button>

          <MapContainer
            center={ridersWithGps[0] ? [ridersWithGps[0].lastLocation.latitude, ridersWithGps[0].lastLocation.longitude] : DEFAULT_CENTER}
            zoom={14}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%' }}
            className='z-0'
          >
            <WidgetMapController ridersWithGps={ridersWithGps} centerTrigger={centerTrigger} />

            <TileLayer
              attribution='&copy; OpenStreetMap'
              url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            />
            {/* Depot Landmark */}
            <Marker
              position={DEFAULT_CENTER}
              icon={new L.DivIcon({
                html: `<div style="background:#0f172a; border:2px solid #38bdf8; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 0 8px rgba(56,189,248,0.5); font-size:13px;">🏪</div>`,
                className: '',
                iconSize: [28, 28],
                iconAnchor: [14, 14]
              })}
            >
              <Popup className='snapit-custom-popup'>
                <div className='p-1 text-slate-900 font-bold text-xs'>
                  🏪 Snapit Express Hub (Paliganj)
                </div>
              </Popup>
            </Marker>

            {/* Riders on OpenStreetMap */}
            {ridersWithGps.map(rider => (
              <Marker
                key={rider.riderId}
                position={[rider.lastLocation.latitude, rider.lastLocation.longitude]}
                icon={createWidgetRiderIcon(rider)}
              >
                <Popup className='snapit-custom-popup'>
                  <div className='p-1.5 text-slate-900 text-xs min-w-[190px]'>
                    <p className='font-black text-sm text-slate-950 flex items-center justify-between gap-2 border-b pb-1'>
                      <span>🛵 {rider.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${rider.isDutyOn ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                        {rider.isDutyOn ? 'ON DUTY' : 'OFF DUTY'}
                      </span>
                    </p>
                    <p className='text-slate-600 mt-1'>Duty: <strong>{formatDutyTime(rider.todayDutyMinutes)}</strong></p>
                    <p className='text-slate-600'>Cash: <strong className='text-amber-700'>{fmtINR(rider.cashInHand)}</strong></p>
                    <p className='text-slate-500 font-medium text-[10px] mt-0.5'>
                      GPS: <strong className={rider.lastLocation?.isFreshGps ? 'text-emerald-700' : 'text-slate-700'}>{formatGpsAge(rider.lastLocation?.updatedAt)}</strong>
                    </p>
                    {rider.lastLocation?.speed !== null && rider.lastLocation?.speed > 0 && (
                      <p className='text-emerald-600 font-bold'>Speed: {Math.round(rider.lastLocation.speed * 3.6)} km/h</p>
                    )}
                    {rider.mobile && (
                      <a href={`tel:${rider.mobile}`} className='mt-1 inline-block text-blue-600 font-bold hover:underline'>📞 Call Rider</a>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
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
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${rider.lastLocation?.isFreshGps ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                          {formatGpsAge(rider.lastLocation?.updatedAt)}
                        </span>
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

                  {hasGps ? (
                    <button
                      onClick={() => navigate('/dashboard/rider-fleet')}
                      className='flex-1 py-1.5 px-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 font-bold text-[10px] rounded-lg flex items-center justify-center gap-1 transition'
                    >
                      <FaMapMarkerAlt size={9} />
                      <span>OpenStreetMap</span>
                    </button>
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


