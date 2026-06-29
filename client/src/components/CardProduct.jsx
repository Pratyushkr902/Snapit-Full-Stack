import React from 'react'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import { Link } from 'react-router-dom'
import { valideURLConvert } from '../utils/valideURLConvert'
import { pricewithDiscount } from '../utils/PriceWithDiscount'
import AddToCartButton from './AddToCartButton'

// Inline SVG fallback — never fails, no network needed
const FALLBACK_IMG =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23f3f4f6'/%3E%3Crect x='90' y='80' width='120' height='100' rx='8' fill='%23e5e7eb'/%3E%3Ccircle cx='150' cy='210' r='18' fill='%23e5e7eb'/%3E%3Ctext x='150' y='255' text-anchor='middle' fill='%239ca3af' font-size='13' font-family='sans-serif'%3ENo Image%3C/text%3E%3C/svg%3E"

const optimizeImage = (url) => {
    if (!url) return FALLBACK_IMG
    if (url.includes('res.cloudinary.com')) {
        return url.replace('/upload/', '/upload/w_400,f_auto,q_auto/')
    }
    if (url.includes('unsplash.com')) {
        return url.includes('?') ? url + '&w=400&q=60' : url + '?w=400&q=60'
    }
    return url
}

const getImageSrc = (image) => {
    if (Array.isArray(image) && image.length > 0 && typeof image[0] === 'string' && image[0].startsWith('http')) {
        return optimizeImage(image[0])
    }
    if (typeof image === 'string' && image.startsWith('http')) {
        return optimizeImage(image)
    }
    return FALLBACK_IMG
}

// Derived once at render time — no state, no re-render
const getProductLabel = (data) => {
    const title = data?.name?.toLowerCase() || ""
    if (title.includes("chicken") || title.includes("fish") || title.includes("meat")) {
        return { text: "Fresh", color: "bg-red-600" }
    }
    if (title.includes("organic") || title.includes("nature")) {
        return { text: "Organic", color: "bg-emerald-600" }
    }
    if (data?.discount > 20) {
        return { text: "Deal", color: "bg-orange-500" }
    }
    return null
}

const CardProduct = ({ data }) => {
    // FIX 3: no useState for imgSrc or imgLoaded.
    // Deriving imgSrc at render time is fine — it's a pure function of props.
    // imgLoaded state was causing a setState → re-render on EVERY image load
    // event, which fires for all visible cards simultaneously mid-scroll.
    // The skeleton shimmer is handled purely in CSS via the img background
    // trick below — zero JS involved.
    const imgSrc = getImageSrc(data?.image)
    const label  = getProductLabel(data)
    const url    = `/product/${valideURLConvert(data?.name || "")}-${data?._id}`

    return (
        <Link
            to={url}
            onClick={() => window.scrollTo(0, 0)}
            // FIX 1: removed contentVisibility:auto — it causes the browser to
            // recalculate layout for each card as it enters the viewport during
            // scroll, which is exactly what produces the "sticking" sensation
            // on Android Chrome. The perf win it promises only applies to very
            // tall off-screen content; for card rows it's net negative.
            //
            // FIX 2: removed hover:shadow-lg and group-hover:scale-105 —
            // both force new compositor layers on every card on hover/touch,
            // which on mobile means on every tap. Replaced scale with a lighter
            // opacity press effect that doesn't trigger layout.
            className='border flex flex-col rounded-xl cursor-pointer bg-white dark:bg-[#0F0F0F] border-slate-100 dark:border-zinc-800 hover:border-green-200 active:opacity-80 relative overflow-hidden p-1.5 lg:p-2'
        >
            {label && (
                <div className={`absolute top-2 left-2 z-10 ${label.color} text-white text-[7px] lg:text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider`}>
                    {label.text}
                </div>
            )}

            {/* Image Container
                FIX 3: the bg-slate-100 on the wrapper acts as the skeleton —
                it shows through until the img paints, with zero JS.
                explicit width + height on <img> tells the browser the space
                to reserve before the image loads, preventing layout shift. */}
            <div className='w-full aspect-square rounded-lg overflow-hidden flex items-center justify-center bg-slate-100 dark:bg-[#1A1A1A] relative'>
                <img
                    src={imgSrc}
                    alt={data?.name || "Product"}
                    width={300}
                    height={300}
                    onError={(e) => { e.currentTarget.src = FALLBACK_IMG }}
                    loading="lazy"
                    decoding="async"
                    fetchPriority="low"
                    // FIX 3: no opacity transition — static class, no JS toggle,
                    // no re-render. The image simply paints over the bg-slate-100
                    // skeleton naturally when it loads.
                    className='w-full h-full object-contain'
                />

                <div className='absolute inset-0 bg-gradient-to-t from-black/[0.03] to-transparent pointer-events-none' />

                {data?.stock < 10 && data?.stock > 0 && (
                    <div className='absolute bottom-0 left-0 w-full bg-gradient-to-t from-red-600/20 to-transparent py-1 text-center'>
                        <p className='text-[7px] font-black text-red-600 uppercase'>
                            Only {data.stock} left
                        </p>
                    </div>
                )}
            </div>

            <div className='flex flex-col mt-1.5 gap-0.5 flex-1'>
                <div className='flex items-center gap-1'>
                    <div className='rounded text-[7px] lg:text-[9px] px-1 py-0.5 text-green-700 bg-green-50 border border-green-100 font-bold uppercase'>
                        10 min
                    </div>
                    {Boolean(data?.discount) && (
                        <p className='text-white bg-green-600 px-1 py-0.5 text-[7px] lg:text-[9px] rounded font-bold'>
                            {data.discount}% OFF
                        </p>
                    )}
                </div>

                <div className='font-bold text-slate-800 dark:text-zinc-100 text-[10px] lg:text-sm line-clamp-2 h-[28px] lg:h-[40px] leading-tight'>
                    {data?.name}
                </div>

                <div className='flex items-center gap-1 mt-0.5'>
                    <span className='text-[7px] lg:text-[9px] px-1.5 py-0.5 rounded-full border border-slate-200 text-slate-500 bg-slate-50 font-bold'>
                        {data?.unit}
                    </span>
                    {data?.variantGroup && (
                        <span className='text-[7px] lg:text-[9px] px-1.5 py-0.5 rounded-full border border-green-200 text-green-600 bg-green-50 font-bold'>
                            + more sizes
                        </span>
                    )}
                </div>

                <div className='flex items-center justify-between gap-1 mt-auto pt-1'>
                    <div className='flex flex-col'>
                        <div className='font-black text-slate-900 dark:text-white text-[11px] lg:text-base leading-tight'>
                            {DisplayPriceInRupees(pricewithDiscount(data?.price || 0, data?.discount || 0))}
                        </div>
                        {Boolean(data?.discount) && (
                            <span className='text-[8px] lg:text-[10px] line-through text-neutral-400'>
                                {DisplayPriceInRupees(data.price)}
                            </span>
                        )}
                    </div>

                    <div className='flex-shrink-0 w-[60px] lg:w-[90px]' onClick={(e) => e.preventDefault()}>
                        {data?.stock == 0 ? (
                            <div className='border border-red-100 bg-red-50 px-1 py-1 rounded text-center'>
                                <p className='text-red-500 text-[7px] lg:text-[9px] font-black uppercase leading-none'>
                                    Out of<br />stock
                                </p>
                            </div>
                        ) : (
                            <AddToCartButton data={data} />
                        )}
                    </div>
                </div>
            </div>
        </Link>
    )
}

export default React.memo(CardProduct)