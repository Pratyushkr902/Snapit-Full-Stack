import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { io } from 'socket.io-client'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import { FaPhone } from 'react-icons/fa'
import { IoArrowBack } from 'react-icons/io5'
import toast from 'react-hot-toast'

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom icons
const riderIcon = new L.DivIcon({
  html: `<div style="background:#16a34a;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:18px;">🏍️</div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
})

const storeIcon = new L.DivIcon({
  html: `<div style="background:#2563eb;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:16px;">🏪</div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

const customerIcon = new L.DivIcon({
  html: `<div style="background:#dc2626;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);font-size:16px;">🏠</div>`,
  className: '',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
})

const STATUS_STEPS = [
  { key: 'Pending',          label: 'Order Placed', icon: '📋' },
  { key: 'Confirmed',        label: 'Confirmed',    icon: '✅' },
  { key: 'Packing',          label: 'Packing',      icon: '📦' },
  { key: 'Out for Delivery', label: 'On the Way',   icon: '🏍️' },
  { key: 'Delivered',        label: 'Delivered',    icon: '🎉' },
]

const SHOP_LAT = 25.2921
const SHOP_LNG = 84.8170

function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function getEstimatedMinutes(lat1, lng1, lat2, lng2) {
  const distance = getDistanceKm(lat1, lng1, lat2, lng2)
  return Math.round(distance * 3 + 5)
}

function ChangeMapCenter({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.panTo(center)
  }, [center, map])
  return null
}

const TrackingPage = () => {
  const { orderId } = useParams()
  const navigate = useNavigate()

  const [order, setOrder]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [riderPos, setRiderPos] = useState(null)
  const [eta, setEta]           = useState(null)
  const [etaSource, setEtaSource] = useState('')
  const socketRef = useRef(null)

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason]       = useState('Changed my mind')
  const [cancelling, setCancelling]           = useState(false)

  // ── Fetch order ──────────────────────────────────────────────
  const fetchOrder = async () => {
    try {
      const response = await Axios({ ...SummaryApi.getOrderItems })
      if (response.data.success) {
        const found = response.data.data.find(
          o => o.orderId === orderId || o._id === orderId
        )
        setOrder(found || null)
      }
    } catch (error) {
      console.error('Order fetch error', error)
    } finally {
      setLoading(false)
    }
  }

  // ── Cancel Order Handler (Zomato style) ──────────────────────
  const handleCancelOrder = async () => {
    try {
      setCancelling(true)
      const res = await Axios({
        ...SummaryApi.cancelOrder,
        data: {
          orderId: order?.orderId || order?._id,
          reason: cancelReason
        }
      })
      if (res.data.success) {
        toast.success(res.data.message || 'Order cancelled successfully')
        setShowCancelModal(false)
        setOrder(prev => prev ? ({ ...prev, delivery_status: 'Cancelled', cancellation_reason: cancelReason }) : null)
      } else {
        toast.error(res.data.message || 'Failed to cancel order')
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error cancelling order')
    } finally {
      setCancelling(false)
    }
  }

  // ── Initial ETA once order loads ─────────────────────────────
  useEffect(() => {
    if (!order) return
    if (order.delivery_status === 'Delivered') { setEta(null); return }
    if (order?.deliveryLocation?.lat && order?.deliveryLocation?.lng) {
      const mins = getEstimatedMinutes(
        SHOP_LAT, SHOP_LNG,
        order.deliveryLocation.lat,
        order.deliveryLocation.lng
      )
      setEta(mins)
      setEtaSource('store')
    }
  }, [order])

  // ── Socket: live rider position ──────────────────────────────
  useEffect(() => {
    if (!orderId) return

    // ✅ Create socket INSIDE useEffect — same pattern as RiderGPS.jsx
    const socket = io(
      import.meta.env.VITE_API_URL || 'https://snapit-full-stack-production.up.railway.app',
      {
        path: '/socket.io/',
        transports: ['websocket', 'polling'],
        withCredentials: true,
      }
    )
    socketRef.current = socket

    // Join the order room immediately on connect
    socket.emit('join_order', orderId)
    socket.on('connect', () => {
      socket.emit('join_order', orderId)
    })

    // ✅ FIX: was 'receive_location' — server emits 'rider_moved'
    socket.on('rider_moved', (data) => {
      if (!data?.latitude || !data?.longitude) return
      setRiderPos([data.latitude, data.longitude])

      // Recalculate ETA from rider's live position
      setOrder(prev => {
        if (prev?.deliveryLocation?.lat && prev?.deliveryLocation?.lng) {
          const mins = getEstimatedMinutes(
            data.latitude, data.longitude,
            prev.deliveryLocation.lat,
            prev.deliveryLocation.lng
          )
          setEta(mins)
          setEtaSource('rider')
        }
        return prev
      })
    })

    return () => {
      socket.emit('leave_order', orderId)
      socket.disconnect()
    }
  }, [orderId])

  // ── Poll order status every 15s ───────────────────────────────
  useEffect(() => {
    fetchOrder()
    const interval = setInterval(fetchOrder, 15000)
    return () => clearInterval(interval)
  }, [orderId])

  // ── Helpers ───────────────────────────────────────────────────
  const getCurrentStepIndex = () => {
    if (!order) return 0
    const idx = STATUS_STEPS.findIndex(s => s.key === order.delivery_status)
    return idx === -1 ? 0 : idx
  }

  const formatEta = () => {
    if (!eta) return null
    if (eta <= 1) return 'Less than a minute'
    return `~${eta} min${eta > 1 ? 's' : ''}`
  }

  const mapCenter = riderPos || storeLocation
  const currentStep = getCurrentStepIndex()

  // ── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className='min-h-screen bg-slate-50 flex items-center justify-center'>
        <div className='flex flex-col items-center gap-3'>
          <div className='w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin'></div>
          <p className='text-slate-500 font-medium'>Loading your order...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className='min-h-screen bg-slate-50 flex items-center justify-center'>
        <div className='text-center'>
          <p className='text-5xl mb-4'>📦</p>
          <p className='text-slate-700 font-bold text-lg'>Order not found</p>
          <button onClick={() => navigate('/dashboard/myorders')} className='mt-4 bg-green-600 text-white px-6 py-2 rounded-xl font-bold'>
            Back to Orders
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-slate-50'>

      {/* Header */}
      <div className='bg-white sticky top-0 z-50 shadow-sm px-4 py-3 flex items-center gap-3'>
        <button onClick={() => navigate(-1)} className='p-2 rounded-full hover:bg-slate-100 transition-all'>
          <IoArrowBack size={20} />
        </button>
        <div>
          <h1 className='font-black text-slate-900 text-base'>Live Tracking</h1>
          <p className='text-[11px] text-slate-400 font-mono'>#{order.orderId?.slice(-8)}</p>
        </div>
        <div className='ml-auto flex items-center gap-2'>
          <span className='text-[11px] font-black uppercase px-3 py-1 rounded-full animate-pulse'
            style={{
              background: order.delivery_status === 'Delivered' ? '#dcfce7' : '#fef9c3',
              color: order.delivery_status === 'Delivered' ? '#15803d' : '#854d0e'
            }}
          >
            {order.delivery_status || 'Processing'}
          </span>
        </div>
      </div>

      {/* ETA Banner */}
      {order.delivery_status !== 'Delivered' && (
        <div className='bg-green-600 text-white px-4 py-3 flex items-center justify-between'>
          <div>
            <p className='text-[11px] font-bold opacity-80 uppercase tracking-wider'>Estimated Arrival</p>
            {formatEta() ? (
              <>
                <p className='text-xl font-black'>{formatEta()}</p>
                <p className='text-[10px] opacity-70 mt-0.5'>
                  {etaSource === 'rider' ? "Based on rider's live location" : 'Estimated from store'}
                </p>
              </>
            ) : (
              <p className='text-xl font-black'>Calculating...</p>
            )}
          </div>
          <div className='text-4xl animate-bounce'>🏍️</div>
        </div>
      )}

      {order.delivery_status === 'Delivered' && (
        <div className='bg-emerald-600 text-white px-4 py-3 flex items-center justify-between'>
          <div>
            <p className='text-[11px] font-bold opacity-80 uppercase tracking-wider'>Status</p>
            <p className='text-xl font-black'>Order Delivered! 🎉</p>
          </div>
          <div className='text-4xl'>✅</div>
        </div>
      )}

      {/* Cancelled Banner */}
      {order.delivery_status === 'Cancelled' && (
        <div className='bg-rose-600 text-white px-4 py-3 flex items-center justify-between'>
          <div>
            <p className='text-[11px] font-bold opacity-80 uppercase tracking-wider'>Status</p>
            <p className='text-xl font-black'>Order Cancelled ❌</p>
            {order.cancellation_reason && (
              <p className='text-xs opacity-90 mt-0.5'>{order.cancellation_reason}</p>
            )}
          </div>
          <div className='text-3xl'>🚫</div>
        </div>
      )}

      {/* Map */}
      {(() => {
        const customerLocation =
          order.delivery_lat && order.delivery_lng
            ? [Number(order.delivery_lat), Number(order.delivery_lng)]
            : order.deliveryLocation?.lat && order.deliveryLocation?.lng
            ? [Number(order.deliveryLocation.lat), Number(order.deliveryLocation.lng)]
            : order.delivery_address?.lat && order.delivery_address?.lng
            ? [Number(order.delivery_address.lat), Number(order.delivery_address.lng)]
            : null

        return (
          <div className='h-64 lg:h-96 w-full z-0'>
            <MapContainer
              center={mapCenter}
              zoom={14}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
              />
              <Marker position={storeLocation} icon={storeIcon}>
                <Popup>🏪 {order.store_details?.name || 'Snapit Store'}</Popup>
              </Marker>
              {riderPos && (
                <>
                  <Marker position={riderPos} icon={riderIcon}>
                    <Popup>🏍️ {order.rider_name || 'Your Rider'} — On the way!</Popup>
                  </Marker>
                  <Polyline
                    positions={[storeLocation, riderPos]}
                    color='#16a34a'
                    weight={3}
                    dashArray='8 6'
                  />
                </>
              )}
              {!riderPos && order.delivery_status === 'Out for Delivery' && (
                <Marker position={storeLocation} icon={riderIcon}>
                  <Popup>🏍️ Rider is on the way</Popup>
                </Marker>
              )}
              {customerLocation && (
                <>
                  <Marker position={customerLocation} icon={customerIcon}>
                    <Popup>
                      <div className='text-xs'>
                        <p className='font-black text-slate-800'>🎯 Your Exact Delivery Pin</p>
                        <p className='text-slate-600 mt-0.5'>{order.delivery_address?.address_line || ''}</p>
                        {(order.delivery_address?.floor_door || order.delivery_address?.landmark) && (
                          <p className='text-slate-500'>{[order.delivery_address?.floor_door, order.delivery_address?.landmark].filter(Boolean).join(' • ')}</p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                  <Polyline
                    positions={riderPos ? [riderPos, customerLocation] : [storeLocation, customerLocation]}
                    color='#2563eb'
                    weight={3}
                    dashArray='6 6'
                  />
                </>
              )}
              <ChangeMapCenter center={mapCenter} />
            </MapContainer>
          </div>
        )
      })()}

      {/* Status Steps */}
      <div className='bg-white mx-4 mt-4 rounded-2xl p-4 shadow-sm border border-slate-100'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='font-black text-slate-800 text-sm uppercase tracking-wider'>Order Progress</h3>
          {order.delivery_distance_km > 0 && (
            <span className='bg-emerald-50 text-emerald-700 text-xs font-black px-2.5 py-1 rounded-full border border-emerald-200'>
              📍 {order.delivery_distance_km} km
            </span>
          )}
        </div>
        <div className='flex items-center justify-between relative'>
          <div className='absolute top-4 left-4 right-4 h-0.5 bg-slate-100 z-0'></div>
          <div
            className='absolute top-4 left-4 h-0.5 bg-green-500 z-0 transition-all duration-700'
            style={{ width: `${(currentStep / (STATUS_STEPS.length - 1)) * 90}%` }}
          ></div>
          {STATUS_STEPS.map((step, i) => (
            <div key={step.key} className='flex flex-col items-center gap-1 z-10 flex-1'>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all ${
                i <= currentStep
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'bg-white border-slate-200 text-slate-300'
              }`}>
                {i <= currentStep ? step.icon : '○'}
              </div>
              <p className={`text-[9px] font-bold text-center leading-tight ${
                i <= currentStep ? 'text-green-700' : 'text-slate-300'
              }`}>
                {step.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Rider Info */}
      <div className='bg-white mx-4 mt-3 rounded-2xl p-4 shadow-sm border border-slate-100'>
        <h3 className='font-black text-slate-800 text-sm uppercase tracking-wider mb-3'>Your Rider</h3>
        <div className='flex items-center gap-3'>
          <div className='w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl'>
            🏍️
          </div>
          <div className='flex-1'>
            <p className='font-black text-slate-800'>{order.rider_name || 'Snapit Rider'}</p>
            <p className='text-xs text-slate-400'>Delivery Partner</p>
          </div>
          <a
            href={`tel:${order.rider_contact || '9576467701'}`}
            className='bg-green-600 text-white p-3 rounded-full shadow-md active:scale-95 transition-all'
          >
            <FaPhone size={16} />
          </a>
        </div>
      </div>

      {/* Order Summary */}
      <div className='bg-white mx-4 mt-3 rounded-2xl p-4 shadow-sm border border-slate-100 mb-6'>
        <h3 className='font-black text-slate-800 text-sm uppercase tracking-wider mb-3'>Order Summary</h3>
        <div className='flex gap-3 items-center'>
          <img
            src={order.product_details?.image?.[0]}
            className='w-16 h-16 object-contain bg-slate-50 rounded-xl border border-slate-100'
            alt={order.product_details?.name}
          />
          <div className='flex-1'>
            <p className='font-bold text-slate-800 text-sm line-clamp-2'>{order.product_details?.name}</p>
            <p className='text-green-700 font-black mt-1'>{DisplayPriceInRupees(order.totalAmt)}</p>
          </div>
        </div>
        <div className='mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs'>
          <div>
            <p className='text-slate-400 font-bold uppercase tracking-wider text-[9px]'>Payment</p>
            <p className='font-bold text-slate-700 mt-0.5'>{order.payment_status || 'COD'}</p>
          </div>
          <div>
            <p className='text-slate-400 font-bold uppercase tracking-wider text-[9px]'>Ordered</p>
            <p className='font-bold text-slate-700 mt-0.5'>{new Date(order.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Zomato-Style Cancel Order Action (Visible ONLY when Pending & Unaccepted by Vendor) */}
        {order.delivery_status === 'Pending' && (!order.seller_status || order.seller_status === 'Pending') && (
          <div className='mt-4 pt-3 border-t border-slate-100'>
            <button
              onClick={() => setShowCancelModal(true)}
              className='w-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm'
            >
              ❌ Cancel Order
            </button>
            <p className='text-[10px] text-center text-slate-400 mt-1.5'>
              You can cancel this order before the vendor accepts and starts preparing it.
            </p>
          </div>
        )}
      </div>

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50'>
          <div className='bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200'>
            <div className='text-center'>
              <div className='w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-3'>
                ❌
              </div>
              <h3 className='font-black text-slate-800 text-lg'>Cancel Order?</h3>
              <p className='text-xs text-slate-500 mt-1'>
                Are you sure you want to cancel order #{order.orderId}?
                {order.payment_status === 'PAID' && ' Any payment made will be refunded to your wallet immediately.'}
              </p>
            </div>

            <div className='mt-4'>
              <label className='text-xs font-bold text-slate-700 block mb-1.5'>Reason for cancellation:</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className='w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:border-rose-500 focus:outline-none bg-slate-50'
              >
                <option value='Changed my mind'>Changed my mind</option>
                <option value='Ordered by mistake'>Ordered by mistake</option>
                <option value='Want to change items/address'>Want to change items/address</option>
                <option value='Delivery time is too long'>Delivery time is too long</option>
                <option value='Other'>Other</option>
              </select>
            </div>

            <div className='flex gap-2 mt-5'>
              <button
                disabled={cancelling}
                onClick={() => setShowCancelModal(false)}
                className='flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 active:scale-95 transition-all'
              >
                Keep Order
              </button>
              <button
                disabled={cancelling}
                onClick={handleCancelOrder}
                className='flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs active:scale-95 transition-all shadow-md shadow-rose-200 flex items-center justify-center gap-1.5'
              >
                {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default TrackingPage