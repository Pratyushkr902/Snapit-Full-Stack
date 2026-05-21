import React, { useState } from 'react'
import { useGlobalContext } from '../provider/GlobalProvider'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import AddAddress from '../components/AddAddress'
import { useSelector } from 'react-redux'
import AxiosToastError from '../utils/AxiosToastError'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const SERVICEABLE_AREAS = [
  'paliganj', 'sarsi', 'kurkuri', 'acchua', 'chandos',
  'chiksi', 'milki', 'akhtiyarpur', 'balipakar'
]

const CheckoutPage = () => {
  const { fetchCartItem, fetchOrder, totalPrice } = useGlobalContext()
  const [openAddress, setOpenAddress] = useState(false)
  const addressList = useSelector(state => state.addresses.addressList)
  const [selectAddress, setSelectAddress] = useState(0)
  const cartItemsList = useSelector(state => state.cartItem.cart)
  const user = useSelector(state => state.user)
  const navigate = useNavigate()

  // --- 🎁 COUPON STATE ENGINE LAYERS ---
  const [couponCode, setCouponCode] = useState('')
  const [discountAmount, setDiscountAmount] = useState(0)
  const [couponApplied, setCouponApplied] = useState(false)
  const [isVerifyingCoupon, setIsVerifyingCoupon] = useState(false)

  const deliveryFee = totalPrice >= 399 ? 0 : 12
  
  // ✅ DYNAMIC GRAND TOTAL: Now instantly factors in any active coupon reductions
  const grandTotal = Math.max(0, (totalPrice + deliveryFee) - discountAmount)

  // --- VALIDATE FIRST-TIME COUPON SYSTEM PATHWAYS ---
  const handleApplyPromoCoupon = async () => {
    if (!couponCode.trim()) return toast.error("Please enter a coupon code code string!")
    if (couponCode.trim().toUpperCase() !== 'FIRST15') {
      return toast.error("Invalid coupon code code. Use 'FIRST15' for your first-purchase discount!")
    }

    try {
      setIsVerifyingCoupon(true)
      const loadingToast = toast.loading("Checking pipeline history metrics...")
      
      const response = await Axios({
        ...SummaryApi.applyCoupon, // Points to your first-time user coupon route
        data: { couponCode: couponCode.trim().toUpperCase() }
      })

      toast.dismiss(loadingToast)
      
      if (response.data.success) {
        // Calculate 15% discount on the subtotal items price cost layout
        const calculatedSavings = Math.round(totalPrice * 0.15)
        setDiscountAmount(calculatedSavings)
        setCouponApplied(true)
        toast.success(`🎉 Code applied! Saved ${DisplayPriceInRupees(calculatedSavings)} (15% First-Timer Offer)`)
      }
    } catch (error) {
      toast.dismiss()
      const serverMsg = error.response?.data?.message || "Coupon verification check rejected."
      toast.error(serverMsg)
      setDiscountAmount(0)
      setCouponApplied(false)
    } finally {
      setIsVerifyingCoupon(false)
    }
  }

  const checkServiceArea = () => {
    const selectedAddr = addressList[selectAddress]
    if (!selectedAddr) return true 
    const cityLower = (selectedAddr.city || '').toLowerCase()
    const lineLower = (selectedAddr.address_line || '').toLowerCase()
    const isServiceable = SERVICEABLE_AREAS.some(
      area => cityLower.includes(area) || lineLower.includes(area)
    )
    if (!isServiceable) {
      toast.error(
        '😔 Location not serviceable. Our team is working tirelessly to bring 10-minute deliveries to your location! 🚀',
        { duration: 5000 }
      )
      return false
    }
    return true
  }

  const getCoordinates = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("Geolocation not supported"))
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        err => reject(err),
        { enableHighAccuracy: true }
      )
    })
  }

  // --- WALLET PAYMENT ---
  const handleWalletPayment = async () => {
    try {
      if (!addressList[selectAddress]) return toast.error("Please select a delivery address")
      if (!checkServiceArea()) return

      const currentBalance = Number(user?.walletBalance || 0)
      const totalToPay = Number(grandTotal)
      if (currentBalance < totalToPay) {
        const missingAmount = totalToPay - currentBalance
        return toast.error(`Insufficient Balance! You need ${DisplayPriceInRupees(missingAmount)} more.`)
      }

      const loadingToast = toast.loading("Processing Wallet Payment...")
      let coords = { lat: 25.2921, lng: 84.8170 }
      try { coords = await getCoordinates() } catch (e) {}

      const response = await Axios({
        ...SummaryApi.payWithWallet,
        data: {
          list_items: cartItemsList,
          addressId: addressList[selectAddress]?._id,
          subTotalAmt: totalPrice,
          delivery_fee: deliveryFee,
          totalAmt: grandTotal, // ✅ FIXED: Pipes the discounted Grand Total securely
          lat: coords.lat,
          lng: coords.lng,
          amount: grandTotal,
          orderId: "SNAP-WLT-" + Date.now()
        }
      })
      const { data: responseData } = response
      toast.dismiss(loadingToast)
      if (responseData.success) {
        toast.success("Paid successfully using Snapit Wallet! 💸")
        if (fetchCartItem) fetchCartItem()
        if (fetchOrder) fetchOrder()
        navigate('/success', { state: { text: "Order" } })
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "Wallet payment failed"
      toast.error(typeof errorMsg === 'object' ? "Payment failed" : errorMsg)
    }
  }

  // --- CASH ON DELIVERY ---
  const handleCashOnDelivery = async () => {
    try {
      if (!addressList[selectAddress]) return toast.error("Please select an address first")
      if (!checkServiceArea()) return

      const loadingToast = toast.loading("Locating nearest Mart...")
      let coords = { lat: 25.2921, lng: 84.8170 }
      try { coords = await getCoordinates() } catch (e) {}

      const response = await Axios({
        ...SummaryApi.CashOnDeliveryOrder,
        data: {
          list_items: cartItemsList,
          addressId: addressList[selectAddress]?._id,
          subTotalAmt: totalPrice,
          delivery_fee: deliveryFee,
          totalAmt: grandTotal, // ✅ FIXED: Saves the 15% discounted total to COD collections
          lat: coords.lat,
          lng: coords.lng
        }
      })
      const { data: responseData } = response
      toast.dismiss(loadingToast)
      if (responseData.success) {
        toast.success(responseData.message)
        if (fetchCartItem) fetchCartItem()
        if (fetchOrder) fetchOrder()
        navigate('/success', { state: { text: "Order" } })
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "COD Order failed"
      toast.error(typeof errorMsg === 'object' ? "Checkout Error" : errorMsg)
    }
  }

  // --- ONLINE PAYMENT (RAZORPAY) ---
  const handleOnlinePayment = async () => {
    try {
      const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID
      if (!RAZORPAY_KEY) return toast.error("Razorpay Key not found.")
      if (!addressList[selectAddress]) return toast.error("Please select a delivery address")
      if (!checkServiceArea()) return

      const loadingToast = toast.loading("Preparing payment...")
      const response = await Axios({
        ...SummaryApi.payment_url,
        data: {
          list_items: cartItemsList,
          addressId: addressList[selectAddress]?._id,
          subTotalAmt: totalPrice,
          delivery_fee: deliveryFee,
          totalAmt: grandTotal // ✅ FIXED: Charges the discounted bill amount in Razorpay order generation
        }
      })
      const { data: responseData } = response
      toast.dismiss(loadingToast)

      if (responseData && responseData.id) {
        const options = {
          key: RAZORPAY_KEY,
          amount: responseData.amount,
          currency: "INR",
          name: "Snapit Grocery",
          order_id: responseData.id,
          handler: async function (response) {
            const verificationToast = toast.loading("Verifying payment...")
            try {
              const verifyRes = await Axios({
                ...SummaryApi.payment_verification,
                data: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  list_items: cartItemsList,
                  addressId: addressList[selectAddress]?._id,
                  subTotalAmt: totalPrice,
                  delivery_fee: deliveryFee,
                  totalAmt: grandTotal // ✅ FIXED: Commits the 15% discount securely inside signature checking
                }
              })
              toast.dismiss(verificationToast)
              if (verifyRes.data.success) {
                toast.success("Order Placed Successfully! 🛒")
                if (fetchCartItem) fetchCartItem()
                if (fetchOrder) fetchOrder()
                navigate('/success', { state: { text: "Order" } })
              }
            } catch (err) {
              toast.dismiss(verificationToast)
              AxiosToastError(err)
            }
          },
          prefill: {
            name: user?.name || "",
            contact: addressList[selectAddress]?.mobile || ""
          },
          theme: { color: "#16a34a" }
        }
        const rzp = new window.Razorpay(options)
        rzp.open()
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Razorpay initialization failed"
      toast.error(typeof errorMsg === 'object' ? "Authentication Failed" : errorMsg)
    }
  }

  const selectedAddr = addressList[selectAddress]
  const selectedCityLower = (selectedAddr?.city || '').toLowerCase()
  const isSelectedServiceable = !selectedAddr || SERVICEABLE_AREAS.some(a => selectedCityLower.includes(a))

  return (
    <section className='bg-blue-50 min-h-screen'>
      <div className='container mx-auto p-4 flex flex-col lg:flex-row w-full gap-5 justify-between'>

        {/* LEFT: ADDRESS */}
        <div className='w-full'>
          <h3 className='text-lg font-black uppercase tracking-tight text-slate-700 mb-2'>Choose your address</h3>
          <div className='bg-white p-2 grid gap-3 rounded-xl shadow-sm'>
            {addressList.length > 0 ? (
              addressList.map((address, index) => (
                <label key={address._id || index} className={`${!address.status && "hidden"} cursor-pointer`}>
                  <div className={`border rounded-xl p-3 flex gap-3 hover:bg-blue-50 transition-all ${Number(selectAddress) === index ? 'border-green-400 bg-green-50 shadow-sm' : ''}`}>
                    <input
                      type='radio'
                      value={index}
                      checked={Number(selectAddress) === index}
                      onChange={e => setSelectAddress(Number(e.target.value))}
                      name='address'
                    />
                    <div className='flex-1'>
                      <p className='font-bold text-slate-800'>{address.address_line}</p>
                      <p className='text-sm text-slate-600'>{address.city}, {address.pincode}</p>
                      <p className='text-xs font-bold text-green-600 uppercase mt-1'>📞 {address.mobile}</p>
                    </div>
                    {(() => {
                      const cityL = (address.city || '').toLowerCase()
                      const ok = SERVICEABLE_AREAS.some(a => cityL.includes(a))
                      return ok
                        ? <span className='text-[10px] bg-green-100 text-green-600 font-black px-2 py-1 rounded-full self-start'>✅ Serviceable</span>
                        : <span className='text-[10px] bg-red-100 text-red-500 font-black px-2 py-1 rounded-full self-start'>❌ Not served</span>
                    })()}
                  </div>
                </label>
              ))
            ) : (
              <p className='text-neutral-500 p-2 text-sm'>No addresses found. Add one below.</p>
            )}
            <div
              onClick={() => setOpenAddress(true)}
              className='h-14 bg-blue-50 border-2 border-dashed border-neutral-300 flex justify-center items-center cursor-pointer rounded-xl text-neutral-500 font-bold text-sm hover:bg-blue-100 transition-all'
            >
              + Add New Address
            </div>
          </div>

          {selectedAddr && !isSelectedServiceable && (
            <div className='mt-3 bg-red-50 border border-red-200 rounded-2xl p-4'>
              <p className='font-black text-red-700 text-sm mb-1'>😔 Location Not Serviceable</p>
              <p className='text-xs text-slate-600 leading-relaxed'>
                Our team is working tirelessly to bring <strong>10-minute deliveries</strong> to your location. 🚀
              </p>
              <p className='text-[11px] text-slate-400 mt-2'>
                Currently serving: Paliganj, Sarsi, Kurkuri, Acchua, Chandos, Chiksi, Milki, Akhtiyarpur, Balipakar
              </p>
            </div>
          )}
        </div>

        {/* RIGHT: BILL + PAYMENT + PROMO COUPONS */}
        <div className='w-full lg:max-w-md bg-white py-4 px-2 h-fit shadow-lg rounded-[2rem] border border-slate-100'>

          {/* Wallet Balance Info Grid */}
          <div className='mx-4 mb-4 bg-green-50 border border-green-100 rounded-2xl p-4 shadow-sm'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-[10px] font-black uppercase text-green-600 tracking-wider'>Wallet Balance</p>
                <p className='text-xl font-black text-slate-900'>{DisplayPriceInRupees(user?.walletBalance || 0)}</p>
              </div>
              <div className='text-2xl'>💰</div>
            </div>
            {(user?.walletBalance || 0) < grandTotal && (
              <p className='text-[10px] text-red-500 font-black mt-2 uppercase flex items-center gap-1'>
                <span>⚠️</span> Insufficient Balance
              </p>
            )}
          </div>

          {/* ✅ PREMIUM ADAPTIVE PROMO COUPON VERIFICATION FIELD BLOCK */}
          <div className='mx-4 mb-5 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl'>
            <p className='text-xs font-black uppercase text-slate-500 tracking-wider mb-2'>Select Promo Coupons</p>
            <div className='flex gap-2'>
              <input
                type='text'
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                disabled={couponApplied}
                placeholder={couponApplied ? "FIRST15 Applied! 🎉" : "Enter code (e.g. FIRST15)"}
                className='flex-1 px-3 py-2 border border-slate-200 rounded-xl uppercase text-sm font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-green-50 disabled:text-green-700 disabled:border-green-200'
              />
              {couponApplied ? (
                <button
                  onClick={() => {
                    setCouponApplied(false)
                    setDiscountAmount(0)
                    setCouponCode('')
                  }}
                  className='px-3 bg-red-100 hover:bg-red-200 text-red-600 font-bold text-xs rounded-xl transition-all'
                >
                  Remove
                </button>
              ) : (
                <button
                  onClick={handleApplyPromoCoupon}
                  disabled={isVerifyingCoupon || cartItemsList.length === 0}
                  className='px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm'
                >
                  Apply
                </button>
              )}
            </div>
            {!couponApplied && cartItemsList.length > 0 && (
              <p className='text-[10px] font-bold text-green-600 mt-1.5 animate-pulse cursor-pointer' onClick={() => setCouponCode('FIRST15')}>
                💡 First time shopping? Click here to fill in code "FIRST15"
              </p>
            )}
          </div>

          {/* Bill Summary */}
          <h3 className='text-lg font-black px-4 uppercase text-slate-800 tracking-tight'>Bill Summary</h3>
          <div className='p-4 space-y-3'>
            <div className='flex justify-between'>
              <p className='text-slate-500 font-medium'>Items total</p>
              <p className='font-bold text-slate-800'>{DisplayPriceInRupees(totalPrice)}</p>
            </div>
            <div className='flex justify-between'>
              <p className='text-slate-500 font-medium'>Delivery Charge</p>
              <p className={deliveryFee === 0 ? "text-green-600 font-black" : "font-bold text-slate-800"}>
                {deliveryFee === 0 ? "FREE 🎉" : DisplayPriceInRupees(deliveryFee)}
              </p>
            </div>
            {deliveryFee > 0 && (
              <p className='text-[11px] text-green-600 font-bold'>Add ₹{399 - totalPrice} more for FREE delivery</p>
            )}
            
            {/* ✅ DYNAMIC SAVINGS ITEM DISPLAY ROW */}
            {couponApplied && (
              <div className='flex justify-between text-green-600 font-bold text-sm bg-green-50/50 p-2 rounded-lg border border-green-100/50 border-dashed animate-fadeIn'>
                <p>First User Code (15%)</p>
                <p>- {DisplayPriceInRupees(discountAmount)}</p>
              </div>
            )}

            <div className='font-black flex justify-between border-t border-dashed pt-4 text-xl text-slate-900 tracking-tighter'>
              <p>Grand Total</p>
              <p>{DisplayPriceInRupees(grandTotal)}</p>
            </div>
          </div>

          {/* Payment Buttons */}
          <div className='w-full flex flex-col gap-3 p-4'>
            <button
              disabled={cartItemsList.length === 0 || !isSelectedServiceable}
              className={`py-4 px-4 rounded-2xl font-black transition-all shadow-xl uppercase tracking-widest text-sm flex items-center justify-center gap-2
                ${(user?.walletBalance || 0) >= grandTotal && isSelectedServiceable
                  ? 'bg-green-700 text-white active:scale-95 shadow-green-100'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'}`}
              onClick={handleWalletPayment}
            >
              <span>Pay via Wallet</span>
              <span>{(user?.walletBalance || 0) >= grandTotal ? '💸' : '🔒'}</span>
            </button>

            <button
              disabled={cartItemsList.length === 0 || !isSelectedServiceable}
              className='py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-sm active:scale-95 shadow-xl shadow-slate-100 disabled:opacity-50 disabled:cursor-not-allowed'
              onClick={handleOnlinePayment}
            >
              Online Payment
            </button>

            <button
              disabled={cartItemsList.length === 0 || !isSelectedServiceable}
              className='py-4 border-2 border-slate-900 text-slate-900 rounded-2xl font-black uppercase tracking-widest text-sm active:scale-95 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed'
              onClick={handleCashOnDelivery}
            >
              Cash on Delivery
            </button>

            {!isSelectedServiceable && (
              <p className='text-center text-xs text-red-500 font-bold'>
                Select a serviceable address to continue
              </p>
            )}
          </div>
        </div>
      </div>

      {openAddress && <AddAddress close={() => setOpenAddress(false)} />}
    </section>
  )
}

export default CheckoutPage