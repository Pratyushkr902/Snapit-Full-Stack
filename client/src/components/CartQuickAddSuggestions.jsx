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

const CartQuickAddSuggestions = ({ remainingForFreeDelivery = 0, title = '' }) => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState(null)
  const { fetchCartItem } = useGlobalContext() || {}
  const cartList = useSelector(state => state.cartItem.cart || [])
  const user = useSelector(state => state.user)

  const cartProductIds = new Set(
    cartList.map(c => (c.productId?._id || c.productId || '')).filter(Boolean)
  )

  useEffect(() => {
    let isMounted = true
    const loadSuggestions = async () => {
      try {
        setLoading(true)
        const res = await Axios({
          ...SummaryApi.getFrequentlyBought,
          params: { impulse: 'true' }
        })
        if (isMounted && res.data?.success) {
          setItems(res.data.data || [])
        }
      } catch {
        // Silent fallback
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    loadSuggestions()
    return () => { isMounted = false }
  }, [])

  const filtered = items.filter(item => !cartProductIds.has(item._id)).slice(0, 10)

  if (loading || filtered.length === 0) return null

  const handleQuickAdd = async (product) => {
    try {
      setAddingId(product._id)
      const res = await Axios({
        ...SummaryApi.addTocart,
        data: { productId: product._id },
      })
      if (res.data?.success) {
        const storeStatus = getStoreStatus(user?.role)
        if (storeStatus.isClosed) {
          const msg = storeStatus.isClosedForToday
            ? `Added ${product.name}! Deliveries resume tomorrow at 8:30 AM.`
            : `Added ${product.name}! Deliveries start at 8:30 AM.`
          toast.success(msg, { icon: '🛒' })
        } else {
          toast.success(`Added ${product.name}!`, { icon: '✨' })
        }
        if (fetchCartItem) fetchCartItem()
      }
    } catch (err) {
      AxiosToastError(err)
    } finally {
      setAddingId(null)
    }
  }

  const isNearingFreeDelivery = remainingForFreeDelivery > 0 && remainingForFreeDelivery <= 100

  return (
    <div className={`my-3 rounded-2xl p-3 shadow-2xs border transition-all ${
      isNearingFreeDelivery
        ? 'bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/60'
        : 'bg-amber-50/40 dark:bg-slate-900/60 border-amber-200/70 dark:border-slate-800'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{isNearingFreeDelivery ? '⚡' : '🛍️'}</span>
          <div>
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 tracking-tight leading-tight">
              {title || (isNearingFreeDelivery
                ? `Add items to unlock FREE Delivery`
                : `Forgot something? Quick adds`)}
            </h3>
            {isNearingFreeDelivery && (
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                Only ₹{remainingForFreeDelivery} away from ₹0 delivery
              </p>
            )}
          </div>
        </div>
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0 ${
          isNearingFreeDelivery
            ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50'
            : 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50'
        }`}>
          {isNearingFreeDelivery ? 'Save ₹12-₹29' : '1-Tap Add'}
        </span>
      </div>

      {/* Products Row */}
      <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none snap-x">
        {filtered.map(item => {
          const image = item.image?.[0] || ''
          const price = item.price || 0
          const unit = item.unit || ''

          return (
            <div
              key={item._id}
              className="snap-start flex-shrink-0 w-28 bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/80 rounded-xl p-2 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all"
            >
              <div className="w-full h-16 rounded-lg bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center p-1 mb-1.5">
                {image ? (
                  <img
                    src={optimizeImage(image, 120)}
                    alt={item.name}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-xl">📦</span>
                )}
              </div>

              <div className="flex-1 min-h-[30px]">
                <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 line-clamp-1 leading-tight" title={item.name}>
                  {item.name}
                </p>
                {unit && (
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold truncate">
                    {unit}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 dark:border-slate-700/50">
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  {DisplayPriceInRupees(price)}
                </span>
                <button
                  disabled={addingId === item._id}
                  onClick={() => handleQuickAdd(item)}
                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[10px] font-black px-2 py-1 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center min-w-[42px]"
                  title="Add to cart"
                >
                  {addingId === item._id ? '...' : '+ ADD'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CartQuickAddSuggestions
