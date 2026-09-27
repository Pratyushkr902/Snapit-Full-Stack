import React, { useState, useEffect } from 'react'
import {
  FiCalendar,
  FiTruck,
  FiPause,
  FiPlay,
  FiMapPin,
  FiCreditCard,
  FiXCircle,
  FiShoppingBag,
  FiAlertCircle,
  FiHeadphones,
  FiChevronRight,
  FiRotateCcw
} from 'react-icons/fi'
import { FaCrown } from 'react-icons/fa'
import { Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { setUserDetails } from '../store/userSlice'
import Axios from '../utils/Axios'
import toast from 'react-hot-toast'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import { haptic } from '../utils/haptics'

const getFrequencyLabel = (freq) => {
  const f = String(freq || '').toUpperCase()
  if (f === 'DAILY') return 'Daily (Every Morning)'
  if (f === 'WEEKLY') return 'Weekly Delivery'
  if (f === 'ALTERNATIVE') return 'Alternate Days'
  if (f === 'MONTHLY') return 'Monthly'
  if (f === 'YEARLY') return 'Annual VIP'
  return f || 'Recurring'
}

const formatNextDelivery = (dateStr) => {
  if (!dateStr) return 'Next delivery pending'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return 'Scheduled soon'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)

  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today (6:00 AM - 8:00 AM)'
  if (diffDays === 1) return 'Tomorrow (6:00 AM - 8:00 AM)'
  if (diffDays > 1 && diffDays < 7) {
    return `In ${diffDays} days (${date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })})`
  }
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export default function SubscriptionCard({ subscription, onUpdate }) {
  const dispatch = useDispatch()
  const [currentStatus, setCurrentStatus] = useState(subscription.status || 'Active')
  const [isLoading, setIsLoading] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  // Sync state whenever prop updates
  useEffect(() => {
    setCurrentStatus(subscription.status || 'Active')
  }, [subscription.status])

  const isActive = currentStatus === 'Active'
  const isPaused = currentStatus === 'Paused'
  const isCancelled = currentStatus === 'Cancelled'

  // Snapit Plus membership card
  if (subscription.isSnapitPlus) {
    const isYearly = subscription.planType === 'yearly'
    const expiresDate = subscription.expiresAt
      ? new Date(subscription.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Active'

    // Compute remaining days
    const daysLeft = subscription.expiresAt
      ? Math.max(0, Math.ceil((new Date(subscription.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null

    return (
      <div className={`relative overflow-hidden rounded-2xl border p-5 shadow-xs transition-all ${
        isCancelled
          ? 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-80'
          : 'bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-amber-600/10 border-amber-300 dark:border-amber-700/60'
      }`}>
        <div className='absolute -right-6 -bottom-6 w-28 h-28 bg-amber-400/10 rounded-full blur-xl pointer-events-none' />

        <div className='flex items-start justify-between gap-3 relative z-10'>
          <div className='flex items-center gap-3'>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-md shrink-0 ${
              isCancelled
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                : 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 shadow-amber-500/20'
            }`}>
              <FaCrown />
            </div>
            <div>
              <div className='flex items-center gap-2 flex-wrap'>
                <h3 className='font-black text-slate-900 dark:text-white text-base leading-tight'>
                  Snapit Plus VIP Membership
                </h3>
                <span className='px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700'>
                  {isYearly ? 'Annual VIP (12 Mo)' : 'Monthly VIP (30 Days)'}
                </span>
              </div>
              <p className='text-xs text-slate-500 dark:text-slate-400 font-medium mt-1'>
                {isCancelled ? (
                  <span className='text-rose-600 dark:text-rose-400 font-bold'>Membership Cancelled</span>
                ) : (
                  <>
                    Valid until: <span className='font-bold text-slate-800 dark:text-slate-200'>{expiresDate}</span>
                    {daysLeft !== null && (
                      <span className='ml-1 text-[11px] text-amber-700 dark:text-amber-400 font-bold'>
                        ({daysLeft} days left)
                      </span>
                    )}
                  </>
                )}
              </p>
            </div>
          </div>

          <div>
            {!isCancelled ? (
              <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shrink-0'>
                <span className='w-2 h-2 rounded-full bg-emerald-500 animate-pulse' />
                Active VIP
              </span>
            ) : (
              <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0'>
                <FiXCircle size={11} />
                Cancelled
              </span>
            )}
          </div>
        </div>

        {/* Benefits banner */}
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-amber-200/50 dark:border-amber-800/40 relative z-10 text-[11px] font-bold text-amber-950 dark:text-amber-200'>
          <div className='flex items-center gap-1.5 bg-white/70 dark:bg-slate-900/70 p-2 rounded-xl border border-amber-200/40 dark:border-amber-800/30'>
            <span>🚀 Free Delivery (₹99+)</span>
          </div>
          <div className='flex items-center gap-1.5 bg-white/70 dark:bg-slate-900/70 p-2 rounded-xl border border-amber-200/40 dark:border-amber-800/30'>
            <span>💰 5% Cashbacks</span>
          </div>
          <div className='flex items-center gap-1.5 bg-white/70 dark:bg-slate-900/70 p-2 rounded-xl border border-amber-200/40 dark:border-amber-800/30'>
            <span>⚡ Priority Pack</span>
          </div>
          <div className='flex items-center gap-1.5 bg-white/70 dark:bg-slate-900/70 p-2 rounded-xl border border-amber-200/40 dark:border-amber-800/30'>
            <span>🎧 VIP Support</span>
          </div>
        </div>

        {/* Bottom controls for Snapit Plus */}
        <div className='mt-4 flex items-center justify-between gap-3 pt-3 border-t border-amber-200/50 dark:border-amber-800/40'>
          <Link
            to='/snapit-plus'
            className='text-xs font-extrabold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1'
          >
            <span>{isCancelled ? 'Reactivate Snapit Plus' : 'View all VIP benefits & savings'}</span>
            <FiChevronRight size={14} />
          </Link>

          <div className='flex items-center gap-2'>
            {!isCancelled ? (
              <button
                type='button'
                onClick={() => setShowCancelModal(true)}
                className='text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2.5 py-1 rounded-lg transition-colors'
              >
                Cancel VIP
              </button>
            ) : (
              <Link
                to='/snapit-plus'
                className='text-xs font-black text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1'
              >
                <FiRotateCcw size={12} />
                <span>Rejoin VIP</span>
              </Link>
            )}
          </div>
        </div>

        {/* Cancellation confirmation modal for Snapit Plus */}
        {showCancelModal && (
          <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150'>
            <div className='bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4'>
              <div className='w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto text-2xl'>
                <FiAlertCircle />
              </div>

              <div className='text-center space-y-1.5'>
                <h3 className='font-black text-slate-900 dark:text-white text-base'>
                  Cancel Snapit Plus VIP?
                </h3>
                <p className='text-xs text-slate-500 dark:text-slate-400 leading-relaxed'>
                  Are you sure you want to cancel your VIP membership? You will lose free delivery on orders ₹99+, 5% cashback on all groceries, and priority VIP support immediately.
                </p>
              </div>

              <div className='grid grid-cols-2 gap-2.5 pt-2'>
                <button
                  type='button'
                  onClick={() => setShowCancelModal(false)}
                  className='px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors'
                >
                  Keep VIP
                </button>
                <button
                  type='button'
                  disabled={isCancelling}
                  onClick={async () => {
                    try { haptic.heavy() } catch {}
                    setIsCancelling(true)
                    try {
                      let res
                      const payload = { id: subscription._id, isSnapitPlus: true }
                      try {
                        res = await Axios({
                          method: 'DELETE',
                          url: `/api/subscription/cancel/${subscription._id}`,
                          data: payload
                        })
                      } catch {
                        res = await Axios({
                          method: 'POST',
                          url: `/api/subscription/cancel/${subscription._id}`,
                          data: payload
                        })
                      }
                      if (res.data?.success) {
                        setCurrentStatus('Cancelled')
                        toast.success('Snapit Plus membership cancelled')
                        setShowCancelModal(false)
                        try {
                          const userRes = await Axios({ url: '/api/user/user-details', method: 'get' })
                          if (userRes.data?.success) dispatch(setUserDetails(userRes.data.data))
                        } catch (_) {}
                        if (onUpdate) onUpdate()
                      } else {
                        toast.error(res.data?.message || 'Failed to cancel membership')
                      }
                    } catch (err) {
                      toast.error(err.response?.data?.message || 'Failed to cancel membership')
                    } finally {
                      setIsCancelling(false)
                    }
                  }}
                  className='px-4 py-2.5 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all flex items-center justify-center'
                >
                  {isCancelling ? (
                    <span className='w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin' />
                  ) : (
                    'Yes, Cancel VIP'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Regular Grocery Recurring Subscription
  const items = Array.isArray(subscription.items) ? subscription.items : []
  const firstItem = items[0] || {}
  const product = firstItem.productId || {}
  const quantity = Number(firstItem.quantity) || 1

  // Safe total amount calculation
  const totalAmount = items.reduce((sum, it) => {
    const unitPrice = Number(it?.productId?.price) || Number(it?.price) || 0
    const qty = Number(it?.quantity) || 1
    return sum + (unitPrice * qty)
  }, 0)

  const address = subscription.delivery_address || null

  const handleStatusToggle = async () => {
    haptic.medium()
    setIsLoading(true)
    const nextStatus = isActive ? 'Paused' : 'Active'
    try {
      const endpoint = isActive
        ? `/api/subscription/pause/${subscription._id}`
        : `/api/subscription/resume/${subscription._id}`

      const res = await Axios({
        method: 'PATCH',
        url: endpoint,
        data: { id: subscription._id }
      })
      if (res.data?.success) {
        setCurrentStatus(nextStatus)
        toast.success(`Subscription ${nextStatus.toLowerCase()} successfully!`)
        if (onUpdate) onUpdate()
      } else {
        toast.error(res.data?.message || 'Failed to update subscription')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update subscription')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmCancel = async () => {
    try { haptic.heavy() } catch {}
    setIsCancelling(true)
    try {
      let res
      const payload = {
        id: subscription._id,
        subscriptionId: subscription._id,
        isSnapitPlus: Boolean(subscription.isSnapitPlus || subscription._id === 'snapit_plus_synced')
      }

      try {
        res = await Axios({
          method: 'DELETE',
          url: `/api/subscription/cancel/${subscription._id}`,
          data: payload
        })
      } catch (deleteErr) {
        // Fallback to POST /cancel/:id
        try {
          res = await Axios({
            method: 'POST',
            url: `/api/subscription/cancel/${subscription._id}`,
            data: payload
          })
        } catch (postErr) {
          // Fallback to POST /cancel
          res = await Axios({
            method: 'POST',
            url: '/api/subscription/cancel',
            data: payload
          })
        }
      }

      if (res?.data?.success) {
        setCurrentStatus('Cancelled')
        toast.success(res.data.message || 'Recurring delivery cancelled successfully')
        setShowCancelModal(false)
        if (onUpdate) onUpdate()
      } else {
        toast.error(res?.data?.message || 'Failed to cancel subscription')
      }
    } catch (err) {
      console.error('Cancel sub error:', err)
      toast.error(err.response?.data?.message || err.message || 'Failed to cancel subscription')
    } finally {
      setIsCancelling(false)
    }
  }

  const handleReactivate = async () => {
    haptic.medium()
    setIsLoading(true)
    try {
      const res = await Axios({
        method: 'PATCH',
        url: `/api/subscription/resume/${subscription._id}`,
        data: { id: subscription._id }
      })
      if (res.data?.success) {
        setCurrentStatus('Active')
        toast.success('Subscription reactivated!')
        if (onUpdate) onUpdate()
      } else {
        toast.error(res.data?.message || 'Failed to reactivate')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reactivate')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenHelp = () => {
    haptic.light()
    if (typeof window !== 'undefined' && window.openSnapitChat) {
      window.openSnapitChat({ orderId: subscription._id })
    }
  }

  return (
    <>
      <div className={`relative bg-white dark:bg-slate-900 border rounded-2xl p-4 sm:p-5 shadow-xs transition-all ${
        isActive
          ? 'border-emerald-200/90 dark:border-emerald-800/60'
          : isPaused
          ? 'border-amber-200/90 dark:border-amber-800/60 bg-amber-50/20 dark:bg-slate-900/90'
          : 'border-slate-200/80 dark:border-slate-800 opacity-75'
      }`}>
        {/* Top Header Badge Row */}
        <div className='flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80'>
          <div className='flex items-center gap-2'>
            <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'>
              <FiCalendar className='text-emerald-600 dark:text-emerald-400' size={12} />
              {getFrequencyLabel(subscription.frequency)}
            </span>
            {subscription.payment_method && (
              <span className='hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'>
                <FiCreditCard size={10} />
                {subscription.payment_method}
              </span>
            )}
          </div>

          <div>
            {isActive && (
              <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'>
                <span className='w-2 h-2 rounded-full bg-emerald-500 animate-pulse' />
                Active
              </span>
            )}
            {isPaused && (
              <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'>
                <FiPause size={10} />
                Paused
              </span>
            )}
            {isCancelled && (
              <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'>
                <FiXCircle size={10} />
                Cancelled
              </span>
            )}
          </div>
        </div>

        {/* Product & Quantity Section */}
        <div className='py-3.5 flex items-start sm:items-center justify-between gap-4'>
          <div className='flex items-center gap-3.5 min-w-0'>
            <div className='relative w-16 h-16 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 flex items-center justify-center p-1.5 shrink-0 overflow-hidden'>
              {product.image?.[0] ? (
                <img
                  src={product.image[0]}
                  alt={product.name || 'Subscription item'}
                  className='w-full h-full object-contain'
                  loading='lazy'
                />
              ) : (
                <FiShoppingBag className='text-slate-400' size={24} />
              )}
              {quantity > 1 && (
                <span className='absolute bottom-1 right-1 bg-emerald-600 text-white font-black text-[9px] px-1.5 py-0.2 rounded-md shadow-xs'>
                  x{quantity}
                </span>
              )}
            </div>

            <div className='min-w-0'>
              <h3 className='font-bold text-slate-900 dark:text-white text-base leading-tight truncate'>
                {product.name || firstItem.name || 'Subscribed Grocery Item'}
              </h3>
              <p className='text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5'>
                {product.unit ? `${quantity} × ${product.unit}` : `${quantity} unit${quantity > 1 ? 's' : ''}`}
                {items.length > 1 && (
                  <span className='ml-2 text-emerald-600 dark:text-emerald-400 font-bold'>
                    +{items.length - 1} more item{items.length > 2 ? 's' : ''}
                  </span>
                )}
              </p>
              <div className='flex items-center gap-2 mt-1.5'>
                <span className='text-sm font-black text-emerald-600 dark:text-emerald-400'>
                  {DisplayPriceInRupees(totalAmount)}
                </span>
                <span className='text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase'>
                  / delivery
                </span>
              </div>
            </div>
          </div>

          <div className='text-right shrink-0'>
            <span className='text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block'>
              Total per cycle
            </span>
            <span className='text-base font-extrabold text-slate-900 dark:text-white'>
              {DisplayPriceInRupees(totalAmount)}
            </span>
          </div>
        </div>

        {/* Next Delivery & Address Details Banner */}
        <div className='bg-slate-50 dark:bg-slate-850/80 rounded-xl p-3 space-y-2 text-xs'>
          <div className='flex items-center justify-between gap-2 text-slate-700 dark:text-slate-300'>
            <div className='flex items-center gap-2 font-medium min-w-0'>
              <FiTruck className='text-emerald-600 dark:text-emerald-400 shrink-0' size={14} />
              <span className='font-bold text-slate-900 dark:text-white truncate'>
                Next Delivery:
              </span>
              <span className='text-slate-600 dark:text-slate-300 truncate'>
                {isCancelled ? 'No upcoming delivery (Cancelled)' : formatNextDelivery(subscription.nextDeliveryDate)}
              </span>
            </div>
          </div>

          {address && (
            <div className='flex items-center gap-2 text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-800/50'>
              <FiMapPin className='shrink-0 text-slate-400' size={13} />
              <span className='truncate text-[11px]'>
                Delivering to: <strong className='text-slate-700 dark:text-slate-200'>{address.address_line_1 || address.city || 'Saved Address'}</strong>
                {address.city ? `, ${address.city}` : ''} {address.pincode ? `(${address.pincode})` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Action Controls Row */}
        <div className='mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5'>
          <button
            onClick={handleOpenHelp}
            className='inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors'
          >
            <FiHeadphones size={13} />
            <span>Support</span>
          </button>

          <div className='flex items-center gap-2 ml-auto'>
            {!isCancelled ? (
              <>
                <button
                  type='button'
                  onClick={() => setShowCancelModal(true)}
                  className='px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition-colors'
                >
                  Cancel
                </button>

                <button
                  type='button'
                  disabled={isLoading}
                  onClick={handleStatusToggle}
                  className={`inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl font-bold text-xs transition-all active:scale-95 ${
                    isActive
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shadow-emerald-600/20'
                  }`}
                >
                  {isLoading ? (
                    <span className='inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin' />
                  ) : isActive ? (
                    <>
                      <FiPause size={12} />
                      <span>Pause Delivery</span>
                    </>
                  ) : (
                    <>
                      <FiPlay size={12} />
                      <span>Resume Delivery</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                type='button'
                disabled={isLoading}
                onClick={handleReactivate}
                className='inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shadow-emerald-600/20 transition-all active:scale-95'
              >
                {isLoading ? (
                  <span className='inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin' />
                ) : (
                  <>
                    <FiRotateCcw size={12} />
                    <span>Restart Delivery</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Subscription Cancellation */}
      {showCancelModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150'>
          <div className='bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4'>
            <div className='w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto text-2xl'>
              <FiAlertCircle />
            </div>

            <div className='text-center space-y-1.5'>
              <h3 className='font-black text-slate-900 dark:text-white text-base'>
                Cancel Recurring Delivery?
              </h3>
              <p className='text-xs text-slate-500 dark:text-slate-400'>
                You will no longer receive automatic morning deliveries for{' '}
                <strong className='text-slate-800 dark:text-slate-200'>
                  {product.name || firstItem.name || 'this item'}
                </strong>. You can pause instead to temporarily skip upcoming dates.
              </p>
            </div>

            <div className='grid grid-cols-2 gap-2.5 pt-2'>
              <button
                type='button'
                onClick={() => setShowCancelModal(false)}
                className='px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors'
              >
                Keep Delivery
              </button>
              <button
                type='button'
                disabled={isCancelling}
                onClick={handleConfirmCancel}
                className='px-4 py-2.5 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all flex items-center justify-center'
              >
                {isCancelling ? (
                  <span className='w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin' />
                ) : (
                  'Yes, Cancel'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}