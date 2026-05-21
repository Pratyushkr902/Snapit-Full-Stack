import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import SummaryApi from '../common/SummaryApi'
import Axios from '../utils/Axios'
import AxiosToastError from '../utils/AxiosToastError'
import { FaAngleRight, FaAngleLeft, FaChevronLeft, FaShareNodes, FaStar } from "react-icons/fa6"; // Cleaned out unused FaHeart
import { FiSearch } from "react-icons/fi";
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import Divider from '../components/Divider'
import image1 from '../assets/minute_delivery.png'
import image2 from '../assets/Best_Prices_Offers.png'
import image3 from '../assets/Wide_Assortment.png'
import { pricewithDiscount } from '../utils/PriceWithDiscount'
import AddToCartButton from '../components/AddToCartButton'
import SmartSuggestions from '../components/SmartSuggestions'
import WishlistButton from '../components/WishlistButton'
import ProductReviews from '../components/ProductReviews'
import toast from 'react-hot-toast'

const ProductDisplayPage = () => {
  const params = useParams()
  const navigate = useNavigate()
  
  let productId = params?.product?.split("-")?.slice(-1)[0]

  const [data, setData] = useState({ name: "", image: [], stock: 0 })
  const [image, setImage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [imageZoom, setImageZoom] = useState(false)
  const imageContainer = useRef()

  const [isOpen, setIsOpen] = useState(true)

  const checkShopStatus = () => {
    const now = new Date()
    const hours = now.getHours()
    setIsOpen(hours >= 7 && hours < 21)
  }

  const fetchProductDetails = async () => {
    try {
      setLoading(true)
      const response = await Axios({
        ...SummaryApi.getProductDetails,
        data: { productId }
      })
      const { data: responseData } = response
      if (responseData.success) setData(responseData.data)
    } catch (error) {
      AxiosToastError(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProductDetails()
    checkShopStatus()
    const timer = setInterval(checkShopStatus, 60000)
    return () => clearInterval(timer)
  }, [params, productId])

  const handleScrollRight = () => { imageContainer.current.scrollLeft += 100 }
  const handleScrollLeft = () => { imageContainer.current.scrollLeft -= 100 }

  const handleShareProductSystem = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Buy ${data.name || 'this item'} on Snapit!`,
          text: `Check out this amazing deal for ${data.name} on Snapit App.`,
          url: window.location.href,
        })
      } else {
        await navigator.clipboard.writeText(window.location.href)
        toast.success('Product link copied! 📋', {
          style: {
            borderRadius: '12px',
            background: '#10b981',
            color: '#fff',
          },
        })
      }
    } catch (err) {
      console.log("Share cancelled")
    }
  }

  return (
    <section key={productId} className='w-full bg-gradient-to-b from-white to-gray-50 pb-20 lg:pb-10'>
      
      {/* ENHANCED STICKY HEADER */}
      <div className='sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm'>
        <div className='container mx-auto px-4 py-3 flex items-center justify-between gap-3'>
          <button 
            onClick={() => navigate(-1)} 
            className='p-2.5 hover:bg-gray-50 active:scale-95 transition-all rounded-xl text-gray-800 flex items-center justify-center border border-gray-100 hover:border-gray-200'
          >
            <FaChevronLeft size={18} />
          </button>

          {/* ENHANCED SEARCH BAR */}
          <div 
            onClick={() => navigate('/')} 
            className='flex-1 max-w-2xl bg-gray-50 border border-gray-200 px-4 py-3 rounded-full flex items-center gap-3 cursor-pointer hover:bg-gray-100 transition-all group'
          >
            <FiSearch size={18} className='text-gray-400 group-hover:text-green-600 transition-colors' />
            <span className='font-medium text-gray-400 text-sm select-none group-hover:text-gray-600 transition-colors'>
              Search products...
            </span>
          </div>

          <button 
            onClick={handleShareProductSystem}
            className='p-2.5 hover:bg-gray-50 active:scale-95 transition-all rounded-xl text-gray-800 flex items-center justify-center border border-gray-100 hover:border-gray-200'
          >
            <FaShareNodes size={18} />
          </button>
        </div>
      </div>

      <div className='container mx-auto p-4 lg:p-8 grid lg:grid-cols-2 gap-8 mt-4'>
        
        {/* LEFT: ENHANCED IMAGE GALLERY */}
        <div className='space-y-4'>
          {/* Main Image */}
          <div 
            className='bg-white lg:min-h-[500px] rounded-3xl min-h-80 max-h-80 lg:max-h-[500px] flex items-center justify-center overflow-hidden border border-gray-100 shadow-lg relative group cursor-zoom-in'
            onClick={() => setImageZoom(!imageZoom)}
          >
            {!loading && data?.image?.length > 0 ? (
              <img
                src={data.image[image]?.replace("http://", "https://")}
                className={`w-full h-full object-contain p-6 transition-transform duration-300 ${imageZoom ? 'scale-150' : 'scale-100'}`}
                alt={data.name}
              />
            ) : (
              <div className='w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 animate-pulse flex items-center justify-center'>
                <p className='text-gray-400 text-sm font-bold uppercase tracking-wider'>Loading...</p>
              </div>
            )}
            
            {/* Zoom Indicator */}
            {data?.image?.length > 0 && (
              <div className='absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1.5 rounded-full text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity'>
                Click to zoom
              </div>
            )}
          </div>

          {/* Image Indicators */}
          <div className='flex items-center justify-center gap-2'>
            {data?.image?.map((img, index) => (
              <button
                key={img + index}
                onClick={() => setImage(index)}
                className={`h-1.5 rounded-full transition-all ${
                  index === image ? "bg-green-600 w-8" : "bg-gray-200 w-1.5 hover:bg-gray-300"
                }`}
              />
            ))}
          </div>

          {/* Thumbnail Gallery */}
          <div className='relative'>
            <div ref={imageContainer} className='flex gap-3 overflow-x-auto scrollbar-none snap-x scroll-smooth'>
              {data?.image?.map((img, index) => (
                <button
                  key={img + index}
                  onClick={() => setImage(index)}
                  className={`min-w-20 w-20 h-20 rounded-2xl border-2 transition-all overflow-hidden ${
                    index === image 
                      ? 'border-green-500 shadow-lg scale-105' 
                      : 'border-gray-200 opacity-60 hover:opacity-100 hover:border-gray-300'
                  }`}
                >
                  <img 
                    src={img?.replace("http://", "https://")} 
                    alt={`thumbnail ${index + 1}`}
                    className='w-full h-full object-contain bg-white p-2'
                  />
                </button>
              ))}
            </div>
            
            {/* Navigation Arrows */}
            {data?.image?.length > 4 && (
              <div className='hidden lg:flex justify-between absolute inset-0 items-center pointer-events-none px-2'>
                <button 
                  onClick={handleScrollLeft}
                  className='pointer-events-auto bg-white/90 backdrop-blur-sm p-2.5 rounded-full shadow-lg border border-gray-100 hover:bg-white transition-all'
                >
                  <FaAngleLeft className='text-gray-700' />
                </button>
                <button 
                  onClick={handleScrollRight}
                  className='pointer-events-auto bg-white/90 backdrop-blur-sm p-2.5 rounded-full shadow-lg border border-gray-100 hover:bg-white transition-all'
                >
                  <FaAngleRight className='text-gray-700' />
                </button>
              </div>
            )}
          </div>

          {/* DESKTOP SPECIFICATIONS */}
          <div className='hidden lg:block bg-white rounded-3xl p-6 shadow-sm border border-gray-100'>
            <h3 className='font-black text-xl text-gray-800 mb-6 flex items-center gap-2'>
              <span className='w-1 h-6 bg-green-600 rounded-full'></span>
              Product Details
            </h3>
            <div className='space-y-5'>
              <div>
                <p className='font-bold text-gray-700 text-xs uppercase tracking-wider mb-2'>Description</p>
                <p className='text-sm text-gray-600 leading-relaxed'>{data.description}</p>
              </div>
              <Divider />
              <div>
                <p className='font-bold text-gray-700 text-xs uppercase tracking-wider mb-2'>Unit</p>
                <p className='text-sm text-gray-600'>{data.unit}</p>
              </div>
              {data?.more_details && Object.keys(data?.more_details).map((element, index) => (
                <div key={element + index} className='space-y-5'>
                  <Divider />
                  <div>
                    <p className='font-bold text-gray-700 text-xs uppercase tracking-wider mb-2'>{element}</p>
                    <p className='text-sm text-gray-600'>{data?.more_details[element]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: ENHANCED PRODUCT DETAILS */}
        <div className='space-y-6'>
          {/* Status Badges */}
          <div className='flex items-center gap-2 flex-wrap'>
            <span className='bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-black px-4 py-2 rounded-full flex items-center gap-2 shadow-lg shadow-green-500/30'>
              <span className='text-base'>⚡</span>
              10 MIN DELIVERY
            </span>
            {data.stock < 5 && data.stock > 0 && (
              <span className='bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-black px-4 py-2 rounded-full uppercase tracking-wide animate-pulse shadow-lg shadow-orange-500/30'>
                Only {data.stock} Left
              </span>
            )}
            {data.discount > 0 && (
              <span className='bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-black px-4 py-2 rounded-full shadow-lg shadow-purple-500/30'>
                {data.discount}% OFF
              </span>
            )}
          </div>

          {/* Product Title */}
          <div>
            <h1 className='text-3xl lg:text-4xl font-black text-gray-900 leading-tight mb-2'>
              {data.name}
            </h1>
            <p className='text-gray-500 font-semibold text-sm'>{data.unit}</p>
          </div>

          {/* Price Section */}
          <div className='bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 shadow-xl'>
            <p className='text-gray-400 text-xs font-bold uppercase tracking-wider mb-3'>Price</p>
            <div className='flex items-end gap-4'>
              <div>
                <p className='font-black text-4xl lg:text-5xl text-white tracking-tight'>
                  {DisplayPriceInRupees(pricewithDiscount(Number(data.price || 0), Number(data.discount || 0)))}
                </p>
              </div>
              {data.discount > 0 && (
                <div className='flex flex-col mb-1'>
                  <p className='line-through text-gray-500 font-bold text-lg'>
                    {DisplayPriceInRupees(Number(data.price || 0))}
                  </p>
                  <p className="font-black text-green-400 text-sm">Save {data.discount}%</p>
                </div>
              )}
            </div>
          </div>

          {/* Wishlist & Rating */}
          <div className='flex items-center gap-3'>
            {productId && (
              <div className='flex-1'>
                <WishlistButton productId={productId} />
              </div>
            )}
            <button className='flex items-center gap-2 bg-white border border-gray-200 px-5 py-3 rounded-2xl hover:border-yellow-400 transition-all group'>
              <FaStar className='text-yellow-400 group-hover:scale-110 transition-transform' />
              <span className='font-bold text-gray-700'>4.5</span>
              <span className='text-gray-400 text-sm'>(120)</span>
            </button>
          </div>

          {/* Add to Cart / Status */}
          {!isOpen ? (
            <div className='bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-100 border-dashed p-8 rounded-3xl flex flex-col items-center gap-2 shadow-inner'>
              <span className='text-4xl mb-2'>🌙</span>
              <p className='font-black text-gray-800 text-xl tracking-tight'>Shop Closed</p>
              <p className='text-gray-600 font-semibold text-sm'>Opens at 7:00 AM</p>
            </div>
          ) : data.stock === 0 ? (
            <div className='bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-100 p-6 rounded-3xl text-center shadow-inner'>
              <p className='text-red-600 font-black text-lg uppercase tracking-wider'>Out of Stock</p>
              <p className='text-red-500 text-sm mt-1'>We'll restock soon!</p>
            </div>
          ) : (
            <div className='h-16'>
              <AddToCartButton data={data} />
            </div>
          )}

          {/* Features Section */}
          <div className='bg-white rounded-3xl p-6 shadow-sm border border-gray-100'>
            <h3 className='font-black text-gray-800 text-lg mb-5 flex items-center gap-2'>
              <span className='w-1 h-5 bg-green-600 rounded-full'></span>
              Why Choose Snapit?
            </h3>
            <div className='space-y-4'>
              <div className='flex items-start gap-4 group hover:bg-gray-50 p-3 rounded-2xl transition-all cursor-pointer'>
                <div className='w-12 h-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm'>
                  <img src={image1} alt='delivery' className='w-7 h-7 object-contain' />
                </div>
                <div>
                  <p className='font-black text-gray-800 text-base mb-1'>Superfast Delivery</p>
                  <p className='text-gray-600 text-sm leading-relaxed'>10-minute delivery from local stores</p>
                </div>
              </div>
              
              <div className='flex items-start gap-4 group hover:bg-gray-50 p-3 rounded-2xl transition-all cursor-pointer'>
                <div className='w-12 h-12 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm'>
                  <img src={image2} alt='prices' className='w-7 h-7 object-contain' />
                </div>
                <div>
                  <p className='font-black text-gray-800 text-base mb-1'>Best Prices</p>
                  <p className='text-gray-600 text-sm leading-relaxed'>Unbeatable deals & discounts</p>
                </div>
              </div>
              
              <div className='flex items-start gap-4 group hover:bg-gray-50 p-3 rounded-2xl transition-all cursor-pointer'>
                <div className='w-12 h-12 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm'>
                  <img src={image3} alt='assortment' className='w-7 h-7 object-contain' />
                </div>
                <div>
                  <p className='font-black text-gray-800 text-base mb-1'>Wide Selection</p>
                  <p className='text-gray-600 text-sm leading-relaxed'>Everything you need in one place</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Specifications */}
          <div className='lg:hidden bg-white rounded-3xl p-6 shadow-sm border border-gray-100'>
            <h3 className='font-black text-xl text-gray-800 mb-5 flex items-center gap-2'>
              <span className='w-1 h-6 bg-green-600 rounded-full'></span>
              Product Details
            </h3>
            <div className='space-y-4'>
              <div>
                <p className='font-bold text-gray-700 text-xs uppercase tracking-wider mb-2'>Description</p>
                <p className='text-sm text-gray-600 leading-relaxed'>{data.description}</p>
              </div>
              <Divider />
              <div>
                <p className='font-bold text-gray-700 text-xs uppercase tracking-wider mb-2'>Unit</p>
                <p className='text-sm text-gray-600'>{data.unit}</p>
              </div>
              {data?.more_details && Object.keys(data?.more_details).map((element, index) => (
                <div key={element + index} className='space-y-4'>
                  <Divider />
                  <div>
                    <p className='font-bold text-gray-700 text-xs uppercase tracking-wider mb-2'>{element}</p>
                    <p className='text-sm text-gray-600'>{data?.more_details[element]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* REVIEWS SECTION */}
      <div className='container mx-auto px-4 mt-12'>
        <div className='bg-white rounded-3xl p-6 lg:p-8 shadow-sm border border-gray-100'>
          <ProductReviews productId={productId} />
        </div>
      </div>

      {/* ENHANCED SMART SUGGESTIONS */}
      <div className='container mx-auto px-4 mt-12'>
        <SmartSuggestions productId={productId} />
      </div>
    </section>
  )
}

export default ProductDisplayPage