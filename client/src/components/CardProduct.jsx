import React from 'react'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import { Link } from 'react-router-dom'
import { valideURLConvert } from '../utils/valideURLConvert'
import { pricewithDiscount } from '../utils/PriceWithDiscount'
import SummaryApi from '../common/SummaryApi'
import AxiosToastError from '../utils/AxiosToastError'
import Axios from '../utils/Axios'
import toast from 'react-hot-toast'
import { useState } from 'react'
import { useGlobalContext } from '../provider/GlobalProvider'
import AddToCartButton from './AddToCartButton'

const CardProduct = ({data}) => {
    // Generate URL with ID for routing
    const url = `/product/${valideURLConvert(data?.name || "")}-${data?._id}`
    const [loading,setLoading] = useState(false)

    // FEATURE: Dynamic Labels based on Category
    const getProductLabel = () => {
        const title = data?.name?.toLowerCase() || "";
        if (title.includes("chicken") || title.includes("fish") || title.includes("meat")) return { text: "Fresh Cut", color: "bg-red-600 shadow-red-500/20" };
        if (title.includes("organic") || title.includes("nature")) return { text: "Organic", color: "bg-emerald-600 shadow-emerald-500/20" };
        if (data?.discount > 20) return { text: "Best Deal", color: "bg-orange-500 shadow-orange-500/20" };
        return null;
    }
    const label = getProductLabel();

    // FIXED: Robust Image Error Handler
    const handleImgError = (e) => {
        e.target.onerror = null; 
        e.target.src = "https://res.cloudinary.com/daso5ntlt/image/upload/v1700000000/placeholder.png"; 
    }
  
  return (
    <Link to={url} className='border p-2 lg:p-3 flex flex-col gap-2 min-w-[150px] lg:min-w-[220px] max-w-[220px] h-[320px] lg:h-[380px] rounded-2xl cursor-pointer bg-white dark:bg-[#0F0F0F] border-slate-100 dark:border-zinc-800 transition-all hover:shadow-xl dark:hover:shadow-green-900/10 hover:border-green-100 dark:hover:border-green-900/50 group relative overflow-hidden' >
      
      {/* FEATURE: Floating Category Label with Glow */}
      {label && (
          <div className={`absolute top-3 left-3 z-10 ${label.color} text-white text-[8px] font-black px-2 py-0.5 rounded shadow-lg uppercase tracking-wider`}>
              {label.text}
          </div>
      )}

      {/* IMAGE CONTAINER with Dark Mode background shift */}
      <div className='w-full h-32 lg:h-48 rounded-xl overflow-hidden flex items-center justify-center bg-[#f9f9f9] dark:bg-[#1A1A1A] p-3 lg:p-5 flex-shrink-0 relative transition-colors'>
            <img 
                src={(data?.image && data.image.length > 0) ? data.image[0] : "https://via.placeholder.com/150"}
                alt={data?.name || "Product"}
                onError={handleImgError} 
                className='max-w-full max-h-full object-contain transition-transform duration-500 lg:group-hover:scale-110 drop-shadow-sm dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.05)]'
            />
            
            {/* FEATURE: Low Stock Urgency Alert */}
            {data?.stock < 10 && data?.stock > 0 && (
                <div className='absolute bottom-0 left-0 w-full bg-red-600/10 dark:bg-red-500/5 py-0.5 text-center'>
                    <p className='text-[8px] font-black text-red-600 dark:text-red-400 animate-pulse uppercase'>Only {data.stock} left</p>
                </div>
            )}
      </div>
      
      {/* CONTENT AREA */}
      <div className='flex flex-col flex-grow mt-1'>
          {/* TOP TAGS */}
          <div className='flex items-center gap-1 mb-1'>
            <div className='rounded text-[9px] lg:text-[10px] w-fit px-1.5 py-0.5 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 font-bold uppercase tracking-tighter'>
                  10 min 
            </div>
            {
              Boolean(data?.discount) && (
                <p className='text-white bg-green-600 dark:bg-green-500 px-1.5 py-0.5 w-fit text-[9px] lg:text-[10px] rounded font-bold shadow-sm'>
                    {data.discount}% OFF
                </p>
              )
            }
          </div>

          {/* PRODUCT TITLE - Smooth Dark Mode transition */}
          <div className='font-bold text-slate-800 dark:text-zinc-100 text-xs lg:text-sm line-clamp-2 min-h-[2.5rem] leading-tight mb-1 group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors'>
            {data?.name}
          </div>

          {/* UNIT */}
          <div className='w-fit text-[10px] lg:text-xs font-semibold text-neutral-400 dark:text-zinc-500 mb-2 italic'>
            {data?.unit} 
          </div>

          {/* PRICE & BUTTON SECTION */}
          <div className='flex items-center justify-between gap-1 mt-auto'>
            <div className='flex flex-col'>
              <div className='font-black text-slate-900 dark:text-white text-sm lg:text-base'>
                  {DisplayPriceInRupees(pricewithDiscount(data?.price || 0, data?.discount || 0))} 
              </div>
              {Boolean(data?.discount) && (
                <span className='text-[10px] line-through text-neutral-400 dark:text-zinc-600 font-medium'>
                    {DisplayPriceInRupees(data.price)}
                </span>
              )}
            </div>

            <div className='flex-shrink-0'>
              {
                data?.stock == 0 ? (
                    <div className='border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 px-2 py-1 rounded-md'>
                        <p className='text-red-500 dark:text-red-400 text-[8px] lg:text-[9px] font-black uppercase text-center leading-none'>Out of<br/>stock</p>
                    </div>
                ) : (
                  <AddToCartButton data={data} />
                )
              }
            </div>
          </div>
      </div>

    </Link>
  )
}

export default CardProduct;