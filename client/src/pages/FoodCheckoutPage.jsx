import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import AddAddress from '../components/AddAddress'
import Axios from '../utils/Axios'
import AxiosToastError from '../utils/AxiosToastError'
import toast from 'react-hot-toast'
import { loadRazorpay } from '../utils/loadRazorpay'

const FoodCheckoutPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useSelector(state => state.user)
  const addressList = useSelector(state => state.addresses.addressList)

  const { cart = {}, allItems = [], restaurantId, restaurantName, restaurantDeliveryFee = 0 } = location.state || {}

  const [selectAddress, setSelectAddress] = useState(0)
  const [openAddress, setOpenAddress] = useState(false)
  const [placing, setPlacing] = useState(false)

  const cartEntries = Object.entries(cart).filter(([, qty]) => qty > 0)

  const resolvedItems = cartEntries.map(([key, qty]) => {
    const [itemId, sizeName] = key.split('_')
    const item = allItems.find(i => String(i._id) === itemId)
    if (!item) return null
    let price = item.discountedPrice || item.price || 0
    if (sizeName) {
      const sizeGroup = item.customizations?.find(c => c.groupName === 'Size')
      const opt = sizeGroup?.options?.find(o => o.name === sizeName)
      if (opt) price += opt.extraPrice || 0
    }
    return { item, qty, price, sizeName, key }
  }).filter(Boolean)

  const subTotal = resolvedItems.reduce((acc, { price, qty }) => acc + price * qty, 0)
  const deliveryFee = restaurantDeliveryFee
  const grandTotal = subTotal + deliveryFee

  const getCoordinates = () => new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({ lat: 25.2921, lng: 84.8170 })
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({ lat: 25.2921, lng: 84.8170 }),
      { enableHighAccuracy: true }
    )
  })

  const buildOrderPayload = async () => {
    const coords = await getCoordinates()
    return {
      restaurantId,
      restaurantName,
      addressId: addressList[selectAddress]?._id,
      items: resolvedItems.map(({ item, qty, price, sizeName }) => ({
        menuItemId: item._id,
        name: item.name + (sizeName ? ` (${sizeName})` : ''),
        image: item.image || '',
        price,
        quantity: qty,
      })),
      subTotalAmt: subTotal,
      delivery_fee: deliveryFee,
      totalAmt: grandTotal,
      deliveryLocation: { lat: coords.lat, lng: coords.lng },
    }
  }

  const handleCOD = async () => {
    if (!addressList[selectAddress]) return toast.error('Please select a delivery address')
    setPlacing(true)
    const t = toast.loading('Placing order...')
    try {
      const payload = await buildOrderPayload()
      const res = await Axios({ method: 'POST', url: '/api/restaurant/food-order/cash-on-delivery', data: payload })
      toast.dismiss(t)
      if (res.data?.success) {
        toast.success('Order placed! 🎉')
        navigate('/success', { state: { text: 'Food Order' } })
      }
    } catch (e) { toast.dismiss(t); AxiosToastError(e) }
    finally { setPlacing(false) }
  }

  const handleWallet = async () => {
    if (!addressList[selectAddress]) return toast.error('Please select a delivery address')
    const balance = Number(user?.walletBalance || 0)
    if (balance < grandTotal) return toast.error(`Insufficient wallet balance. Need ₹${grandTotal}, have ₹${balance.toFixed(0)}`)
    setPlacing(true)
    const t = toast.loading('Processing wallet payment...')
    try {
      const payload = await buildOrderPayload()
      const res = await Axios({ method: 'POST', url: '/api/restaurant/food-order/wallet', data: payload })
      toast.dismiss(t)
      if (res.data?.success) {
        toast.success('Paid via wallet! 💸')
        navigate('/success', { state: { text: 'Food Order' } })
      }
    } catch (e) { toast.dismiss(t); AxiosToastError(e) }
    finally { setPlacing(false) }
  }

  const handleOnlinePayment = async () => {
    const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID
    if (!RAZORPAY_KEY) return toast.error('Razorpay key missing')
    if (!addressList[selectAddress]) return toast.error('Please select a delivery address')
    const gt = toast.loading('Loading payment gateway...')
    let RazorpayClass
    try { RazorpayClass = await loadRazorpay() } catch {
      toast.dismiss(gt); toast.error('Payment gateway failed to load'); return
    }
    toast.dismiss(gt)
    setPlacing(true)
    const lt = toast.loading('Preparing transaction...')
    try {
      const payload = await buildOrderPayload()
      const res = await Axios({ method: 'POST', url: '/api/restaurant/food-order/create-payment', data: payload })
      toast.dismiss(lt)
      const rzpOrder = res.data
      if (!rzpOrder?.id) { toast.error('Payment initiation failed'); setPlacing(false); return }
      const options = {
        key: RAZORPAY_KEY,
        amount: rzpOrder.amount,
        currency: 'INR',
        name: restaurantName || 'Snapit Food',
        order_id: rzpOrder.id,
        handler: async (rzpRes) => {
          const vt = toast.loading('Verifying payment...')
          try {
            const vPayload = await buildOrderPayload()
            const vRes = await Axios({
              method: 'POST', url: '/api/restaurant/food-order/verify-payment',
              data: { ...vPayload, ...rzpRes }
            })
            toast.dismiss(vt)
            if (vRes.data?.success) {
              toast.success('Order placed! 🎉')
              navigate('/success', { state: { text: 'Food Order' } })
            }
          } catch (e) { toast.dismiss(vt); AxiosToastError(e) }
        },
        prefill: { name: user?.name || '', contact: addressList[selectAddress]?.mobile || '' },
        theme: { color: '#f97316' }
      }
      const rzp = new RazorpayClass(options)
      rzp.open()
    } catch (e) { toast.dismiss(lt); AxiosToastError(e) }
    finally { setPlacing(false) }
  }

  if (!location.state || resolvedItems.length === 0) {
    return (
      <div className='min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50'>
        <span className='text-5xl'>🛒</span>
        <p className='text-gray-500 font-semibold'>No items to checkout</p>
        <button onClick={() => navigate('/food')} className='text-orange-500 font-black'>← Back to Food</button>
      </div>
    )
  }

  return (
    <section className='bg-orange-50 min-h-screen pb-10'>
      <div className='bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 shadow-sm'>
        <button onClick={() => navigate(-1)} className='p-2 rounded-full bg-gray-100'>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h1 className='font-black text-gray-900 text-lg'>Checkout</h1>
          <p className='text-xs text-gray-500'>{restaurantName}</p>
        </div>
      </div>
      <div className='max-w-lg mx-auto px-4 pt-4 flex flex-col gap-4'>
        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
          <div className='px-4 py-3 border-b border-gray-50'>
            <p className='font-black text-gray-800 text-sm'>🍽️ Your Order</p>
          </div>
          <div className='divide-y divide-gray-50'>
            {resolvedItems.map(({ item, qty, price, sizeName, key }) => (
              <div key={key} className='flex items-center gap-3 px-4 py-3'>
                <div className='w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0'>
                  {item.image ? <img src={item.image} alt={item.name} className='w-full h-full object-cover'/> : <div className='w-full h-full flex items-center justify-center text-lg'>🍽️</div>}
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='font-bold text-gray-800 text-sm truncate'>{item.name}{sizeName ? ` (${sizeName})` : ''}</p>
                  <p className='text-xs text-gray-400'>₹{price} × {qty}</p>
                </div>
                <p className='font-black text-gray-900 text-sm'>₹{price * qty}</p>
              </div>
            ))}
          </div>
        </div>
        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
          <div className='px-4 py-3 border-b border-gray-50'>
            <p className='font-black text-gray-800 text-sm'>📍 Delivery Address</p>
          </div>
          <div className='p-3 flex flex-col gap-2'>
            {addressList.filter(a => a.status !== false).length === 0 && (
              <p className='text-sm text-gray-400 px-1'>No addresses saved.</p>
            )}
            {addressList.map((address, index) => {
              if (address.status === false) return null
              return (
                <label key={address._id || index} className='cursor-pointer'>
                  <div className={`border rounded-xl p-3 flex gap-3 transition-all ${Number(selectAddress) === index ? 'border-orange-400 bg-orange-50' : 'border-gray-100'}`}>
                    <input type='radio' value={index} checked={Number(selectAddress) === index}
                      onChange={e => setSelectAddress(Number(e.target.value))} name='food-address' className='accent-orange-500 mt-1'/>
                    <div>
                      <p className='font-bold text-gray-800 text-sm'>{address.address_line}</p>
                      <p className='text-xs text-gray-500'>{address.city}, {address.pincode}</p>
                    </div>
                  </div>
                </label>
              )
            })}
            <button onClick={() => setOpenAddress(true)}
              className='h-12 border-2 border-dashed border-gray-200 flex justify-center items-center rounded-xl text-gray-400 font-bold text-sm'>
              + Add New Address
            </button>
          </div>
        </div>
        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
          <div className='px-4 py-3 border-b border-gray-50'>
            <p className='font-black text-gray-800 text-sm'>🧾 Bill Summary</p>
          </div>
          <div className='px-4 py-3 space-y-2.5'>
            <div className='flex justify-between text-sm text-gray-600'>
              <span>Items total</span><span className='font-bold text-gray-800'>₹{subTotal}</span>
            </div>
            <div className='flex justify-between text-sm text-gray-600'>
              <span>Delivery fee</span>
              <span className='font-bold text-gray-800'>{deliveryFee === 0 ? <span className='text-green-600'>FREE</span> : `₹${deliveryFee}`}</span>
            </div>
            <div className='flex justify-between font-black text-base border-t border-dashed pt-3 mt-1'>
              <span>Grand Total</span><span className='text-orange-600'>₹{grandTotal}</span>
            </div>
          </div>
        </div>
        {user?.walletBalance > 0 && (
          <div className='bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex items-center gap-2'>
            <span className='text-lg'>💸</span>
            <p className='text-sm text-green-700 font-bold'>Wallet Balance: ₹{Number(user.walletBalance).toFixed(0)}</p>
          </div>
        )}
        <div className='flex flex-col gap-3'>
          <button onClick={handleCOD} disabled={placing}
            className='w-full py-4 border-2 border-gray-900 text-gray-900 rounded-2xl font-black text-sm uppercase disabled:opacity-40 active:scale-[0.98] transition'>
            💵 Cash on Delivery
          </button>
          <button onClick={handleWallet} disabled={placing}
            className='w-full py-4 bg-green-600 text-white rounded-2xl font-black text-sm uppercase disabled:opacity-40 active:scale-[0.98] transition'>
            💸 Pay via Wallet
          </button>
          <button onClick={handleOnlinePayment} disabled={placing}
            className='w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-sm uppercase shadow-lg shadow-orange-500/30 disabled:opacity-40 active:scale-[0.98] transition'>
            💳 Pay Online
          </button>
        </div>
      </div>
      {openAddress && <AddAddress close={() => setOpenAddress(false)} />}
    </section>
  )
}

export default FoodCheckoutPage
