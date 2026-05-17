import React from 'react'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import { Link } from 'react-router-dom'
import { valideURLConvert } from '../utils/valideURLConvert'
import { pricewithDiscount } from '../utils/PriceWithDiscount'
import AddToCartButton from './AddToCartButton'

// ─── FIXED: Removed hardcoded "chicken curry cut" special-case image scaling ──
//     That kind of one-off hack causes bugs when product names change. 
//     Use object-contain uniformly; product images should be properly cropped.
//
// ─── FIXED: Removed "10 min" badge from every card ───────────────────────────
//     It's already shown in the sticky header. Showing it 40+ times = noise.
//
// ─── FIXED: Negative/garbage discounts now filtered out ──────────────────────
//     Only show discount badge if discount is between 5% and 90%.
//     Prevents "-1% OFF", "100% OFF at ₹0" from showing.

const MIN_DISPLAY_DISCOUNT = 5
const MAX_DISPLAY_DISCOUNT = 90

const CardProduct = ({ data }) => {
  const url = `/product/${valideURLConvert(data?.name || "")}-${data?._id}`

  // ─── Clean discount guard ─────────────────────────────────────────────────
  const discount = data?.discount || 0
  const showDiscount = discount >= MIN_DISPLAY_DISCOUNT && discount <= MAX_DISPLAY_DISCOUNT

  const getProductLabel = () => {
    const title = (data?.name || "").toLowerCase()
    if (title.includes("chicken") || title.includes("fish") || title.includes("meat")) {
      return { text: "Fresh", color: "bg-red-500" }
    }
    if (title.includes("organic") || title.includes("nature")) {
      return { text: "Organic", color: "bg-emerald-600" }
    }
    if (discount > 20 && discount <= MAX_DISPLAY_DISCOUNT) {
      return { text: "Deal", color: "bg-orange-500" }
    }
    return null
  }

  const label = getProductLabel()

  const handleImgError = (e) => {
    e.target.onerror = null
    e.target.src = "https://res.cloudinary.com/daso5ntlt/image/upload/v1773599668/Aashirvaad_Superior_MP_Whole_Wheat_Atta_z8tqsf.jpg"
  }

  const isOutOfStock = data?.stock === 0

  return (
    <Link
      to={url}
      onClick={() => window.scrollTo(0, 0)}
      // ─── IMPROVED: tap-scale class for mobile press feedback ──────────────
      className='tap-scale border flex flex-col rounded-xl cursor-pointer bg-white border-slate-100 transition-all hover:shadow-md hover:border-green-200 group relative overflow-hidden p-1.5 lg:p-3'
    >
      {/* Product label badge */}
      {label && (
        <div className={`absolute top-2 left-2 z-10 ${label.color} text-white text-[7px] lg:text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider`}>
          {label.text}
        </div>
      )}

      {/* Out of stock overlay */}
      {isOutOfStock && (
        <div className='absolute inset-0 z-20 bg-white/60 flex items-center justify-center rounded-xl'>
          <span className='bg-white border border-slate-200 text-slate-500 text-[9px] font-bold px-2 py-1 rounded-lg uppercase tracking-wide shadow-sm'>
            Out of stock
          </span>
        </div>
      )}

      {/* Product image */}
      <div className='w-full aspect-square rounded-lg overflow-hidden flex items-center justify-center bg-slate-50 relative p-2'>
        <img
          src={data?.image?.[0] || "https://via.placeholder.com/150"}
          alt={data?.name || "Product"}
          onError={handleImgError}
          // ─── FIXED: Removed hardcoded chicken curry cut hack ──────────────
          className='max-w-[78%] max-h-[78%] object-contain transition-transform duration-300 lg:group-hover:scale-105'
          loading="lazy"
        />

        {/* Low stock warning */}
        {data?.stock < 10 && data?.stock > 0 && (
          <div className='absolute bottom-0 left-0 right-0 py-1 text-center bg-gradient-to-t from-red-50 to-transparent'>
            <p className='text-[7px] font-black text-red-500 uppercase animate-pulse'>
              Only {data.stock} left
            </p>
          </div>
        )}
      </div>

      {/* Product info */}
      <div className='flex flex-col mt-1.5 gap-0.5'>

        {/* ─── REMOVED: "10 min" badge — shown once in sticky header ──────── */}
        {/* Discount badge only — and only when discount is valid ──────────── */}
        {showDiscount && (
          <div className='flex items-center gap-1'>
            <p className='text-white bg-green-600 px-1.5 py-0.5 text-[7px] lg:text-[9px] rounded font-bold'>
              {discount}% OFF
            </p>
          </div>
        )}

        {/* Product name */}
        <div className='font-semibold text-slate-800 text-[10px] lg:text-sm line-clamp-2 min-h-[28px] leading-tight group-hover:text-green-700 transition-colors'>
          {data?.name}
        </div>

        {/* Unit */}
        <div className='text-[9px] lg:text-xs text-slate-400'>
          {data?.unit}
        </div>

        {/* Price + cart button */}
        <div className='flex items-center justify-between gap-1 mt-1.5'>
          <div className='flex flex-col'>
            <div className='font-black text-slate-900 text-[11px] lg:text-base leading-tight'>
              {DisplayPriceInRupees(pricewithDiscount(data?.price || 0, showDiscount ? discount : 0))}
            </div>
            {showDiscount && (
              <span className='text-[8px] lg:text-[10px] line-through text-slate-400'>
                {DisplayPriceInRupees(data.price)}
              </span>
            )}
          </div>

          {/* Cart button — stop link propagation */}
          <div className='flex-shrink-0 w-[60px] lg:w-[90px]' onClick={(e) => e.preventDefault()}>
            {isOutOfStock ? (
              // ─── IMPROVED: Out of stock state is now handled by the overlay above.
              // The button area just shows nothing when OOS, keeping layout clean.
              null
            ) : (
              <AddToCartButton data={data} />
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

export default CardProduct