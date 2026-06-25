import React, { useState } from 'react'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import { Link } from 'react-router-dom'
import { valideURLConvert } from '../utils/valideURLConvert'
import { pricewithDiscount } from '../utils/PriceWithDiscount'
import AddToCartButton from './AddToCartButton'

// ✅ Inline SVG fallback — never fails, no network needed
const FALLBACK_IMG =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23f3f4f6'/%3E%3Crect x='90' y='80' width='120' height='100' rx='8' fill='%23e5e7eb'/%3E%3Ccircle cx='150' cy='210' r='18' fill='%23e5e7eb'/%3E%3Ctext x='150' y='255' text-anchor='middle' fill='%239ca3af' font-size='13' font-family='sans-serif'%3ENo Image%3C/text%3E%3C/svg%3E"

// ✅ Serve Cloudinary images at w_400 to reduce bandwidth by ~60-70%
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

const CardProduct = ({ data }) => {
    const [imgSrc, setImgSrc] = useState(() => getImageSrc(data?.image))
    const [imgLoaded, setImgLoaded] = useState(false)

    const url = `/product/${valideURLConvert(data?.name || "")}-${data?._id}`

    const getProductLabel = () => {
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

    const label = getProductLabel()

    const handleImgError = () => {
        setImgSrc(FALLBACK_IMG)
    }

    return (
        <Link
            to={url}
            onClick={() => window.scrollTo(0, 0)}
            className='border flex flex-col rounded-xl cursor-pointer bg-white dark:bg-[#0F0F0F] border-slate-100 dark:border-zinc-800 transition-all hover:shadow-lg hover:border-green-200 group relative overflow-hidden p-1.5 lg:p-2'
        >
            {/* Product Label */}
            {label && (
                <div className={`absolute top-2 left-2 z-10 ${label.color} text-white text-[7px] lg:text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider`}>
                    {label.text}
                </div>
            )}

            {/* Image Container */}
            <div className='w-full aspect-square rounded-lg overflow-hidden flex items-center justify-center bg-[#f9f9f9] dark:bg-[#1A1A1A] relative'>
                {!imgLoaded && (
                    <div className='absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-pulse rounded-lg' />
                )}
                <img
                    src={imgSrc}
                    alt={data?.name || "Product"}
                    onError={handleImgError}
                    onLoad={() => setImgLoaded(true)}
                    loading="lazy"
                    decoding="async"
                    className={`w-full h-full object-contain transition-all duration-300 lg:group-hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                />

                {/* Soft Overlay */}
                <div className='absolute inset-0 bg-gradient-to-t from-black/[0.03] to-transparent pointer-events-none' />

                {/* Low Stock Warning */}
                {data?.stock < 10 && data?.stock > 0 && (
                    <div className='absolute bottom-0 left-0 w-full bg-gradient-to-t from-red-600/20 to-transparent py-1 text-center'>
                        <p className='text-[7px] font-black text-red-600 animate-pulse uppercase'>
                            Only {data.stock} left
                        </p>
                    </div>
                )}
            </div>

            {/* Info Block */}
            <div className='flex flex-col mt-1.5 gap-0.5 flex-1'>

                {/* Delivery + Discount Tags */}
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

                {/* Product Name */}
                <div className='font-bold text-slate-800 dark:text-zinc-100 text-[10px] lg:text-sm line-clamp-2 h-[28px] lg:h-[40px] leading-tight group-hover:text-green-700 transition-colors'>
                    {data?.name}
                </div>

                {/* Unit Pill - Zepto/Blinkit style */}
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

                {/* Price + Cart */}
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

export default CardProduct