import React, { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import SubscriptionCard from '../components/SubscriptionCard'
import toast from 'react-hot-toast'
import { IoArrowBack, IoRefreshOutline } from 'react-icons/io5'
import { FiCalendar, FiPackage, FiAward, FiPlus, FiShoppingBag, FiTruck } from 'react-icons/fi'
import { haptic } from '../utils/haptics'

export default function MySubscriptions() {
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filterTab, setFilterTab] = useState('ALL') // ALL | ACTIVE | PAUSED
  const navigate = useNavigate()

  const fetchSubscriptions = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await Axios({
        method: SummaryApi.mySubscriptions.method,
        url: SummaryApi.mySubscriptions.url
      })
      if (res.data?.success && Array.isArray(res.data.data)) {
        setSubscriptions(res.data.data)
      }
    } catch (err) {
      toast.error('Failed to load subscriptions')
      console.error('Failed to load subscriptions', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  // Stats computation
  const activeCount = useMemo(
    () => subscriptions.filter(s => s.status === 'Active' || s.isSnapitPlus).length,
    [subscriptions]
  )
  const pausedCount = useMemo(
    () => subscriptions.filter(s => s.status === 'Paused').length,
    [subscriptions]
  )

  // Find nearest upcoming delivery
  const nextDeliveryItem = useMemo(() => {
    const activeSubs = subscriptions.filter(s => s.status === 'Active' && s.nextDeliveryDate && !s.isSnapitPlus)
    if (!activeSubs.length) return null
    return activeSubs.sort((a, b) => new Date(a.nextDeliveryDate) - new Date(b.nextDeliveryDate))[0]
  }, [subscriptions])

  // Filtered list
  const filteredSubscriptions = useMemo(() => {
    if (filterTab === 'ACTIVE') {
      return subscriptions.filter(s => s.status === 'Active' || s.isSnapitPlus)
    }
    if (filterTab === 'PAUSED') {
      return subscriptions.filter(s => s.status === 'Paused')
    }
    return subscriptions
  }, [subscriptions, filterTab])

  const handleManualRefresh = () => {
    haptic.light()
    fetchSubscriptions(true)
  }

  return (
    <div className='min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors pb-24'>
      {/* Sticky Mobile/Desktop Top Header */}
      <div className='sticky top-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 shadow-xs'>
        <div className='max-w-2xl mx-auto flex items-center justify-between'>
          <button
            onClick={() => {
              if (window.history.length > 1) navigate(-1)
              else navigate('/')
            }}
            className='w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center text-slate-700 dark:text-slate-200 active:scale-90 transition-transform'
            aria-label='Back'
          >
            <IoArrowBack size={18} />
          </button>

          <div className='text-center'>
            <h1 className='text-base font-black text-slate-900 dark:text-white tracking-tight'>
              My Subscriptions
            </h1>
            <p className='text-[11px] text-slate-400 font-medium'>
              {subscriptions.length} recurring deliveries
            </p>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className={`w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center text-slate-700 dark:text-slate-200 active:scale-90 transition-transform ${
              refreshing ? 'animate-spin text-emerald-600' : ''
            }`}
            aria-label='Refresh'
          >
            <IoRefreshOutline size={18} />
          </button>
        </div>
      </div>

      <div className='max-w-2xl mx-auto px-4 pt-4 space-y-4'>
        {/* Next Delivery Highlight Banner (if any scheduled) */}
        {nextDeliveryItem && (
          <div className='bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-4 shadow-md shadow-emerald-600/20 flex items-center justify-between gap-3'>
            <div className='flex items-center gap-3 min-w-0'>
              <div className='w-11 h-11 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white text-xl shrink-0'>
                <FiTruck />
              </div>
              <div className='min-w-0'>
                <span className='text-[10px] font-black uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-full'>
                  Upcoming Morning Delivery
                </span>
                <p className='text-sm font-black truncate mt-0.5'>
                  {nextDeliveryItem.items?.[0]?.productId?.name || nextDeliveryItem.items?.[0]?.name || 'Grocery Order'}
                </p>
                <p className='text-[11px] text-emerald-100 font-medium'>
                  Scheduled for {new Date(nextDeliveryItem.nextDeliveryDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
              </div>
            </div>
            <Link
              to='/grocery'
              className='shrink-0 px-3 py-1.5 rounded-xl bg-white text-emerald-900 font-extrabold text-xs shadow-xs hover:bg-emerald-50 active:scale-95 transition-transform'
            >
              Add Items
            </Link>
          </div>
        )}

        {/* Filter Pills */}
        <div className='flex items-center gap-2 overflow-x-auto scrollbar-none py-1'>
          <button
            type='button'
            onClick={() => { haptic.selection(); setFilterTab('ALL') }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filterTab === 'ALL'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            All ({subscriptions.length})
          </button>

          <button
            type='button'
            onClick={() => { haptic.selection(); setFilterTab('ACTIVE') }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filterTab === 'ACTIVE'
                ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            Active ({activeCount})
          </button>

          <button
            type='button'
            onClick={() => { haptic.selection(); setFilterTab('PAUSED') }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filterTab === 'PAUSED'
                ? 'bg-amber-600 text-white shadow-xs shadow-amber-600/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            Paused ({pausedCount})
          </button>
        </div>

        {/* Content List */}
        {loading ? (
          <div className='space-y-3 pt-4'>
            {[1, 2].map(n => (
              <div
                key={n}
                className='h-36 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse p-4 flex flex-col justify-between'
              >
                <div className='flex items-center gap-3'>
                  <div className='w-14 h-14 bg-slate-200 dark:bg-slate-800 rounded-xl' />
                  <div className='space-y-2 flex-1'>
                    <div className='h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-1/2' />
                    <div className='h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-1/3' />
                  </div>
                </div>
                <div className='h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-full' />
              </div>
            ))}
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <div className='bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-8 text-center space-y-4 my-4 shadow-xs'>
            <div className='w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-3xl shadow-xs'>
              <FiCalendar />
            </div>

            <div className='space-y-1.5'>
              <h3 className='font-black text-slate-900 dark:text-white text-lg'>
                {filterTab === 'ALL'
                  ? 'No active subscriptions yet'
                  : `No ${filterTab.toLowerCase()} subscriptions found`}
              </h3>
              <p className='text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed'>
                Never run out of morning milk, fresh bread, farm eggs, or daily essentials. Set up automated delivery from any product page.
              </p>
            </div>

            <div className='flex flex-wrap items-center justify-center gap-3 pt-2'>
              <Link
                to='/grocery'
                className='px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/25 active:scale-95 transition-all flex items-center gap-1.5'
              >
                <FiShoppingBag size={14} />
                <span>Browse Daily Essentials</span>
              </Link>
              <Link
                to='/snapit-plus'
                className='px-5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-bold text-xs active:scale-95 transition-all flex items-center gap-1.5'
              >
                <FiAward size={14} />
                <span>Join Snapit Plus VIP</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className='space-y-3.5'>
            {filteredSubscriptions.map(sub => (
              <SubscriptionCard
                key={sub._id}
                subscription={sub}
                onUpdate={() => fetchSubscriptions(false)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}