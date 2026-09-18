import React, { useEffect, useState } from 'react'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import { useGlobalContext } from '../provider/GlobalProvider'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import AxiosToastError from '../utils/AxiosToastError'
import { getStoreStatus } from './StoreClosedOverlay'
import { optimizeImage } from '../utils/optimizeImage'
import { IoSparkles, IoBagAddOutline } from 'react-icons/io5'

const SmartCombosSection = () => {
  const [combos, setCombos] = useState([])
  const [loading, setLoading] = useState(true)
  const [addingComboId, setAddingComboId] = useState(null)
  const { fetchCartItem } = useGlobalContext() || {}
  const user = useSelector(state => state.user)

  useEffect(() => {
    let isMounted = true
    const fetchCombos = async () => {
      try {
        setLoading(true)
        const res = await Axios({
          url: SummaryApi.getSmartCombos?.url || '/api/product/smart-combos',
          method: SummaryApi.getSmartCombos?.method || 'get'
        })
        if (isMounted && res.data?.success && Array.isArray(res.data.data)) {
          setCombos(res.data.data)
        }
      } catch {
        // Silent fallback
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchCombos()
    return () => { isMounted = false }
  }, [])

  if (loading || combos.length === 0) return null

  const handleAddComboToCart = async (combo) => {
    if (!combo.items || combo.items.length === 0) return
    const token = localStorage.getItem('accesstoken') || localStorage.getItem('accessToken') || localStorage.getItem('token')
    if (!token && !user?._id) {
      toast('Please login to add combo to cart', { icon: '🔐' })
      return
    }

    let loadingToast = null
    try {
      setAddingComboId(combo.id)
      loadingToast = toast.loading(`Adding ${combo.title}...`)

      let addedCount = 0
      for (const item of combo.items) {
        if (item._id) {
          try {
            const res = await Axios({
              ...SummaryApi.addTocart,
              data: { productId: item._id }
            })
            if (res.data?.success) {
              addedCount++
            }
          } catch (itemErr) {
            console.warn('Combo item add warning:', itemErr.message)
          }
        }
      }

      if (loadingToast) toast.dismiss(loadingToast)
      if (fetchCartItem) fetchCartItem()

      if (addedCount > 0) {
        const storeStatus = getStoreStatus(user?.role)
        if (storeStatus.isClosed) {
          toast.success(`🎉 ${combo.title} added! Next morning pre-order slot (7:00 AM) active!`, { duration: 4500 })
        } else {
          toast.success(`🎉 ${combo.title} added! Saved ₹${combo.discount}!`, { duration: 3500 })
        }
      } else {
        toast.error('Could not add combo items. Please try again.')
      }
    } catch (err) {
      if (loadingToast) toast.dismiss(loadingToast)
      AxiosToastError(err)
    } finally {
      setAddingComboId(null)
    }
  }

  return (
    <section className='my-4 sm:my-6 px-4 max-w-7xl mx-auto'>
      <div className='flex flex-wrap items-center justify-between gap-2 mb-3 sm:mb-4'>
        <div>
          <div className='flex items-center gap-1.5'>
            <span className='p-1 bg-amber-100 text-amber-600 rounded-md'>
              <IoSparkles size={16} />
            </span>
            <h2 className='font-black text-slate-900 dark:text-white text-base sm:text-lg'>
              Smart Value Combos & Bundles
            </h2>
            <span className='text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full'>
              1-Click Save
            </span>
          </div>
          <p className='text-xs text-slate-500 dark:text-slate-400 mt-0.5'>
            Curated daily combos packed together to save you time and money
          </p>
        </div>
      </div>

      {/* Combos Rail */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
        {combos.map((combo) => (
          <div
            key={combo.id}
            className='bg-gradient-to-b from-white to-slate-50/70 dark:from-slate-800 dark:to-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-3xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between'
          >
            <div>
              {/* Header Badge */}
              <div className='flex items-center justify-between gap-2 mb-2'>
                <span className='px-2.5 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-wider rounded-full'>
                  {combo.badge}
                </span>
                <span className='text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg'>
                  Save ₹{combo.discount}
                </span>
              </div>

              {/* Title & Tagline */}
              <h3 className='font-black text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-1.5'>
                <span>{combo.emoji}</span>
                <span>{combo.title}</span>
              </h3>
              <p className='text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1'>
                {combo.tagline}
              </p>

              {/* Combo Items Preview Thumbnails */}
              <div className='flex items-center gap-2 my-3 p-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner overflow-hidden'>
                {combo.items.map((item, idx) => (
                  <React.Fragment key={item._id || idx}>
                    <div className='flex-1 flex flex-col items-center text-center'>
                      <div className='w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-xl p-1 flex items-center justify-center'>
                        <img
                          src={optimizeImage(item.image?.[0], 120)}
                          alt={item.name}
                          className='w-full h-full object-contain'
                          onError={(e) => {
                            e.target.onerror = null
                            e.target.src = '/empty_cart.webp'
                          }}
                        />
                      </div>
                      <p className='text-[9px] font-bold text-slate-700 dark:text-slate-300 mt-1 line-clamp-1 w-full'>
                        {item.name}
                      </p>
                    </div>
                    {idx < combo.items.length - 1 && (
                      <span className='text-slate-400 font-bold text-xs'>+</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Bottom pricing & 1-Click Add */}
            <div className='pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3 mt-1'>
              <div>
                <div className='flex items-baseline gap-1.5'>
                  <span className='text-base sm:text-lg font-black text-slate-900 dark:text-white'>
                    {DisplayPriceInRupees(combo.comboPrice)}
                  </span>
                  <span className='text-xs text-slate-400 line-through font-normal'>
                    {DisplayPriceInRupees(combo.originalPrice)}
                  </span>
                </div>
                <p className='text-[10px] text-emerald-600 dark:text-emerald-400 font-bold'>
                  Includes {combo.items.length} items
                </p>
              </div>

              <button
                type='button'
                disabled={addingComboId === combo.id}
                onClick={() => handleAddComboToCart(combo)}
                className='flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer'
              >
                <IoBagAddOutline size={15} />
                <span>{addingComboId === combo.id ? 'Adding...' : '+ Add Combo'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default SmartCombosSection

