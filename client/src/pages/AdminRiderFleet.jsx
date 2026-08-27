import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import { io } from 'socket.io-client'
import { FaMotorcycle, FaPhone, FaMapMarkerAlt, FaClock, FaCheckCircle, FaMoneyBillWave, FaCompass, FaLayerGroup, FaExpand, FaCompress } from 'react-icons/fa'
import { IoArrowBack, IoRefresh, IoMapOutline, IoGridOutline } from 'react-icons/io5'

// Fix Leaflet default marker assets in Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const DEFAULT_CENTER = [25.3286, 84.7997] // Paliganj, Bihar

const fmtINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const formatDutyTime = (minutes) => {
  const m = Number(minutes || 0)
  const hrs = Math.floor(m / 60)
  const mins = m % 60
  if (hrs === 0) return `${mins}m`
  return `${hrs}h ${mins}m`
}

// ── Custom OpenStreetMap Rider Icon Generator ──
const createRiderMapIcon = (rider, isSelected) => {
  const isDelivering = Boolean(rider.activeOrder)
  const isOnDuty = rider.isDutyOn
  const bgColor = isDelivering ? '#2563eb' : (isOnDuty ? '#16a34a' : '#475569')
  const ringColor = isSelected ? '#f59e0b' : (isDelivering ? '#93c5fd' : (isOnDuty ? '#86efac' : '#94a3b8'))
  const pulseHtml = (isOnDuty || isDelivering)
    ? `<span style="position:absolute; top:-2px; right:-2px; width:10px; height:10px; background:#22c55e; border-radius:50%; border:2px solid #0f172a; box-shadow:0 0 8px #22c55e;" class="animate-ping"></span>
       <span style="position:absolute; top:-2px; right:-2px; width:10px; height:10px; background:#22c55e; border-radius:50%; border:2px solid #0f172a;"></span>`
    : ''

  const shortName = (rider.name || 'Rider').split(' ')[0]

  return new L.DivIcon({
    className: 'snapit-osm-rider-marker',
    html: `
      <div style="position:relative; display:flex; flex-direction:column; align-items:center; cursor:pointer; filter:drop-shadow(0 4px 8px rgba(0,0,0,0.5)); transform:${isSelected ? 'scale(1.2)' : 'scale(1)'}; transition:all 0.25s ease;">
        <div style="background:${bgColor}; border: 2.5px solid ${ringColor}; width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 0 14px ${ringColor}80; color:#fff; font-size:18px;">
          🛵
        </div>
        ${pulseHtml}
        <div style="background:rgba(15,23,42,0.92); color:#f8fafc; font-weight:800; font-size:10px; padding:2px 7px; border-radius:6px; margin-top:3px; white-space:nowrap; border:1px solid rgba(255,255,255,0.2); letter-spacing:0.3px;">
          ${shortName}
        </div>
      </div>
    `,
    iconSize: [44, 56],
    iconAnchor: [22, 48],
    popupAnchor: [0, -48]
  })
}

// ── Map Helper: Recenter to Selected Target ──
function MapController({ selectedCoords }) {
  const map = useMap()

  useEffect(() => {
    if (selectedCoords && selectedCoords[0] && selectedCoords[1]) {
      map.flyTo(selectedCoords, 16, { animate: true, duration: 1.2 })
    }
  }, [selectedCoords, map])

  return null
}

