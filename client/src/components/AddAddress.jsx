import React, { useState } from 'react'
import { useForm } from "react-hook-form"
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import AxiosToastError from '../utils/AxiosToastError'
import { IoClose, IoLocationSharp } from "react-icons/io5"
import { useGlobalContext } from '../provider/GlobalProvider'
import { isInDeliveryZone, getUserLocation } from '../utils/serviceArea'

const SERVICEABLE_PINCODES = [
  '801110', '801108', '801105', '801113', '801116'
]

const AddAddress = ({ close }) => {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm()
  const { fetchAddress } = useGlobalContext() || {}
  const [locationChecking, setLocationChecking] = useState(false)
  const [locationStatus, setLocationStatus] = useState(null)
  const [detectedLocation, setDetectedLocation] = useState(null)

  const handleDetectLocation = async () => {
    setLocationChecking(true)
    setLocationStatus(null)
    try {
      const { lat, lng } = await getUserLocation()
      const result = isInDeliveryZone(lat, lng)
      setDetectedLocation({ lat, lng, ...result })
      if (result.serviceable) {
        setLocationStatus('ok')
        toast.success(`✅ We deliver to ${result.zone}!`)
        setValue('city', result.zone)
        setValue('state', 'Bihar')
        setValue('country', 'India')
      } else {
        setLocationStatus('out')
      }
    } catch (error) {
      toast.error('Could not detect location. Please enter manually.')
    } finally {
      setLocationChecking(false)
    }
  }

  const onSubmit = async (data) => {
    try {
      const response = await Axios({
        ...SummaryApi.createAddress,
        data: {
          address_line : data.addressline,
          city         : data.city,
          state        : data.state,
          country      : data.country,
          pincode      : data.pincode,
          mobile       : data.mobile,
          lat          : detectedLocation?.lat || null,
          lng          : detectedLocation?.lng || null,
        }
      })
      const { data: responseData } = response
      if (responseData.success) {
        toast.success(responseData.message)
        if (close) { close(); reset(); fetchAddress() }
      }
    } catch (error) {
      AxiosToastError(error)
    }
  }

  const inputClass = (hasError) =>
    `border ${hasError ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-slate-50'} p-3 rounded-xl text-sm outline-none focus:border-green-400 focus:bg-white transition-all w-full`

  return (
    <section className='bg-black fixed inset-0 z-50 bg-opacity-70 overflow-auto flex items-start justify-center p-4'>
      <div className='bg-white w-full max-w-lg mt-8 rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto'>

        {/* Header */}
        <div className='flex justify-between items-center p-5 border-b'>
          <h2 className='font-black text-slate-800 text-lg'>Add Delivery Address</h2>
          <button onClick={close} className='hover:text-red-500 transition-colors'>
            <IoClose size={24} />
          </button>
        </div>

        {/* Detect Location Button */}
        <div className='p-5 pb-0'>
          <button
            type='button'
            onClick={handleDetectLocation}
            disabled={locationChecking}
            className='w-full flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 border-2 border-green-200 text-green-700 font-bold py-3 rounded-xl transition-all active:scale-95 mb-4'
          >
            <IoLocationSharp size={18} />
            {locationChecking ? 'Detecting...' : 'Use My Current Location'}
          </button>

          {detectedLocation?.lat && locationStatus === 'ok' && (
            <p className='text-xs text-green-600 text-center -mt-2 mb-2'>
              📍 GPS pinned: {detectedLocation.lat.toFixed(5)}, {detectedLocation.lng.toFixed(5)}
            </p>
          )}

          {locationStatus === 'ok' && detectedLocation && (
            <div className='bg-green-50 border border-green-200 rounded-xl p-3 mb-4 flex items-center gap-3'>
              <span className='text-2xl'>✅</span>
              <div>
                <p className='font-black text-green-700 text-sm'>We deliver here!</p>
                <p className='text-xs text-green-600'>{detectedLocation.zone} — {detectedLocation.distanceKm}km from our store</p>
              </div>
            </div>
          )}

          {locationStatus === 'out' && (
            <div className='bg-red-50 border border-red-200 rounded-xl p-4 mb-4'>
              <div className='flex items-center gap-3 mb-2'>
                <span className='text-2xl'>😔</span>
                <div>
                  <p className='font-black text-red-700 text-sm'>Not serviceable yet</p>
                  <p className='text-xs text-red-500'>We're not delivering to your location yet</p>
                </div>
              </div>
              <p className='text-xs text-slate-500 leading-relaxed'>
                We currently deliver to: <strong>Paliganj, Sarsi, Kurkuri, Acchua, Chandos, Chiksi, Milki</strong> and nearby areas within 3-4km.
              </p>
              <p className='text-xs text-green-600 font-bold mt-2'>🚀 Expanding soon to your area!</p>
            </div>
          )}
        </div>

        {/* Form */}
        <form className='p-5 grid gap-3' onSubmit={handleSubmit(onSubmit)}>

          {/* Address Line */}
          <div className='grid gap-1'>
            <label className='text-xs font-bold text-slate-600 uppercase tracking-wider'>Address Line</label>
            <input
              type='text'
              placeholder='House no, Street, Landmark'
              className={inputClass(errors.addressline)}
              {...register("addressline", {
                required: "Address is required",
                minLength: { value: 10, message: "Address too short (min 10 characters)" },
                validate: {
                  notOnlyNumbers: v => !/^\d+$/.test(v.trim()) || "Please enter a valid address, not just numbers",
                  hasLetters: v => /[a-zA-Z\u0900-\u097F]/.test(v) || "Address must contain actual location details",
                }
              })}
            />
            {errors.addressline && <p className='text-xs text-red-500 mt-0.5'>⚠ {errors.addressline.message}</p>}
          </div>

          <div className='grid grid-cols-2 gap-3'>
            {/* City */}
            <div className='grid gap-1'>
              <label className='text-xs font-bold text-slate-600 uppercase tracking-wider'>City / Village</label>
              <input
                type='text'
                placeholder='Paliganj'
                className={inputClass(errors.city)}
                {...register("city", {
                  required: "City is required",
                  pattern: { value: /^[a-zA-Z\u0900-\u097F\s]+$/, message: "City name cannot contain numbers" },
                  minLength: { value: 2, message: "Too short" }
                })}
              />
              {errors.city && <p className='text-xs text-red-500 mt-0.5'>⚠ {errors.city.message}</p>}
            </div>

            {/* Pincode */}
            <div className='grid gap-1'>
              <label className='text-xs font-bold text-slate-600 uppercase tracking-wider'>Pincode</label>
              <input
                type='text'
                placeholder='801110'
                maxLength={6}
                className={inputClass(errors.pincode)}
                {...register("pincode", {
                  required: "Pincode is required",
                  pattern: { value: /^\d{6}$/, message: "Must be 6 digits" },
                  validate: v => SERVICEABLE_PINCODES.includes(v) || "Sorry, we don't deliver to this pincode yet"
                })}
              />
              {errors.pincode && <p className='text-xs text-red-500 mt-0.5'>⚠ {errors.pincode.message}</p>}
            </div>
          </div>

          <div className='grid grid-cols-2 gap-3'>
            {/* State */}
            <div className='grid gap-1'>
              <label className='text-xs font-bold text-slate-600 uppercase tracking-wider'>State</label>
              <input
                type='text'
                placeholder='Bihar'
                className={inputClass(errors.state)}
                {...register("state", {
                  required: "State is required",
                  pattern: { value: /^[a-zA-Z\u0900-\u097F\s]+$/, message: "State cannot contain numbers" },
                })}
              />
              {errors.state && <p className='text-xs text-red-500 mt-0.5'>⚠ {errors.state.message}</p>}
            </div>

            {/* Country */}
            <div className='grid gap-1'>
              <label className='text-xs font-bold text-slate-600 uppercase tracking-wider'>Country</label>
              <input
                type='text'
                placeholder='India'
                className={inputClass(errors.country)}
                {...register("country", {
                  required: "Country is required",
                  pattern: { value: /^[a-zA-Z\u0900-\u097F\s]+$/, message: "Country cannot contain numbers" },
                })}
              />
              {errors.country && <p className='text-xs text-red-500 mt-0.5'>⚠ {errors.country.message}</p>}
            </div>
          </div>

          {/* Mobile */}
          <div className='grid gap-1'>
            <label className='text-xs font-bold text-slate-600 uppercase tracking-wider'>Mobile Number</label>
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

          <button
            type='submit'
            className='w-full bg-green-600 hover:bg-green-700 text-white font-black py-3.5 rounded-xl mt-2 transition-all active:scale-95 shadow-lg shadow-green-100'
          >
            Save Address
          </button>
        </form>
      </div>
    </section>
  )
}

export default AddAddress
