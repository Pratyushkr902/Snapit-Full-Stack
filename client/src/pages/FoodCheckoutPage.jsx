import React, { useState, useCallback, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import AddAddress from '../components/AddAddress'
import Axios from '../utils/Axios'
import AxiosToastError from '../utils/AxiosToastError'
import toast from 'react-hot-toast'
import { loadRazorpay } from '../utils/loadRazorpay'
import { useGlobalContext } from '../provider/GlobalProvider'
import { getDeliveryInfo } from '../utils/getDeliveryInfo'

const TIP_PRESETS = [
  { amt: 0,  label: 'No tip' },
  { amt: 20, label: 'Most tipped' },
  { amt: 30, label: 'Generous' },
  { amt: 50, label: 'Super kind' },
]

const QUICK_TAGS = [
  { icon: '🔕', label: "Don't ring bell" },
  { icon: '🚪', label: 'Leave at door' },
  { icon: '🤝', label: 'Contactless' },
  { icon: '🪜', label: 'Climb stairs' },
]

const VALID_COUPONS = ['SNAPIT', 'FIRSTUSER', 'FIRSTFREE', 'FIRST50']

const VegDot = ({ isVeg }) => (
  <span
    style={{
      display: 'inline-block',
      width: 16, height: 16,
      border: `1.5px solid ${isVeg ? '#22a86b' : '#e84339'}`,
      borderRadius: 3,
      flexShrink: 0,
      position: 'relative',
    }}
  >
    <span style={{
      position: 'absolute', top: '50%', left: '50%',
      transform: 'translate(-50%,-50%)',
      width: 7, height: 7,
      background: isVeg ? '#22a86b' : '#e84339',
      borderRadius: '50%',
      display: 'block',
    }} />
  </span>
)

const FoodCheckoutPage = () => {
  const navigate  = useNavigate()
  const location  = useLocation()
  const user      = useSelector(s => s.user)
  const addressList = useSelector(s => s.addresses.addressList)
  const { fetchAddress } = useGlobalContext() || {}

  useEffect(() => { fetchAddress() }, [])

  const {
    cart = {},
    allItems = [],
    restaurantId,
    restaurantName,
    restaurantDeliveryFee = 0,
  } = location.state || {}

  // ── Resolve cart items ──────────────────────────────────────────────────────
  const cartEntries = Object.entries(cart).filter(([, qty]) => qty > 0)
  const [quantities, setQuantities] = useState(() => {
    const init = {}
    cartEntries.forEach(([key, qty]) => { init[key] = qty })
    return init
  })

  const resolvedItems = cartEntries.map(([key]) => {
    const [itemId, sizeName] = key.split('_')
    const item = allItems.find(i => String(i._id) === itemId)
    if (!item) return null
    let price = item.discountedPrice || item.price || 0
    if (sizeName) {
      const sizeGroup = item.customizations?.find(c => c.groupName === 'Size')
      const opt = sizeGroup?.options?.find(o => o.name === sizeName)
      if (opt) price += opt.extraPrice || 0
    }
    return { item, basePrice: price, sizeName, key }
  }).filter(Boolean)

  // ── State ───────────────────────────────────────────────────────────────────
  const [selectAddress, setSelectAddress]   = useState(0)
  const [openAddress,   setOpenAddress]     = useState(false)
  const [placing,       setPlacing]         = useState(false)

  const [tipAmt,        setTipAmt]          = useState(20)
  const [customTip,     setCustomTip]       = useState('')
  const [activeTipIdx,  setActiveTipIdx]    = useState(1)

  // flat coupon (random ₹1–8)
  const [couponCode,       setCouponCode]       = useState('')
  const [couponDiscount,   setCouponDiscount]   = useState(0)
  const [appliedCouponCode, setAppliedCouponCode] = useState('')
  const [couponError,      setCouponError]      = useState('')

  const [walletApplied, setWalletApplied]   = useState(false)

  const [scheduleNow,   setScheduleNow]     = useState(true)
  const [scheduleSlot,  setScheduleSlot]    = useState('Today, 7:00 PM – 7:30 PM')

  const [activeTags,    setActiveTags]      = useState([])
  const [instructions,  setInstructions]    = useState('')

  // ── Calculations ────────────────────────────────────────────────────────────
  const subTotal = resolvedItems.reduce((acc, { basePrice, key }) => {
    return acc + basePrice * (quantities[key] || 1)
  }, 0)

  const isSnapitPlus = Boolean(
    user?.isSnapitPlusMember &&
    user?.snapitPlusExpiresAt &&
    new Date() < new Date(user.snapitPlusExpiresAt)
  )
  const deliveryFee = isSnapitPlus ? 0 : restaurantDeliveryFee
  const walletBal   = Number(user?.walletBalance || 0)
  const preWallet   = subTotal - couponDiscount + deliveryFee + tipAmt
  const walletDeduct = walletApplied ? Math.min(walletBal, preWallet) : 0
  const grandTotal  = Math.max(0, preWallet - walletDeduct)
  const totalSaved  = 48 + couponDiscount + walletDeduct

  const selectedAddr = addressList[selectAddress]
  const deliveryInfo = (selectedAddr?.lat && selectedAddr?.lng)
    ? getDeliveryInfo(selectedAddr.lat, selectedAddr.lng, subTotal, isSnapitPlus)
    : null

  const checkMinOrder = () => {
    if (deliveryInfo && deliveryInfo.minOrder > 0 && subTotal < deliveryInfo.minOrder) {
      toast.error(`Minimum order of ₹${deliveryInfo.minOrder} required for delivery beyond 6km.`, { duration: 5000 })
      return false
    }
    return true
  }

  // ── Handlers ────────────────────────────────────────────────────────────────
  const changeQty = (key, delta) => {
    setQuantities(prev => ({ ...prev, [key]: Math.max(1, (prev[key] || 1) + delta) }))
  }

  const handleTipPreset = (idx, amt) => {
    setActiveTipIdx(idx)
    setCustomTip('')
    setTipAmt(amt)
  }

  const handleCustomTip = (val) => {
    setCustomTip(val)
    setActiveTipIdx(-1)
    const n = parseInt(val)
    setTipAmt(isNaN(n) || n < 0 ? 0 : Math.min(500, n))
  }

  const applyCoupon = () => {
    const code = couponCode.trim().toUpperCase()
    if (!code) { setCouponError('Please enter a coupon code'); return }
    if (!VALID_COUPONS.includes(code)) {
      setCouponError('Invalid coupon code')
      return
    }
    const randomDiscount = Math.floor(Math.random() * 8) + 1
    setCouponDiscount(randomDiscount)
    setAppliedCouponCode(code)
    setCouponError('')
  }

  const removeCoupon = () => {
    setCouponDiscount(0)
    setAppliedCouponCode('')
    setCouponCode('')
    setCouponError('')
  }

  const toggleTag = (label) => {
    setActiveTags(prev =>
      prev.includes(label) ? prev.filter(t => t !== label) : [...prev, label]
    )
  }

  // ── GPS ─────────────────────────────────────────────────────────────────────
  // NOTE: fallback used to be Patna city center (25.2921, 84.8170), ~9km from
  // the store — that silently pushed denied/failed-GPS customers into the
  // 8-10km delivery slab even if they were standing next to the store.
  // Fallback is now the store's own coords, which is the safest neutral default.
  const STORE_COORDS_FALLBACK = { lat: 25.33121156659458, lng: 84.8006737574818 }
  const getCoordinates = () => new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(STORE_COORDS_FALLBACK)
    // NOTE: no timeout here used to mean getCurrentPosition could hang
    // indefinitely on the Capacitor Android WebView, which stalled the
    // entire checkout on "Preparing transaction..." since buildPayload()
    // awaits this before the Razorpay/COD/wallet request is even sent.
    // 8s timeout + fallback mirrors the fix already applied in serviceArea.js.
    let settled = false
    const finish = (coords) => { if (!settled) { settled = true; resolve(coords) } }
    const timer = setTimeout(() => finish(STORE_COORDS_FALLBACK), 8000)
    navigator.geolocation.getCurrentPosition(
      pos => { clearTimeout(timer); finish({ lat: pos.coords.latitude, lng: pos.coords.longitude }) },
      ()  => { clearTimeout(timer); finish(STORE_COORDS_FALLBACK) },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  })

  const buildPayload = useCallback(async (extra = {}) => {
    const coords = await getCoordinates()
    const fullInstructions = [
      ...activeTags,
      instructions.trim(),
    ].filter(Boolean).join('. ')

    return {
      restaurantId,
      restaurantName,
      addressId: addressList[selectAddress]?._id,
      scheduledDelivery: scheduleNow ? null : scheduleSlot,
      deliveryInstructions: fullInstructions || undefined,
      tip: tipAmt,
      couponCode: appliedCouponCode || undefined,
      couponDiscount: couponDiscount || undefined,
      walletAmountUsed: walletDeduct || undefined,
      items: resolvedItems.map(({ item, basePrice, sizeName, key }) => ({
        menuItemId: item._id,
        name:       item.name + (sizeName ? ` (${sizeName})` : ''),
        image:      item.image || '',
        price:      basePrice,
        quantity:   quantities[key] || 1,
      })),
      subTotalAmt:      subTotal,
      delivery_fee:     deliveryFee,
      totalAmt:         grandTotal,
      deliveryLocation: { lat: coords.lat, lng: coords.lng },
      ...extra,
    }
  }, [
    activeTags, instructions, restaurantId, restaurantName,
    addressList, selectAddress, scheduleNow, scheduleSlot,
    tipAmt, appliedCouponCode, couponDiscount,
    walletDeduct, resolvedItems, quantities, subTotal, deliveryFee, grandTotal,
  ])

  // ── Payment handlers ─────────────────────────────────────────────────────────
  const handleCOD = async () => {
    if (!addressList[selectAddress]) return toast.error('Select a delivery address')
    if (!checkMinOrder()) return
    setPlacing(true)
    const t = toast.loading('Placing order...')
    try {
      const payload = await buildPayload()
      const res = await Axios({ method: 'POST', url: '/api/restaurant/food-order/cash-on-delivery', data: payload })
      toast.dismiss(t)
      if (res.data?.success) {
        toast.success('Order placed!')
        navigate('/success', { state: { text: 'Food Order' } })
      }
    } catch (e) { toast.dismiss(t); AxiosToastError(e) }
    finally { setPlacing(false) }
  }

  const handleWalletPay = async () => {
    if (!addressList[selectAddress]) return toast.error('Select a delivery address')
    if (!checkMinOrder()) return
    if (walletBal < grandTotal) return toast.error(`Insufficient wallet balance. Need ₹${grandTotal}, have ₹${walletBal.toFixed(0)}`)
    setPlacing(true)
    const t = toast.loading('Processing wallet payment...')
    try {
      const payload = await buildPayload()
      const res = await Axios({ method: 'POST', url: '/api/restaurant/food-order/wallet', data: payload })
      toast.dismiss(t)
      if (res.data?.success) {
        toast.success('Paid via wallet!')
        navigate('/success', { state: { text: 'Food Order' } })
      }
    } catch (e) { toast.dismiss(t); AxiosToastError(e) }
    finally { setPlacing(false) }
  }

  const handleOnlinePayment = async () => {
    const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID
    if (!RAZORPAY_KEY) return toast.error('Razorpay key missing')
    if (!addressList[selectAddress]) return toast.error('Select a delivery address')
    if (!checkMinOrder()) return

    let RazorpayClass
    const gt = toast.loading('Loading payment gateway...')
    try { RazorpayClass = await loadRazorpay() }
    catch { toast.dismiss(gt); toast.error('Payment gateway failed to load'); return }
    toast.dismiss(gt)

    setPlacing(true)
    const lt = toast.loading('Preparing transaction...')
    try {
      const payload = await buildPayload()
      const res = await Axios({ method: 'POST', url: '/api/restaurant/food-order/create-payment', data: payload })
      toast.dismiss(lt)
      const rzpOrder = res.data
      if (!rzpOrder?.id) { toast.error('Payment initiation failed'); setPlacing(false); return }

      const options = {
        key:       RAZORPAY_KEY,
        amount:    rzpOrder.amount,
        currency:  'INR',
        name:      restaurantName || 'Snapit Food',
        order_id:  rzpOrder.id,
        handler: async (rzpRes) => {
          const vt = toast.loading('Verifying payment...')
          try {
            const vPayload = await buildPayload()
            const vRes = await Axios({
              method: 'POST',
              url: '/api/restaurant/food-order/verify-payment',
              data: { ...vPayload, ...rzpRes },
            })
            toast.dismiss(vt)
            if (vRes.data?.success) {
              toast.success('Order placed!')
              navigate('/success', { state: { text: 'Food Order' } })
            }
          } catch (e) { toast.dismiss(vt); AxiosToastError(e) }
        },
        prefill: {
          name:    user?.name || '',
          contact: addressList[selectAddress]?.mobile || '',
        },
        theme: { color: '#e84339' },
        modal: {
          ondismiss: () => {
            document.body.style.overflow = '';
            document.body.style.touchAction = '';
            document.documentElement.style.overflow = '';
            document.documentElement.style.touchAction = '';
          }
        },
      }
      new RazorpayClass(options).open()
    } catch (e) { toast.dismiss(lt); AxiosToastError(e) }
    finally { setPlacing(false) }
  }

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!location.state || resolvedItems.length === 0) {
    return (
      <div className='min-h-screen flex flex-col items-center justify-center gap-4 bg-orange-50'>
        <span className='text-5xl'>🛒</span>
        <p className='text-gray-500 font-semibold'>No items to checkout</p>
        <button onClick={() => navigate('/food')} className='text-orange-500 font-black'>← Back to Food</button>
      </div>
    )
  }

  const activeAddresses = addressList.filter(a => a.status !== false)

  // ── UI ───────────────────────────────────────────────────────────────────────
  return (
    <section className='bg-gray-100 min-h-screen pb-32'>

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div className='sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3'>
        <button
          onClick={() => navigate(-1)}
          className='w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 bg-white'
        >
          <svg className='w-5 h-5 text-gray-700' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
          </svg>
        </button>
        <div>
          <h1 className='font-bold text-gray-900 text-base'>Review order</h1>
          <p className='text-xs text-gray-400'>{restaurantName}</p>
        </div>
      </div>

      {/* ── Items ────────────────────────────────────────────────────── */}
      <div className='bg-white mt-2 px-4 py-4'>
        <p className='text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3'>Your items</p>
        <div className='divide-y divide-gray-50'>
          {resolvedItems.map(({ item, basePrice, sizeName, key }) => {
            const qty = quantities[key] || 1
            return (
              <div key={key} className='flex items-center gap-3 py-3'>
                <VegDot isVeg={item.isVeg !== false} />
                <div className='w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0'>
                  {item.image
                    ? <img src={item.image} alt={item.name} className='w-full h-full object-cover' />
                    : <div className='w-full h-full flex items-center justify-center text-xl'>🍽️</div>
                  }
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='font-semibold text-gray-800 text-sm truncate'>
                    {item.name}{sizeName ? ` (${sizeName})` : ''}
                  </p>
                  <p className='text-xs text-gray-400 mt-0.5'>₹{basePrice} each</p>
                </div>
                <div className='flex flex-col items-end gap-1.5'>
                  <p className='font-bold text-gray-900 text-sm'>₹{basePrice * qty}</p>
                  <div className='flex items-center border-2 border-red-500 rounded-lg overflow-hidden'>
                    <button
                      onClick={() => changeQty(key, -1)}
                      className='w-7 h-6 bg-white text-red-500 font-bold text-base flex items-center justify-center'
                    >−</button>
                    <div className='w-7 h-6 bg-red-50 text-red-500 font-semibold text-xs flex items-center justify-center'>{qty}</div>
                    <button
                      onClick={() => changeQty(key, 1)}
                      className='w-7 h-6 bg-white text-red-500 font-bold text-base flex items-center justify-center'
                    >+</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {totalSaved > 0 && (
          <div className='mt-3 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 flex items-center gap-2'>
            <span className='text-green-600 text-sm'>🏷️</span>
            <p className='text-xs font-semibold text-green-700'>You saved ₹{totalSaved} on this order!</p>
          </div>
        )}
      </div>

      {/* ── Delivery time ────────────────────────────────────────────── */}
      <div className='bg-white mt-2 px-4 py-4'>
        <p className='text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3'>Delivery time</p>
        <div className='grid grid-cols-2 gap-2'>
          {[
            { label: 'Now', sub: '25–35 min', val: true },
            { label: 'Schedule', sub: 'Pick a slot', val: false },
          ].map(({ label, sub, val }) => (
            <button
              key={label}
              onClick={() => setScheduleNow(val)}
              className={`border-2 rounded-xl py-2.5 text-center transition-all ${
                scheduleNow === val
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200'
              }`}
            >
              <p className={`text-sm font-semibold ${scheduleNow === val ? 'text-red-500' : 'text-gray-800'}`}>{label}</p>
              <p className='text-xs text-gray-400 mt-0.5'>{sub}</p>
            </button>
          ))}
        </div>
        {!scheduleNow && (
          <select
            value={scheduleSlot}
            onChange={e => setScheduleSlot(e.target.value)}
            className='mt-3 w-full h-10 border border-gray-200 rounded-xl px-3 text-sm text-gray-700 bg-white outline-none'
          >
            {['Today, 7:00 PM – 7:30 PM', 'Today, 7:30 PM – 8:00 PM', 'Today, 8:00 PM – 8:30 PM', 'Tomorrow, 12:00 PM – 12:30 PM'].map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
        )}
      </div>

      {/* ── Address ──────────────────────────────────────────────────── */}
      <div className='bg-white mt-2 px-4 py-4'>
        <p className='text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3'>Delivery address</p>
        <div className='flex flex-col gap-2'>
          {activeAddresses.length === 0 && (
            <p className='text-sm text-gray-400'>No addresses saved yet.</p>
          )}
          {addressList.map((address, index) => {
            if (address.status === false) return null
            const selected = Number(selectAddress) === index
            return (
              <label key={address._id || index} className='cursor-pointer'>
                <div className={`border-2 rounded-xl p-3 flex gap-3 transition-all ${selected ? 'border-red-500 bg-red-50' : 'border-gray-100'}`}>
                  <div className='w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0'>
                    <span className='text-sm'>{index === 0 ? '🏠' : '💼'}</span>
                  </div>
                  <div className='flex-1'>
                    <p className='font-semibold text-gray-800 text-sm'>{address.address_line}</p>
                    <p className='text-xs text-gray-400 mt-0.5'>{address.city}, {address.pincode}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${selected ? 'border-red-500' : 'border-gray-300'}`}>
                    {selected && <div className='w-2.5 h-2.5 rounded-full bg-red-500' />}
                  </div>
                  <input
                    type='radio'
                    value={index}
                    checked={selected}
                    onChange={e => setSelectAddress(Number(e.target.value))}
                    name='food-address'
                    className='sr-only'
                  />
                </div>
              </label>
            )
          })}
          <button
            onClick={() => setOpenAddress(true)}
            className='h-12 border-2 border-dashed border-gray-200 flex justify-center items-center rounded-xl text-gray-400 font-semibold text-sm gap-2'
          >
            <span className='text-lg'>+</span> Add new address
          </button>
        </div>
      </div>

      {/* ── Delivery instructions ─────────────────────────────────────── */}
      <div className='bg-white mt-2 px-4 py-4'>
        <p className='text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3'>Delivery instructions</p>
        <div className='flex flex-wrap gap-2 mb-3'>
          {QUICK_TAGS.map(({ icon, label }) => (
            <button
              key={label}
              onClick={() => toggleTag(label)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                activeTags.includes(label)
                  ? 'border-red-400 bg-red-50 text-red-600'
                  : 'border-gray-200 text-gray-500'
              }`}
            >
              <span>{icon}</span> {label}
            </button>
          ))}
        </div>
        <textarea
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
          rows={2}
          placeholder='Any specific instructions for the rider...'
          className='w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 resize-none outline-none focus:border-red-400 transition-colors'
        />
      </div>

      {/* ── Tip ──────────────────────────────────────────────────────── */}
      <div className='bg-white mt-2 px-4 py-4'>
        <p className='text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1'>Tip your delivery rider</p>
        <p className='text-xs text-gray-400 mb-3'>100% goes directly to your rider</p>
        <div className='grid grid-cols-2 gap-2 mb-3'>
          {TIP_PRESETS.map(({ amt, label }, idx) => (
            <button
              key={idx}
              onClick={() => handleTipPreset(idx, amt)}
              className={`border-2 rounded-xl py-2.5 text-center transition-all ${
                activeTipIdx === idx ? 'border-red-500 bg-red-50' : 'border-gray-200'
              }`}
            >
              <p className={`text-base font-bold ${activeTipIdx === idx ? 'text-red-500' : 'text-gray-800'}`}>
                {amt === 0 ? 'No tip' : `₹${amt}`}
              </p>
              <p className='text-xs text-gray-400 mt-0.5'>{label}</p>
            </button>
          ))}
        </div>
        <input
          type='number'
          value={customTip}
          onChange={e => handleCustomTip(e.target.value)}
          placeholder='Custom tip amount'
          min='0'
          max='500'
          className='w-full h-10 border border-gray-200 rounded-xl px-3 text-sm text-gray-700 outline-none focus:border-red-400 transition-colors'
        />
      </div>

      <div className='bg-white mt-2 px-4 py-4'>
        {/* Flat coupon — random ₹1–8 */}
        <div className='mt-4'>
          <p className='text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2'>Coupon code</p>
          {!appliedCouponCode ? (
            <>
              <div className='flex gap-2'>
                <input
                  value={couponCode}
                  onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError('') }}
                 placeholder='Try SNAPIT, FIRSTUSER, FIRSTFREE, FIRST50'
                  className='flex-1 min-w-0 h-10 border border-gray-200 rounded-xl px-3 text-sm text-gray-700 outline-none focus:border-red-400 transition-colors'
                />
                <button
                  onClick={applyCoupon}
                  className='px-5 h-10 bg-red-500 text-white text-sm font-semibold rounded-xl'
                >
                  Apply
                </button>
              </div>
              {couponError && <p className='text-xs text-red-500 mt-2'>{couponError}</p>}
            </>
          ) : (
            <div className='bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 flex items-center gap-2'>
              <span className='text-green-600'>✅</span>
              <div className='flex-1'>
                <p className='text-xs font-semibold text-green-700'>{appliedCouponCode} applied</p>
                <p className='text-xs text-green-600'>−₹{couponDiscount} off</p>
              </div>
              <button onClick={removeCoupon} className='text-xs text-red-500 font-medium'>Remove</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Wallet ───────────────────────────────────────────────────── */}
      {walletBal > 0 && (
        <div className='bg-white mt-2 px-4 py-4'>
          <div className='bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='w-9 h-9 bg-green-100 rounded-full flex items-center justify-center'>
                <span className='text-lg'>💸</span>
              </div>
              <div>
                <p className='text-sm font-semibold text-green-800'>Snapit wallet</p>
                <p className='text-xs text-green-600'>
                  ₹{walletApplied ? walletBal - walletDeduct : walletBal} available
                  {walletApplied && walletDeduct > 0 && ` · ₹${walletDeduct} used`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setWalletApplied(p => !p)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                walletApplied
                  ? 'bg-green-600 text-white border-green-600'
                  : 'border-green-600 text-green-600'
              }`}
            >
              {walletApplied ? 'Remove' : 'Apply'}
            </button>
          </div>
        </div>
      )}

      {/* ── Bill details ─────────────────────────────────────────────── */}
      <div className='bg-white mt-2 px-4 py-4'>
        <p className='text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2'>Bill details</p>
        <div className='space-y-1.5'>
          <div className='flex justify-between text-sm'>
            <span className='text-gray-500'>Item total</span>
            <span className='font-semibold text-gray-800'>₹{subTotal}</span>
          </div>
          {couponDiscount > 0 && (
            <div className='flex justify-between text-sm'>
              <span className='text-gray-500'>Coupon ({appliedCouponCode})</span>
              <span className='font-semibold text-green-600'>−₹{couponDiscount}</span>
            </div>
          )}
          {walletDeduct > 0 && (
            <div className='flex justify-between text-sm'>
              <span className='text-gray-500'>Wallet credit</span>
              <span className='font-semibold text-green-600'>−₹{walletDeduct}</span>
            </div>
          )}
          <div className='flex justify-between text-sm'>
            <span className='text-gray-500'>🛵 Delivery fee</span>
            <span className='font-semibold'>
              {deliveryFee === 0
                ? <><span className='line-through text-gray-300 mr-1'>₹30</span><span className='text-green-600'>Free</span></>
                : `₹${deliveryFee}`
              }
            </span>
          </div>
          {tipAmt > 0 && (
            <div className='flex justify-between text-sm'>
              <span className='text-gray-500'>Rider tip</span>
              <span className='font-semibold text-gray-800'>₹{tipAmt}</span>
            </div>
          )}
          <div className='border-t border-dashed border-gray-200 pt-2 mt-1 flex justify-between'>
            <span className='font-bold text-gray-900 text-base'>Total to pay</span>
            <span className='font-bold text-red-500 text-lg'>₹{grandTotal}</span>
          </div>
        </div>
        {totalSaved > 0 && (
          <div className='mt-3 bg-green-50 border border-green-200 rounded-xl px-3 py-2 flex items-center gap-2'>
            <span className='text-sm'>🏷️</span>
            <p className='text-xs font-semibold text-green-700'>Total savings on this order: ₹{totalSaved}</p>
          </div>
        )}
      </div>

      {/* ── Fixed bottom pay bar ──────────────────────────────────────── */}
      <div className='fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 pt-3 pb-5 z-20'>
        <div className='flex justify-between items-center mb-3'>
          <div>
            <p className='text-xs text-gray-400'>Total to pay</p>
            <p className='text-xl font-bold text-gray-900'>₹{grandTotal}</p>
          </div>
          <div className='text-right'>
            <p className='text-xs font-semibold text-green-600'>Free delivery applied</p>
            <p className='text-xs text-gray-400'>
              {scheduleNow ? 'Est. 25–35 min' : `Scheduled: ${scheduleSlot}`}
            </p>
          </div>
        </div>
        <div className='grid grid-cols-2 gap-2'>
          <button
            onClick={handleCOD}
            disabled={placing}
            className='h-12 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition'
          >
            💵 Cash
          </button>
          <button
            onClick={handleWalletPay}
            disabled={placing}
            className='h-12 rounded-xl border border-green-200 bg-green-50 text-green-800 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition'
          >
            💸 Wallet
          </button>
          <button
            onClick={handleOnlinePayment}
            disabled={placing}
            className='col-span-2 h-12 rounded-xl bg-red-500 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition shadow-md shadow-red-200'
          >
            💳 Pay online — ₹{grandTotal}
          </button>
        </div>
      </div>

      {openAddress && <AddAddress close={() => setOpenAddress(false)} />}
    </section>
  )
}

export default FoodCheckoutPage