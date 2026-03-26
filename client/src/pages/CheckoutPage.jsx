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

  const handleCashOnDelivery = async () => {
    try {
      if (!addressList[selectAddress]) {
        return toast.error("Please select an address first")
      }

      const loadingToast = toast.loading("Locating nearest Mart...");
      let coords = { lat: 25.2921, lng: 84.8170 }; // Default Paliganj Center

      try {
        coords = await getCoordinates();
      } catch (e) {
        console.warn("Location access denied, using default mart routing.");
      }

      const response = await Axios({
        ...SummaryApi.CashOnDeliveryOrder,
        data: {
          list_items: cartItemsList,
          addressId: addressList[selectAddress]?._id,
          subTotalAmt: totalPrice,
          delivery_fee: deliveryFee,
          totalAmt: grandTotal,
          lat: coords.lat, // SENT TO BACKEND FOR NEAREST STORE CALCULATION
          lng: coords.lng  // SENT TO BACKEND FOR NEAREST STORE CALCULATION
        }
      })

      const { data: responseData } = response
      toast.dismiss(loadingToast);

      if (responseData.success) {
        toast.success(responseData.message)
        if (fetchCartItem) fetchCartItem()
        if (fetchOrder) fetchOrder()
        
        navigate('/success', {
          state: { text: "Order" }
        })
      }

    } catch (error) {
      AxiosToastError(error)
    }
  }

  const handleOnlinePayment = async () => {
    try {
      const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID;
      
      if (!RAZORPAY_KEY) {
        toast.error("Frontend Configuration Error: Razorpay Key not found.");
        return;
      }

      if (!addressList[selectAddress]) {
        return toast.error("Please select a delivery address")
      }

      const loadingToast = toast.loading("Finding nearest Mart and preparing payment...")

      let coords = { lat: 25.2921, lng: 84.8170 };
      try {
        coords = await getCoordinates();
      } catch (e) {
        console.warn("Location access denied.");
      }
      
      const response = await Axios({
        ...SummaryApi.payment_url, 
        data: {
          list_items: cartItemsList,
          addressId: addressList[selectAddress]?._id,
          subTotalAmt: totalPrice,
          delivery_fee: deliveryFee,
          totalAmt: grandTotal,
          lat: coords.lat, // SENT TO BACKEND
          lng: coords.lng  // SENT TO BACKEND
        }
      })

      const { data: responseData } = response
      toast.dismiss(loadingToast)

      if (responseData && responseData.id) {
        const options = {
            key: RAZORPAY_KEY, 
            amount: responseData.amount, 
            currency: responseData.currency || "INR",
            name: "Snapit Grocery",
            description: "Online Payment",
            order_id: responseData.id, 
            handler: async function (response) {
                toast.success("Payment Successful")
                if (fetchCartItem) fetchCartItem()
                if (fetchOrder) fetchOrder()
                navigate('/success', { state: { text: "Order" } })
            },
            prefill: {
                name: user?.name || "Customer",
                email: user?.email || "",
                contact: addressList[selectAddress]?.mobile || ""
            },
            theme: { color: "#16a34a" },
            modal: {
                ondismiss: function() { toast.error("Payment Cancelled"); }
            }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response){
          toast.error("Payment Failed: " + response.error.description);
        });
        rzp.open();
      } else {
        toast.error("Backend Error: Could not generate Payment ID.");
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
            {
              addressList.length > 0 ? (
                addressList.map((address, index) => {
                  return (
                    <label key={address._id || index} htmlFor={"address" + index} className={`${!address.status && "hidden"} cursor-pointer`}>
                      <div className={`border rounded-xl p-3 flex gap-3 hover:bg-blue-50 transition-all ${Number(selectAddress) === index ? 'border-primary-200 bg-blue-50 shadow-sm' : ''}`}>
                        <div>
                          <input 
                            id={"address" + index} 
                            type='radio' 
                            value={index} 
                            checked={Number(selectAddress) === index}
                            onChange={(e) => setSelectAddress(Number(e.target.value))} 
                            name='address' 
                          />
                        </div>
                        <div>
                          <p className='font-bold text-slate-800'>{address.address_line}</p>
                          <p className='text-sm text-slate-600'>{address.city}, {address.state}</p>
                          <p className='text-sm text-slate-600'>{address.country} - {address.pincode}</p>
                          <p className='text-xs font-bold text-primary-200 mt-1 uppercase'>Contact: {address.mobile}</p>
                        </div>
                      </div>
                    </label>
                  )
                })
              ) : (
                <p className='text-neutral-500 p-2'>No addresses found. Please add one.</p>
              )
            }
            <div onClick={() => setOpenAddress(true)} className='h-16 bg-blue-50 border-2 border-dashed border-neutral-300 flex justify-center items-center cursor-pointer hover:border-primary-200 rounded-xl text-neutral-500 font-bold'>
              + Add New Address
            </div>
          </div>
        </div>

        <div className='w-full max-w-md bg-white py-4 px-2 h-fit shadow-lg rounded-[2rem] border border-slate-100'>
          <h3 className='text-lg font-black px-4 uppercase text-slate-800'>Bill Summary</h3>
          <div className='p-4 space-y-3'>
            <div className='flex gap-4 justify-between'>
              <p className='text-slate-500 font-medium'>Items total</p>
              <p className='flex items-center gap-2 font-bold'>
                <span className='line-through text-neutral-300 text-sm font-normal'>{DisplayPriceInRupees(notDiscountTotalPrice)}</span>
                <span>{DisplayPriceInRupees(totalPrice)}</span>
              </p>
            </div>
            <div className='flex gap-4 justify-between'>
              <p className='text-slate-500 font-medium'>Quantity</p>
              <p className='font-bold'>{totalQty} {totalQty > 1 ? "items" : "item"}</p>
            </div>
            
            <div className='flex gap-4 justify-between'>
              <p className='text-slate-500 font-medium'>Delivery Charge</p>
              <p className={`${deliveryFee === 0 ? "text-green-600 font-black" : "text-slate-800 font-bold"}`}>
                {deliveryFee === 0 ? "FREE" : DisplayPriceInRupees(deliveryFee)}
              </p>
            </div>

            {deliveryFee > 0 && (
              <div className='bg-orange-50 p-2 rounded-lg border border-orange-100'>
                <p className='text-[10px] text-orange-600 font-black italic text-center uppercase'>
                  Add {DisplayPriceInRupees(399 - totalPrice)} more for Free Delivery
                </p>
              </div>
            )}

            <div className='font-black flex items-center justify-between border-t border-dashed pt-4 text-xl text-slate-900'>
              <p>Grand total</p>
              <p>{DisplayPriceInRupees(grandTotal)}</p>
            </div>
          </div>

          <div className='w-full flex flex-col gap-3 p-4'>
            <button 
                disabled={cartItemsList.length === 0}
                className={`py-4 px-4 bg-slate-900 hover:bg-black rounded-2xl text-white font-black transition-all shadow-xl shadow-slate-200 uppercase tracking-widest text-sm ${cartItemsList.length === 0 ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`} 
                onClick={handleOnlinePayment}
            >
                Pay Online Now
            </button>

            <button 
                disabled={cartItemsList.length === 0}
                className={`py-4 px-4 border-2 border-slate-900 font-black text-slate-900 hover:bg-slate-900 hover:text-white rounded-2xl transition-all uppercase tracking-widest text-sm ${cartItemsList.length === 0 ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`} 
                onClick={handleCashOnDelivery}
            >
                Cash on Delivery
            </button>
          </div>
        </div>
      </div>

      {
        openAddress && (
          <AddAddress close={() => setOpenAddress(false)} />
        )
      }
    </section>
  )
}

export default CheckoutPage