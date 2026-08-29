import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import Axios from '../utils/Axios'
import { IoCall, IoLocationSharp, IoTimeOutline, IoCheckmarkCircle, IoBagHandleOutline, IoStorefrontOutline, IoNavigateCircle } from 'react-icons/io5'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'

// Marker Icons
const destinationIcon = new L.DivIcon({
  html: `<div style="background:#16a34a;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.3);font-size:18px;">📍</div>`,
  className: '',
  iconSize: [34, 34],
  iconAnchor: [17, 34],
})

const storeIcon = new L.DivIcon({
  html: `<div style="background:#ea580c;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.3);font-size:18px;">🏪</div>`,
  className: '',
  iconSize: [34, 34],
  iconAnchor: [17, 34],
})

const riderIcon = new L.DivIcon({
  html: `<div style="background:#2563eb;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 4px 14px rgba(37,99,235,0.6);font-size:20px;animation:pulse 1.5s infinite;">🛵</div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
})

const PublicTrackingPage = () => {
  const { token } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const timerRef = useRef(null)

  const fetchTracking = async (showSpinner = false) => {
    if (showSpinner) setLoading(true)
    try {
      const response = await Axios.get(`/api/public-tracking/${token}`)
      if (response.data?.success) {
        setOrder(response.data.data)
        setError(null)
      } else {
        setError(response.data?.message || 'Tracking details not found')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to connect to Snapit Live Tracking')
    } finally {
      if (showSpinner) setLoading(false)
    }
  }

  useEffect(() => {
    fetchTracking(true)

    // Auto-refresh every 8 seconds
    timerRef.current = setInterval(() => {
      fetchTracking(false)
    }, 8000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [token])

  if (loading) {
    return (
      <div className='min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4'>
        <div className='w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4' />
        <h2 className='text-lg font-black tracking-wide'>Connecting to Snapit Live GPS...</h2>
        <p className='text-xs text-slate-400 mt-1'>Loading real-time delivery status</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className='min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center'>
        <div className='w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center text-3xl mb-4'>
          📦
        </div>
        <h2 className='text-xl font-black text-white'>Order Tracking Not Found</h2>
        <p className='text-sm text-slate-400 max-w-sm mt-2 leading-relaxed'>
          {error || 'This live delivery link may have expired or is invalid.'}
        </p>
        <Link
          to='/'
          className='mt-6 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 font-black text-white text-xs uppercase tracking-wider rounded-2xl transition-all'
        >
          Open Snapit App
        </Link>
      </div>
    )
  }

  const steps = [
    { label: 'Order Confirmed', done: ['Confirmed', 'Processing', 'Out for Delivery', 'Delivered'].includes(order.delivery_status) },
    { label: 'Packing Items',   done: ['Processing', 'Out for Delivery', 'Delivered'].includes(order.delivery_status) },
    { label: 'Out for Delivery', done: ['Out for Delivery', 'Delivered'].includes(order.delivery_status) },
    { label: 'Delivered',       done: order.delivery_status === 'Delivered' },
  ]

  const destCoords = [order.delivery_address?.lat || 25.2921, order.delivery_address?.lng || 84.8170]
  const storeCoords = [order.store_details?.lat || 25.3312, order.store_details?.lng || 84.8006]
  const riderCoords = order.rider?.liveCoords?.lat && order.rider?.liveCoords?.lng
    ? [order.rider.liveCoords.lat, order.rider.liveCoords.lng]
    : null

  const centerCoords = riderCoords || destCoords

  return (
    <div className='min-h-screen bg-slate-950 text-slate-100 pb-12 font-sans'>
      
      {/* Top Header */}
      <header className='bg-slate-900 border-b border-slate-800/80 px-4 py-3 sticky top-0 z-40 backdrop-blur-md bg-slate-900/90 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <div className='w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center font-black text-white text-base shadow-md shadow-emerald-600/30'>
            ⚡
          </div>
          <div>
            <h1 className='text-sm font-black text-white leading-tight'>Snapit Live Tracking</h1>
            <p className='text-[10px] text-emerald-400 font-bold'>Real-time GPS • Auto-refresh</p>
          </div>
        </div>
        <div className='flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full text-emerald-400 text-[10px] font-black'>
          <span className='w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping' />
          <span>LIVE</span>
        </div>
      </header>

      <div className='max-w-xl mx-auto p-4 space-y-4'>

        {/* Recipient Greeting Banner */}
        <div className='bg-gradient-to-br from-emerald-950/80 to-slate-900 border border-emerald-500/30 rounded-3xl p-5 shadow-xl relative overflow-hidden'>
          <div className='relative z-10 space-y-2'>
            <div className='flex items-center gap-2'>
              <span className='text-xl'>🎁</span>
              <span className='text-xs font-black uppercase tracking-wider text-emerald-400'>
                {order.order_for === 'SOMEONE_ELSE' ? 'Gift / Friend Delivery' : 'Your Order'}
              </span>
            </div>

            <h2 className='text-xl font-black text-white'>
              {order.recipient_name ? `Hi ${order.recipient_name}!` : 'Hello!'}
            </h2>

            <p className='text-xs text-slate-300 leading-relaxed'>
              {order.delivery_status === 'Delivered'
                ? 'Your Snapit package has been successfully delivered! 🎉'
                : order.delivery_status === 'Out for Delivery'
                ? 'Your order is on the delivery partner\'s bike and arriving shortly! 🛵'
                : 'Your order is being carefully packed at our store.'}
            </p>

            <div className='pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80'>
              <span>Order #{order.orderId?.slice(-8).toUpperCase()}</span>
              <span className='font-bold text-white'>{DisplayPriceInRupees(order.totalAmt)}</span>
            </div>
          </div>
        </div>

        {/* Live Stepper */}
        <div className='bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4'>
          <p className='text-[11px] font-black text-slate-400 uppercase tracking-wider'>Delivery Status</p>
          <div className='grid grid-cols-4 gap-2 text-center relative'>
            {steps.map((step, idx) => (
              <div key={step.label} className='flex flex-col items-center gap-1.5'>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                  step.done
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                }`}>
                  {step.done ? '✓' : idx + 1}
                </div>
                <p className={`text-[10px] font-bold leading-tight ${
                  step.done ? 'text-emerald-400' : 'text-slate-500'
                }`}>
                  {step.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Live Map */}
        <div className='bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl'>
          <div className='px-4 py-3 border-b border-slate-800 flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <IoLocationSharp className='text-emerald-400' size={18} />
              <span className='text-xs font-black text-white'>Live Delivery Route</span>
            </div>
            {riderCoords && (
              <span className='text-[10px] bg-blue-500/20 text-blue-300 font-bold px-2 py-0.5 rounded-full border border-blue-500/30'>
                Rider Active
              </span>
            )}
          </div>

          <div className='h-64 w-full relative'>
            <MapContainer
              center={centerCoords}
              zoom={13}
              scrollWheelZoom={false}
              className='w-full h-full'
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
              />

              {/* Store Marker */}
              <Marker position={storeCoords} icon={storeIcon}>
                <Popup>
                  <div className='text-xs font-bold text-slate-900'>
                    🏪 {order.store_details?.name}
                  </div>
                </Popup>
              </Marker>

              {/* Destination Marker */}
              <Marker position={destCoords} icon={destinationIcon}>
                <Popup>
                  <div className='text-xs font-bold text-slate-900'>
                    📍 {order.recipient_name || 'Delivery Destination'}
                  </div>
                </Popup>
              </Marker>

              {/* Live Rider Marker */}
              {riderCoords && (
                <Marker position={riderCoords} icon={riderIcon}>
                  <Popup>
                    <div className='text-xs font-bold text-slate-900'>
                      🛵 Rider: {order.rider?.name || 'Snapit Rider'}
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Route connecting line */}
              {riderCoords && (
                <Polyline
                  positions={[riderCoords, destCoords]}
                  color="#2563eb"
                  weight={4}
                  dashArray="6, 8"
                />
              )}
            </MapContainer>
          </div>
        </div>

        {/* Rider Contact Card (if assigned) */}
        {order.rider?.name && (
          <div className='bg-slate-900 border border-slate-800 rounded-3xl p-4 flex items-center justify-between gap-3 shadow-lg'>
            <div className='flex items-center gap-3'>
              <div className='w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center text-2xl font-bold'>
                🛵
              </div>
              <div>
                <p className='text-[10px] font-black text-slate-400 uppercase tracking-wider'>Delivery Partner</p>
                <h3 className='text-sm font-black text-white'>{order.rider.name}</h3>
                <p className='text-xs text-slate-400'>Snapit Express Rider</p>
              </div>
            </div>

            {order.rider.contact && (
              <a
                href={`tel:${order.rider.contact}`}
                className='px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all'
              >
                <IoCall size={14} />
                <span>Call Rider</span>
              </a>
            )}
          </div>
        )}

        {/* Destination & Items Box */}
        <div className='bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4'>
          <div>
            <p className='text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1'>Delivery Address</p>
            <p className='text-sm font-bold text-white'>{order.delivery_address?.address_line}</p>
            <p className='text-xs text-slate-400'>{order.delivery_address?.city}</p>
            {order.delivery_instructions && (
              <p className='text-xs text-amber-400/90 italic mt-1.5 font-medium'>
                📝 Note: {order.delivery_instructions}
              </p>
            )}
          </div>

          <div className='border-t border-slate-800 pt-3 space-y-2'>
            <p className='text-[10px] font-black text-slate-400 uppercase tracking-wider'>Package Items</p>
            <div className='divide-y divide-slate-800/60'>
              {order.items?.map((item, idx) => (
                <div key={idx} className='py-2 flex items-center justify-between gap-3 text-xs'>
                  <div className='flex items-center gap-2.5 min-w-0'>
                    {item.image && (
                      <img src={item.image} alt={item.name} className='w-8 h-8 rounded-lg object-contain bg-slate-800 p-0.5' />
                    )}
                    <span className='font-bold text-slate-200 truncate'>{item.name}</span>
                  </div>
                  <span className='font-black text-slate-400 flex-shrink-0'>x{item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default PublicTrackingPage
