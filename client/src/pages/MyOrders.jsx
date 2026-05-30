import React, { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import NoData from '../components/NoData'
import ReorderButton from '../components/ReorderButton'
import OrderInvoice from '../components/OrderInvoice'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import { useGlobalContext } from '../provider/GlobalProvider'

const MyOrders = () => {
  const orders = useSelector(state => state.orders.order)
  const navigate = useNavigate()
  const { fetchCartItem } = useGlobalContext()
  const [reorderingId, setReorderingId] = useState(null)

  const handleOrderAgain = async (order) => {
    try {
      setReorderingId(order._id)

      // Add all cart items from the order back to cart
      const cartItems = order.cartItems || []

      if (cartItems.length === 0) {
        // Fallback: if no cartItems array, add the single product
        const response = await Axios({
          ...SummaryApi.addTocart,
          data: {
            productId: order.product_details?._id || order.productId,
            quantity: order.quantity || 1
          }
        })
        if (response.data.success) {
          toast.success('Item added to cart!')
          if (fetchCartItem) fetchCartItem()
          navigate('/cart')
        }
      } else {
        // Add all items from original order
        const promises = cartItems.map(item =>
          Axios({
            ...SummaryApi.addTocart,
            data: {
              productId: item.productId?._id || item.productId,
              quantity: item.quantity || 1
            }
          })
        )
        await Promise.all(promises)
        toast.success(`${cartItems.length} item${cartItems.length > 1 ? 's' : ''} added to cart!`)
        if (fetchCartItem) fetchCartItem()
        navigate('/cart')
      }
    } catch (error) {
      toast.error('Could not add items to cart')
    } finally {
      setReorderingId(null)
    }
  }

  return (
    <div className='bg-neutral-50 min-h-screen pb-10'>
      <div className='bg-white shadow-md p-4 font-bold text-xl sticky top-0 z-10 flex items-center justify-between'>
        <h1>My Orders</h1>
        <span className='text-sm font-medium text-neutral-400'>{orders?.length || 0} Orders Total</span>
      </div>

      <div className='flex flex-col gap-4 p-4 max-w-2xl mx-auto'>
        {!orders || orders.length === 0 ? (
          <div className='mt-20'>
            <NoData />
            <p className='text-center text-neutral-400 mt-4'>You haven't placed any orders yet.</p>
          </div>
        ) : (
          orders.map((order, index) => (
            <div
              key={order._id + index + "order"}
              className='bg-white rounded-xl p-5 shadow-sm border border-neutral-200 flex flex-col gap-4 hover:shadow-md transition-shadow'
            >
              {/* Header: ID and Status */}
              <div className='flex justify-between items-center border-b pb-3'>
                <div className='flex flex-col'>
                  <p className='text-[10px] uppercase tracking-widest text-neutral-400 font-bold'>Order ID</p>
                  <p className='text-neutral-700 font-mono font-semibold'>{order?.orderId}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  order.delivery_status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                  order.delivery_status === 'Out for Delivery' ? 'bg-orange-100 text-orange-700 animate-pulse' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {order.delivery_status || 'Processing'}
                </span>
              </div>

              {/* Product Body */}
              <div className='flex gap-4 items-start'>
                <img
                  src={order.product_details.image[0]}
                  className='w-20 h-20 object-scale-down bg-neutral-50 rounded-lg border border-neutral-100'
                  alt={order.product_details.name}
                />
                <div className='flex-1 py-1'>
                  <h3 className='font-bold text-slate-800 text-lg line-clamp-1'>{order.product_details.name}</h3>
                  <div className='flex items-center gap-3 mt-1'>
                    <p className='text-neutral-500 text-sm font-medium'>Qty: {order.quantity || 1}</p>
                    <span className='w-1 h-1 bg-neutral-300 rounded-full'></span>
                    <p className='text-slate-900 font-bold'>₹{order.totalAmt}</p>
                  </div>
                  <p className='text-[10px] text-neutral-400 mt-2 italic'>
                    Ordered on: {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Action Footer */}
              <div className='flex flex-wrap gap-3 mt-2 pt-3 border-t'>
                {/* LIVE TRACKING */}
                <button
                  onClick={() => navigate(`/dashboard/order-tracking/${order.orderId}`)}
                  className='flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg shadow-slate-200 flex items-center justify-center gap-2'
                >
                  📍 Track Live
                </button>

                {/* ORDER AGAIN — only for delivered orders */}
                {order.delivery_status === 'Delivered' && (
                  <button
                    onClick={() => handleOrderAgain(order)}
                    disabled={reorderingId === order._id}
                    className='flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg shadow-green-100 flex items-center justify-center gap-2'
                  >
                    {reorderingId === order._id ? (
                      <>
                        <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                        Adding...
                      </>
                    ) : (
                      <>🔁 Order Again</>
                    )}
                  </button>
                )}

                {/* REORDER */}
                <div className='flex-1'>
                  <ReorderButton orderId={order._id} />
                </div>

                {/* INVOICE — only shows for delivered orders */}
                <OrderInvoice order={order} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default MyOrders