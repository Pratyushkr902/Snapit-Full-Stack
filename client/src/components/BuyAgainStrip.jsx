import React, { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import AddToCartButton from './AddToCartButton'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import { pricewithDiscount } from '../utils/PriceWithDiscount'
import { FALLBACK_IMAGE, getPrimaryImage, optimizeImageUrl } from '../utils/optimizeImageUrl'
import { valideURLConvert } from '../utils/valideURLConvert'

/**
 * BuyAgainStrip
 * High-converting 1-tap re-order carousel for repeat customers.
 * Displays past purchased items from user's order history with instant + Add buttons.
 */
const BuyAgainStrip = ({ type = 'grocery' }) => {
  const orders = useSelector((state) => state.orders?.order) || []
  const user = useSelector((state) => state.user)

  const items = useMemo(() => {
    if (!orders || orders.length === 0) return []

    const seenIds = new Set()
    const result = []

    for (const order of orders) {
      if (!order || order.delivery_status === 'Cancelled') continue

      if (Array.isArray(order.cartItems) && order.cartItems.length > 0) {
        for (const ci of order.cartItems) {
          const p = ci?.productId
          const isRestaurantItem = Boolean(ci.restaurantId || order.restaurantId || ci.seller_store_name?.toLowerCase().includes('resto') || ci.seller_store_name?.toLowerCase().includes('garden') || ci.seller_store_name?.toLowerCase().includes('tafri'))

          if (type === 'grocery' && isRestaurantItem) continue
          if (type === 'food' && !isRestaurantItem && orders.some(o => o.restaurantId)) continue

          const itemId = String(p?._id || ci._id || ci.productId || '')
          if (!itemId || seenIds.has(itemId)) continue
          seenIds.add(itemId)

          const name = p?.name || ci.name || 'Item'
          const price = Number(p?.price ?? ci.price ?? 0)
          const discount = Number(p?.discount ?? ci.discount ?? 0)
          const unit = p?.unit || ci.unit || ''
          const image = p?.image || ci.image || ''
          const stock = p?.stock !== undefined ? p.stock : 50

          result.push({
            _id: itemId,
            name,
            price,
            discount,
            unit,
            image,
            stock,
            productData: p && typeof p === 'object' ? p : {
              _id: itemId,
              name,
              price,
              discount,
              unit,
              image: Array.isArray(image) ? image : [image],
              stock
            }
          })

          if (result.length >= 12) break
        }
      }

      if (result.length >= 12) break
    }

    return result
  }, [orders, type])

  if (!user?._id || items.length === 0) {
    return null
  }

  return (
    <section className="w-full mb-4 px-3 sm:px-4">
      <div className="bg-gradient-to-r from-emerald-50/80 via-white to-green-50/80 dark:from-emerald-950/30 dark:via-slate-900 dark:to-green-950/30 border border-emerald-100/80 dark:border-emerald-800/40 rounded-3xl p-3.5 sm:p-4 shadow-xs">
        
        {/* Header Strip */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-sm shadow-xs shadow-emerald-500/30">
              ⚡
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5 leading-tight">
                Buy Again in 5 Seconds
                <span className="hidden sm:inline-block text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Past Favorites
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                1-tap re-order your daily staples
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/60 px-2.5 py-1 rounded-full">
            {items.length} items
          </span>
        </div>

        {/* Horizontal Scrollable Product Track */}
        <div className="flex gap-2.5 sm:gap-3 overflow-x-auto scrollbar-none pb-1 pt-0.5 -mx-1 px-1">
          {items.map((item) => {
            const rawImg = Array.isArray(item.image) ? item.image[0] : item.image
            const finalImg = rawImg ? optimizeImageUrl(rawImg, 160, 75) : FALLBACK_IMAGE
            const discountedPrice = pricewithDiscount(item.price, item.discount)

            return (
              <div
                key={item._id}
                className="w-32 sm:w-36 flex-shrink-0 bg-white dark:bg-slate-800/90 border border-slate-100 dark:border-slate-700/60 rounded-2xl p-2.5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all group"
              >
                <Link
                  to={`/product/${valideURLConvert(item.name)}-${item._id}`}
                  className="flex flex-col items-center text-center"
                >
                  <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-xl bg-slate-50 dark:bg-slate-700/50 p-1 flex items-center justify-center mb-1.5 overflow-hidden">
                    <img
                      src={finalImg}
                      alt={item.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                      onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE }}
                    />
                  </div>

                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-1 w-full text-left" title={item.name}>
                    {item.name}
                  </h3>
                  
                  {item.unit && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium w-full text-left">
                      {item.unit}
                    </p>
                  )}
                </Link>

                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1 text-left">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {DisplayPriceInRupees(discountedPrice)}
                    </span>
                    {item.discount > 0 && (
                      <span className="text-[10px] line-through text-slate-400">
                        ₹{item.price}
                      </span>
                    )}
                  </div>

                  <div className="w-full">
                    <AddToCartButton data={item.productData} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default BuyAgainStrip

