import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useForm } from "react-hook-form"
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import AxiosToastError from '../utils/AxiosToastError'
import {
  IoClose,
  IoLocationSharp,
  IoGiftOutline,
  IoPersonOutline,
  IoHomeOutline,
  IoBriefcaseOutline,
  IoLocationOutline,
  IoNavigateCircle,
  IoCheckmarkCircle,
  IoAlertCircle
} from "react-icons/io5"
import { useGlobalContext } from '../provider/GlobalProvider'
import { isInDeliveryZone, getUserLocation, SERVICEABLE_VILLAGES } from '../utils/serviceArea'
import { reverseGeocode } from '../utils/reverseGeocode'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix default Leaflet marker assets
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Zepto-style modern pin icon with delivery badge
const zeptoPinIcon = new L.DivIcon({
  html: `
    <div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);pointer-events:none;">
      <div style="background:#0f172a;color:#ffffff;font-size:10px;font-weight:900;padding:2px 8px;border-radius:20px;box-shadow:0 4px 12px rgba(0,0,0,0.3);white-space:nowrap;margin-bottom:2px;border:1px solid rgba(255,255,255,0.25);display:flex;align-items:center;gap:4px;">
        <span style="color:#22c55e;">●</span> Deliver Here
      </div>
      <div style="width:34px;height:34px;border-radius:50%;background:#16a34a;border:3px solid #ffffff;box-shadow:0 6px 16px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:18px;">
        📍
      </div>
      <div style="width:8px;height:8px;background:#16a34a;transform:rotate(45deg);margin-top:-4px;"></div>
    </div>
  `,
  className: '',
  iconSize: [34, 52],
  iconAnchor: [17, 52],
})

const VILLAGE_COORDS = {
  'Paliganj': { lat: 25.2921, lng: 84.8170 },
  'Sarsi': { lat: 25.3050, lng: 84.8320 },
  'Kurkuri': { lat: 25.2780, lng: 84.8050 },
  'Acchua': { lat: 25.3120, lng: 84.7980 },
  'Chandos': { lat: 25.2650, lng: 84.8400 },
  'Chiksi': { lat: 25.2850, lng: 84.7850 },
  'Milki': { lat: 25.3200, lng: 84.8100 },
  'Akhtiyarpur': { lat: 25.2750, lng: 84.8280 },
  'Balipakar': { lat: 25.3010, lng: 84.7920 },
  'Purani Bazar': { lat: 25.3273, lng: 84.8008 },
  'Indira Nagar': { lat: 25.3334, lng: 84.8003 },
  'Dharhara': { lat: 25.3375, lng: 84.8117 },
  'Rakasiya': { lat: 25.3571, lng: 84.8305 },
  'Himalaya Medical College': { lat: 25.2639, lng: 84.8545 },
  'Ular More': { lat: 25.3619, lng: 84.8397 },
  'Rampur Nagawa': { lat: 25.2984, lng: 84.7537 },
  'Nirakhpur Pali': { lat: 25.3096, lng: 84.7634 },
  'Dariyapur': { lat: 25.3328, lng: 84.7922 },
  'Fatehpur': { lat: 25.3448, lng: 84.7854 },
}

const QUICK_INSTRUCTIONS = [
  { icon: '🚪', text: 'Leave at door' },
  { icon: '🔕', text: "Don't ring bell" },
  { icon: '📞', text: 'Call upon reaching' },
  { icon: '🤝', text: 'Contactless delivery' },
  { icon: '👵', text: 'Senior citizen delivery' },
]

function MapFlyController({ center, zoom = 16 }) {
  const map = useMap()
  useEffect(() => {
    if (center && center.lat && center.lng) {
      map.flyTo([center.lat, center.lng], zoom, { animate: true, duration: 1.2 })
    }
  }, [center, map, zoom])
  return null
}

