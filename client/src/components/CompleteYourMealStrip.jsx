import React from 'react'
import { optimizeImageUrl, FALLBACK_IMAGE } from '../utils/optimizeImageUrl'

const ADDON_REGEX = /beverage|drink|shake|lassi|cold|dessert|sweet|ice cream|gulab|rasgulla|cake|pastry|juice|mocktail/i

export default function CompleteYourMealStrip({ menuItems = [], foodCart = [], onAdd, isLongDistance = false, getCampusAdjustedPrice }) {
  if (!menuItems || menuItems.length === 0 || !foodCart || foodCart.length === 0) {
    return null
  }

  // Get item IDs already in cart
  const cartItemIds = new Set(foodCart.map(c => String(c.id || c._id || c.productId)))

  // Filter available items that match beverages or desserts
  const crossSellItems = menuItems.filter(item => {
    if (!item || !item.isAvailable) return false
    const matchCategory = ADDON_REGEX.test(item.category || '')
    const matchName = ADDON_REGEX.test(item.name || '')
    return (matchCategory || matchName) && !cartItemIds.has(String(item._id))
  }).slice(0, 10)

  if (crossSellItems.length === 0) return null

  return (
    <div className="bg-linear-to-r from-amber-50 to-orange-50/80 border-y border-amber-200/70 py-3 px-4 my-3 rounded-2xl shadow-xs">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-base">🥤</span>
          <h4 className="text-xs font-black text-gray-900 tracking-tight">
            Complete Your Meal
          </h4>
          <span className="text-[10px] font-bold text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-full">
            Recommended Add-ons
          </span>
        </div>
        <span className="text-[11px] text-amber-700 font-medium">
          Drinks & Sweets
        </span>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none snap-x">
        {crossSellItems.map(item => {
          const rawPrice = item.discountedPrice > 0 ? item.discountedPrice : item.price
          const finalPrice = getCampusAdjustedPrice ? getCampusAdjustedPrice(rawPrice, isLongDistance) : rawPrice
          const imgUrl = optimizeImageUrl(item.image, 160, 160) || FALLBACK_IMAGE

          return (
            <div
              key={item._id}
              className="snap-start shrink-0 w-32 bg-white rounded-xl p-2 border border-amber-100 shadow-xs flex flex-col justify-between"
            >
              <div className="relative w-full h-20 rounded-lg overflow-hidden bg-gray-100 mb-1.5">
                <img
                  src={imgUrl}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE }}
                />
                <span className={`absolute top-1 left-1 w-2.5 h-2.5 rounded-full border border-white ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-bold text-gray-900 truncate" title={item.name}>
                  {item.name}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-black text-gray-900">
                    ₹{finalPrice}
                  </span>
                  <button
                    onClick={() => onAdd(item)}
                    className="px-2.5 py-1 bg-green-600 hover:bg-green-700 active:scale-95 text-white text-[10px] font-black rounded-lg transition shadow-xs flex items-center gap-0.5"
                  >
                    <span>+</span> ADD
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

