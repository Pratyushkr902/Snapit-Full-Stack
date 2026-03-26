import React from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom' // Added for navigation
import NoData from '../components/NoData'

const MyOrders = () => {
  const orders = useSelector(state => state.orders.order)
  const navigate = useNavigate() // Initialize navigator

  console.log("order Items", orders)

  return (
    <div className='bg-neutral-50 min-h-screen pb-10'>
      <div className='bg-white shadow-md p-3 font-semibold sticky top-0 z-10'>
        <h1>Order</h1>
      </div>
      
      <div className='flex flex-col gap-3 p-4'>
        {
          !orders || orders.length === 0 ? (
            <NoData />
          ) : (
            orders.map((order, index) => {
              return (
                <div 
                  key={order._id + index + "order"} 
                  className='order bg-white rounded-lg p-4 text-sm shadow-sm border border-neutral-100 flex flex-col gap-3'
                >
                    <div className='flex justify-between items-center'>
                      <p className='text-neutral-500 font-mono'>Order No : {order?.orderId}</p>
                      {/* Status Badge */}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        order.delivery_status === 'Out for Delivery' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {order.delivery_status || 'Pending'}
                      </span>
                    </div>

                    <div className='flex gap-3 items-center'>
                      <img
                        src={order.product_details.image[0]} 
                        className='w-16 h-16 object-scale-down bg-neutral-100 rounded'
                        alt={order.product_details.name}
                      />  
                      <div className='flex-1'>
                        <p className='font-medium text-base line-clamp-1'>{order.product_details.name}</p>
                        <p className='text-neutral-400'>Qty: {order.quantity || 1}</p>
                      </div>

                      {/* LIVE TRACKING BUTTON */}
                      <button 
                        onClick={() => navigate(`/dashboard/order-tracking/${order.orderId}`)}
                        className='bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-semibold transition-all active:scale-95 shadow-sm'
                      >
                        Track Live
                      </button>
                    </div>
                </div>
              )
            })
          )
        }
      </div>
    </div>
  )
}

export default MyOrders