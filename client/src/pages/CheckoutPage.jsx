import React, { useState } from 'react'
import { useGlobalContext } from '../provider/GlobalProvider'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import AddAddress from '../components/AddAddress'
import { useSelector } from 'react-redux'
import AxiosToastError from '../utils/AxiosToastError'
import Axios, { SummaryApi } from '../utils/Axios'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { loadRazorpay } from '../utils/loadRazorpay'
import { getDeliveryInfo } from '../utils/getDeliveryInfo'
import { isStoreOpen, getStoreStatus } from '../components/StoreClosedOverlay'
import { isGenericPaliganjCentroid, getUserLocation, resolveVillageFromText, getEffectiveAddressCoords } from '../utils/serviceArea'
import FreeDeliveryProgressBar from '../components/FreeDeliveryProgressBar'
import CartQuickAddSuggestions from '../components/CartQuickAddSuggestions'

const STORE_FALLBACK = { lat: 25.33121156659458, lng: 84.8006737574818 }

const TIP_PRESETS = [
  { amt: 0,  label: 'No tip' },
  { amt: 10, label: 'Fair' },
  { amt: 20, label: 'Most tipped' },
  { amt: 30, label: 'Generous' },
]

// NOTE: Serviceability is determined by real distance from store via
// getDeliveryInfo() / deliveryInfo.serviceable (see checkServiceArea below).
// Do not reintroduce a hardcoded area-name list here — it will drift out of
// sync with server/utils/serviceArea.js and silently block valid zones.

