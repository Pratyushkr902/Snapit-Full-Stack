import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import AddAddress from '../components/AddAddress'
import EditAddressDetails from '../components/EditAddressDetails'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import AxiosToastError from '../utils/AxiosToastError'
import { useGlobalContext } from '../provider/GlobalProvider'
import { Geolocation } from '@capacitor/geolocation'
import { reverseGeocode } from '../utils/reverseGeocode'

// Icons matching Zepto/Blinkit design
import { IoChevronBack, IoSearchOutline, IoHomeOutline, IoLocationOutline, IoShareOutline } from 'react-icons/io5'
import { BiCurrentLocation } from 'react-icons/bi'
import { FiPlus } from 'react-icons/fi'
import { FaWhatsapp, FaChevronRight } from 'react-icons/fa'
import { HiDotsVertical } from 'react-icons/hi'
import { MdEdit, MdDelete } from 'react-icons/md'

// Paliganj Central Store Coordinates (fallback reference)
const STORE_LAT = 25.3217
const STORE_LNG = 84.8143

function getDistanceMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null
  const R = 6371000 // Earth's radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function formatDistance(meters) {
  if (meters == null || isNaN(meters)) return ''
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

const Address = () => {
  const navigate = useNavigate()
  const addressList = useSelector((state) => state.addresses.addressList) || []
  const { fetchAddress } = useGlobalContext() || {}

  const [searchQuery, setSearchQuery] = useState('')
  const [openAddress, setOpenAddress] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [editData, setEditData] = useState({})
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [locating, setLocating] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [selectedId, setSelectedId] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('selected_address_id') : null
  })

  // Silently obtain current GPS coordinates for accurate distance calculations
  useEffect(() => {
    let isMounted = true
    const getCoords = async () => {
      try {
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 8000,
        })
        if (isMounted && pos?.coords) {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          })
        }
      } catch (err) {
        // Fallback to browser geolocation
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (isMounted && pos?.coords) {
                setUserLocation({
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                })
              }
            },
            () => {},
            { timeout: 8000 }
          )
        }
      }
    }
    getCoords()
    return () => {
      isMounted = false
    }
  }, [])

  // Close 3-dots menu when tapping elsewhere
  useEffect(() => {
    const handleOutside = () => setActiveMenuId(null)
    window.addEventListener('click', handleOutside)
    return () => window.removeEventListener('click', handleOutside)
  }, [])

  const handleDisableAddress = async (id) => {
    try {
      const response = await Axios({
        ...SummaryApi.disableAddress,
        data: { _id: id },
      })
      if (response.data.success) {
        toast.success('Address removed successfully')
        if (selectedId === id) {
          localStorage.removeItem('selected_address_id')
          setSelectedId(null)
        }
        if (fetchAddress) fetchAddress()
      }
    } catch (error) {
      AxiosToastError(error)
    }
  }

  // Handle "Use my Current Location"
  const handleUseCurrentLocation = async () => {
    setLocating(true)
    const t = toast.loading('Detecting your GPS location...')
    try {
      let coords = userLocation
      if (!coords) {
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
        })
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(coords)
      }

      const geo = await reverseGeocode(coords.lat, coords.lng)
      toast.dismiss(t)

      // Check if user already has a saved address within 150m of current location
      const nearby = addressList.find((addr) => {
        if (!addr.lat || !addr.lng) return false
        const d = getDistanceMeters(coords.lat, coords.lng, Number(addr.lat), Number(addr.lng))
        return d !== null && d < 150
      })

      if (nearby) {
        localStorage.setItem('selected_address_id', nearby._id)
        setSelectedId(nearby._id)
        toast.success(`📍 Set delivery location to: ${nearby.address_line}`)
        setTimeout(() => navigate(-1), 400)
      } else {
        // Open Add Address modal pre-centered at current location
        toast.success(`📍 Located near ${geo.locality || geo.city || geo.zone || 'Paliganj'}`)
        setOpenAddress(true)
      }
    } catch (err) {
      toast.dismiss(t)
      toast.error('Could not access current location. Please grant location permission.')
    } finally {
      setLocating(false)
    }
  }

  // Handle "Request address from friend" via WhatsApp
  const handleRequestFromFriend = () => {
    const text = encodeURIComponent(
      'Hey! Please send me your delivery address so I can order groceries/food for you on Snapit: https://snapit.pages.dev'
    )
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank')
  }

  // Select an address as active delivery location
  const handleSelectAddress = (address) => {
    localStorage.setItem('selected_address_id', address._id)
    setSelectedId(address._id)
    toast.success(`📍 Delivery location set to: ${address.address_line}`)
    setTimeout(() => navigate(-1), 350)
  }

  // Share address
  const handleShareAddress = (e, address) => {
    e.stopPropagation()
    const fullText = `${address.floor_door ? address.floor_door + ', ' : ''}${address.address_line}, ${
      address.landmark ? 'near ' + address.landmark + ', ' : ''
    }${address.city}, ${address.state} - ${address.pincode} (Contact: ${address.mobile})`

    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullText)
      toast.success('Address copied to clipboard! 📋')
    } else {
      const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
        'Delivery Address: ' + fullText
      )}`
      window.open(shareUrl, '_blank')
    }
  }

  // Filter addresses by search query
  const filteredAddresses = addressList.filter((addr) => {
    if (!addr.status) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      (addr.address_line || '').toLowerCase().includes(q) ||
      (addr.city || '').toLowerCase().includes(q) ||
      (addr.landmark || '').toLowerCase().includes(q) ||
      (addr.pincode || '').toString().includes(q) ||
      (addr.recipient_name || '').toLowerCase().includes(q) ||
      (addr.address_type || '').toLowerCase().includes(q)
    )
  })

  const refLat = userLocation?.lat || STORE_LAT
  const refLng = userLocation?.lng || STORE_LNG

  return (
    <div className='min-h-screen bg-[#F4F5F7] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors pb-24'>
      {/* Top Header */}
      <div className='sticky top-0 z-30 bg-[#F4F5F7]/90 dark:bg-slate-950/90 backdrop-blur-md px-4 pt-4 pb-2'>
        <div className='max-w-xl mx-auto flex items-center gap-3.5'>
          <button
            onClick={() => navigate(-1)}
            className='w-10 h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 active:scale-95 transition shadow-xs flex-shrink-0'
            aria-label='Back'
          >
            <IoChevronBack className='text-xl' />
          </button>
          <h1 className='text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white'>
            Select Location
          </h1>
        </div>

        {/* Search Bar */}
        <div className='max-w-xl mx-auto mt-3.5'>
          <div className='bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs px-4 py-3 flex items-center gap-3'>
            <IoSearchOutline className='text-slate-400 text-lg flex-shrink-0' />
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search Address'
              className='w-full text-sm font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 bg-transparent outline-none'
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className='text-slate-400 hover:text-slate-600 text-sm font-bold px-1'
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      <div className='max-w-xl mx-auto px-4 mt-3 space-y-3.5'>
        {/* Action Card 1: Current Location & Add Address */}
        <div className='bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 shadow-xs divide-y divide-slate-100 dark:divide-slate-800/60 overflow-hidden'>
          {/* Row 1: Use my Current Location */}
          <button
            onClick={handleUseCurrentLocation}
            disabled={locating}
            className='w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 active:bg-slate-100 transition'
          >
            <div className='flex items-center gap-3.5'>
              <BiCurrentLocation className='text-[#E11D48] text-2xl flex-shrink-0' />
              <div>
                <span className='font-bold text-sm sm:text-base text-[#E11D48]'>
                  {locating ? 'Detecting Location...' : 'Use my Current Location'}
                </span>
                {userLocation && (
                  <p className='text-[11px] text-slate-400 font-medium'>GPS High-Accuracy active</p>
                )}
              </div>
            </div>
          </button>

          {/* Row 2: Add New Address */}
          <button
            onClick={() => setOpenAddress(true)}
            className='w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 active:bg-slate-100 transition'
          >
            <div className='flex items-center gap-3.5'>
              <FiPlus className='text-[#E11D48] text-2xl flex-shrink-0' />
              <span className='font-bold text-sm sm:text-base text-[#E11D48]'>
                Add New Address
              </span>
            </div>
            <FaChevronRight className='text-slate-400 text-xs' />
          </button>
        </div>

        {/* Action Card 2: Request address from friend */}
        <div
          onClick={handleRequestFromFriend}
          className='bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 shadow-xs p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 active:scale-[0.99] transition'
        >
          <div className='flex items-center gap-3.5'>
            <FaWhatsapp className='text-[#25D366] text-2xl flex-shrink-0' />
            <span className='font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100'>
              Request address from friend
            </span>
          </div>
          <FaChevronRight className='text-slate-400 text-xs' />
        </div>

        {/* Section: Saved Addresses */}
        <div className='pt-2'>
          <h2 className='text-base font-bold text-slate-900 dark:text-white mb-3 tracking-tight'>
            Saved Addresses
          </h2>

          {filteredAddresses.length === 0 ? (
            <div className='bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 p-8 text-center shadow-xs'>
              <span className='text-3xl block mb-2'>📍</span>
              <p className='text-sm font-bold text-slate-700 dark:text-slate-200'>
                {searchQuery ? 'No address matches your search' : 'No saved addresses yet'}
              </p>
              <p className='text-xs text-slate-400 mt-1 mb-4'>
                Add your home, office, or hostel address for quick 10-minute delivery.
              </p>
              <button
                onClick={() => setOpenAddress(true)}
                className='px-4 py-2 bg-[#E11D48] text-white font-bold text-xs rounded-xl shadow-sm hover:bg-[#be123c] active:scale-95 transition'
              >
                + Add First Address
              </button>
            </div>
          ) : (
            <div className='bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 shadow-xs divide-y divide-slate-100 dark:divide-slate-800/60 overflow-hidden'>
              {filteredAddresses.map((address) => {
                const isHome =
                  (address.address_type || '').toUpperCase() === 'HOME' ||
                  /home|ghar/i.test(address.address_type || '')
                const isSelected = selectedId === address._id

                // Distance calculation
                let distMeters = null
                if (address.lat && address.lng) {
                  distMeters = getDistanceMeters(
                    refLat,
                    refLng,
                    Number(address.lat),
                    Number(address.lng)
                  )
                }

                return (
                  <div
                    key={address._id}
                    onClick={() => handleSelectAddress(address)}
                    className={`p-4 sm:p-5 flex items-start justify-between gap-3.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-rose-50/50 dark:bg-rose-950/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Left Icon */}
                    <div className='mt-0.5 text-slate-800 dark:text-slate-200 flex-shrink-0'>
                      {isHome ? (
                        <IoHomeOutline className='text-xl' />
                      ) : (
                        <IoLocationOutline className='text-xl' />
                      )}
                    </div>

                    {/* Center Info */}
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2 flex-wrap'>
                        <span className='font-bold text-sm text-slate-900 dark:text-white capitalize'>
                          {address.address_type || 'Other'}
                        </span>
                        {distMeters !== null && (
                          <>
                            <span className='text-slate-300 dark:text-slate-600 text-xs'>•</span>
                            <span className='text-xs text-slate-400 font-medium'>
                              {formatDistance(distMeters)}
                            </span>
                          </>
                        )}
                        {isSelected && (
                          <span className='bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full'>
                            ✓ Delivering Here
                          </span>
                        )}
                        {address.recipient_name && (
                          <span className='bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded'>
                            For {address.recipient_name}
                          </span>
                        )}
                      </div>

                      {/* Full Address Text */}
                      <p className='text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed mt-1 line-clamp-2'>
                        {address.floor_door ? `${address.floor_door}, ` : ''}
                        {address.address_line}
                        {address.landmark ? `, near ${address.landmark}` : ''}
                        {`, ${address.city || 'Paliganj'}`}
                        {address.pincode ? ` - ${address.pincode}` : ''}
                      </p>
                    </div>

                    {/* Right Action Icons: Share & 3-dots Menu */}
                    <div className='flex items-center gap-1 flex-shrink-0 relative'>
                      <button
                        type='button'
                        onClick={(e) => handleShareAddress(e, address)}
                        title='Share Address'
                        className='w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95'
                      >
                        <IoShareOutline className='text-lg' />
                      </button>

                      <div className='relative'>
                        <button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveMenuId(activeMenuId === address._id ? null : address._id)
                          }}
                          title='More options'
                          className='w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95'
                        >
                          <HiDotsVertical className='text-lg' />
                        </button>

                        {/* Dropdown Menu */}
                        {activeMenuId === address._id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className='absolute right-0 top-9 z-20 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 animate-in fade-in duration-150'
                          >
                            <button
                              onClick={() => {
                                setActiveMenuId(null)
                                setEditData(address)
                                setOpenEdit(true)
                              }}
                              className='w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2'
                            >
                              <MdEdit className='text-sm text-slate-500' /> Edit
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenuId(null)
                                handleDisableAddress(address._id)
                              }}
                              className='w-full px-3.5 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2'
                            >
                              <MdDelete className='text-sm text-red-500' /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Address Modal (Zepto-style Map Pin) */}
      {openAddress && (
        <AddAddress
          close={() => {
            setOpenAddress(false)
            if (fetchAddress) fetchAddress()
          }}
        />
      )}

      {/* Edit Address Modal */}
      {openEdit && (
        <EditAddressDetails
          data={editData}
          close={() => {
            setOpenEdit(false)
            if (fetchAddress) fetchAddress()
          }}
        />
      )}
    </div>
  )
}

export default Address