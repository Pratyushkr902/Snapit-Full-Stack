import React, { useState } from 'react'
import { useGlobalContext } from '../provider/GlobalProvider'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import AddAddress from '../components/AddAddress'
import { useSelector } from 'react-redux'
import AxiosToastError from '../utils/AxiosToastError'
import Axios, { SummaryApi } from '../utils/Axios' // ✅ FIXED: Safely destructure the clean route map
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

  const [couponCode, setCouponCode] = useState('')
  const [discountAmount, setDiscountAmount] = useState(0)
  const [couponApplied, setCouponApplied] = useState(false)
  const [isVerifyingCoupon, setIsVerifyingCoupon] = useState(false)

  const deliveryFee = totalPrice >= 399 ? 0 : 12
  const grandTotal = Math.max(0, (totalPrice + deliveryFee) - discountAmount)

  const handleApplyPromoCoupon = async () => {
    if (!couponCode.trim()) return toast.error("Please enter a coupon code!")
    if (couponCode.trim().toUpperCase() !== 'FIRST15' && couponCode.trim().toUpperCase() !== 'SNAPIT15' && couponCode.trim().toUpperCase() !== 'FIRSTORDER') {
      return toast.error("Invalid code. Use 'FIRST15' for your first-purchase offer!")
    }

    try {
      setIsVerifyingCoupon(true)
      const loadingToast = toast.loading("Checking eligibility...")
      
      const response = await Axios({
        ...SummaryApi.applyFirstTimeCoupon,
        data: { couponCode: couponCode.trim().toUpperCase(), totalAmt: grandTotal }
      })

      toast.dismiss(loadingToast)
      
      if (response.data.success) {
        const calculatedSavings = Math.round(totalPrice * 0.15)
        setDiscountAmount(calculatedSavings)
        setCouponApplied(true)
        toast.success(`🎉 Code applied! Saved ${DisplayPriceInRupees(calculatedSavings)}`)
      }
    } catch (error) {
      toast.dismiss()
      const serverMsg = error.response?.data?.message || "Coupon rejected."
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
      toast.error('Location not serviceable by Snapit at this moment.', { duration: 5000 })
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

  const handleWalletPayment = async () => {
    try {
      if (!addressList[selectAddress]) return toast.error("Please select a delivery address")
      if (!checkServiceArea()) return

      const currentBalance = Number(user?.walletBalance || 0)
      const totalToPay = Number(grandTotal)
      if (currentBalance < totalToPay) {
        return toast.error(`Insufficient Balance!`)
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
          totalAmt: grandTotal,
          lat: coords.lat,
          lng: coords.lng,
          amount: grandTotal,
          orderId: "SNAP-WLT-" + Date.now()
        }
      })
      toast.dismiss(loadingToast)
      if (response.data.success) {
        toast.success("Paid successfully using Snapit Wallet! 💸")
        if (fetchCartItem) fetchCartItem()
        if (fetchOrder) fetchOrder()
        navigate('/success', { state: { text: "Order" } })
      }
    } catch (error) {
      AxiosToastError(error)
    }
  }

  const handleCashOnDelivery = async () => {
    try {
      if (!addressList[selectAddress]) return toast.error("Please select an address first")
      if (!checkServiceArea()) return

      const loadingToast = toast.loading("Placing order...")
      let coords = { lat: 25.2921, lng: 84.8170 }
      try { coords = await getCoordinates() } catch (e) {}

      const response = await Axios({
        ...SummaryApi.CashOnDeliveryOrder,
        data: {
          list_items: cartItemsList,
          addressId: addressList[selectAddress]?._id,
          subTotalAmt: totalPrice,
          delivery_fee: deliveryFee,
          totalAmt: grandTotal,
          lat: coords.lat,
          lng: coords.lng
        }
      })
      toast.dismiss(loadingToast)
      if (response.data.success) {
        toast.success(response.data.message)
        if (fetchCartItem) fetchCartItem()
        if (fetchOrder) fetchOrder()
        navigate('/success', { state: { text: "Order" } })
      }
    } catch (error) {
      AxiosToastError(error)
    }
  }

  const handleOnlinePayment = async () => {
    try {
      const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID
      if (!RAZORPAY_KEY) return toast.error("Razorpay Key Id is missing.")
      if (!addressList[selectAddress]) return toast.error("Please select a delivery address")
      if (!checkServiceArea()) return

      const loadingToast = toast.loading("Preparing transaction...")
      const response = await Axios({
        ...SummaryApi.payment_url,
        data: {
          list_items: cartItemsList,
          addressId: addressList[selectAddress]?._id,
          subTotalAmt: totalPrice,
          delivery_fee: deliveryFee,
          totalAmt: grandTotal
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
            const verificationToast = toast.loading("Verifying transaction...")
            try {
              // ✅ FIXED: Fallback verification handle guard map block check
              const verifyUrl = SummaryApi.payment_verification?.url || '/api/order/verify-payment'
              const verifyMethod = SummaryApi.payment_verification?.method || 'post'

              const verifyRes = await Axios({
                url: verifyUrl,
                method: verifyMethod,
                data: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  list_items: cartItemsList,
                  addressId: addressList[selectAddress]?._id,
                  subTotalAmt: totalPrice,
                  delivery_fee: deliveryFee,
                  totalAmt: grandTotal
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
      AxiosToastError(error)
    }
  }

  return (
    <section className='bg-blue-50 min-h-screen'>
      <div className='container mx-auto p-4 flex flex-col lg:flex-row w-full gap-5 justify-between'>
        {/* Left: Addresses */}
        <div className='w-full'>
          <h3 className='text-lg font-black uppercase text-slate-700 mb-2'>Choose address</h3>
          <div className='bg-white p-2 grid gap-3 rounded-xl shadow-sm'>
            {addressList.length > 0 ? (
              addressList.map((address, index) => (
                <label key={address._id || index} className={`${!address.status && "hidden"} cursor-pointer`}>
                  <div className={`border rounded-xl p-3 flex gap-3 hover:bg-blue-50 transition-all ${Number(selectAddress) === index ? 'border-green-400 bg-green-50 shadow-sm' : ''}`}>
                    <input type='radio' value={index} checked={Number(selectAddress) === index} onChange={e => setSelectAddress(Number(e.target.value))} name='address' />
                    <div className='flex-1'>
                      <p className='font-bold text-slate-800'>{address.address_line}</p>
                      <p className='text-sm text-slate-600'>{address.city}, {address.pincode}</p>
                    </div>
                  </div>
                </label>
              ))
            ) : (
              <p className='text-neutral-500 p-2 text-sm'>No addresses found.</p>
            )}
            <div onClick={() => setOpenAddress(true)} className='h-14 border-2 border-dashed border-neutral-300 flex justify-center items-center cursor-pointer rounded-xl text-neutral-500 font-bold text-sm'>
              + Add New Address
            </div>
          </div>
        </div>

        {/* Right: Bill Info */}
        <div className='w-full lg:max-w-md bg-white py-4 px-2 h-fit shadow-lg rounded-[2rem] border border-slate-100'>
          <div className='mx-4 mb-5 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl'>
            <p className='text-xs font-black uppercase text-slate-500 tracking-wider mb-2'>Promo Coupons</p>
            <div className='flex gap-2'>
              <input
                type='text'
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                disabled={couponApplied}
                placeholder={couponApplied ? "FIRST15 Applied! 🎉" : "Enter code (FIRST15)"}
                className='flex-1 px-3 py-2 border border-slate-200 rounded-xl uppercase text-sm font-bold text-slate-800 focus:outline-none'
              />
              {couponApplied ? (
                <button onClick={() => { setCouponApplied(false); setDiscountAmount(0); setCouponCode('') }} className='px-3 bg-red-100 text-red-600 font-bold text-xs rounded-xl'>Remove</button>
              ) : (
                <button onClick={handleApplyPromoCoupon} disabled={isVerifyingCoupon} className='px-4 py-2 bg-slate-900 text-white font-black text-xs uppercase rounded-xl'>Apply</button>
              )}
            </div>
          </div>

          <h3 className='text-lg font-black px-4 uppercase text-slate-800'>Bill Summary</h3>
          <div className='p-4 space-y-3'>
            <div className='flex justify-between'><p>Items total</p><p>{DisplayPriceInRupees(totalPrice)}</p></div>
            <div className='flex justify-between'><p>Delivery Charge</p><p>{deliveryFee === 0 ? "FREE" : DisplayPriceInRupees(deliveryFee)}</p></div>
            {couponApplied && (
              <div className='flex justify-between text-green-600 font-bold bg-green-50 p-2 rounded-lg border border-green-200 border-dashed'>
                <p>First Order Promo (15%)</p><p>- {DisplayPriceInRupees(discountAmount)}</p>
              </div>
            )}
            <div className='font-black flex justify-between border-t border-dashed pt-4 text-xl'>
              <p>Grand Total</p><p>{DisplayPriceInRupees(grandTotal)}</p>
            </div>
          </div>

          <div className='w-full flex flex-col gap-3 p-4'>
            <button disabled={cartItemsList.length === 0} className='py-4 bg-green-700 text-white rounded-2xl font-black uppercase' onClick={handleWalletPayment}>Pay via Wallet</button>
            <button disabled={cartItemsList.length === 0} className='py-4 bg-slate-900 text-white rounded-2xl font-black uppercase' onClick={handleOnlinePayment}>Online Payment</button>
            <button disabled={cartItemsList.length === 0} className='py-4 border-2 border-slate-900 text-slate-950 rounded-2xl font-black uppercase' onClick={handleCashOnDelivery}>Cash on Delivery</button>
          </div>
        </div>
      </div>
      {openAddress && <AddAddress close={() => setOpenAddress(false)} />}
    </section>
  )
}

export default CheckoutPage;