const CheckoutPage = () => {
  const { fetchCartItem, fetchOrder, fetchAddress, totalPrice } = useGlobalContext() || {}
  const [openAddress, setOpenAddress]       = useState(false)
  const addressList                          = useSelector(state => state.addresses.addressList)
  const [selectAddress, setSelectAddress]   = useState(0)
  const cartItemsList                        = useSelector(state => state.cartItem.cart)
  const user                                 = useSelector(state => state.user)
  const navigate                             = useNavigate()

  const [couponCode, setCouponCode]               = useState('')
  const [discountAmount, setDiscountAmount]       = useState(0)
  const [discountLabel, setDiscountLabel]         = useState('')
  const [couponApplied, setCouponApplied]         = useState(false)
  const [isVerifyingCoupon, setIsVerifyingCoupon] = useState(false)
  const [tipAmt, setTipAmt]                       = useState(0)
  const [activeTipIdx, setActiveTipIdx]           = useState(0)

  const isSnapitPlus = user?.isSnapitPlusMember && new Date() < new Date(user?.snapitPlusExpiresAt)
  const isStoreClosed = !isStoreOpen(user?.role)
  const storeStatus = getStoreStatus(user?.role)


  // Read coords directly from selected address, falling back to Paliganj center if no pin
  const selectedAddress = addressList[selectAddress]
  const effectiveCoords = getEffectiveAddressCoords(selectedAddress) || (selectedAddress ? STORE_FALLBACK : null)

  const deliveryInfo = effectiveCoords
    ? getDeliveryInfo(effectiveCoords.lat, effectiveCoords.lng, totalPrice, isSnapitPlus)
    : null

  const deliveryFee = deliveryInfo ? deliveryInfo.charge : 12
  const grandTotal  = Math.max(0, (totalPrice + deliveryFee + tipAmt) - discountAmount)

  // Coords for backend — from effective address or store fallback
  const getCoords = () => ({
    lat: effectiveCoords?.lat || selectedAddress?.lat || STORE_FALLBACK.lat,
    lng: effectiveCoords?.lng || selectedAddress?.lng || STORE_FALLBACK.lng,
  })

  // ── Coupon ──
  const handleApplyPromoCoupon = async () => {
    if (!couponCode.trim()) return toast.error('Please enter a coupon code!')
    const upper = couponCode.trim().toUpperCase()
    if (upper !== 'FIRSTUSER') return toast.error("Invalid code. Try 'FIRSTUSER' for your first order!")
    if (totalPrice < 149) return toast.error('Minimum order of ₹149 required.')
    try {
      setIsVerifyingCoupon(true)
      const loadingToast = toast.loading('Checking eligibility...')
      const response = await Axios({
        ...SummaryApi.applyFirstTimeCoupon,
        data: { couponCode: upper, totalAmt: totalPrice }
      })
      toast.dismiss(loadingToast)
      if (response.data.success) {
        const { discount, discount_label } = response.data.data
        setDiscountAmount(discount)
        setDiscountLabel(discount_label)
        setCouponApplied(true)
        toast.success(`Lucky coupon! ₹${discount} surprise discount applied 🎉`)
      }
    } catch (error) {
      toast.dismiss()
      toast.error(error.response?.data?.message || 'Coupon rejected.')
      setDiscountAmount(0)
      setCouponApplied(false)
    } finally {
      setIsVerifyingCoupon(false)
    }
  }

  const checkServiceArea = () => {
    if (!selectedAddress) return true
    if (deliveryInfo && !deliveryInfo.serviceable) {
      if (deliveryInfo.isEveningClosed) {
        toast.error(`🌙 Delivery beyond 5 km is closed after 8:00 PM (${deliveryInfo.distanceKm} km away). Deliveries resume tomorrow at 8:30 AM!`, { duration: 6000 })
      } else {
        toast.error(`Your address is ${deliveryInfo.distanceKm} km away and outside our 16 km delivery range.`, { duration: 5000 })
      }
      return false
    }
    const minGroceryOrder = Math.max(49, deliveryInfo?.minOrder || (deliveryInfo?.isLongDistance ? 199 : 49))
    if (totalPrice < minGroceryOrder) {
      toast.error(`Minimum order of ₹${minGroceryOrder} required${deliveryInfo?.isLongDistance ? ' for campus delivery' : ''}. Add ₹${minGroceryOrder - totalPrice} more to proceed!`, { duration: 5000 })
      return false
    }
    return true
  }

  const navigateToSuccess = (scratchCards, orderData = null) => {
    const cards = scratchCards || []
    try { sessionStorage.setItem('pending_scratch_cards', JSON.stringify(cards)) } catch (e) {}
    navigate('/success', {
      state: {
        text: 'Order',
        scratch_cards: cards,
        orderData: orderData || (selectedAddress?.recipient_name ? {
          recipient_name: selectedAddress.recipient_name,
          recipient_mobile: selectedAddress.recipient_mobile,
          order_for: 'SOMEONE_ELSE',
          address_line: selectedAddress.address_line,
        } : null)
      }
    })
  }

  const handleWalletPayment = async () => {
    let loadingToast = null
    try {
      const storeStatus = getStoreStatus(user?.role)
      if (storeStatus.isClosed) return toast.error(storeStatus.isClosedForToday ? 'Snapit is closed for today. We reopen tomorrow at 8:30 AM IST!' : 'Store is closed for the night. We open at 8:30 AM IST!', { duration: 4000 })
      if (!selectedAddress) return toast.error('Please select a delivery address')
      if (!checkServiceArea()) return
      if (!checkMinOrder()) return
      const currentBalance = Number(user?.walletBalance || 0)
      if (currentBalance < grandTotal) return toast.error('Insufficient Balance!')
      loadingToast = toast.loading('Processing Wallet Payment...')
      const c = getCoords()
      const response = await Axios({
        ...SummaryApi.payWithWallet,
        data: {
          list_items:       cartItemsList,
          addressId:        selectedAddress?._id,
          subTotalAmt:      totalPrice,
          delivery_fee:     deliveryFee,
          totalAmt:         grandTotal,
          tip:              tipAmt,
          lat:              c.lat,
          lng:              c.lng,
          amount:           grandTotal,
          orderId:          'SNAP-WLT-' + Date.now(),
          deliveryLocation: { lat: c.lat, lng: c.lng },
          couponCode:       couponApplied ? couponCode.trim().toUpperCase() : null,
          discountAmt:      discountAmount
        }
      })
      if (response.data.success) {
        toast.success('Paid successfully using Snapit Wallet! 💸')
        if (fetchCartItem) fetchCartItem()
        if (fetchOrder) fetchOrder()
        navigateToSuccess(response.data.scratch_cards)
      }
    } catch (error) {
      AxiosToastError(error)
    } finally {
      if (loadingToast) toast.dismiss(loadingToast)
    }
  }

  const handleCashOnDelivery = async () => {
    let loadingToast = null
    try {
      const storeStatus = getStoreStatus(user?.role)
      if (storeStatus.isClosed) return toast.error(storeStatus.isClosedForToday ? 'Snapit is closed for today. We reopen tomorrow at 8:30 AM IST!' : 'Store is closed for the night. We open at 8:30 AM IST!', { duration: 4000 })
      if (!selectedAddress) return toast.error('Please select an address first')
      if (!checkServiceArea()) return
      if (!checkMinOrder()) return
      loadingToast = toast.loading('Placing order...')
      const c = getCoords()
      const response = await Axios({
        ...SummaryApi.CashOnDeliveryOrder,
        data: {
          list_items:       cartItemsList,
          addressId:        selectedAddress?._id,
          subTotalAmt:      totalPrice,
          delivery_fee:     deliveryFee,
          totalAmt:         grandTotal,
          tip:              tipAmt,
          lat:              c.lat,
          lng:              c.lng,
          deliveryLocation: { lat: c.lat, lng: c.lng },
          couponCode:       couponApplied ? couponCode.trim().toUpperCase() : null,
          discountAmt:      discountAmount
        }
      })
      if (response.data.success) {
        toast.success(response.data.message)
        if (fetchCartItem) fetchCartItem()
        if (fetchOrder) fetchOrder()
        navigateToSuccess(response.data.scratch_cards)
      }
    } catch (error) {
      AxiosToastError(error)
    } finally {
      if (loadingToast) toast.dismiss(loadingToast)
    }
  }

  const handleOnlinePayment = async () => {
    try {
      const storeStatus = getStoreStatus(user?.role)
      if (storeStatus.isClosed) return toast.error(storeStatus.isClosedForToday ? 'Snapit is closed for today. We reopen tomorrow at 8:30 AM IST!' : 'Store is closed for the night. We open at 8:30 AM IST!', { duration: 4000 })
      const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID
      if (!RAZORPAY_KEY) return toast.error('Razorpay Key ID is missing.')
      if (!selectedAddress) return toast.error('Please select a delivery address')
      if (!checkServiceArea()) return
      if (!checkMinOrder()) return
      const gatewayToast = toast.loading('Loading payment gateway...')
      let RazorpayClass
      try { RazorpayClass = await loadRazorpay() }
      catch (err) {
        toast.dismiss(gatewayToast)
        toast.error('Payment gateway failed to load. Please refresh and try again.')
        return
      }
      toast.dismiss(gatewayToast)
      const c = getCoords()
      const loadingToast = toast.loading('Preparing transaction...')
      const response = await Axios({
        ...SummaryApi.payment_url,
        data: {
          list_items:       cartItemsList,
          addressId:        selectedAddress?._id,
          subTotalAmt:      totalPrice,
          delivery_fee:     deliveryFee,
          totalAmt:         grandTotal,
          tip:              tipAmt,
          deliveryLocation: { lat: c.lat, lng: c.lng }
        }
      })
      const { data: responseData } = response
      toast.dismiss(loadingToast)
      if (responseData && responseData.id) {
        const options = {
          key:      RAZORPAY_KEY,
          amount:   responseData.amount,
          currency: 'INR',
          name:     'Snapit Grocery',
          order_id: responseData.id,
          prefill: {
            name:    user?.name || '',
            email:   user?.email || '',
            contact: selectedAddress?.mobile || user?.mobile || '',
          },
          method: {
            upi:        true,
            card:       true,
            netbanking: true,
            wallet:     true,
          },
          theme: { color: '#16a34a' },
          config: {
            display: {
              blocks: {
                upi: { name: 'UPI', instruments: [{ method: 'upi' }] },
                other: { name: 'Other Methods', instruments: [{ method: 'card' }, { method: 'netbanking' }, { method: 'wallet' }] }
              },
              sequence: ['block.upi', 'block.other'],
              preferences: { show_default_blocks: false }
            }
          },
          handler: async function (razorpayResponse) {
            const verificationToast = toast.loading('Verifying transaction...')
            try {
              const verifyUrl    = SummaryApi.payment_verification?.url    || '/api/order/verify-payment'
              const verifyMethod = SummaryApi.payment_verification?.method || 'post'
              const verifyRes = await Axios({
                url:    verifyUrl,
                method: verifyMethod,
                data: {
                  razorpay_order_id:   razorpayResponse.razorpay_order_id,
                  razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                  razorpay_signature:  razorpayResponse.razorpay_signature,
                  list_items:          cartItemsList,
                  addressId:           selectedAddress?._id,
                  subTotalAmt:         totalPrice,
                  delivery_fee:        deliveryFee,
                  totalAmt:            grandTotal,
                  tip:                 tipAmt,
                  deliveryLocation:    { lat: c.lat, lng: c.lng },
                  couponCode:          couponApplied ? couponCode.trim().toUpperCase() : null,
                  discountAmt:         discountAmount
                }
              })
              toast.dismiss(verificationToast)
              if (verifyRes.data.success) {
                toast.success('Order Placed Successfully! 🛒')
                if (fetchCartItem) fetchCartItem()
                if (fetchOrder) fetchOrder()
                navigateToSuccess(verifyRes.data.scratch_cards)
              }
            } catch (err) { toast.dismiss(verificationToast); AxiosToastError(err) }
          },
          modal: {
            ondismiss: () => {
              document.body.style.overflow = "";
              document.body.style.touchAction = "";
              document.documentElement.style.overflow = "";
              document.documentElement.style.touchAction = "";
            }
          }
        }
        const rzp = new RazorpayClass(options)
        rzp.open()
      }
    } catch (error) { AxiosToastError(error) }
  }

  return (
    <section className='bg-blue-50 min-h-screen'>
      <div className='container mx-auto p-4 flex flex-col lg:flex-row w-full gap-5 justify-between'>

        <div className='w-full'>
          <h3 className='text-lg font-black uppercase text-slate-700 mb-2'>Choose address</h3>
          <div className='bg-white p-2 grid gap-3 rounded-xl shadow-sm'>
            {addressList.length > 0 ? (
              addressList.map((address, index) => {
                const isRecipient = Boolean(address.recipient_name)
                return (
                  <label key={address._id || index} className={`${!address.status && 'hidden'} cursor-pointer block`}>
                    <div className={`border rounded-2xl p-3.5 flex gap-3 hover:bg-slate-50 transition-all ${Number(selectAddress) === index ? 'border-green-500 bg-green-50/70 shadow-md ring-1 ring-green-500' : 'border-slate-200 bg-white'}`}>
                      <input type='radio' value={index} checked={Number(selectAddress) === index}
                        onChange={e => setSelectAddress(Number(e.target.value))} name='address' className='mt-1 text-green-600 focus:ring-green-500' />
                      <div className='flex-1 space-y-1'>
                        <div className='flex items-center gap-2'>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isRecipient || address.address_type === 'FRIENDS_FAMILY'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {isRecipient || address.address_type === 'FRIENDS_FAMILY' ? '🎁 Friends & Family' : address.address_type || '🏠 Home'}
                          </span>

                          {address.lat && (
                            isGenericPaliganjCentroid(address.lat, address.lng) ? (
                              <span className='text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold'>⚠️ Centroid (Rajeshwar Path)</span>
                            ) : (
                              <span className='text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold'>🎯 Doorstep GPS</span>
                            )
                          )}
                        </div>

                        {isRecipient && (
                          <p className='text-xs font-black text-emerald-800 flex items-center gap-1.5'>
                            <span>🎁 Recipient:</span>
                            <span className='underline'>{address.recipient_name}</span>
                            {address.recipient_mobile && <span className='text-slate-500 font-semibold'>({address.recipient_mobile})</span>}
                          </p>
                        )}

                        {address.floor_door && (
                          <p className='text-xs text-slate-700 font-semibold'>{address.floor_door}</p>
                        )}
                        <p className='font-bold text-slate-800 text-xs'>{address.address_line}</p>
                        <p className='text-xs text-slate-500'>{address.city}, {address.pincode}</p>
                        {address.delivery_instructions && (
                          <p className='text-[11px] text-slate-500 italic'>Note: {address.delivery_instructions}</p>
                        )}

                        {Number(selectAddress) === index && isGenericPaliganjCentroid(address.lat, address.lng) && (
                          <div className='mt-2 pt-2 border-t border-amber-200/80 flex items-center justify-between gap-2'>
                            <p className='text-[11px] text-amber-800 font-medium'>
                              📍 Pinned at Paliganj center. Refine to exact doorstep GPS:
                            </p>
                            <button
                              type='button'
                              onClick={async (e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                try {
                                  toast.loading('Getting your live GPS fix...', { id: 'refine-gps' });
                                  const loc = await getUserLocation();
                                  toast.dismiss('refine-gps');
                                  if (loc?.lat && loc?.lng) {
                                    await Axios({
                                      ...SummaryApi.updateAddress,
                                      data: {
                                        _id: address._id,
                                        address_line: address.address_line,
                                        city: address.city,
                                        state: address.state,
                                        country: address.country,
                                        pincode: address.pincode,
                                        mobile: address.mobile,
                                        lat: loc.lat,
                                        lng: loc.lng,
                                        isExactGps: true,
                                        gpsAccuracy: loc.accuracy
                                      }
                                    });
                                    toast.success(`🎯 Updated to exact GPS doorstep (±${Math.round(loc.accuracy || 5)}m)!`);
                                    fetchAddress?.();
                                  }
                                } catch (err) {
                                  toast.dismiss('refine-gps');
                                  toast.error('Could not get GPS. Please check location permissions.');
                                }
                              }}
                              className='px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex-shrink-0 shadow active:scale-95'
                            >
                              1-Tap GPS Fix
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </label>
                )
              })
            ) : (
              <p className='text-neutral-500 p-2 text-sm'>No addresses found.</p>
            )}
            <div onClick={() => setOpenAddress(true)}
              className='h-14 border-2 border-dashed border-neutral-300 flex justify-center items-center cursor-pointer rounded-xl text-neutral-500 font-bold text-sm'>
              + Add New Address
            </div>
          </div>

          <div className='mx-4 mt-4 mb-5 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl'>
            <p className='text-xs font-black uppercase text-slate-500 tracking-wider mb-1'>Promo Code</p>
            <p className='text-[10px] text-slate-400 mb-2'>
              First order? Use <span className='font-black text-slate-600'>FIRSTUSER</span> on orders ₹149+ for an instant surprise discount!
            </p>
            <div className='flex flex-col sm:flex-row gap-2'>
              <input type='text' value={couponCode} onChange={e => setCouponCode(e.target.value)}
                disabled={couponApplied}
                placeholder={couponApplied ? 'Code applied! 🎉' : 'Enter FIRSTUSER'}
                className='w-full px-3 py-2.5 border border-slate-200 rounded-xl uppercase text-sm font-bold text-slate-800 focus:outline-none focus:border-slate-400 disabled:bg-green-50 disabled:border-green-200' />
              {couponApplied ? (
                <button onClick={() => { setCouponApplied(false); setDiscountAmount(0); setDiscountLabel(''); setCouponCode('') }}
                  className='w-full sm:w-auto px-4 py-2.5 bg-red-100 text-red-600 font-black text-xs rounded-xl whitespace-nowrap'>
                  ✕ Remove
                </button>
              ) : (
                <button onClick={handleApplyPromoCoupon} disabled={isVerifyingCoupon}
                  className='w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white font-black text-xs uppercase rounded-xl disabled:opacity-50 whitespace-nowrap'>
                  {isVerifyingCoupon ? 'Checking...' : 'Apply'}
                </button>
              )}
            </div>
            {couponApplied && (
              <div className='mt-2 flex items-center gap-1.5 text-green-700 bg-green-50 border border-dashed border-green-300 rounded-xl px-3 py-1.5'>
                <span className='text-base'>🎟️</span>
                <span className='text-xs font-black'>{discountLabel || 'Surprise Discount'} — ₹{discountAmount} OFF applied!</span>
              </div>
            )}
          </div>

          {/* Free Delivery Progress Bar & Quick Adds (Zepto / Blinkit) */}
          <div className='mx-4 mb-3'>
            <FreeDeliveryProgressBar
              currentAmount={totalPrice}
              threshold={149}
              isSnapitPlus={isSnapitPlus}
              isLongDistance={deliveryInfo?.isLongDistance}
            />
            <CartQuickAddSuggestions
              remainingForFreeDelivery={deliveryInfo?.amountNeededForFreeDelivery || Math.max(0, 149 - totalPrice)}
            />
          </div>

          {/* ── Tip Delivery Partner (Blinkit / Zepto) ── */}
          <div className='mx-4 mb-4 bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs'>
            <div className='flex items-center justify-between mb-1.5'>
              <div className='flex items-center gap-1.5'>
                <span className='text-base'>🛵</span>
                <p className='text-xs font-black text-slate-800'>Tip your delivery partner</p>
              </div>
              <span className='text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full'>
                100% goes to rider
              </span>
            </div>
            <p className='text-[11px] text-slate-500 font-medium mb-3'>
              Thank your delivery hero for bringing your heavy bags safely to your door.
            </p>
            <div className='grid grid-cols-4 gap-2'>
              {TIP_PRESETS.map((t, idx) => (
                <button
                  key={t.amt}
                  type='button'
                  onClick={() => { setActiveTipIdx(idx); setTipAmt(t.amt) }}
                  className={`py-2 px-1 rounded-xl text-xs font-black transition-all flex flex-col items-center ${
                    activeTipIdx === idx
                      ? 'bg-slate-900 text-white shadow-xs scale-[1.02]'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{t.amt === 0 ? 'No tip' : `₹${t.amt}`}</span>
                  {t.label && <span className='text-[9px] font-medium opacity-80'>{t.label}</span>}
                </button>
              ))}
            </div>
          </div>

          <h3 className='text-lg font-black px-4 uppercase text-slate-800'>Bill Summary</h3>
          <div className='p-4 space-y-3'>
            <div className='flex justify-between'>
              <p>Items total</p>
              <p>{DisplayPriceInRupees(totalPrice)}</p>
            </div>
            <div className='flex justify-between items-center'>
              <div>
                <p className='font-medium text-slate-800 text-sm'>Delivery Charge</p>
                {deliveryInfo && deliveryInfo.serviceable && (
                  <p className='text-[10px] text-slate-500 font-medium'>
                    {deliveryInfo.distanceKm <= 3
                      ? '0–3 km local rate (₹12)'
                      : deliveryInfo.distanceKm <= 5
                      ? '3–5 km rate (₹29)'
                      : deliveryInfo.distanceKm <= 7
                      ? '5–7 km rate (₹29)'
                      : `Campus Flat Rate ₹12 (${deliveryInfo.distanceKm} km)`}
                  </p>
                )}
              </div>
              <p className={deliveryInfo && !deliveryInfo.serviceable ? 'text-amber-600 font-black text-xs' : deliveryFee === 0 ? 'text-green-600 font-black' : 'font-bold text-slate-900'}>
                {deliveryInfo && !deliveryInfo.serviceable
                  ? 'Closed (>5km)'
                  : deliveryFee === 0
                  ? <>
                      {deliveryInfo?.originalCharge > 0 && (
                        <span className='line-through text-slate-400 mr-1.5 font-normal'>
                          ₹{deliveryInfo.originalCharge}
                        </span>
                      )}
                      <span className='text-green-600 font-black'>FREE</span>
                    </>
                  : DisplayPriceInRupees(deliveryFee)
                }
              </p>
            </div>
            {couponApplied && (
              <div className='flex justify-between text-green-600 font-bold bg-green-50 p-2 rounded-lg border border-green-200 border-dashed'>
                <p>🎟️ {discountLabel || 'Promo Discount'} ({couponCode.trim().toUpperCase()})</p>
                <p>- {DisplayPriceInRupees(discountAmount)}</p>
              </div>
            )}
            {tipAmt > 0 && (
              <div className='flex justify-between text-slate-700 font-bold'>
                <p>Delivery Partner Tip ❤️</p>
                <p>+ {DisplayPriceInRupees(tipAmt)}</p>
              </div>
            )}
            <div className='font-black flex justify-between border-t border-dashed pt-4 text-xl'>
              <p>Grand Total</p>
              <p>{DisplayPriceInRupees(grandTotal)}</p>
            </div>
          </div>

          <div className='w-full flex flex-col gap-3 p-4'>
            {isStoreClosed && (
              <div className='bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-2xl text-xs font-bold leading-relaxed shadow-sm flex items-center gap-2.5'>
                <span className='text-xl'>⛔</span>
                <div>
                  <p className='font-black'>{storeStatus.isClosedForToday ? "Store Closed for Today" : "Store Closed for the Night"}</p>
                  <p className='font-medium text-[11px] text-red-600 mt-0.5'>
                    {storeStatus.isClosedForToday
                      ? "Snapit is closed for today. Deliveries resume tomorrow at 8:30 AM IST."
                      : "Operating hours are 8:30 AM – 8:30 PM IST. Orders resume tomorrow morning!"}
                  </p>
                </div>
              </div>
            )}
            {deliveryInfo && !deliveryInfo.serviceable && (
              <div className='bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-2xl text-xs font-bold leading-relaxed shadow-sm'>
                {deliveryInfo.isEveningClosed
                  ? `🌙 Delivery beyond 5 km is closed after 8:00 PM for rider safety (${deliveryInfo.distanceKm} km away). Please select an address within 5 km or order tomorrow morning!`
                  : `📍 Your address is ${deliveryInfo.distanceKm} km away and outside our 16 km serviceable delivery area.`}
              </div>
            )}
            <button disabled={isStoreClosed || cartItemsList.length === 0 || (deliveryInfo && !deliveryInfo.serviceable)}
              className='py-4 bg-green-700 text-white rounded-2xl font-black uppercase disabled:opacity-40'
              onClick={handleWalletPayment}>{isStoreClosed ? 'Store Closed for Today' : 'Pay via Wallet'}</button>
            <button disabled={isStoreClosed || cartItemsList.length === 0 || (deliveryInfo && !deliveryInfo.serviceable)}
              className='py-4 bg-slate-900 text-white rounded-2xl font-black uppercase disabled:opacity-40'
              onClick={handleOnlinePayment}>{isStoreClosed ? 'Store Closed for Today' : 'Online Payment'}</button>
            <button disabled={isStoreClosed || cartItemsList.length === 0 || (deliveryInfo && !deliveryInfo.serviceable)}
              className='py-4 border-2 border-slate-900 text-slate-950 rounded-2xl font-black uppercase disabled:opacity-40'
              onClick={handleCashOnDelivery}>{isStoreClosed ? 'Store Closed for Today' : 'Cash on Delivery'}</button>
          </div>
        </div>
      </div>
      {openAddress && <AddAddress close={() => setOpenAddress(false)} />}
    </section>
  )
}

export default CheckoutPage