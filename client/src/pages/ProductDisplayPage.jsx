import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import SummaryApi from '../common/SummaryApi'
import Axios from '../utils/Axios'
import AxiosToastError from '../utils/AxiosToastError'
import { FaAngleRight, FaAngleLeft, FaChevronLeft, FaShareNodes } from "react-icons/fa6";
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
  
  // ✓ FIX: Resilient ID extraction fallback to support both :product and :productId parameters
  const rawProduct = params?.product || params?.productId || ''
  let productId = rawProduct.includes('-') ? rawProduct.split('-').pop() : rawProduct

  const [data, setData] = useState({ name: "", image: [], stock: 0, unit: "" })
  const [image, setImage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [imageZoom, setImageZoom] = useState(false)
  const imageContainer = useRef()
  const [isOpen, setIsOpen] = useState(true)

  const checkShopStatus = () => {
    const now = new Date()
    const hours = now.getHours()
    setIsOpen(hours >= 8 && hours < 21)
  }

  const fetchProductDetails = async () => {
    // Basic validation check for 24-char MongoDB ObjectIDs
    if (!productId || productId.length !== 24) {
      console.warn("⚠️ Invalid or missing tracking product ID:", productId);
      return
    }
    try {
      setLoading(true)
      const response = await Axios({
        url: '/api/product/get-product-details',
        method: 'post',
        data: { productId: productId }
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
  }, [productId])

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
        toast.success('Product link copied! 📋')
      }
    } catch (err) {
      console.log("Share cancelled")
    }
  }

  return (
    <section key={productId} className='w-full bg-gradient-to-b from-white to-gray-50 pb-24 lg:pb-10 animate-fadeIn relative'>
      
      {/* ACTION STICKY HEADER */}
      <div className='sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm'>
        <div className='container mx-auto px-4 py-3.5 flex items-center justify-between w-full'>
          <button 
            onClick={() => navigate(-1)} 
            className='p-2.5 hover:bg-gray-50 active:scale-95 transition-all rounded-full text-gray-800 flex items-center justify-center border border-gray-100 bg-white shadow-sm'
          >
            <FaChevronLeft size={16} />
          </button>

          <h4 className='text-xs font-black tracking-wider text-slate-400 uppercase truncate max-w-[50%] select-none'>
            {data.name || 'Product Details'}
          </h4>

          <button 
            onClick={handleShareProductSystem}
            className='p-2.5 hover:bg-gray-50 active:scale-95 transition-all rounded-full text-gray-800 flex items-center justify-center border border-gray-100 bg-white shadow-sm'
          >
            <FaShareNodes size={16} />
          </button>
        </div>
      </div>

      <div className='container mx-auto p-4 lg:p-8 grid lg:grid-cols-2 gap-8 mt-2'>
        
        {/* Left: Gallery Column */}
        <div className='space-y-4'>
          {/* Main Image View Box */}
          <div 
            className='bg-white w-full aspect-square max-h-[300px] sm:max-h-[360px] lg:max-h-[420px] rounded-2xl flex items-center justify-center overflow-hidden border border-gray-100/70 shadow-sm relative group cursor-zoom-in'
            onClick={() => setImageZoom(!imageZoom)}
          >
            {!loading && data?.image?.length > 0 ? (
              <img
                src={data.image[image]?.replace("https://", "https://")}
                // ✓ FIX: Applied absolute constraints to keep product image safely proportional and completely eliminate horizontal stretching
                className={`absolute max-w-[85%] max-h-[85%] object-contain transition-transform duration-300 ${imageZoom ? 'scale-150' : 'scale-100'}`}
                alt={data.name}
              />
            ) : (
              <div className='w-full h-full bg-slate-50 animate-pulse flex items-center justify-center'>
                <p className='text-gray-400 font-bold text-xs uppercase tracking-widest'>Loading...</p>
              </div>
            )}
          </div>

          {/* Dots Indicator */}
          <div className='flex items-center justify-center gap-1.5'>
            {data?.image?.map((img, index) => (
              <button
                key={img + index}
                onClick={() => setImage(index)}
                className={`h-1.5 rounded-full transition-all ${index === image ? "bg-green-600 w-6" : "bg-gray-200 w-1.5"}`}
              />
            ))}
          </div>

          {/* Thumbnails list */}
          <div className='relative'>
            <div ref={imageContainer} className='flex gap-2.5 overflow-x-auto scrollbar-none snap-x scroll-smooth px-1'>
              {data?.image?.map((img, index) => (
                <button
                  key={img + index}
                  onClick={() => setImage(index)}
                  className={`min-w-20 w-20 h-20 rounded-2xl border-2 transition-all overflow-hidden ${index === image ? 'border-green-500 shadow-md scale-105' : 'border-transparent opacity-60 bg-white p-1'}`}
                >
                  <img src={img?.replace("https://", "https://")} alt='thumb' className='w-full h-full object-contain p-1' />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Product Info Column */}
        <div className='space-y-5 flex flex-col justify-center'>
          <div className='flex items-center gap-2'>
            <span className='bg-green-100 text-green-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm'>⚡ 10 MINS</span>
          </div>

          <h1 className='text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-tight'>{data.name}</h1>
          <p className='text-gray-400 font-bold text-xs mt-0.5'>{data.unit}</p>

          <Divider />

          {/* Price Component Box */}
          <div className='bg-slate-950 text-white p-5 rounded-3xl shadow-xl flex items-center justify-between'>
            <div>
              <p className='text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1'>Price Details</p>
              <div className='flex items-baseline gap-3'>
                <span className='text-3xl font-black tracking-tight'>
                  {DisplayPriceInRupees(pricewithDiscount(Number(data.price || 0), Number(data.discount || 0)))}
                </span>
                {data.discount > 0 && (
                  <span className='line-through text-gray-500 font-bold text-sm'>
                    {DisplayPriceInRupees(Number(data.price || 0))}
                  </span>
                )}
              </div>
            </div>
            {data.discount > 0 && (
              <span className='bg-green-600 font-black text-xs px-3 py-1.5 rounded-xl text-white shadow-md uppercase tracking-wider'>
                {data.discount}% OFF
              </span>
            )}
          </div>

          {productId && <WishlistButton productId={productId} />}

          {!isOpen ? (
            <div className='bg-indigo-50/60 border-2 border-indigo-100 border-dashed p-6 rounded-3xl text-center animate-pulse'>
              <p className='font-black text-slate-800 text-base'>🌙 Snapit is resting</p>
              <p className='text-xs text-indigo-600 font-bold mt-1 uppercase tracking-wider'>Ordering resumes at 8:00 AM</p>
            </div>
          ) : data.stock === 0 ? (
            <div className='bg-rose-50 border border-rose-100 p-4 rounded-2xl text-center'>
              <p className='text-rose-600 font-black text-sm uppercase tracking-widest italic'>Out of stock</p>
            </div>
          ) : (
            <div className='h-14 mt-2 shadow-md shadow-green-100/30 rounded-2xl overflow-hidden'>
              <AddToCartButton data={data} />
            </div>
          )}

          {/* Why Shop from Snapit */}
          <div className='bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4'>
            <h3 className='font-black text-slate-800 text-sm uppercase tracking-wider px-1'>
              Why shop from Snapit?
            </h3>
            
            <div className='flex items-center gap-4 group cursor-pointer'>
              <div className='w-11 h-11 bg-blue-50 rounded-2xl flex items-center justify-center p-2.5 flex-shrink-0'>
                <img src={image1} alt='superfast' className='object-contain' />
              </div>
              <div>
                <p className='font-extrabold text-slate-800 text-sm'>Superfast Delivery</p>
                <p className='text-xs text-gray-400 font-medium'>Directly from local dark stores in 10 minutes.</p>
              </div>
            </div>

            <div className='flex items-center gap-4 group cursor-pointer'>
              <div className='w-11 h-11 bg-emerald-50 rounded-2xl flex items-center justify-center p-2.5 flex-shrink-0'>
                <img src={image2} alt='offers' className='object-contain' />
              </div>
              <div>
                <p className='font-extrabold text-slate-800 text-sm'>Best Prices & Offers</p>
                <p className='text-xs text-gray-400 font-medium'>Unbeatable local deals with verified first-order coupons.</p>
              </div>
            </div>

            <div className='flex items-center gap-4 group cursor-pointer'>
              <div className='w-11 h-11 bg-purple-50 rounded-2xl flex items-center justify-center p-2.5 flex-shrink-0'>
                <img src={image3} alt='assortment' className='object-contain' />
              </div>
              <div>
                <p className='font-extrabold text-slate-800 text-sm'>Wide Assortment</p>
                <p className='text-xs text-gray-400 font-medium'>Everything from Maggi to gym supplements available.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ratings and Reviews */}
      <div className='container mx-auto px-4 mt-4 border-t border-gray-100/70 pt-4'>
        <ProductReviews productId={productId} />
      </div>

      <SmartSuggestions productId={productId} />

    </section>
  )
}

export default ProductDisplayPage