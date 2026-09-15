import React, { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import AddToCartButton from './AddToCartButton'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import { pricewithDiscount } from '../utils/PriceWithDiscount'
import { FALLBACK_IMAGE, getPrimaryImage } from '../utils/optimizeImageUrl'
import { valideURLConvert } from '../utils/valideURLConvert'

export default function LastOrders() {
  const orders = useSelector((state) => state.orders?.order) || []
  const user = useSelector((state) => state.user)

  // Extract unique products from user's completed/past orders
  const recentProducts = useMemo(() => {
    if (!orders || orders.length === 0) return []

    const seenIds = new Set()
    const products = []

    for (const order of orders) {
      if (!order) continue
      // Only include non-cancelled orders
      if (order.delivery_status === 'Cancelled') continue

      // Check cartItems
      if (Array.isArray(order.cartItems) && order.cartItems.length > 0) {
        for (const ci of order.cartItems) {
          const p = ci?.productId
          if (!p || typeof p !== 'object' || !p._id) continue
          const pid = String(p._id)
          if (seenIds.has(pid)) continue
          seenIds.add(pid)

          products.push({
            _id: pid,
            name: p.name || 'Product',
            unit: p.unit || '',
            image: Array.isArray(p.image) ? p.image : (p.image ? [p.image] : []),
            price: Number(p.price ?? ci.price ?? 0),
            discount: Number(p.discount ?? 0),
            stock: p.stock !== undefined ? p.stock : 50,
            store_inventory: p.store_inventory || [],
            orderedDate: order.createdAt,
          })
          if (products.length >= 10) break
        }
      }

      if (products.length >= 10) break
    }

    return products
  }, [orders])

  if (!user?._id || recentProducts.length === 0) {
    return null
  }

  return (
    <section className="container mx-auto px-4 mb-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-base">🔄</span>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
              Order Again
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Your frequently ordered staples in 1-tap
          </p>
        </div>
        <Link
          to="/dashboard/myorders"
          className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 flex items-center gap-1"
        >
          <span>Past Orders</span>
          <span>→</span>
        </Link>
      </div>

      {/* Horizontal Carousel */}
      <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1.5 -mx-4 px-4 sm:mx-0 sm:px-0">
        {recentProducts.map((prod) => {
          const imgSrc = getPrimaryImage(prod.image, null, 240)
          const finalPrice = prod.discount > 0 ? pricewithDiscount(prod.price, prod.discount) : prod.price
          const url = `/product/${valideURLConvert(prod.name)}-${prod._id}`

          return (
            <div
              key={prod._id}
              className="flex-shrink-0 w-[140px] sm:w-[155px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-2.5 flex flex-col justify-between shadow-2xs hover:border-emerald-200 dark:hover:border-emerald-800 transition-all"
            >
              <Link to={url} className="block group">
                <div className="w-full aspect-square rounded-xl bg-slate-50 dark:bg-slate-800/60 overflow-hidden flex items-center justify-center relative mb-2">
                  <img
                    src={imgSrc}
                    alt={prod.name}
                    className="w-full h-full object-scale-down p-1 group-hover:scale-105 transition-transform"
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null
                      e.target.src = FALLBACK_IMAGE
                    }}
                  />
                  <div className="absolute top-1 left-1 bg-slate-900/80 backdrop-blur-xs text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                    <span>⚡</span>
                    <span>10m</span>
                  </div>
                </div>

                <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 line-clamp-2 leading-tight min-h-[26px]">
                  {prod.name}
                </p>
                {prod.unit && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                    {prod.unit}
                  </p>
                )}
              </Link>

              <div className="mt-2 pt-2 border-t border-slate-50 dark:border-slate-800/80 flex items-center justify-between gap-1">
                <div>
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {DisplayPriceInRupees(finalPrice)}
                  </span>
                  {prod.discount > 0 && (
                    <span className="text-[10px] text-slate-400 line-through block -mt-1">
                      {DisplayPriceInRupees(prod.price)}
                    </span>
                  )}
                </div>
                <div className="scale-90 origin-right">
                  <AddToCartButton data={prod} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}