const AdminRiderFleet = () => {
  const navigate = useNavigate()
  const [fleet, setFleet] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [selectedRider, setSelectedRider] = useState(null)
  const [filter, setFilter] = useState('ALL') // 'ALL' | 'ON_DUTY' | 'OFF_DUTY' | 'DELIVERING'
  const [viewMode, setViewMode] = useState('SPLIT') // 'SPLIT' | 'MAP' | 'CARDS'
  const socketRef = useRef(null)
  const markerRefs = useRef({})

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

  // Collect active GPS coordinates for OpenStreetMap markers
  const ridersWithGps = fleet.filter(r => r.lastLocation?.latitude && r.lastLocation?.longitude)

  const handleSelectRider = (rider) => {
    setSelectedRider(rider)
    if (rider.lastLocation?.latitude && rider.lastLocation?.longitude) {
      const marker = markerRefs.current[rider.riderId]
      if (marker) {
        marker.openPopup()
      }
    }
  }

  return (
    <div className='min-h-screen bg-slate-950 text-white pb-12 w-full max-w-full overflow-x-hidden'>
      
      {/* ── HEADER ── */}
      <div className='sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-3 sm:px-4 py-3 w-full'>
        <div className='max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2 sm:gap-3'>
          <div className='flex items-center gap-2.5 min-w-0'>
            <button
              onClick={() => navigate(-1)}
              className='w-9 h-9 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition active:scale-95 flex-shrink-0'
            >
              <IoArrowBack size={16} />
            </button>
            <div className='min-w-0'>
              <div className='flex items-center gap-1.5'>
                <h1 className='text-base sm:text-lg font-black tracking-tight text-white truncate'>🛵 LIVE RIDER FLEET</h1>
                <span className='px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] sm:text-[10px] font-black uppercase tracking-wider animate-pulse flex-shrink-0'>
                  ● OpenStreetMap Live
                </span>
              </div>
              <p className='text-[9px] sm:text-[10px] text-slate-500 truncate'>
                {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString('en-IN')}` : 'Connecting OpenStreetMap stream…'}
              </p>
            </div>
          </div>

          <div className='flex items-center gap-1.5 flex-shrink-0'>
            {/* View Mode Toggle */}
            <div className='bg-slate-900 border border-slate-800 rounded-xl p-0.5 flex items-center gap-0.5'>
              <button
                onClick={() => setViewMode('SPLIT')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  viewMode === 'SPLIT' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
                title='Split Map & Cards View'
              >
                <IoMapOutline size={13} />
                <span className='hidden sm:inline'>Split</span>
              </button>
              <button
                onClick={() => setViewMode('MAP')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  viewMode === 'MAP' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
                title='Full OpenStreetMap View'
              >
                <FaExpand size={11} />
                <span className='hidden sm:inline'>Map Only</span>
              </button>
              <button
                onClick={() => setViewMode('CARDS')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  viewMode === 'CARDS' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
                title='Fleet Cards Grid'
              >
                <IoGridOutline size={13} />
                <span className='hidden sm:inline'>Cards</span>
              </button>
            </div>

            <button
              onClick={() => fetchFleet(true)}
              className='p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition active:scale-95'
              title='Refresh Fleet'
            >
              <IoRefresh size={15} />
            </button>
            <button
              onClick={() => navigate('/dashboard/treasury')}
              className='px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs hover:bg-amber-500/20 transition flex items-center gap-1'
            >
              <FaMoneyBillWave size={11} />
              <span className='hidden sm:inline'>Remittances</span>
            </button>
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 w-full max-w-full'>

        {/* ── METRIC STATS ── */}
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 mb-5 w-full max-w-full'>
          <div className='bg-slate-900/90 border border-slate-800/80 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 flex flex-col justify-between'>
            <span className='text-[9px] sm:text-[10px] font-black uppercase text-slate-500 tracking-wider'>Total Fleet</span>
            <div className='flex items-baseline gap-1.5 mt-1.5'>
              <span className='text-2xl sm:text-3xl font-black text-white'>{totalRiders}</span>
              <span className='text-[11px] text-slate-400 font-medium'>riders</span>
            </div>
          </div>

          <div className='bg-emerald-950/40 border border-emerald-800/40 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 flex flex-col justify-between'>
            <div className='flex items-center justify-between'>
              <span className='text-[9px] sm:text-[10px] font-black uppercase text-emerald-400 tracking-wider'>On Duty</span>
              <span className='w-2 h-2 rounded-full bg-emerald-400 animate-ping'></span>
            </div>
            <div className='flex items-baseline gap-1.5 mt-1.5'>
              <span className='text-2xl sm:text-3xl font-black text-emerald-400'>{onDutyCount}</span>
              <span className='text-[11px] text-emerald-200/60 font-medium'>active</span>
            </div>
          </div>

          <div className='bg-blue-950/40 border border-blue-800/40 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 flex flex-col justify-between'>
            <span className='text-[9px] sm:text-[10px] font-black uppercase text-blue-400 tracking-wider'>Delivering</span>
            <div className='flex items-baseline gap-1.5 mt-1.5'>
              <span className='text-2xl sm:text-3xl font-black text-blue-400'>{deliveringCount}</span>
              <span className='text-[11px] text-blue-200/60 font-medium'>orders</span>
            </div>
          </div>

          <div className='bg-amber-950/40 border border-amber-800/40 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 flex flex-col justify-between'>
            <span className='text-[9px] sm:text-[10px] font-black uppercase text-amber-400 tracking-wider'>Cash in Hand</span>
            <div className='flex items-baseline gap-1.5 mt-1.5'>
              <span className='text-xl sm:text-2xl font-black text-amber-400 truncate'>{fmtINR(totalCashInHand)}</span>
            </div>
          </div>
        </div>

        {/* ── OPENSTREETMAP LIVE MAP CONTAINER (Rendered in SPLIT or MAP mode) ── */}
        {viewMode !== 'CARDS' && (
          <div className={`mb-6 rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl relative transition-all ${
            viewMode === 'MAP' ? 'h-[75vh]' : 'h-[360px] sm:h-[440px]'
          }`}>
            <div className='absolute top-3 left-3 z-[400] bg-slate-950/85 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-800/90 text-xs font-black flex items-center gap-2 shadow-lg'>
              <span className='w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse'></span>
              <span className='text-slate-200'>OpenStreetMap Live Tracking</span>
              <span className='text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-400 font-mono'>
                {ridersWithGps.length} GPS Fixes
              </span>
            </div>

            <MapContainer
              center={
                selectedRider?.lastLocation?.latitude && selectedRider?.lastLocation?.longitude
                  ? [selectedRider.lastLocation.latitude, selectedRider.lastLocation.longitude]
                  : (ridersWithGps[0] ? [ridersWithGps[0].lastLocation.latitude, ridersWithGps[0].lastLocation.longitude] : DEFAULT_CENTER)
              }
              zoom={14}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%' }}
              className='z-0'
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
              />

              {/* Hub / Paliganj Store Landmark Marker */}
              <Marker
                position={DEFAULT_CENTER}
                icon={new L.DivIcon({
                  html: `<div style="background:#0f172a; border:2.5px solid #38bdf8; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 0 12px rgba(56,189,248,0.5); font-size:16px;">🏪</div>`,
                  className: '',
                  iconSize: [34, 34],
                  iconAnchor: [17, 17]
                })}
              >
                <Popup className='snapit-custom-popup'>
                  <div className='p-1 text-slate-900'>
                    <p className='font-black text-xs'>🏪 Snapit Express Hub</p>
                    <p className='text-[11px] text-slate-600 font-medium'>Paliganj Central Depot</p>
                  </div>
                </Popup>
              </Marker>

              {/* Live Rider Markers on OpenStreetMap */}
              {ridersWithGps.map(rider => {
                const isSelected = selectedRider?.riderId === rider.riderId
                const pos = [rider.lastLocation.latitude, rider.lastLocation.longitude]

                return (
                  <Marker
                    key={rider.riderId}
                    position={pos}
                    icon={createRiderMapIcon(rider, isSelected)}
                    ref={el => { if (el) markerRefs.current[rider.riderId] = el }}
                    eventHandlers={{
                      click: () => setSelectedRider(rider)
                    }}
                  >
                    <Popup className='snapit-custom-popup'>
                      <div className='p-2 min-w-[210px] text-slate-900'>
                        <div className='flex items-center justify-between gap-2 border-b pb-1.5 mb-1.5'>
                          <div className='font-black text-sm text-slate-950 flex items-center gap-1.5'>
                            <span>🛵</span>
                            <span>{rider.name}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            rider.isDutyOn ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {rider.isDutyOn ? 'ON DUTY' : 'OFF DUTY'}
                          </span>
                        </div>

                        <div className='space-y-1 text-xs'>
                          <p className='text-slate-600 flex justify-between'>
                            <span className='font-bold'>Phone:</span>
                            <a href={`tel:${rider.mobile}`} className='text-blue-600 font-bold hover:underline'>{rider.mobile || 'N/A'}</a>
                          </p>

                          <p className='text-slate-600 flex justify-between'>
                            <span className='font-bold'>Duty Today:</span>
                            <span className='font-bold text-slate-800'>{formatDutyTime(rider.todayDutyMinutes)}</span>
                          </p>

                          <p className='text-slate-600 flex justify-between'>
                            <span className='font-bold'>Cash in Hand:</span>
                            <span className='font-black text-amber-700'>{fmtINR(rider.cashInHand)}</span>
                          </p>

                          {rider.lastLocation?.speed !== null && rider.lastLocation?.speed !== undefined && (
                            <p className='text-slate-600 flex justify-between'>
                              <span className='font-bold'>Speed:</span>
                              <span className='font-black text-emerald-600'>{Math.round(rider.lastLocation.speed * 3.6)} km/h</span>
                            </p>
                          )}

                          <div className='pt-1 border-t mt-1 font-mono text-[10px] text-slate-500 truncate'>
                            GPS: {rider.lastLocation.latitude.toFixed(5)}, {rider.lastLocation.longitude.toFixed(5)}
                          </div>

                          {rider.activeOrder && (
                            <div className='mt-2 p-1.5 bg-blue-50 border border-blue-200 rounded-lg text-[11px]'>
                              <p className='font-black text-blue-900'>🚀 Delivering Order</p>
                              <p className='text-blue-800 truncate'>#{rider.activeOrder.orderId?.slice(-6)} ({fmtINR(rider.activeOrder.totalAmt)})</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )
              })}

              <MapController
                selectedCoords={
                  selectedRider?.lastLocation?.latitude && selectedRider?.lastLocation?.longitude
                    ? [selectedRider.lastLocation.latitude, selectedRider.lastLocation.longitude]
                    : null
                }
              />
            </MapContainer>
          </div>
        )}

        {/* ── FILTER CHIPS ── */}
        <div className='flex items-center justify-between gap-2 mb-4 w-full'>
          <div className='flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-hide'>
            {[
              { id: 'ALL', label: `All (${totalRiders})` },
              { id: 'ON_DUTY', label: `🟢 On Duty (${onDutyCount})` },
              { id: 'DELIVERING', label: `🛵 Delivering (${deliveringCount})` },
              { id: 'OFF_DUTY', label: `🔴 Off Duty (${totalRiders - onDutyCount})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition border whitespace-nowrap ${
                  filter === tab.id
                    ? 'bg-white text-slate-950 border-white shadow-md'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── FLEET CARDS GRID (Rendered in SPLIT or CARDS mode) ── */}
        {viewMode !== 'MAP' && (
          <>
            {loading ? (
              <div className='py-20 text-center flex flex-col items-center justify-center'>
                <div className='w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4'></div>
                <p className='text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse'>
                  Tracking Paliganj Fleet on OpenStreetMap…
                </p>
              </div>
            ) : filteredFleet.length === 0 ? (
              <div className='py-16 text-center bg-slate-900/50 rounded-3xl border border-slate-800 p-8'>
                <p className='text-4xl mb-2'>🛵</p>
                <p className='text-slate-300 font-bold text-sm'>No riders in this view</p>
              </div>
            ) : (
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-full'>
                {filteredFleet.map(rider => {
                  const hasGps = Boolean(rider.lastLocation?.latitude && rider.lastLocation?.longitude)
                  const isSelected = selectedRider?.riderId === rider.riderId

                  return (
                    <div
                      key={rider.riderId}
                      onClick={() => handleSelectRider(rider)}
                      className={`bg-slate-900 border rounded-3xl p-5 transition-all flex flex-col justify-between w-full max-w-full overflow-hidden box-border cursor-pointer ${
                        isSelected
                          ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-xl shadow-amber-950/30'
                          : rider.isDutyOn
                            ? 'border-emerald-500/40 shadow-lg shadow-emerald-950/20 hover:border-emerald-400'
                            : 'border-slate-800 opacity-90 hover:border-slate-700'
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
                          <div className='bg-slate-950/70 border border-slate-800/80 rounded-2xl p-2.5 mb-3 flex items-center justify-between gap-2 text-xs'>
                            <div className='min-w-0'>
                              <p className='text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1'>
                                <FaMapMarkerAlt size={10} className='text-rose-400' /> OpenStreetMap GPS
                              </p>
                              <p className='font-mono font-bold text-slate-200 mt-0.5 truncate text-[11px] select-all'>
                                Lat: {rider.lastLocation.latitude.toFixed(5)}, Lng: {rider.lastLocation.longitude.toFixed(5)}
                              </p>
                            </div>
                            {rider.lastLocation.speed !== null && rider.lastLocation.speed > 0 ? (
                              <div className='text-right flex-shrink-0'>
                                <p className='text-[9px] font-bold text-slate-500 uppercase'>Speed</p>
                                <p className='font-black text-emerald-400 text-xs'>
                                  {Math.round(rider.lastLocation.speed * 3.6)} km/h
                                </p>
                              </div>
                            ) : (
                              <span className='text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex-shrink-0'>
                                ● Live Pin
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Bottom Action Buttons */}
                      <div className='flex gap-2 pt-3 border-t border-slate-800/80 mt-2' onClick={(e) => e.stopPropagation()}>
                        {rider.mobile && (
                          <a
                            href={`tel:${rider.mobile}`}
                            className='flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition'
                          >
                            <FaPhone size={11} className='text-emerald-400' />
                            <span>Call</span>
                          </a>
                        )}

                        {hasGps ? (
                          <button
                            onClick={() => {
                              handleSelectRider(rider)
                              if (viewMode === 'CARDS') setViewMode('SPLIT')
                              window.scrollTo({ top: 120, behavior: 'smooth' })
                            }}
                            className='flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-600/20'
                          >
                            <FaMapMarkerAlt size={12} />
                            <span>View on Map</span>
                          </button>
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
          </>
        )}
      </div>
    </div>
  )
}

export default AdminRiderFleet

