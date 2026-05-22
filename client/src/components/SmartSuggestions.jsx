import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import { pricewithDiscount } from '../utils/PriceWithDiscount'
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
        // ✅ FIXED: Using 'params' for GET request query serialization instead of 'data'
        params: { 
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
    <div className='bg-white pt-6 pb-4 mt-4 border-t border-gray-100/80'>
      <h2 className='text-xl font-extrabold text-slate-900 px-5 mb-4 tracking-tight'>
        You might also like
      </h2>

      {/* HORIZONTAL CAROUSEL */}
      <div className='flex gap-4 overflow-x-auto px-5 pb-4 scrollbar-none snap-x scroll-smooth'>
        {suggestions.map((product) => {
          const finalPrice = pricewithDiscount(
            Number(product.price || 0),
            Number(product.discount || 0)
          )

          return (
            <div
              key={product._id}
              onClick={() => handleProductClick(product)}
              className='min-w-[170px] w-[170px] bg-white border border-gray-100 rounded-3xl flex flex-col snap-start cursor-pointer p-3 hover:shadow-md transition-shadow duration-200'
            >
              {/* Product Image */}
              <div className='w-full aspect-square bg-white flex items-center justify-center overflow-hidden p-2 relative mb-2'>
                <img
                  src={product.image?.[0]?.replace('https://', 'https://')}
                  alt={product.name}
                  className='w-full h-full object-contain'
                  onError={(e) => { e.target.src = 'https://placehold.co/150?text=Product' }}
                />
              </div>

              {/* Title & Price Display */}
              <div className='flex flex-col flex-1 justify-between gap-1'>
                <h3 className='text-sm font-bold text-slate-800 line-clamp-2 leading-tight min-h-[2.5rem]'>
                  {product.name}
                </h3>
                
                <div className='mt-1 text-green-600 font-extrabold text-base tracking-tight'>
                  {DisplayPriceInRupees(finalPrice)}
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