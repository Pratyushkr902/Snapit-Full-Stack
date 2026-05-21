// SmartSuggestions.jsx - Enhanced Version
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import { pricewithDiscount } from '../utils/PriceWithDiscount'
import { FaStar, FaHeart } from 'react-icons/fa6'
import { valideURLConvert } from '../utils/valideURLConvert'

const SmartSuggestions = ({ productId }) => {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const fetchSuggestions = async () => {
    try {
      setLoading(true)
      const response = await Axios({
        ...SummaryApi.getFrequentlyBought,
        // ✅ FIXED: Sending both possible object key names to satisfy your backend route requirements
        data: { 
          productId: productId,
          id: productId, 
          limit: 10 
        }
      })
      if (response.data.success) {
        setSuggestions(response.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch suggestions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (productId) fetchSuggestions()
  }, [productId])

  const handleProductClick = (product) => {
    const productUrl = `/product/${valideURLConvert(product.name || "")}-${product._id}`
    navigate(productUrl)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading || suggestions.length === 0) return null

  return (
    <div className='bg-white pt-6 pb-4 mt-4 border-t border-gray-100'>
      <h2 className='text-xl font-extrabold text-slate-900 px-4 mb-4 tracking-tight'>
        You might also like
      </h2>

      {/* HORIZONTAL SCROLL CAROUSEL ENGINE */}
      <div className='flex gap-3 overflow-x-auto px-4 pb-4 scrollbar-none snap-x scroll-smooth'>
        {suggestions.map((product) => {
          const finalPrice = pricewithDiscount(
            Number(product.price || 0),
            Number(product.discount || 0)
          )

          return (
            <div
              key={product._id}
              onClick={() => handleProductClick(product)}
              className='min-w-[150px] w-[150px] bg-white rounded-2xl flex flex-col snap-start cursor-pointer relative'
            >
              {/* Product Image Frame */}
              <div className='w-full aspect-square bg-gray-50 rounded-2xl flex items-center justify-center relative overflow-hidden p-3 border border-gray-100/60 shadow-sm'>
                <img
                  src={product.image?.[0]?.replace('http://', 'https://')}
                  alt={product.name}
                  className='w-full h-full object-contain'
                  onError={(e) => {
                    e.target.src = 'https://placehold.co/150?text=Product'
                  }}
                />
                
                {/* Floating Heart Favourite Icon */}
                <button 
                  onClick={(e) => e.stopPropagation()} 
                  className='absolute top-2 right-2 text-rose-400 bg-white p-1 rounded-full shadow-sm hover:scale-110 transition-transform'
                >
                  <FaHeart size={12} />
                </button>

                {/* Reference Styled ADD Button Overlay */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    console.log('Add to cart:', product._id)
                  }}
                  className='absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-white border border-rose-500 text-rose-500 font-extrabold text-xs px-5 py-1 rounded-lg shadow-sm hover:bg-rose-50 active:scale-95 transition-all uppercase tracking-wider'
                >
                  Add
                </button>
              </div>

              {/* Pricing Blocks Row */}
              <div className='mt-2.5 px-1 flex items-center gap-1.5'>
                <span className='bg-green-700 text-white font-black text-[10px] px-1.5 py-0.5 rounded'>
                  {DisplayPriceInRupees(finalPrice)}
                </span>
                {product.discount > 0 && (
                  <span className='text-gray-400 line-through text-[10px] font-bold'>
                    {DisplayPriceInRupees(product.price)}
                  </span>
                )}
              </div>

              {/* Dynamic Saving Tag Accent */}
              {product.discount > 0 && (
                <p className='text-green-600 font-extrabold text-[10px] px-1 uppercase tracking-wide mt-0.5'>
                  {DisplayPriceInRupees(product.price - finalPrice)} OFF
                </p>
              )}

              {/* Title & Metadata Details */}
              <div className='px-1 mt-1 flex-1 flex flex-col justify-between'>
                <h3 className='text-xs font-bold text-slate-800 line-clamp-2 leading-tight min-h-[2rem]'>
                  {product.name}
                </h3>
                
                <div className='mt-1 space-y-0.5'>
                  <p className='text-[10px] text-gray-400 font-medium'>{product.unit}</p>
                  
                  {/* Rating Stars Bar Strip */}
                  <div className='flex items-center gap-1 text-[10px] text-slate-500 font-bold bg-slate-50 w-fit px-1.5 py-0.5 rounded border border-gray-100'>
                    <FaStar className='text-yellow-400' size={9} />
                    <span>4.2</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SmartSuggestions