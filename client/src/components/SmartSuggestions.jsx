// SmartSuggestions.jsx - Enhanced Version
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import { pricewithDiscount } from '../utils/PriceWithDiscount'
import { FaChevronRight, FaPlus } from 'react-icons/fa6'
import { valideURLConvert } from '../utils/valideURLConvert'

const SmartSuggestions = ({ productId }) => {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const fetchSuggestions = async () => {
    try {
      setLoading(true)
      // FIXED: Swapped out unmapped endpoint reference to match getFrequentlyBought
      const response = await Axios({
        ...SummaryApi.getFrequentlyBought,
        data: { productId, limit: 8 }
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
    if (productId) {
      fetchSuggestions()
    }
  }, [productId])

  const handleProductClick = (product) => {
    // Standard routing formatting schema matching your ProductListPage templates
    const productUrl = `/${valideURLConvert(product.name)}-${product._id}`
    navigate(productUrl)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className='bg-white rounded-3xl p-8 shadow-sm border border-gray-100'>
        <div className='flex items-center justify-center h-40'>
          <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-green-600'></div>
        </div>
      </div>
    )
  }

  if (suggestions.length === 0) return null

  return (
    <div className='bg-white rounded-3xl p-6 lg:p-8 shadow-sm border border-gray-100'>
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-2xl font-black text-gray-800 flex items-center gap-3'>
          <span className='w-1.5 h-8 bg-gradient-to-b from-green-600 to-green-400 rounded-full'></span>
          You Might Also Like
        </h2>
        <button className='text-green-600 font-bold text-sm flex items-center gap-2 hover:gap-3 transition-all group'>
          View All
          <FaChevronRight className='group-hover:translate-x-1 transition-transform' />
        </button>
      </div>

      <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
        {suggestions.map((product) => {
          const finalPrice = pricewithDiscount(
            Number(product.price || 0),
            Number(product.discount || 0)
          )

          return (
            <button
              key={product._id}
              onClick={() => handleProductClick(product)}
              className='bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-xl hover:border-green-200 transition-all duration-300 group text-left relative overflow-hidden active:scale-95'
            >
              {/* Discount Badge */}
              {product.discount > 0 && (
                <div className='absolute top-3 right-3 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg z-10'>
                  {product.discount}% OFF
                </div>
              )}

              {/* Product Image */}
              <div className='bg-gray-50 rounded-xl h-40 flex items-center justify-center mb-3 group-hover:bg-gray-100 transition-colors overflow-hidden'>
                <img
                  src={product.image?.[0]?.replace('http://', 'https://')}
                  alt={product.name}
                  className='w-full h-full object-contain p-3 group-hover:scale-110 transition-transform duration-300'
                  onError={(e) => {
                    e.target.src = 'https://placehold.co/150?text=Product'
                  }}
                />
              </div>

              {/* Product Info */}
              <div className='space-y-2'>
                <h3 className='text-sm font-bold text-gray-800 line-clamp-2 group-hover:text-green-600 transition-colors min-h-[2.5rem]'>
                  {product.name}
                </h3>
                
                <p className='text-xs text-gray-500 font-medium'>{product.unit}</p>

                {/* Price Section */}
                <div className='flex items-center justify-between pt-2'>
                  <div>
                    <p className='text-lg font-black text-gray-900'>
                      {DisplayPriceInRupees(finalPrice)}
                    </p>
                    {product.discount > 0 && (
                      <p className='text-xs text-gray-400 line-through font-medium'>
                        {DisplayPriceInRupees(product.price)}
                      </p>
                    )}
                  </div>
                  
                  {/* Quick Add Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      console.log('Add to cart:', product._id)
                    }}
                    className='bg-green-100 text-green-600 p-2.5 rounded-xl hover:bg-green-600 hover:text-white transition-all hover:scale-110 active:scale-95'
                  >
                    <FaPlus className='w-4 h-4' />
                  </button>
                </div>

                {/* Stock Status */}
                {product.stock < 5 && product.stock > 0 && (
                  <p className='text-xs text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded-lg mt-2'>
                    Only {product.stock} left!
                  </p>
                )}
              </div>

              {/* Hover Effect Overlay */}
              <div className='absolute inset-0 border-2 border-green-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none'></div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default SmartSuggestions