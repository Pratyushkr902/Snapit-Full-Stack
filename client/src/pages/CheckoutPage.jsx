import React, { useState, useEffect } from 'react'
import { useGlobalContext } from '../provider/GlobalProvider'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import AxiosToastError from '../utils/AxiosToastError'
import { useNavigate } from 'react-router-dom'
import { IoLocationSharp, IoWalletOutline, IoCardOutline, IoBicycleOutline, IoAddCircleOutline } from 'react-icons/io5'
import AddAddress from '../components/AddAddress'

const SERVICEABLE_AREAS = [
  'paliganj', 'sarsi', 'kurkuri', 'acchua', 'chandos', 'chiksi', 'milki', 'akhtiyarpur', 'balipakar'
]

const CheckoutPage = () => {
  const { cartItems, addressList, fetchAddress, walletDetails, fetchWallet } = useGlobalContext()
  const [selectAddress, setSelectAddress] = useState(0)
  const [openAddressModal, setOpenAddressModal] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('') // 'COD' | 'RAZORPAY' | 'WALLET'

  const navigate = useNavigate()

  // Calculate Order Value Data Matrix
  const subTotalAmt = cartItems.reduce((acc, curr) => acc + (curr.productId.price * curr.quantity), 0)
  const deliveryCharge = subTotalAmt > 200 ? 0 : 15
  const totalAmt = subTotalAmt + deliveryCharge

  useEffect(() => {
    fetchAddress()
    if (fetchWallet) fetchWallet()
  }, [])

  // --- CORE SYSTEM GUARD: PREVENT UNSERVICEABLE ORDERS GLOBAL CHECK ---
  const verifyServiceability = () => {
    if (addressList.length === 0) {
      toast.error("Please add a delivery address to proceed.")
      return false
    }

    const selectedAddr = addressList[selectAddress]
    if (!selectedAddr) {
      toast.error("Please select a valid delivery address.")
      return false
    }

    if (selectedAddr?.city) {
      const cityLower = selectedAddr.city.toLowerCase().trim()
      const isServiceable = SERVICEABLE_AREAS.some(area => cityLower.includes(area))
      
      if (!isServiceable) {
        toast.error("Location not serviceable. Our team is working tirelessly to bring 10-minute deliveries to your location! 🚀")
        return false
      }
    }
    return true
  }

  // 1. CASH ON DELIVERY SYSTEM
  const handleCashOnDelivery = async () => {
    if (!verifyServiceability()) return
    
    setPaymentLoading(true)
    try {
      const selectedAddr = addressList[selectAddress]
      const response = await Axios({
        ...SummaryApi.CashOnDeliveryOrder,
        data: {
          list_items: cartItems,
          addressId: selectedAddr._id,
          subTotalAmt: subTotalAmt,
          totalAmt: totalAmt,
          lat: selectedAddr.lat || null,
          lng: selectedAddr.lng || null
        }
      })

      if (response.data.success) {
        toast.success("Order placed successfully via COD! 🎉")
        navigate('/dashboard/my-orders')
      }
    } catch (error) {
      AxiosToastError(error)
    } finally {
      setPaymentLoading(false)
    }
  }

  // 2. WALLET TRANSACTION GATEWAY
  const handleWalletPayment = async () => {
    if (!verifyServiceability()) return

    const walletBalance = walletDetails?.balance || 0
    if (walletBalance < totalAmt) {
      return toast.error("Insufficient Wallet Balance! Please add money or choose another payment method.")
    }

    setPaymentLoading(true)
    try {
      const selectedAddr = addressList[selectAddress]
      const response = await Axios({
        ...SummaryApi.payWithWallet,
        data: {
          list_items: cartItems,
          addressId: selectedAddr._id,
          subTotalAmt: subTotalAmt,
          totalAmt: totalAmt
        }
      })

      if (response.data.success) {
        toast.success("Payment successful using Snapit Wallet! 💸")
        navigate('/dashboard/my-orders')
      }
    } catch (error) {
      AxiosToastError(error)
    } finally {
      setPaymentLoading(false)
    }
  }

  // 3. RAZORPAY ONLINE GATEWAY INTEGRATION
  const handleRazorpayPayment = async () => {
    if (!verifyServiceability()) return

    setPaymentLoading(true)
    try {
      const selectedAddr = addressList[selectAddress]
      
      // Step A: Request a transactional order configuration from Razorpay core API
      const orderResponse = await Axios({
        ...SummaryApi.payment_url,
        data: {
          totalAmt: totalAmt,
          addressId: selectedAddr._id
        }
      })

      const orderData = orderResponse.data

      // Step B: Initialize the browser Client Checkout configurations
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Snapit Delivery",
        description: "Hyperlocal Checkout Payment Gateway",
        order_id: orderData.id,
        handler: async function (authResponse) {
          try {
            // Step C: Dispatch secure cryptographic signature evaluation payload
            const verificationResponse = await Axios({
              url: '/api/order/verify-payment', // Links to backend verifyPaymentController
              method: 'post',
              data: {
                razorpay_order_id: authResponse.razorpay_order_id,
                razorpay_payment_id: authResponse.razorpay_payment_id,
                razorpay_signature: authResponse.razorpay_signature,
                list_items: cartItems,
                addressId: selectedAddr._id,
                subTotalAmt: subTotalAmt,
                totalAmt: totalAmt
              }
            })

            if (verificationResponse.data.success) {
              toast.success("Online payment verified successfully! 🚀")
              navigate('/dashboard/my-orders')
            }
          } catch (verifyErr) {
            toast.error("Payment verification failed. Please contact support.")
          }
        },
        prefill: {
          contact: selectedAddr.mobile || "",
        },
        theme: {
          color: "#16a34a"
        }
      }

      const razorpayWindow = new window.Razorpay(options)
      razorpayWindow.open()

    } catch (error) {
      AxiosToastError(error)
    } finally {
      setPaymentLoading(false)
    }
  }

  // Routing processing framework orchestration layer
  const handlePlaceOrder = () => {
    if (!paymentMethod) {
      return toast.error("Please select a payment method to complete checkout.")
    }
    if (paymentMethod === 'COD') handleCashOnDelivery()
    if (paymentMethod === 'RAZORPAY') handleRazorpayPayment()
    if (paymentMethod === 'WALLET') handleWalletPayment()
  }

  return (
    <section className='bg-slate-50 min-h-screen py-8 px-4 md:px-12 lg:px-24'>
      <div className='max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8'>
        
        {/* LEFT & CENTER PANEL: ADDRESSES & PAYMENT LOGICS */}
        <div className='lg:col-span-2 space-y-6'>
          
          {/* Section 1: Address Frame Panel */}
          <div className='bg-white p-6 rounded-2xl shadow-sm border border-slate-100'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='font-black text-slate-800 text-lg flex items-center gap-2'>
                <IoLocationSharp className='text-green-600' />
                1. Select Delivery Address
              </h3>
              <button 
                onClick={() => setOpenAddressModal(true)}
                className='text-green-600 font-bold text-sm flex items-center gap-1 hover:text-green-700 transition-colors'
              >
                <IoAddCircleOutline size={18} /> Add New
              </button>
            </div>

            {addressList.length === 0 ? (
              <div className='text-center py-6 border-2 border-dashed border-slate-200 rounded-xl'>
                <p className='text-sm text-slate-500'>No addresses saved yet. Add one to unlock delivery options.</p>
              </div>
            ) : (
              <div className='grid gap-3 max-h-64 overflow-y-auto pr-1'>
                {addressList.map((addr, index) => {
                  const isCurrentServiceable = SERVICEABLE_AREAS.some(area => addr.city?.toLowerCase().includes(area))
                  return (
                    <div 
                      key={addr._id || index}
                      onClick={() => setSelectAddress(index)}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${selectAddress === index ? 'border-green-500 bg-green-50/40' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                    >
                      <div className='flex items-start gap-3'>
                        <input 
                          type='radio' 
                          name='checkout_address'
                          checked={selectAddress === index}
                          onChange={() => setSelectAddress(index)}
                          className='mt-1 accent-green-600'
                        />
                        <div>
                          <p className='font-bold text-sm text-slate-800'>{addr.address_line}</p>
                          <p className='text-xs text-slate-500 mt-0.5'>{addr.city}, {addr.state} - {addr.pincode}</p>
                          <p className='text-xs text-slate-600 font-medium mt-1'>📞 {addr.mobile}</p>
                          
                          {!isCurrentServiceable && (
                            <span className='inline-block text-[10px] font-extrabold bg-red-100 text-red-700 px-2 py-0.5 rounded mt-2 uppercase tracking-wide'>
                              ⚠️ Not Serviceable
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Section 2: Payment Selector Engine Frame */}
          <div className='bg-white p-6 rounded-2xl shadow-sm border border-slate-100'>
            <h3 className='font-black text-slate-800 text-lg flex items-center gap-2 mb-4'>
              <IoCardOutline className='text-green-600' />
              2. Choose Payment Method
            </h3>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
              {/* Wallet Selection Module */}
              <div 
                onClick={() => setPaymentMethod('WALLET')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'WALLET' ? 'border-green-500 bg-green-50/40' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
              >
                <div className='flex flex-col items-center text-center gap-2'>
                  <IoWalletOutline size={26} className={paymentMethod === 'WALLET' ? 'text-green-600' : 'text-slate-500'} />
                  <div>
                    <p className='font-bold text-sm text-slate-800'>Snapit Wallet</p>
                    <p className='text-xs text-green-600 font-semibold mt-0.5'>Bal: ₹{walletDetails?.balance || 0}</p>
                  </div>
                </div>
              </div>

              {/* Razorpay Online Selection Module */}
              <div 
                onClick={() => setPaymentMethod('RAZORPAY')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'RAZORPAY' ? 'border-green-500 bg-green-50/40' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
              >
                <div className='flex flex-col items-center text-center gap-2'>
                  <IoCardOutline size={26} className={paymentMethod === 'RAZORPAY' ? 'text-green-600' : 'text-slate-500'} />
                  <div>
                    <p className='font-bold text-sm text-slate-800'>Online Payment</p>
                    <p className='text-xs text-slate-400 mt-0.5'>UPI, Cards, Netbanking</p>
                  </div>
                </div>
              </div>

              {/* Cash On Delivery Selection Module */}
              <div 
                onClick={() => setPaymentMethod('COD')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'COD' ? 'border-green-500 bg-green-50/40' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
              >
                <div className='flex flex-col items-center text-center gap-2'>
                  <IoBicycleOutline size={26} className={paymentMethod === 'COD' ? 'text-green-600' : 'text-slate-500'} />
                  <div>
                    <p className='font-bold text-sm text-slate-800'>Cash On Delivery</p>
                    <p className='text-xs text-slate-400 mt-0.5'>Pay rider at your door</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: BILLING INVOICE AND EXECUTION TRIGGERS */}
        <div className='bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit space-y-6'>
          <h3 className='font-black text-slate-800 text-lg border-b pb-3'>Order Summary</h3>
          
          {/* Cart item minimal scroll map list */}
          <div className='max-h-48 overflow-y-auto space-y-3 pr-1 border-b pb-4'>
            {cartItems.map((item) => (
              <div key={item._id} className='flex justify-between items-center text-sm'>
                <p className='text-slate-600 truncate max-w-[180px]'>
                  {item.productId.name} <span className='text-slate-400 font-bold'>x{item.quantity}</span>
                </p>
                <p className='font-bold text-slate-800'>Template: ₹{item.productId.price * item.quantity}</p>
              </div>
            ))}
          </div>

          {/* Pricing Ledger calculations frame sheet */}
          <div className='space-y-2 text-sm border-b pb-4'>
            <div className='flex justify-between text-slate-500'>
              <p>Items Subtotal</p>
              <p>₹{subTotalAmt}</p>
            </div>
            <div className='flex justify-between text-slate-500'>
              <p>Delivery Partner Fee</p>
              <p>{deliveryCharge === 0 ? <span className='text-green-600 font-bold'>FREE</span> : `₹${deliveryCharge}`}</p>
            </div>
          </div>

          <div className='flex justify-between items-center pb-2'>
            <p className='font-black text-slate-800 text-base'>Bill Total</p>
            <p className='font-black text-green-700 text-lg'>₹{totalAmt}</p>
          </div>

          {/* Core Master Trigger Call to Action */}
          <button
            type='button'
            disabled={paymentLoading || cartItems.length === 0}
            onClick={handlePlaceOrder}
            className='w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-green-100 tracking-wide text-sm flex items-center justify-center'
          >
            {paymentLoading ? 'Processing Secure Transaction...' : `PLACE ORDER — ₹${totalAmt}`}
          </button>
        </div>
      </div>

      {/* Global Add Address Layer Toggle Modal Mount */}
      {openAddressModal && <AddAddress close={() => setOpenAddressModal(false)} />}
    </section>
  )
}

export default CheckoutPage