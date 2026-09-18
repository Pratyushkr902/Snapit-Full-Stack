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
      <div className='flex items-center justify-between mb-2.5 px-0.5'>
        <div className='flex items-center gap-2'>
          <h2 className='font-black text-slate-900 dark:text-white text-sm sm:text-base tracking-wide uppercase'>
            Blockbuster Deals
          </h2>
          <span className='text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-600 text-white tracking-wider shadow-2xs'>
            Save Up to 30%
          </span>
        </div>
        <span className='text-xs font-semibold text-slate-400'>
          Curated Combos
        </span>
      </div>

      {/* Zepto/Blinkit-Grade Value Combos Carousel */}
      <div className='flex gap-3.5 overflow-x-auto scrollbar-none snap-x pb-2 -mx-3 px-3 sm:mx-0 sm:px-0'>
        {combos.map((combo) => (
          <div
            key={combo.id}
            className='w-[290px] sm:w-[330px] shrink-0 snap-start bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-3.5 shadow-sm hover:border-emerald-500/50 hover:shadow-md transition-all flex flex-col justify-between'
          >
            <div>
              {/* Badges Row */}
              <div className='flex items-center justify-between gap-2 mb-2'>
                <span className='px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50 text-[10px] font-black uppercase tracking-wider rounded-full'>
                  Save ₹{combo.discount}
                </span>
                <span className='text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide'>
                  {(() => {
                    const b = (combo.badge || '').trim();
                    if (!b || /save/i.test(b) || /₹|\d+/.test(b)) {
                      if (combo.id === 'chai_combo') return 'Tea-Time Special';
                      if (combo.id === 'breakfast_combo') return 'Breakfast';
                      if (combo.id === 'movie_combo') return 'Snacks & Sips';
                      return 'Curated Pack';
                    }
                    return b;
                  })()}
                </span>
              </div>

              {/* Title & Tagline */}
              <h3 className='font-extrabold text-slate-900 dark:text-white text-sm sm:text-base line-clamp-1'>
                {combo.title}
              </h3>
              <p className='text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 font-medium'>
                {combo.tagline}
              </p>

              {/* Generous Product Visuals Rail (Zepto / Blinkit Showcase) */}
              <div className='flex items-center justify-center gap-2 my-3 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/80'>
                {combo.items.map((item, idx) => (
                  <React.Fragment key={item._id || idx}>
                    <div className='flex-1 flex flex-col items-center text-center min-w-0 max-w-[85px]'>
                      <div className='w-16 h-16 sm:w-[70px] sm:h-[70px] bg-white dark:bg-slate-900 rounded-xl p-1.5 flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-2xs transition-transform hover:scale-105'>
                        <img
                          src={optimizeImage(item.image?.[0], 180)}
                          alt={item.name}
                          className='w-full h-full object-contain'
                          loading='lazy'
                          decoding='async'
                          onError={(e) => {
                            const raw = Array.isArray(item.image) ? item.image[0] : item.image;
                            if (raw && !e.target.dataset.fallbackAttempted) {
                              e.target.dataset.fallbackAttempted = 'true';
                              e.target.src = raw;
                            } else {
                              e.target.onerror = null;
                              e.target.src = FALLBACK_IMAGE;
                            }
                          }}
                        />
                      </div>
                      <p className='text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-1 line-clamp-1 w-full'>
                        {item.name}
                      </p>
                    </div>
                    {idx < combo.items.length - 1 && (
                      <span className='text-slate-400 dark:text-slate-500 font-black text-xs shrink-0 self-center'>+</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Bottom pricing & Blinkit-style Add button */}
            <div className='pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 mt-1'>
              <div>
                <div className='flex items-baseline gap-1.5'>
                  <span className='text-base sm:text-lg font-black text-slate-900 dark:text-white'>
                    {DisplayPriceInRupees(combo.comboPrice)}
                  </span>
                  <span className='text-xs text-slate-400 line-through font-medium'>
                    {DisplayPriceInRupees(combo.originalPrice)}
                  </span>
                </div>
                <p className='text-[10px] text-slate-400 font-semibold'>
                  {combo.items.length} items bundle
                </p>
              </div>

              <button
                type='button'
                disabled={addingComboId === combo.id}
                onClick={() => handleAddComboToCart(combo)}
                className='px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer uppercase tracking-wider'
              >
                {addingComboId === combo.id ? 'Adding...' : '+ ADD'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default SmartCombosSection
