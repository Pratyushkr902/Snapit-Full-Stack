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

const CheckoutPage = () => {
  const { notDiscountTotalPrice, totalPrice, totalQty, fetchCartItem, fetchOrder } = useGlobalContext()
  const [openAddress, setOpenAddress] = useState(false)
  const addressList = useSelector(state => state.addresses.addressList)
  const [selectAddress, setSelectAddress] = useState(0)
  const cartItemsList = useSelector(state => state.cartItem.cart)
  const user = useSelector(state => state.user) 
  const navigate = useNavigate()

  const deliveryFee = totalPrice >= 399 ? 0 : 12;
  const grandTotal = totalPrice + deliveryFee;

  // NEW: Helper function to get coordinates
  const getCoordinates = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject(new Error("Geolocation not supported"));
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true }
      );
    });
  };

  // --- WALLET PAYMENT HANDLER ---
  const handleWalletPayment = async () => {
    try {
      if (!addressList[selectAddress]) {
        return toast.error("Please select a delivery address")
      }

      // Check balance before processing
      if ((user?.walletBalance || 0) < grandTotal) {
        return toast.error(`Insufficient Balance! You need ${DisplayPriceInRupees(grandTotal - user.walletBalance)} more.`)
      }

      const loadingToast = toast.loading("Processing Wallet Payment...")

      let coords = { lat: 25.2921, lng: 84.8170 };
      try {
        coords = await getCoordinates();
      } catch (e) {
        console.warn("Location access denied.");
      }

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

      const { data: responseData } = response
      toast.dismiss(loadingToast);

      if (responseData.success) {
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
      if (!addressList[selectAddress]) {
        return toast.error("Please select an address first")
      }

      const loadingToast = toast.loading("Locating nearest Mart...");
      let coords = { lat: 25.2921, lng: 84.8170 };

      try {
        coords = await getCoordinates();
      } catch (e) {
        console.warn("Location access denied.");
      }

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

      const { data: responseData } = response
      toast.dismiss(loadingToast);

      if (responseData.success) {
        toast.success(responseData.message)
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
      const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!RAZORPAY_KEY) return toast.error("Razorpay Key not found.");

      if (!addressList[selectAddress]) return toast.error("Please select a delivery address")

      const loadingToast = toast.loading("Preparing payment...")
      
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
                toast.success("Payment Successful")
                if (fetchCartItem) fetchCartItem()
                if (fetchOrder) fetchOrder()
                navigate('/success', { state: { text: "Order" } })
            },
            prefill: {
                name: user?.name || "",
                contact: addressList[selectAddress]?.mobile || ""
            },
            theme: { color: "#16a34a" }
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (error) {
      AxiosToastError(error)
    }
  }

  return (
    <section className='bg-blue-50'>
      <div className='container mx-auto p-4 flex flex-col lg:flex-row w-full gap-5 justify-between'>
        <div className='w-full'>
          <h3 className='text-lg font-semibold uppercase tracking-tight text-slate-700'>Choose your address</h3>
          <div className='bg-white p-2 grid gap-4 mt-2 rounded-xl shadow-sm'>
            {addressList.length > 0 ? (
                addressList.map((address, index) => (
                    <label key={address._id || index} className={`${!address.status && "hidden"} cursor-pointer`}>
                      <div className={`border rounded-xl p-3 flex gap-3 hover:bg-blue-50 transition-all ${Number(selectAddress) === index ? 'border-primary-200 bg-blue-50' : ''}`}>
                        <input type='radio' value={index} checked={Number(selectAddress) === index} onChange={(e) => setSelectAddress(Number(e.target.value))} name='address' />
                        <div>
                          <p className='font-bold text-slate-800'>{address.address_line}</p>
                          <p className='text-sm text-slate-600'>{address.city}, {address.pincode}</p>
                          <p className='text-xs font-bold text-primary-200 uppercase'>Contact: {address.mobile}</p>
                        </div>
                      </div>
                    </label>
                ))
              ) : <p className='text-neutral-500 p-2'>No addresses found.</p>
            }
            <div onClick={() => setOpenAddress(true)} className='h-16 bg-blue-50 border-2 border-dashed border-neutral-300 flex justify-center items-center cursor-pointer rounded-xl text-neutral-500 font-bold'>+ Add New Address</div>
          </div>
        </div>

        <div className='w-full max-w-md bg-white py-4 px-2 h-fit shadow-lg rounded-[2rem] border border-slate-100'>
          <div className='mx-4 mb-4 bg-green-50 border border-green-100 rounded-2xl p-4'>
             <div className='flex items-center justify-between'>
                <div>
                   <p className='text-[10px] font-black uppercase text-green-600'>Wallet Balance</p>
                   <p className='text-xl font-black text-slate-900'>{DisplayPriceInRupees(user?.walletBalance || 0)}</p>
                </div>
                <div className='text-2xl'>💰</div>
             </div>
             {(user?.walletBalance || 0) < grandTotal && (
                <p className='text-[10px] text-red-500 font-bold mt-2 uppercase underline'>Insufficient Balance</p>
             )}
          </div>

          <h3 className='text-lg font-black px-4 uppercase text-slate-800'>Bill Summary</h3>
          <div className='p-4 space-y-3'>
            <div className='flex justify-between'><p className='text-slate-500'>Items total</p><p className='font-bold'>{DisplayPriceInRupees(totalPrice)}</p></div>
            <div className='flex justify-between'><p className='text-slate-500'>Delivery Charge</p><p className={deliveryFee === 0 ? "text-green-600 font-black" : "font-bold"}>{deliveryFee === 0 ? "FREE" : DisplayPriceInRupees(deliveryFee)}</p></div>
            <div className='font-black flex justify-between border-t border-dashed pt-4 text-xl text-slate-900'><p>Grand total</p><p>{DisplayPriceInRupees(grandTotal)}</p></div>
          </div>

          <div className='w-full flex flex-col gap-3 p-4'>
            {/* IMPROVED WALLET BUTTON */}
            <button 
                disabled={cartItemsList.length === 0}
                className={`py-4 px-4 rounded-2xl font-black transition-all shadow-xl uppercase tracking-widest text-sm flex items-center justify-center gap-2 
                ${(user?.walletBalance || 0) >= grandTotal ? 'bg-green-700 text-white active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`} 
                onClick={handleWalletPayment}
            >
                Pay via Wallet { (user?.walletBalance || 0) >= grandTotal ? '💸' : '🔒' }
            </button>

            <button disabled={cartItemsList.length === 0} className='py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-sm active:scale-95' onClick={handleOnlinePayment}>Online Payment</button>
            <button disabled={cartItemsList.length === 0} className='py-4 border-2 border-slate-900 text-slate-900 rounded-2xl font-black uppercase tracking-widest text-sm active:scale-95' onClick={handleCashOnDelivery}>Cash on Delivery</button>
          </div>
        </div>
      </div>
      {openAddress && <AddAddress close={() => setOpenAddress(false)} />}
    </section>
  )
}

export default CheckoutPage