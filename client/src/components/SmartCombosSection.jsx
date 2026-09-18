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
      toast('Please login to add combo to cart')
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
          toast.success(`${combo.title} added! Next morning pre-order slot (7:00 AM) active!`, { duration: 4500 })
        } else {
          toast.success(`${combo.title} added! Saved ₹${combo.discount}!`, { duration: 3500 })
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
    <section className='my-2 sm:my-3 px-3 sm:px-4 max-w-7xl mx-auto'>
      {/* Sleek Quick-Commerce Header without Emojis / Vibe-coded Icons */}
      <div className='flex items-center justify-between mb-2 px-0.5'>
        <div className='flex items-center gap-2'>
          <h2 className='font-black text-slate-900 dark:text-white text-xs sm:text-sm tracking-wide uppercase'>
            Blockbuster Deals
          </h2>
          <span className='text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-600 text-white tracking-wider'>
            Save Up to 30%
          </span>
        </div>
        <span className='text-[11px] font-semibold text-slate-400'>
          Curated Combos
        </span>
      </div>

      {/* Ultra-compact Horizontal Carousel (Zero Screen Hijack) */}
      <div className='flex gap-3 overflow-x-auto scrollbar-none snap-x pb-1 -mx-3 px-3 sm:mx-0 sm:px-0'>
        {combos.map((combo) => (
          <div
            key={combo.id}
            className='w-[270px] sm:w-[300px] shrink-0 snap-start bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-xs hover:border-emerald-500/40 transition-all flex flex-col justify-between'
          >
            <div>
              {/* Badges Row */}
              <div className='flex items-center justify-between gap-1.5 mb-1.5'>
                <span className='px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider rounded'>
                  {combo.badge || 'Blockbuster'}
                </span>
                <span className='text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded'>
                  Save ₹{combo.discount}
                </span>
              </div>

              {/* Title without emojis */}
              <h3 className='font-bold text-slate-900 dark:text-white text-xs sm:text-sm line-clamp-1'>
                {combo.title}
              </h3>
              <p className='text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-1'>
                {combo.tagline}
              </p>

              {/* Compact Item Thumbnails Rail */}
              <div className='flex items-center gap-1.5 my-2.5 p-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800/80'>
                {combo.items.map((item, idx) => (
                  <React.Fragment key={item._id || idx}>
                    <div className='flex-1 flex flex-col items-center text-center min-w-0'>
                      <div className='w-10 h-10 bg-white dark:bg-slate-900 rounded-lg p-0.5 flex items-center justify-center border border-slate-100 dark:border-slate-800'>
                        <img
                          src={optimizeImage(item.image?.[0], 100)}
                          alt={item.name}
                          className='w-full h-full object-contain'
                          onError={(e) => {
                            e.target.onerror = null
                            e.target.src = '/empty_cart.webp'
                          }}
                        />
                      </div>
                      <p className='text-[8.5px] font-medium text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-1 w-full'>
                        {item.name}
                      </p>
                    </div>
                    {idx < combo.items.length - 1 && (
                      <span className='text-slate-300 dark:text-slate-600 font-bold text-[10px] shrink-0'>+</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Bottom pricing & Compact Add button */}
            <div className='pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 mt-0.5'>
              <div>
                <div className='flex items-baseline gap-1'>
                  <span className='text-sm sm:text-base font-black text-slate-900 dark:text-white'>
                    {DisplayPriceInRupees(combo.comboPrice)}
                  </span>
                  <span className='text-[10px] text-slate-400 line-through'>
                    {DisplayPriceInRupees(combo.originalPrice)}
                  </span>
                </div>
                <p className='text-[9px] text-slate-400'>
                  {combo.items.length} items combo
                </p>
              </div>

              <button
                type='button'
                disabled={addingComboId === combo.id}
                onClick={() => handleAddComboToCart(combo)}
                className='px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer'
              >
                {addingComboId === combo.id ? 'Adding...' : '+ Add Combo'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default SmartCombosSection