function ZeptoInteractiveMarker({ position, onPositionChange }) {
  const markerRef = useRef(null)

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current
        if (marker != null) {
          const newPos = marker.getLatLng()
          onPositionChange({ lat: newPos.lat, lng: newPos.lng })
        }
      },
    }),
    [onPositionChange]
  )

  useMapEvents({
    click(e) {
      onPositionChange({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })

  return position ? (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={[position.lat, position.lng]}
      ref={markerRef}
      icon={zeptoPinIcon}
    />
  ) : null
}

const EditAddressDetails = ({ close, data }) => {
  const isInitiallySomeoneElse = Boolean(data?.recipient_name || data?.address_type === 'FRIENDS_FAMILY')
  const [orderFor, setOrderFor] = useState(isInitiallySomeoneElse ? 'SOMEONE_ELSE' : 'SELF')
  const [addressType, setAddressType] = useState(data?.address_type || (isInitiallySomeoneElse ? 'FRIENDS_FAMILY' : 'HOME'))
  const [locationChecking, setLocationChecking] = useState(false)
  const [isGeocoding, setIsGeocoding] = useState(false)

  const initialLat = Number(data?.lat) || 25.2921
  const initialLng = Number(data?.lng) || 84.8170
  const [coords, setCoords] = useState({ lat: initialLat, lng: initialLng })
  const [zoneStatus, setZoneStatus] = useState(() => isInDeliveryZone(initialLat, initialLng))
  const [resolvedAddressSummary, setResolvedAddressSummary] = useState(data?.address_line || 'Paliganj, Bihar')

  const initialInstructions = (data?.delivery_instructions || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  const [activeInstructions, setActiveInstructions] = useState(initialInstructions)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      _id: data?._id,
      addressline: data?.address_line || '',
      city: data?.city || 'Paliganj',
      state: data?.state || 'Bihar',
      country: data?.country || 'India',
      pincode: data?.pincode || '801110',
      mobile: data?.mobile || '',
      recipient_name: data?.recipient_name || '',
      recipient_mobile: data?.recipient_mobile || '',
      landmark: data?.landmark || '',
      floor_door: data?.floor_door || '',
      delivery_instructions: data?.delivery_instructions || '',
    }
  })

  const { fetchAddress } = useGlobalContext() || {}

  const handleLocationUpdate = useCallback(async (newCoords, skipReverse = false) => {
    setCoords(newCoords)
    const z = isInDeliveryZone(newCoords.lat, newCoords.lng)
    setZoneStatus(z)

    if (skipReverse) return

    setIsGeocoding(true)
    try {
      const geo = await reverseGeocode(newCoords.lat, newCoords.lng)
      if (geo) {
        setResolvedAddressSummary(geo.formattedAddress || `${geo.zone}, Paliganj`)
        if (geo.formattedAddress) {
          setValue('addressline', geo.formattedAddress)
        }
        if (geo.city) setValue('city', geo.city)
        if (geo.state) setValue('state', geo.state)
        if (geo.pincode) setValue('pincode', geo.pincode)
      }
    } catch (err) {
      console.warn('Reverse geocode error:', err)
    } finally {
      setIsGeocoding(false)
    }
  }, [setValue])

  const handleDetectLocation = async () => {
    setLocationChecking(true)
    try {
      toast.loading('Detecting exact GPS coordinates...', { id: 'gps-fetch' })
      const { lat, lng, accuracy } = await getUserLocation()
      toast.dismiss('gps-fetch')

      if (accuracy != null && accuracy > 150) {
        toast('📍 GPS accuracy is ±' + Math.round(accuracy) + 'm. Drag pin to your exact building.', { icon: 'ℹ️' })
      } else {
        toast.success('🎯 Precise location detected!')
      }

      await handleLocationUpdate({ lat, lng })
    } catch (err) {
      toast.dismiss('gps-fetch')
      toast.error('Could not get GPS. Tap on the map to pin your location.')
    } finally {
      setLocationChecking(false)
    }
  }

  const handleSelectVillage = (villageName) => {
    const vCoords = VILLAGE_COORDS[villageName] || { lat: 25.2921, lng: 84.8170 }
    handleLocationUpdate(vCoords)
    toast.success(`📍 Pinned to ${villageName}`)
  }

  const toggleInstructionTag = (text) => {
    setActiveInstructions(prev => {
      const exists = prev.includes(text)
      const next = exists ? prev.filter(t => t !== text) : [...prev, text]
      setValue('delivery_instructions', next.join(', '))
      return next
    })
  }

  const onSubmit = async (formData) => {
    if (!zoneStatus.serviceable) {
      toast.error('Selected location is outside our 14km delivery area. Please adjust your pin closer to Paliganj.')
      return
    }

    try {
      const payload = {
        _id:                   formData._id,
        address_line:          formData.addressline,
        city:                  formData.city || zoneStatus.zone || 'Paliganj',
        state:                 formData.state || 'Bihar',
        country:               formData.country || 'India',
        pincode:               formData.pincode || '801110',
        mobile:                formData.mobile,
        recipient_name:        orderFor === 'SOMEONE_ELSE' ? formData.recipient_name : '',
        recipient_mobile:      orderFor === 'SOMEONE_ELSE' ? formData.recipient_mobile : '',
        address_type:          orderFor === 'SOMEONE_ELSE' ? 'FRIENDS_FAMILY' : addressType,
        landmark:              formData.landmark || '',
        floor_door:            formData.floor_door || '',
        delivery_instructions: formData.delivery_instructions || activeInstructions.join(', ') || '',
        lat:                   coords.lat,
        lng:                   coords.lng,
      }

      const response = await Axios({
        ...SummaryApi.updateAddress,
        data: payload
      })

      if (response.data?.success) {
        toast.success('✅ Address updated with live GPS pin!')
        if (close) { close(); reset(); fetchAddress?.() }
      }
    } catch (error) {
      AxiosToastError(error)
    }
  }

  const inputClass = (hasError) =>
    `border ${hasError ? 'border-red-400 bg-red-50 dark:bg-red-950/30' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900'} p-3 rounded-2xl text-xs sm:text-sm outline-none focus:border-green-500 focus:bg-white dark:focus:bg-slate-950 text-slate-800 dark:text-slate-100 transition-all w-full shadow-xs`

  return (
    <section 
      className='bg-black/75 backdrop-blur-md fixed inset-0 z-50 overflow-y-auto flex items-end sm:items-center justify-center p-0 sm:p-4'
      onClick={close}
    >
      <div 
        className='bg-white dark:bg-slate-950 w-full max-w-xl rounded-t-[28px] sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90dvh] sm:max-h-[88vh] transition-all'
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile Pull Handle (Zepto/Blinkit/Zomato style) */}
        <div className='w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-2.5 mb-1 sm:hidden flex-shrink-0'></div>

        {/* Header */}
        <div className='flex justify-between items-center px-4 sm:px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex-shrink-0'>
          <div>
            <h2 className='font-black text-slate-900 dark:text-white text-base sm:text-lg'>
              Edit Delivery Location
            </h2>
            <p className='text-[11px] text-slate-400 font-bold'>
              Update live pinpoint &amp; doorstep address
            </p>
          </div>
          <button
            onClick={close}
            className='w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-full transition-colors'
          >
            <IoClose size={22} />
          </button>
        </div>

        <div className='overflow-y-auto p-4 sm:p-6 space-y-4 flex-1'>

          {/* ── 1. ZEPTO-STYLE INTERACTIVE MAP & PIN ── */}
          <div className='space-y-2'>
            <div className='rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md h-56 sm:h-64 relative bg-slate-100 dark:bg-slate-900'>
              <MapContainer
                center={[coords.lat, coords.lng]}
                zoom={16}
                scrollWheelZoom={false}
                className='w-full h-full'
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap'
                />
                <MapFlyController center={coords} zoom={16} />
                <ZeptoInteractiveMarker
                  position={coords}
                  onPositionChange={handleLocationUpdate}
                />
              </MapContainer>

              {/* Floating "Locate Me" Button */}
              <button
                type='button'
                onClick={handleDetectLocation}
                disabled={locationChecking}
                className='absolute bottom-3 right-3 z-[1000] bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xl px-3 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 active:scale-95 transition-all hover:bg-slate-50'
              >
                <IoNavigateCircle size={18} className='text-emerald-500 animate-pulse' />
                <span>{locationChecking ? 'Locating...' : 'Use Live GPS'}</span>
              </button>

              <div className='absolute top-3 left-3 z-[1000] bg-slate-900/85 backdrop-blur-sm text-white px-3 py-1 rounded-xl text-[10px] font-bold shadow-md pointer-events-none flex items-center gap-1'>
                <span>👆 Tap or drag pin to exact gate</span>
              </div>
            </div>

            {/* Resolved Location Banner */}
            <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
              zoneStatus.serviceable
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
                : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/80 text-red-900 dark:text-red-200'
            }`}>
              <div className='flex items-center gap-2.5 min-w-0'>
                {zoneStatus.serviceable ? (
                  <span className='w-3 h-3 rounded-full bg-emerald-500 animate-ping flex-shrink-0'></span>
                ) : (
                  <IoAlertCircle size={20} className='text-red-500 flex-shrink-0' />
                )}
                <div className='truncate'>
                  <p className='text-xs font-black truncate'>
                    {isGeocoding ? 'Detecting address details...' : resolvedAddressSummary}
                  </p>
                  <p className='text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5'>
                    {zoneStatus.serviceable
                      ? `⚡ Delivering in 10-20 mins • ${zoneStatus.distanceKm} km from Paliganj Store`
                      : `⚠️ ${zoneStatus.distanceKm} km away • Outside 14 km delivery radius`}
                  </p>
                </div>
              </div>

              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full flex-shrink-0 ${
                zoneStatus.serviceable
                  ? 'bg-emerald-600 text-white'
                  : 'bg-red-600 text-white'
              }`}>
                {zoneStatus.serviceable ? 'Serviceable' : 'Unavailable'}
              </span>
            </div>

            {/* Quick Village / Town Snap Chips */}
            <div className='pt-1'>
              <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5'>
                Or Quick Snap to Paliganj Local Area:
              </p>
              <div className='flex gap-1.5 overflow-x-auto pb-1 max-w-full'>
                {SERVICEABLE_VILLAGES.slice(0, 12).map((v) => (
                  <button
                    key={v}
                    type='button'
                    onClick={() => handleSelectVillage(v)}
                    className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap ${
                      watch('city') === v
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── 2. ORDER FOR ── */}
          <div className='grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800'>
            <button
              type='button'
              onClick={() => { setOrderFor('SELF'); setAddressType('HOME') }}
              className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all ${
                orderFor === 'SELF'
                  ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <IoPersonOutline size={15} />
              <span>For Myself</span>
            </button>

            <button
              type='button'
              onClick={() => { setOrderFor('SOMEONE_ELSE'); setAddressType('FRIENDS_FAMILY') }}
              className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all ${
                orderFor === 'SOMEONE_ELSE'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <IoGiftOutline size={15} />
              <span>Send as Gift 🎁</span>
            </button>
          </div>

          {/* ── 3. ADDRESS FORM ── */}
          <form className='space-y-3 pt-1' onSubmit={handleSubmit(onSubmit)}>

            {orderFor === 'SOMEONE_ELSE' && (
              <div className='bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-3.5 space-y-3'>
                <p className='text-xs font-black text-amber-950 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5'>
                  <span>🎁</span> Recipient Details (Rider will contact them)
                </p>

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  <div>
                    <label className='text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1'>Recipient Full Name *</label>
                    <input
                      type='text'
                      placeholder='e.g. Ramesh Kumar'
                      className={inputClass(errors.recipient_name)}
                      {...register("recipient_name", {
                        required: orderFor === 'SOMEONE_ELSE' ? "Recipient name is required" : false,
                        minLength: { value: 2, message: "Enter full name" }
                      })}
                    />
                    {errors.recipient_name && <p className='text-xs text-red-500 mt-0.5'>⚠ {errors.recipient_name.message}</p>}
                  </div>

                  <div>
                    <label className='text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1'>Recipient 10-Digit Mobile *</label>
                    <input
                      type='tel'
                      placeholder='10-digit mobile'
                      maxLength={10}
                      className={inputClass(errors.recipient_mobile)}
                      {...register("recipient_mobile", {
                        required: orderFor === 'SOMEONE_ELSE' ? "Recipient phone number is required" : false,
                        pattern: { value: /^[6-9]\d{9}$/, message: "Valid 10-digit Indian number" },
                      })}
                    />
                    {errors.recipient_mobile && <p className='text-xs text-red-500 mt-0.5'>⚠ {errors.recipient_mobile.message}</p>}
                  </div>
                </div>
              </div>
            )}

            {orderFor === 'SELF' && (
              <div>
                <label className='text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5'>
                  Save Address As
                </label>
                <div className='grid grid-cols-3 gap-2'>
                  {[
                    { key: 'HOME', label: 'Home', icon: IoHomeOutline },
                    { key: 'WORK', label: 'Work', icon: IoBriefcaseOutline },
                    { key: 'OTHER', label: 'Other', icon: IoLocationOutline },
                  ].map(t => {
                    const Icon = t.icon
                    const isSelected = addressType === t.key
                    return (
                      <button
                        key={t.key}
                        type='button'
                        onClick={() => setAddressType(t.key)}
                        className={`py-2 px-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 border transition-all ${
                          isSelected
                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <Icon size={14} />
                        <span>{t.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div>
                <label className='text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1'>
                  House / Flat / Floor No. (Optional)
                </label>
                <input
                  type='text'
                  placeholder='e.g. Flat 204, 2nd Floor'
                  className={inputClass(errors.floor_door)}
                  {...register("floor_door")}
                />
              </div>

              <div>
                <label className='text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1'>
                  Nearby Landmark (Optional)
                </label>
                <input
                  type='text'
                  placeholder='e.g. Near Shiv Mandir / SBI ATM'
                  className={inputClass(errors.landmark)}
                  {...register("landmark")}
                />
              </div>
            </div>

            <div>
              <div className='flex items-center justify-between mb-1'>
                <label className='text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block'>
                  Complete Area / Street Address *
                </label>
                {isGeocoding && <span className='text-[10px] text-emerald-600 animate-pulse font-bold'>Auto-detecting...</span>}
              </div>
              <input
                type='text'
                placeholder='e.g. Main Market Road, Near Gandhi Maidan'
                className={inputClass(errors.addressline)}
                {...register("addressline", {
                  required: "Address details are required",
                  minLength: { value: 4, message: "Please enter detailed address" },
                })}
              />
              {errors.addressline && <p className='text-xs text-red-500 mt-0.5'>⚠ {errors.addressline.message}</p>}
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className='text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1'>
                  Village / City *
                </label>
                <input
                  type='text'
                  placeholder='Paliganj'
                  className={inputClass(errors.city)}
                  {...register("city", { required: "City/Village is required" })}
                />
              </div>

              <div>
                <label className='text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1'>
                  Pincode *
                </label>
                <input
                  type='text'
                  placeholder='801110'
                  maxLength={6}
                  className={inputClass(errors.pincode)}
                  {...register("pincode", {
                    required: "Pincode is required",
                    pattern: { value: /^\d{6}$/, message: "Must be 6 digits" }
                  })}
                />
              </div>
            </div>

            <div>
              <label className='text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1'>
                Contact Mobile Number *
              </label>
              <input
                type='tel'
                placeholder='10-digit mobile number'
                maxLength={10}
                className={inputClass(errors.mobile)}
                {...register("mobile", {
                  required: "Mobile number is required",
                  pattern: { value: /^[6-9]\d{9}$/, message: "Enter valid 10-digit Indian mobile number" },
                })}
              />
              {errors.mobile && <p className='text-xs text-red-500 mt-0.5'>⚠ {errors.mobile.message}</p>}
            </div>

            <div>
              <label className='text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5'>
                Delivery Instructions (Tap to select)
              </label>
              <div className='flex flex-wrap gap-1.5 mb-2'>
                {QUICK_INSTRUCTIONS.map(({ icon, text }) => {
                  const isChecked = activeInstructions.includes(text)
                  return (
                    <button
                      key={text}
                      type='button'
                      onClick={() => toggleInstructionTag(text)}
                      className={`text-[11px] font-bold px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1 ${
                        isChecked
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <span>{icon}</span>
                      <span>{text}</span>
                    </button>
                  )
                })}
              </div>
              <input
                type='text'
                placeholder='Any other specific note for delivery rider...'
                className={inputClass(errors.delivery_instructions)}
                {...register("delivery_instructions")}
              />
            </div>

            <button
              type='submit'
              disabled={!zoneStatus.serviceable}
              className={`w-full font-black py-4 rounded-2xl mt-4 transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 text-sm ${
                zoneStatus.serviceable
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 cursor-pointer'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
              }`}
            >
              <IoCheckmarkCircle size={18} />
              <span>Update Delivery Address</span>
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}

export default EditAddressDetails