import React, { useState, useMemo, useRef } from 'react'
import { useForm } from "react-hook-form"
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import AxiosToastError from '../utils/AxiosToastError'
import { IoClose, IoLocationSharp, IoGiftOutline, IoPersonOutline, IoHomeOutline, IoBriefcaseOutline, IoLocationOutline, IoMapOutline } from "react-icons/io5"
import { useGlobalContext } from '../provider/GlobalProvider'
import { isInDeliveryZone, getUserLocation, SERVICEABLE_VILLAGES } from '../utils/serviceArea'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const customPinIcon = new L.DivIcon({
  html: `<div style="background:#16a34a;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.35);font-size:18px;">📍</div>`,
  className: '',
  iconSize: [34, 34],
  iconAnchor: [17, 34],
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
}

function LocationDraggableMarker({ position, setPosition, onZoneChange }) {
  const markerRef = useRef(null)

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current
        if (marker != null) {
          const newPos = marker.getLatLng()
          setPosition({ lat: newPos.lat, lng: newPos.lng })
          const zone = isInDeliveryZone(newPos.lat, newPos.lng)
          onZoneChange(zone)
        }
      },
    }),
    [setPosition, onZoneChange]
  )

  useMapEvents({
    click(e) {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng })
      const zone = isInDeliveryZone(e.latlng.lat, e.latlng.lng)
      onZoneChange(zone)
    },
  })

  return position ? (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={[position.lat, position.lng]}
      ref={markerRef}
      icon={customPinIcon}
    />
  ) : null
}

