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

const STORE_FALLBACK = { lat: 25.33107548756642, lng: 84.80066055528225 }

const SERVICEABLE_AREAS = [
  'paliganj', 'sarsi', 'kurkuri', 'acchua', 'chandos',
  'chiksi', 'milki', 'akhtiyarpur', 'balipakar'
]

const CheckoutPage = () => {
  const { fetchCartItem, fetchOrder, totalPrice } = useGlobalContext()
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

  const isSnapitPlus = user?.isSnapitPlusMember && new Date() < new Date(user?.snapitPlusExpiresAt)

  // Read coords directly from selected address — no GPS needed on checkout
  const selectedAddress = addressList[selectAddress]
  const deliveryInfo = (selectedAddress?.lat && selectedAddress?.lng)
    ? getDeliveryInfo(selectedAddress.lat, selectedAddress.lng, totalPrice, isSnapitPlus)
    : null

  const deliveryFee = deliveryInfo ? deliveryInfo.charge : 12
  const grandTotal  = Math.max(0, (totalPrice + deliveryFee) - discountAmount)

  // Coords for backend — from address or store fallback
  const getCoords = () => ({
    lat: selectedAddress?.lat || STORE_FALLBACK.lat,
    lng: selectedAddress?.lng || STORE_FALLBACK.lng,
  })

  // ── Coupon ──
  const handleApplyPromoCoupon = async () => {
    if (!couponCode.trim()) return toast.error('Please enter a coupon code!')
    const upper = couponCode.trim().toUpperCase()
    if (upper !== 'FIRSTUSER') return toast.error("Invalid code. Try 'FIRSTUSER' for your first order!")
    if (totalPrice + deliveryFee < 149) return toast.error('Minimum order ₹149 required.')
    try {
      setIsVerifyingCoupon(true)
      const loadingToast = toast.loading('Checking eligibility...')
      const response = await Axios({
        ...SummaryApi.applyFirstTimeCoupon,
        data: { couponCode: upper, totalAmt: totalPrice + deliveryFee }
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
    const cityLower = (selectedAddress.city || '').toLowerCase()
    const lineLower = (selectedAddress.address_line || '').toLowerCase()
    const isServiceable = SERVICEABLE_AREAS.some(
      area => cityLower.includes(area) || lineLower.includes(area)
    )
    if (!isServiceable) {
      toast.error('Location not serviceable by Snapit at this moment.', { duration: 5000 })
      return false
    }
    if (deliveryInfo && !deliveryInfo.serviceable) {
      toast.error('Your location is outside our 12 km delivery range.', { duration: 5000 })
      return false
    }
    return true
  }

  const navigateToSuccess = (scratchCards) => {
    const cards = scratchCards || []
    try { sessionStorage.setItem('pending_scratch_cards', JSON.stringify(cards)) } catch (e) {}
    navigate('/success', { state: { text: 'Order', scratch_cards: cards } })
  }

  const handleWalletPayment = async () => {
    try {
      if (!selectedAddress) return toast.error('Please select a delivery address')
      if (!checkServiceArea()) return
      const currentBalance = Number(user?.walletBalance || 0)
      if (currentBalance < grandTotal) return toast.error('Insufficient Balance!')
      const loadingToast = toast.loading('Processing Wallet Payment...')
      const c = getCoords()
      const response = await Axios({
        ...SummaryApi.payWithWallet,
        data: {
          list_items:       cartItemsList,
          addressId:        selectedAddress?._id,
          subTotalAmt:      totalPrice,
          delivery_fee:     deliveryFee,
          totalAmt:         grandTotal,
          lat:              c.lat,
          lng:              c.lng,
          amount:           grandTotal,
          orderId:          'SNAP-WLT-' + Date.now(),
          deliveryLocation: { lat: c.lat, lng: c.lng },
          couponCode:       couponApplied ? couponCode.trim().toUpperCase() : null,
          discountAmt:      discountAmount
        }
      })
      toast.dismiss(loadingToast)
      if (response.data.success) {
        toast.success('Paid successfully using Snapit Wallet! 💸')
        if (fetchCartItem) fetchCartItem()
        if (fetchOrder) fetchOrder()
        navigateToSuccess(response.data.scratch_cards)
      }
    } catch (error) { AxiosToastError(error) }
  }

  const handleCashOnDelivery = async () => {
    try {
      if (!selectedAddress) return toast.error('Please select an address first')
      if (!checkServiceArea()) return
      const loadingToast = toast.loading('Placing order...')
      const c = getCoords()
      const response = await Axios({
        ...SummaryApi.CashOnDeliveryOrder,
        data: {
          list_items:       cartItemsList,
          addressId:        selectedAddress?._id,
          subTotalAmt:      totalPrice,
          delivery_fee:     deliveryFee,
          totalAmt:         grandTotal,
          lat:              c.lat,
          lng:              c.lng,
          deliveryLocation: { lat: c.lat, lng: c.lng },
          couponCode:       couponApplied ? couponCode.trim().toUpperCase() : null,
          discountAmt:      discountAmount
        }
      })
      toast.dismiss(loadingToast)
      if (response.data.success) {
        toast.success(response.data.message)
        if (fetchCartItem) fetchCartItem()
        if (fetchOrder) fetchOrder()
        navigateToSuccess(response.data.scratch_cards)
      }
    } catch (error) { AxiosToastError(error) }
  }

  const handleOnlinePayment = async () => {
    try {
      const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID
      if (!RAZORPAY_KEY) return toast.error('Razorpay Key ID is missing.')
      if (!selectedAddress) return toast.error('Please select a delivery address')
      if (!checkServiceArea()) return
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
          prefill: { name: user?.name || '', contact: selectedAddress?.mobile || '' },
          theme: { color: '#16a34a' }
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
              addressList.map((address, index) => (
                <label key={address._id || index} className={`${!address.status && 'hidden'} cursor-pointer`}>
                  <div className={`border rounded-xl p-3 flex gap-3 hover:bg-blue-50 transition-all ${Number(selectAddress) === index ? 'border-green-400 bg-green-50 shadow-sm' : ''}`}>
                    <input type='radio' value={index} checked={Number(selectAddress) === index}
                      onChange={e => setSelectAddress(Number(e.target.value))} name='address' />
                    <div className='flex-1'>
                      <p className='font-bold text-slate-800'>{address.address_line}</p>
                      <p className='text-sm text-slate-600'>{address.city}, {address.pincode}</p>
                      {/* Show warning if address has no coords */}
                      {!address.lat && (
                        <p className='text-[10px] text-yellow-600 font-bold mt-0.5'>
                          📍 Re-save with "Use My Current Location" for accurate delivery fee
                        </p>
                      )}
                    </div>
                  </div>
                </label>
              ))
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
              First-time customer? Use <span className='font-black text-slate-600'>FIRSTUSER</span> on orders ₹149+
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

          <h3 className='text-lg font-black px-4 uppercase text-slate-800'>Bill Summary</h3>
          <div className='p-4 space-y-3'>
            <div className='flex justify-between'>
              <p>Items total</p>
              <p>{DisplayPriceInRupees(totalPrice)}</p>
            </div>
            <div className='flex justify-between items-center'>
              <p>Delivery Charge</p>
              <p className={deliveryFee === 0 ? 'text-green-600 font-bold' : ''}>
                {deliveryFee === 0 ? 'FREE' : DisplayPriceInRupees(deliveryFee)}
              </p>
            </div>
            {couponApplied && (
              <div className='flex justify-between text-green-600 font-bold bg-green-50 p-2 rounded-lg border border-green-200 border-dashed'>
                <p>🎟️ {discountLabel || 'Surprise Discount'} (FIRSTUSER)</p>
                <p>- {DisplayPriceInRupees(discountAmount)}</p>
              </div>
            )}
            <div className='font-black flex justify-between border-t border-dashed pt-4 text-xl'>
              <p>Grand Total</p>
              <p>{DisplayPriceInRupees(grandTotal)}</p>
            </div>
          </div>

          <div className='w-full flex flex-col gap-3 p-4'>
            <button disabled={cartItemsList.length === 0}
              className='py-4 bg-green-700 text-white rounded-2xl font-black uppercase disabled:opacity-40'
              onClick={handleWalletPayment}>Pay via Wallet</button>
            <button disabled={cartItemsList.length === 0}
              className='py-4 bg-slate-900 text-white rounded-2xl font-black uppercase disabled:opacity-40'
              onClick={handleOnlinePayment}>Online Payment</button>
            <button disabled={cartItemsList.length === 0}
              className='py-4 border-2 border-slate-900 text-slate-950 rounded-2xl font-black uppercase disabled:opacity-40'
              onClick={handleCashOnDelivery}>Cash on Delivery</button>
          </div>
        </div>
      </div>
      {openAddress && <AddAddress close={() => setOpenAddress(false)} />}
    </section>
  )
}

export default CheckoutPage