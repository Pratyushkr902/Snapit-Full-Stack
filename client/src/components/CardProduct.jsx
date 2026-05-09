import React from 'react'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import { Link } from 'react-router-dom'
import { valideURLConvert } from '../utils/valideURLConvert'
import { pricewithDiscount } from '../utils/PriceWithDiscount'
import AddToCartButton from './AddToCartButton'

const CardProduct = ({ data }) => {

    const url = `/product/${valideURLConvert(data?.name || "")}-${data?._id}`

    const getProductLabel = () => {
        const title = data?.name?.toLowerCase() || ""

        if (
            title.includes("chicken") ||
            title.includes("fish") ||
            title.includes("meat")
        ) {
            return { text: "Fresh", color: "bg-red-600" }
        }

        if (
            title.includes("organic") ||
            title.includes("nature")
        ) {
            return { text: "Organic", color: "bg-emerald-600" }
        }

        if (data?.discount > 20) {
            return { text: "Deal", color: "bg-orange-500" }
        }

        return null
    }

    const label = getProductLabel()

    const handleImgError = (e) => {
        e.target.onerror = null
        e.target.src =
            "https://res.cloudinary.com/daso5ntlt/image/upload/v1700000000/placeholder.png"
    }

    return (
        <Link
            to={url}
            onClick={() => window.scrollTo(0, 0)}
            className='border flex flex-col rounded-xl cursor-pointer bg-white dark:bg-[#0F0F0F] border-slate-100 dark:border-zinc-800 transition-all hover:shadow-lg hover:border-green-200 group relative overflow-hidden p-1.5 lg:p-3'
        >

            {/* Product Label */}
            {label && (
                <div
                    className={`absolute top-2 left-2 z-10 ${label.color} text-white text-[7px] lg:text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider`}
                >
                    {label.text}
                </div>
            )}

            {/* Product Image */}
            <div className='w-full aspect-square min-h-[140px] rounded-lg overflow-hidden flex items-center justify-center bg-[#f9f9f9] dark:bg-[#1A1A1A] relative p-2'>

                <img
                    src={
                        (data?.image && data.image.length > 0)
                            ? data.image[0]
                            : "https://via.placeholder.com/150"
                    }
                    alt={data?.name || "Product"}
                    onError={handleImgError}
                    className='max-w-[78%] max-h-[78%] object-contain transition-transform duration-500 lg:group-hover:scale-105'
                />

                {/* Soft Overlay */}
                <div className='absolute inset-0 bg-gradient-to-t from-black/[0.03] to-transparent pointer-events-none'></div>

                {/* Low Stock Warning */}
                {data?.stock < 10 && data?.stock > 0 && (
                    <div className='absolute bottom-0 left-0 w-full bg-gradient-to-t from-red-600/20 to-transparent py-1 text-center'>
                        <p className='text-[7px] font-black text-red-600 animate-pulse uppercase'>
                            Only {data.stock} left
                        </p>
                    </div>
                )}
            </div>

            {/* Product Content */}
            <div className='flex flex-col mt-1.5 gap-0.5'>

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
                <div className='font-bold text-slate-800 dark:text-zinc-100 text-[10px] lg:text-sm line-clamp-2 min-h-[32px] leading-tight group-hover:text-green-700 transition-colors'>
                    {data?.name}
                </div>

                {/* Product Unit */}
                <div className='text-[9px] lg:text-xs text-neutral-400 italic'>
                    {data?.unit}
                </div>

                {/* Price + Cart */}
                <div className='flex items-center justify-between gap-1 mt-1'>

                    {/* Price */}
                    <div className='flex flex-col'>

                        <div className='font-black text-slate-900 dark:text-white text-[11px] lg:text-base leading-tight'>
                            {
                                DisplayPriceInRupees(
                                    pricewithDiscount(
                                        data?.price || 0,
                                        data?.discount || 0
                                    )
                                )
                            }
                        </div>

                        {Boolean(data?.discount) && (
                            <span className='text-[8px] lg:text-[10px] line-through text-neutral-400'>
                                {DisplayPriceInRupees(data.price)}
                            </span>
                        )}
                    </div>

                    {/* Add To Cart */}
                    <div
                        className='flex-shrink-0 w-[60px] lg:w-[90px]'
                        onClick={(e) => e.preventDefault()}
                    >

                        {data?.stock == 0 ? (
                            <div className='border border-red-100 bg-red-50 px-1 py-1 rounded text-center'>
                                <p className='text-red-500 text-[7px] lg:text-[9px] font-black uppercase leading-none'>
                                    Out of
                                    <br />
                                    stock
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