const AddAddress = ({ close }) => {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      address_type: 'HOME',
      state: 'Bihar',
      country: 'India',
      pincode: '801110',
    }
  })
  const { fetchAddress } = useGlobalContext() || {}

  // Mode: 'SELF' vs 'SOMEONE_ELSE'
  const [orderFor, setOrderFor] = useState('SELF')
  const [addressType, setAddressType] = useState('HOME')
  const [locationChecking, setLocationChecking] = useState(false)
  const [showMap, setShowMap] = useState(false)

  const [coords, setCoords] = useState({ lat: 25.2921, lng: 84.8170 })
  const [zoneStatus, setZoneStatus] = useState(isInDeliveryZone(25.2921, 84.8170))

  const handleSelectVillage = (villageName) => {
    setValue('city', villageName)
    const vCoords = VILLAGE_COORDS[villageName] || { lat: 25.2921, lng: 84.8170 }
    setCoords(vCoords)
    const z = isInDeliveryZone(vCoords.lat, vCoords.lng)
    setZoneStatus(z)
    toast.success(`📍 Pinned to ${villageName}`)
  }

  const handleDetectLocation = async () => {
    setLocationChecking(true)
    try {
      const { lat, lng, accuracy } = await getUserLocation()
      if (accuracy != null && accuracy > 200) {
        toast.error(`Weak GPS accuracy (±${Math.round(accuracy)}m). Adjust pin on map.`)
      }
      setCoords({ lat, lng })
      const result = isInDeliveryZone(lat, lng)
      setZoneStatus(result)
      if (result.serviceable) {
        toast.success(`✅ Location detected: ${result.zone}!`)
        setValue('city', result.zone)
      } else {
        toast.error('Location is beyond our 14km service area.')
      }
    } catch {
      toast.error('Could not detect location. Please choose village or pin on map.')
    } finally {
      setLocationChecking(false)
    }
  }

  const onSubmit = async (formData) => {
    if (!zoneStatus.serviceable) {
      toast.error('Selected location is outside our 14km delivery area.')
      return
    }

    try {
      const payload = {
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
        delivery_instructions: formData.delivery_instructions || '',
        lat:                   coords.lat,
        lng:                   coords.lng,
      }

      const response = await Axios({
        ...SummaryApi.createAddress,
        data: payload
      })

      if (response.data?.success) {
        toast.success(orderFor === 'SOMEONE_ELSE' ? '🎁 Recipient address saved!' : 'Address saved!')
        if (close) { close(); reset(); fetchAddress?.() }
      }
    } catch (error) {
      AxiosToastError(error)
    }
  }

  const inputClass = (hasError) =>
    `border ${hasError ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-slate-50'} p-3 rounded-xl text-sm outline-none focus:border-green-500 focus:bg-white transition-all w-full`

  return (
    <section className='bg-black/75 backdrop-blur-sm fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-3 sm:p-4'>
      <div className='bg-white w-full max-w-lg my-4 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]'>

        {/* Header */}
        <div className='flex justify-between items-center px-5 py-4 border-b border-slate-100 bg-slate-50/50'>
          <div>
            <h2 className='font-black text-slate-800 text-lg'>Add Delivery Address</h2>
            <p className='text-xs text-slate-500'>Store delivery within 14km service radius</p>
          </div>
          <button onClick={close} className='p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors'>
            <IoClose size={22} />
          </button>
        </div>

        <div className='overflow-y-auto p-5 space-y-4 flex-1'>

          {/* ── MODE SELECTOR: MY ADDRESS vs DELIVER TO SOMEONE ELSE ── */}
          <div className='grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl'>
            <button
              type='button'
              onClick={() => { setOrderFor('SELF'); setAddressType('HOME') }}
              className={`py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
                orderFor === 'SELF'
                  ? 'bg-white text-green-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <IoPersonOutline size={16} />
              <span>For Myself</span>
            </button>

            <button
              type='button'
              onClick={() => { setOrderFor('SOMEONE_ELSE'); setAddressType('FRIENDS_FAMILY') }}
              className={`py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
                orderFor === 'SOMEONE_ELSE'
                  ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-md shadow-green-600/20'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <IoGiftOutline size={16} />
              <span>Send to Someone 🎁</span>
            </button>
          </div>

          {/* Recipient Notice Banner */}
          {orderFor === 'SOMEONE_ELSE' && (
            <div className='bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-3'>
              <span className='text-2xl'>🎁</span>
              <div>
                <p className='text-xs font-black text-amber-950'>Ordering for Family or Friend</p>
                <p className='text-[11px] text-amber-800 leading-relaxed mt-0.5'>
                  Our delivery partner will directly call the recipient and navigate straight to their destination pin!
                </p>
              </div>
            </div>
          )}

          {/* ── MAP PIN & VILLAGE SELECTOR ── */}
          <div className='bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5'>
                <IoLocationSharp className='text-green-600' size={16} />
                <span>1. Select Village / Area</span>
              </span>
              <button
                type='button'
                onClick={() => setShowMap(!showMap)}
                className='text-xs font-bold text-green-700 hover:text-green-800 flex items-center gap-1 underline'
              >
                <IoMapOutline size={14} />
                {showMap ? 'Hide Map' : 'Adjust on Map 📍'}
              </button>
            </div>

            {/* Quick Village Chips */}
            <div className='flex flex-wrap gap-1.5'>
              {SERVICEABLE_VILLAGES.slice(0, 10).map((v) => (
                <button
                  key={v}
                  type='button'
                  onClick={() => handleSelectVillage(v)}
                  className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                    watch('city') === v
                      ? 'bg-green-600 text-white border-green-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-green-400'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            {/* Interactive Leaflet Draggable Map */}
            {showMap && (
              <div className='rounded-2xl overflow-hidden border border-slate-200 shadow-inner h-52 relative'>
                <MapContainer
                  center={[coords.lat, coords.lng]}
                  zoom={14}
                  scrollWheelZoom={false}
                  className='w-full h-full'
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap'
                  />
                  <LocationDraggableMarker
                    position={coords}
                    setPosition={setCoords}
                    onZoneChange={setZoneStatus}
                  />
                </MapContainer>
                <div className='absolute bottom-2 left-2 right-2 bg-slate-900/80 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-[10px] font-semibold text-center z-[1000] pointer-events-none'>
                  📍 Tap anywhere or drag pin to exact house / building gate
                </div>
              </div>
            )}

            {/* GPS Detect & Service Status */}
            <div className='flex items-center justify-between pt-1'>
              <button
                type='button'
                onClick={handleDetectLocation}
                disabled={locationChecking}
                className='text-xs font-black text-slate-700 hover:text-green-700 flex items-center gap-1.5 transition-colors'
              >
                <span className='w-2 h-2 rounded-full bg-green-500 animate-ping' />
                {locationChecking ? 'Detecting GPS...' : 'Use My Live GPS Location'}
              </button>

              <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                zoneStatus.serviceable
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-700'
              }`}>
                {zoneStatus.serviceable ? `✅ Deliverable (${zoneStatus.distanceKm}km)` : '❌ Beyond 14km'}
              </span>
            </div>
          </div>

          {/* ── ADDRESS FORM ── */}
          <form className='space-y-3' onSubmit={handleSubmit(onSubmit)}>

            {/* Recipient Details (if ordering for someone else) */}
            {orderFor === 'SOMEONE_ELSE' && (
              <div className='bg-green-50/70 border border-green-200/80 rounded-2xl p-3.5 space-y-3'>
                <p className='text-xs font-black text-green-950 uppercase tracking-wider'>
                  Recipient Information
                </p>

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  <div>
                    <label className='text-[11px] font-bold text-slate-600 block mb-1'>Recipient Full Name *</label>
                    <input
                      type='text'
                      placeholder='e.g. Rahul Kumar'
                      className={inputClass(errors.recipient_name)}
                      {...register("recipient_name", {
                        required: orderFor === 'SOMEONE_ELSE' ? "Recipient name is required" : false,
                        minLength: { value: 2, message: "Enter full name" }
                      })}
                    />
                    {errors.recipient_name && <p className='text-xs text-red-500 mt-0.5'>⚠ {errors.recipient_name.message}</p>}
                  </div>

                  <div>
                    <label className='text-[11px] font-bold text-slate-600 block mb-1'>Recipient Mobile Number *</label>
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

            {/* Address Tag Selector */}
            {orderFor === 'SELF' && (
              <div>
                <label className='text-[11px] font-bold text-slate-600 block mb-1.5'>Save Address As</label>
                <div className='flex gap-2'>
                  {[
                    { key: 'HOME', label: 'Home', icon: IoHomeOutline },
                    { key: 'WORK', label: 'Work', icon: IoBriefcaseOutline },
                    { key: 'OTHER', label: 'Other', icon: IoLocationOutline },
                  ].map(t => {
                    const Icon = t.icon
                    return (
                      <button
                        key={t.key}
                        type='button'
                        onClick={() => setAddressType(t.key)}
                        className={`flex-1 py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all ${
                          addressType === t.key
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
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

            {/* Flat / Building & Landmark */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div>
                <label className='text-[11px] font-bold text-slate-600 block mb-1'>House / Flat / Floor (Optional)</label>
                <input
                  type='text'
                  placeholder='e.g. Flat 302, 2nd Floor'
                  className={inputClass(errors.floor_door)}
                  {...register("floor_door")}
                />
              </div>

              <div>
                <label className='text-[11px] font-bold text-slate-600 block mb-1'>Nearby Landmark (Optional)</label>
                <input
                  type='text'
                  placeholder='e.g. Near Shiv Mandir'
                  className={inputClass(errors.landmark)}
                  {...register("landmark")}
                />
              </div>
            </div>

            {/* Address Line */}
            <div>
              <label className='text-[11px] font-bold text-slate-600 block mb-1'>Complete Street / Area Address *</label>
              <input
                type='text'
                placeholder='e.g. Main Market Road, Near SBI Bank, Paliganj'
                className={inputClass(errors.addressline)}
                {...register("addressline", {
                  required: "Address details are required",
                  minLength: { value: 6, message: "Please enter detailed address" },
                })}
              />
              {errors.addressline && <p className='text-xs text-red-500 mt-0.5'>⚠ {errors.addressline.message}</p>}
            </div>

            {/* City & Pincode */}
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className='text-[11px] font-bold text-slate-600 block mb-1'>Village / City *</label>
                <input
                  type='text'
                  placeholder='Paliganj'
                  className={inputClass(errors.city)}
                  {...register("city", { required: "City/Village is required" })}
                />
              </div>

              <div>
                <label className='text-[11px] font-bold text-slate-600 block mb-1'>Pincode *</label>
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

            {/* Ordering User Contact Mobile */}
            <div>
              <label className='text-[11px] font-bold text-slate-600 block mb-1'>Your Account Contact Mobile *</label>
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

            {/* Delivery Instructions */}
            <div>
              <label className='text-[11px] font-bold text-slate-600 block mb-1'>Delivery Instructions (Optional)</label>
              <input
                type='text'
                placeholder='e.g. Call upon reaching main gate, leave at door'
                className={inputClass(errors.delivery_instructions)}
                {...register("delivery_instructions")}
              />
            </div>

            {/* Submit Button */}
            <button
              type='submit'
              disabled={!zoneStatus.serviceable}
              className={`w-full font-black py-4 rounded-2xl mt-4 transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 ${
                zoneStatus.serviceable
                  ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-green-600/25'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              {orderFor === 'SOMEONE_ELSE' ? (
                <>
                  <IoGiftOutline size={18} />
                  <span>Save Recipient Address 🎁</span>
                </>
              ) : (
                <span>Save Address</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}

export default AddAddress

