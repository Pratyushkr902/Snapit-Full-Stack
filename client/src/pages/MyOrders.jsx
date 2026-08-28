import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { IoArrowBack } from 'react-icons/io5'
import NoData from '../components/NoData'
import OrderInvoice from '../components/OrderInvoice'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import { setOrder } from '../store/orderSlice'
import toast from 'react-hot-toast'

const REASONS = ['Wrong item delivered', 'Item damaged', 'Item missing', 'Poor quality', 'Other']

const MyOrders = () => {
  const orders   = useSelector(state => state.orders.order)
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const [refundModal, setRefundModal]       = useState(null)
  const [cancelModal, setCancelModal]       = useState(null)
  const [cancelReason, setCancelReason]     = useState('Changed my mind')
  const [cancelling, setCancelling]         = useState(false)
  const [myRefunds, setMyRefunds]           = useState([])
  const [loadingRefunds, setLoadingRefunds] = useState(false)
  const [submitting, setSubmitting]         = useState(false)
  const [activeTab, setActiveTab]           = useState('orders')
  const [form, setForm] = useState({ reason: '', description: '', refundAmount: '' })

  useEffect(() => { fetchMyRefunds() }, [])

  const handleCancelOrder = async () => {
    if (!cancelModal) return
    try {
      setCancelling(true)
      const res = await Axios({
        ...SummaryApi.cancelOrder,
        data: {
          orderId: cancelModal.orderId || cancelModal._id,
          reason: cancelReason
        }
      })
      if (res.data.success) {
        toast.success(res.data.message || 'Order cancelled successfully')
        setCancelModal(null)
        // Update local Redux order state
        dispatch(setOrder(orders.map(o => (o._id === cancelModal._id || o.orderId === cancelModal.orderId)
          ? { ...o, delivery_status: 'Cancelled', cancellation_reason: cancelReason }
          : o
        )))
      } else {
        toast.error(res.data.message || 'Failed to cancel order')
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error cancelling order')
    } finally {
      setCancelling(false)
    }
  }

  const fetchMyRefunds = async () => {
    try {
      setLoadingRefunds(true)
      const res = await Axios({ ...SummaryApi.getMyRefunds })
      if (res.data.success) setMyRefunds(res.data.data)
    } catch {}
    finally { setLoadingRefunds(false) }
  }

  const openRefundModal = (order) => {
    setForm({ reason: '', description: '', refundAmount: order.totalAmt || '' })
    setRefundModal(order)
  }

  const submitRefund = async () => {
    if (!form.reason) return toast.error('Please select a reason')
    try {
      setSubmitting(true)
      const res = await Axios({
        ...SummaryApi.submitRefund,
        data: {
          orderId:      refundModal._id,
          reason:       form.reason,
          description:  form.description,
          refundAmount: Number(form.refundAmount),
        }
      })
      if (res.data.success) {
        toast.success('Refund request submitted!')
        setRefundModal(null)
        fetchMyRefunds()
        setActiveTab('refunds')
      } else {
        toast.error(res.data.message || 'Failed to submit')
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Error submitting refund')
    } finally {
      setSubmitting(false)
    }
  }

  const statusColor = (s) => ({
    Pending:        'bg-yellow-100 text-yellow-700',
    'Under Review': 'bg-blue-100 text-blue-700',
    Approved:       'bg-emerald-100 text-emerald-700',
    Rejected:       'bg-red-100 text-red-700',
    Refunded:       'bg-purple-100 text-purple-700',
  }[s] || 'bg-gray-100 text-gray-600')

  const alreadyRefunded = (orderId) =>
    myRefunds.some(r => (r.orderId?._id || r.orderId)?.toString() === orderId?.toString())

  return (
    <div className='bg-neutral-50 min-h-screen pb-10'>

      {/* Header with Back Button */}
      <div className='bg-white shadow-md p-4 font-bold text-xl sticky top-0 z-10 flex items-center gap-3'>
        <button onClick={() => navigate(-1)} className='text-neutral-500 hover:text-neutral-800 transition-colors'>
          <IoArrowBack size={22} />
        </button>
        <h1 className='flex-1'>My Orders</h1>
        <span className='text-sm font-medium text-neutral-400'>{orders?.length || 0} Orders</span>
      </div>

      {/* Tabs */}
      <div className='flex gap-2 px-4 pt-4 max-w-2xl mx-auto'>
        <button onClick={() => setActiveTab('orders')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'orders' ? 'bg-slate-900 text-white' : 'bg-white border border-neutral-200 text-neutral-500'
          }`}>
          🛍️ Orders ({orders?.length || 0})
        </button>
        <button onClick={() => setActiveTab('refunds')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'refunds' ? 'bg-rose-600 text-white' : 'bg-white border border-neutral-200 text-neutral-500'
          }`}>
          🔄 Refunds ({myRefunds.length})
        </button>
      </div>

      <div className='flex flex-col gap-4 p-4 max-w-2xl mx-auto'>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <>
            {!orders || orders.length === 0 ? (
              <div className='mt-20'>
                <NoData />
                <p className='text-center text-neutral-400 mt-4'>You haven't placed any orders yet.</p>
              </div>
            ) : (
              orders.map((order, index) => (
                <div key={order._id + index + "order"}
                  className='bg-white rounded-xl p-5 shadow-sm border border-neutral-200 flex flex-col gap-4 hover:shadow-md transition-shadow'>

                  <div className='flex justify-between items-center border-b pb-3'>
                    <div className='flex flex-col'>
                      <div className='flex items-center gap-2'>
                        <p className='text-[10px] uppercase tracking-widest text-neutral-400 font-bold'>Order ID</p>
                        {order.delivery_distance_km > 0 && (
                          <span className='bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200'>
                            📍 {order.delivery_distance_km} km
                          </span>
                        )}
                      </div>
                      <p className='text-neutral-700 font-mono font-semibold'>{order?.orderId}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      order.delivery_status === 'Delivered'        ? 'bg-emerald-100 text-emerald-700' :
                      order.delivery_status === 'Out for Delivery' ? 'bg-orange-100 text-orange-700 animate-pulse' :
                      order.delivery_status === 'Cancelled'        ? 'bg-rose-100 text-rose-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {order.delivery_status || 'Processing'}
                    </span>
                  </div>

                  <div className='flex gap-4 items-start'>
                    <img src={order.product_details.image[0]}
                      className='w-20 h-20 object-scale-down bg-neutral-50 rounded-lg border border-neutral-100'
                      alt={order.product_details.name} />
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

                  <div className='flex flex-wrap gap-3 mt-2 pt-3 border-t'>
                    <button onClick={() => navigate(`/dashboard/order-tracking/${order.orderId}`)}
                      className='flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg shadow-slate-200 flex items-center justify-center gap-2'>
                      📍 Track Live
                    </button>
                    <OrderInvoice order={order} />

                    {/* Zomato-Style Cancellation: Only visible when Pending and unaccepted */}
                    {order.delivery_status === 'Pending' && (!order.seller_status || order.seller_status === 'Pending') && (
                      <button
                        onClick={() => setCancelModal(order)}
                        className='flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-1.5'
                      >
                        ❌ Cancel
                      </button>
                    )}

                    {order.delivery_status === 'Delivered' && (
                      alreadyRefunded(order._id) ? (
                        <span className='flex-1 text-center py-2.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200'>
                          ✅ Refund Submitted
                        </span>
                      ) : (
                        <button onClick={() => openRefundModal(order)}
                          className='flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2'>
                          🔄 Request Refund
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* Refunds Tab */}
        {activeTab === 'refunds' && (
          <>
            {loadingRefunds ? (
              <div className='text-center py-20 text-neutral-400'>Loading refunds...</div>
            ) : myRefunds.length === 0 ? (
              <div className='mt-10 text-center'>
                <p className='text-5xl mb-3'>🔄</p>
                <p className='text-neutral-400 font-medium'>No refund requests yet</p>
                <p className='text-neutral-300 text-sm mt-1'>Refunds appear here after you request them on a delivered order</p>
              </div>
            ) : (
              myRefunds.map(r => (
                <div key={r._id} className='bg-white rounded-xl p-5 shadow-sm border border-neutral-200 flex flex-col gap-3'>
                  <div className='flex justify-between items-start'>
                    <div>
                      <p className='text-[10px] uppercase tracking-widest text-neutral-400 font-bold'>Refund ID</p>
                      <p className='text-neutral-700 font-mono text-sm'>{r._id?.slice(-8).toUpperCase()}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${statusColor(r.status)}`}>
                      {r.status}
                    </span>
                  </div>
                  <div className='flex justify-between text-sm'>
                    <span className='text-neutral-500'>Order: <span className='font-mono font-semibold text-neutral-700'>{r.orderId?.orderId || '—'}</span></span>
                    <span className='font-black text-rose-600'>₹{r.refundAmount}</span>
                  </div>
                  <div className='bg-neutral-50 rounded-lg px-3 py-2 text-xs text-neutral-600'>
                    <span className='font-bold'>Reason:</span> {r.reason}
                    {r.description && <p className='mt-1 text-neutral-400'>{r.description}</p>}
                  </div>
                  {r.adminNote && (
                    <div className='bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700'>
                      <span className='font-bold'>Admin Note:</span> {r.adminNote}
                    </div>
                  )}
                  {r.refundMethod === 'wallet' && r.status === 'Refunded' && (
                    <div className='bg-emerald-50 rounded-lg px-3 py-2 text-xs text-emerald-700 font-bold'>
                      ✅ ₹{r.refundAmount} credited to your wallet
                    </div>
                  )}
                  <p className='text-[10px] text-neutral-300'>
                    Submitted: {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* Refund Modal */}
      {refundModal && (
        <div className='fixed inset-0 z-50 bg-black/50 flex items-end justify-center p-4'>
          <div className='bg-white rounded-2xl w-full max-w-lg p-6 flex flex-col gap-4'>
            <div className='flex justify-between items-center'>
              <h2 className='font-black text-lg text-slate-800'>🔄 Request Refund</h2>
              <button onClick={() => setRefundModal(null)} className='text-neutral-400 text-2xl leading-none'>×</button>
            </div>
            <p className='text-xs text-neutral-400'>Order: <span className='font-mono font-semibold text-neutral-600'>{refundModal.orderId}</span></p>

            <div className='flex flex-col gap-1'>
              <label className='text-xs font-bold text-neutral-500 uppercase'>Reason *</label>
              <select value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                className='border border-neutral-200 rounded-xl px-3 py-2.5 text-sm text-neutral-700 outline-none focus:ring-2 focus:ring-rose-300'>
                <option value=''>Select a reason</option>
                {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className='flex flex-col gap-1'>
              <label className='text-xs font-bold text-neutral-500 uppercase'>Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3} placeholder='Describe the issue...'
                className='border border-neutral-200 rounded-xl px-3 py-2.5 text-sm text-neutral-700 outline-none focus:ring-2 focus:ring-rose-300 resize-none' />
            </div>

            <div className='flex flex-col gap-1'>
              <label className='text-xs font-bold text-neutral-500 uppercase'>Refund Amount (₹)</label>
              <input type='number' value={form.refundAmount} onChange={e => setForm(f => ({ ...f, refundAmount: e.target.value }))}
                className='border border-neutral-200 rounded-xl px-3 py-2.5 text-sm text-neutral-700 outline-none focus:ring-2 focus:ring-rose-300' />
            </div>

            <div className='flex gap-3 mt-2'>
              <button onClick={() => setRefundModal(null)}
                className='flex-1 py-3 rounded-xl border border-neutral-200 text-neutral-500 font-bold text-sm'>
                Cancel
              </button>
              <button onClick={submitRefund} disabled={submitting}
                className='flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm disabled:opacity-50 transition-all active:scale-95'>
                {submitting ? 'Submitting...' : 'Submit Refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Modal (Zomato Style) */}
      {cancelModal && (
        <div className='fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4'>
          <div className='bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200'>
            <div className='text-center'>
              <div className='w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-3'>
                ❌
              </div>
              <h3 className='font-black text-slate-800 text-lg'>Cancel Order?</h3>
              <p className='text-xs text-slate-500 mt-1'>
                Are you sure you want to cancel order #{cancelModal.orderId}?
                {cancelModal.payment_status === 'PAID' && ' Any payment made will be refunded to your wallet immediately.'}
              </p>
            </div>

            <div className='mt-4'>
              <label className='text-xs font-bold text-slate-700 block mb-1.5'>Reason for cancellation:</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className='w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:border-rose-500 focus:outline-none bg-slate-50'
              >
                <option value='Changed my mind'>Changed my mind</option>
                <option value='Ordered by mistake'>Ordered by mistake</option>
                <option value='Want to change items/address'>Want to change items/address</option>
                <option value='Delivery time is too long'>Delivery time is too long</option>
                <option value='Other'>Other</option>
              </select>
            </div>

            <div className='flex gap-2 mt-5'>
              <button
                disabled={cancelling}
                onClick={() => setCancelModal(null)}
                className='flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 active:scale-95 transition-all'
              >
                Keep Order
              </button>
              <button
                disabled={cancelling}
                onClick={handleCancelOrder}
                className='flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs active:scale-95 transition-all shadow-md shadow-rose-200 flex items-center justify-center gap-1.5'
              >
                {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyOrders