import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { socket } from '../utils/socket'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import { FaMotorcycle, FaStore, FaHome, FaPhone } from 'react-icons/fa'
import { IoArrowBack } from 'react-icons/io5'

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom rider icon
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

const homeIcon = new L.DivIcon({
  html: `<div style="background:#dc2626;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:16px;">🏠</div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

const STATUS_STEPS = [
  { key: 'Pending', label: 'Order Placed', icon: '📋' },
  { key: 'Confirmed', label: 'Confirmed', icon: '✅' },
  { key: 'Packing', label: 'Packing', icon: '📦' },
  { key: 'Out for Delivery', label: 'On the Way', icon: '🏍️' },
  { key: 'Delivered', label: 'Delivered', icon: '🎉' },
]

const TrackingPage = () => {
  const { orderId } = useParams()
  const navigate = useNavigate()

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [riderPos, setRiderPos] = useState(null)

  // Default store location (Paliganj)
  const storeLocation = [25.2921, 84.8170]

  // Fetch order details
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

  // Socket for live tracking
  useEffect(() => {
    if (!orderId) return
    socket.emit('join_order', orderId)

    const handleRiderMovement = (data) => {
      if (data.latitude && data.longitude) {
        setRiderPos([data.latitude, data.longitude])
      }
    }

    socket.on('rider_moved', handleRiderMovement)
    socket.on('connect', () => socket.emit('join_order', orderId))

    return () => {
      socket.off('rider_moved', handleRiderMovement)
      socket.off('connect')
    }
  }, [orderId])

  useEffect(() => {
    fetchOrder()
    const interval = setInterval(fetchOrder, 15000)
    return () => clearInterval(interval)
  }, [orderId])

  const getCurrentStepIndex = () => {
    if (!order) return 0
    const idx = STATUS_STEPS.findIndex(s => s.key === order.delivery_status)
    return idx === -1 ? 0 : idx
  }

  const getETA = () => {
    const status = order?.delivery_status
    if (status === 'Delivered') return 'Delivered!'
    if (status === 'Out for Delivery') return '~5 mins away'
    if (status === 'Packing') return '~10 mins'
    return '~15 mins'
  }

  const mapCenter = riderPos || storeLocation
  const currentStep = getCurrentStepIndex()

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
            <p className='text-xl font-black'>{getETA()}</p>
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

      {/* Map */}
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

          {/* Store marker */}
          <Marker position={storeLocation} icon={storeIcon}>
            <Popup>🏪 Snapit Store — Paliganj</Popup>
          </Marker>

          {/* Rider marker (live) */}
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

          {/* No live position — show store only with pulse */}
          {!riderPos && order.delivery_status === 'Out for Delivery' && (
            <Marker position={storeLocation} icon={riderIcon}>
              <Popup>🏍️ Rider is on the way</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Status Steps */}
      <div className='bg-white mx-4 mt-4 rounded-2xl p-4 shadow-sm border border-slate-100'>
        <h3 className='font-black text-slate-800 text-sm uppercase tracking-wider mb-4'>Order Progress</h3>
        <div className='flex items-center justify-between relative'>
          {/* Progress line */}
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
            href={`tel:${order.rider_contact || '9472026580'}`}
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
      </div>

    </div>
  )
}

export default TrackingPage