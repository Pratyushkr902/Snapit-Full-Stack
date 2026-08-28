import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import SummaryApi from '../common/SummaryApi'
import Axios from '../utils/Axios'
import AxiosToastError from '../utils/AxiosToastError'
import { FaChevronLeft, FaShareNodes } from "react-icons/fa6";
import { FaCalendarCheck, FaTimes } from 'react-icons/fa'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import Divider from '../components/Divider'
import image1 from '../assets/minute_delivery.png'
import image2 from '../assets/Best_Prices_Offers.png'
import image3 from '../assets/Wide_Assortment.webp'
import { pricewithDiscount } from '../utils/PriceWithDiscount'
import AddToCartButton from '../components/AddToCartButton'
import SmartSuggestions from '../components/SmartSuggestions'
import WishlistButton from '../components/WishlistButton'
import ProductReviews from '../components/ProductReviews'
import toast from 'react-hot-toast'
import { optimizeImageUrl, FALLBACK_IMAGE } from '../utils/optimizeImageUrl'

// ─── Subscribe & Save Modal ───────────────────────────────────────────────────
const SubscribeModal = ({ product, onClose }) => {
  const [frequency, setFrequency] = useState('DAILY')
  const [quantity, setQuantity] = useState(1)
  const [addresses, setAddresses] = useState([])
  const [selectedAddress, setSelectedAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('COD')
  const [loading, setLoading] = useState(false)
  const [fetchingAddress, setFetchingAddress] = useState(true)

  const frequencies = [
    { value: 'DAILY',       label: 'Daily',         desc: 'Every day' },
    { value: 'ALTERNATIVE', label: 'Alternate Days', desc: 'Every 2 days' },
    { value: 'WEEKLY',      label: 'Weekly',         desc: 'Once a week' },
  ]

  const price = pricewithDiscount(Number(product.price || 0), Number(product.discount || 0))

  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const res = await Axios({ ...SummaryApi.getAddress })
        if (res.data.success) {
          const active = res.data.data.filter(a => a.status !== false)  // ✅ FIXED
          setAddresses(active)
          if (active.length > 0) setSelectedAddress(active[0]._id)
        }
      } catch (err) {
        toast.error('Could not load addresses')
      } finally {
        setFetchingAddress(false)
      }
    }
    fetchAddresses()
  }, [])

  const handleSubscribe = async () => {
    if (!selectedAddress) { toast.error('Please select a delivery address'); return }
    setLoading(true)
    try {
      const res = await Axios({
        method: SummaryApi.createSubscription.method,
        url: SummaryApi.createSubscription.url,
        data: {
          items: [{ productId: product._id, quantity }],
          frequency,
          delivery_address: selectedAddress,
          nextDeliveryDate: new Date().toISOString(),
          payment_method: paymentMethod,
        }
      })
      if (res.data.success) { toast.success('Subscription created!'); onClose() }
      else toast.error(res.data.message || 'Failed to create subscription')
    } catch (err) {
      console.error('SUBSCRIPTION ERROR:', err.response?.status, err.response?.data)
      toast.error(err.response?.data?.message || 'Failed to create subscription')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='fixed inset-0 z-[999] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-0 sm:px-4'>
      <div className='bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden'>
        <div className='bg-gradient-to-r from-green-600 to-emerald-500 px-5 py-4 flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <FaCalendarCheck className='text-white text-lg' />
            <div>
              <p className='text-white font-black text-sm'>Subscribe & Save</p>
              <p className='text-green-100 text-[11px] font-medium'>Never run out of {product.name}</p>
            </div>
          </div>
          <button onClick={onClose} className='text-white/80 hover:text-white p-1'><FaTimes size={18} /></button>
        </div>

        <div className='p-5 space-y-4 max-h-[70vh] overflow-y-auto'>
          <div className='flex items-center gap-3 bg-gray-50 rounded-2xl p-3'>
            <img src={product.image?.[0]} alt={product.name} className='w-14 h-14 object-contain rounded-xl bg-white border border-gray-100' />
            <div className='flex-1 min-w-0'>
              <p className='font-bold text-slate-800 text-sm truncate'>{product.name}</p>
              <p className='text-gray-400 text-xs'>{product.unit}</p>
              <p className='text-green-700 font-black text-sm mt-0.5'>{DisplayPriceInRupees(price)} / delivery</p>
            </div>
          </div>

          <div>
            <p className='text-xs font-black text-slate-600 uppercase tracking-wider mb-2'>Delivery Frequency</p>
            <div className='grid grid-cols-3 gap-2'>
              {frequencies.map(f => (
                <button key={f.value} onClick={() => setFrequency(f.value)}
                  className={`p-2.5 rounded-2xl border-2 text-center transition-all ${frequency === f.value ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 bg-white text-gray-500'}`}>
                  <p className='font-black text-xs'>{f.label}</p>
                  <p className='text-[10px] font-medium mt-0.5 opacity-70'>{f.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className='text-xs font-black text-slate-600 uppercase tracking-wider mb-2'>Quantity per Delivery</p>
            <div className='flex items-center gap-3'>
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className='w-9 h-9 rounded-full border-2 border-gray-200 flex items-center justify-center font-black text-gray-600 hover:border-green-400 transition-all'>−</button>
              <span className='font-black text-slate-800 text-lg w-6 text-center'>{quantity}</span>
              <button onClick={() => setQuantity(q => q + 1)} className='w-9 h-9 rounded-full border-2 border-gray-200 flex items-center justify-center font-black text-gray-600 hover:border-green-400 transition-all'>+</button>
              <span className='text-xs text-gray-400 font-medium'>units per delivery</span>
            </div>
          </div>

          <div>
            <p className='text-xs font-black text-slate-600 uppercase tracking-wider mb-2'>Delivery Address</p>
            {fetchingAddress ? (
              <div className='h-10 bg-gray-100 animate-pulse rounded-xl' />
            ) : addresses.length === 0 ? (
              <p className='text-xs text-rose-500 font-semibold bg-rose-50 p-3 rounded-xl'>No saved address found. Please add an address first.</p>
            ) : (
              <select value={selectedAddress} onChange={e => setSelectedAddress(e.target.value)}
                className='w-full border-2 border-gray-100 rounded-2xl px-3 py-2.5 text-sm font-semibold text-slate-700 focus:border-green-400 focus:outline-none bg-white'>
                {addresses.map(addr => (
                  <option key={addr._id} value={addr._id}>{addr.address_line}, {addr.city} — {addr.pincode}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <p className='text-xs font-black text-slate-600 uppercase tracking-wider mb-2'>Payment Method</p>
            <div className='grid grid-cols-2 gap-2'>
              {[{ value: 'COD', label: '💵 Cash on Delivery' }, { value: 'WALLET', label: '👛 Snapit Wallet' }].map(pm => (
                <button key={pm.value} onClick={() => setPaymentMethod(pm.value)}
                  className={`p-3 rounded-2xl border-2 text-xs font-black transition-all ${paymentMethod === pm.value ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 bg-white text-gray-500'}`}>
                  {pm.label}
                </button>
              ))}
            </div>
          </div>

          <div className='bg-slate-950 text-white rounded-2xl px-4 py-3 flex items-center justify-between'>
            <div>
              <p className='text-gray-400 text-[10px] font-bold uppercase tracking-wider'>Per Delivery Total</p>
              <p className='text-white font-black text-lg'>{DisplayPriceInRupees(price * quantity)}</p>
            </div>
            <div className='text-right'>
              <p className='text-gray-400 text-[10px] font-bold uppercase tracking-wider'>Frequency</p>
              <p className='text-green-400 font-black text-sm capitalize'>{frequency.toLowerCase()}</p>
            </div>
          </div>
        </div>

        <div className='px-5 pb-6 pt-2'>
          <button onClick={handleSubscribe} disabled={loading || addresses.length === 0}
            className='w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl text-sm transition-all active:scale-95 shadow-lg shadow-green-200'>
            {loading ? 'Creating Subscription...' : '✅ Confirm Subscription'}
          </button>
          <p className='text-center text-[11px] text-gray-400 font-medium mt-2'>You can pause or cancel anytime from My Subscriptions</p>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const ProductDisplayPage = () => {
  const params = useParams()
  const navigate = useNavigate()
  
  const rawProduct = params?.product || params?.productId || ''
  let productId = '';
  if (rawProduct) {
    const cleanUrlTrack = rawProduct.split('?')[0].replace(/\/$/, '').trim();
    const matchId = cleanUrlTrack.match(/[0-9a-fA-F]{24}$/);
    productId = matchId ? matchId[0] : '';
  }

  const [data, setData] = useState({ name: "", image: [], stock: 0, unit: "" })
  const [image, setImage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [imageZoom, setImageZoom] = useState(false)
  const [isOpen, setIsOpen] = useState(true)
  const [showSubscribeModal, setShowSubscribeModal] = useState(false)
  const [variants, setVariants] = useState([])
  const imageContainer = useRef()

  // ── Swipe/drag state for Zepto/Blinkit-style image carousel ──
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const touchDeltaX = useRef(0)
  const isDragging = useRef(false)
  const directionLocked = useRef(null) // 'x' | 'y' | null
  const [dragOffset, setDragOffset] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const checkShopStatus = () => {
    const now = new Date()
    setIsOpen(now.getHours() >= 8 && now.getHours() < 20)
  }

  const fetchVariants = async (group) => {
    try {
      const res = await Axios({ url: '/api/product/get-variants', method: 'post', data: { variantGroup: group } })
      if (res.data.success) setVariants(res.data.data || [])
    } catch { setVariants([]) }
  }

  const fetchProductDetails = async () => {
    if (!productId || !/^[0-9a-fA-F]{24}$/.test(productId)) return;
    try {
      setLoading(true)
      const response = await Axios({ url: '/api/product/get-product-details', method: 'post', data: { productId, id: productId } })
      const { data: responseData } = response
      if (responseData.success) {
        setData(responseData.data)
        if (responseData.data?.variantGroup) {
          fetchVariants(responseData.data.variantGroup)
        } else {
          setVariants([])
        }
      }
    } catch (error) { AxiosToastError(error) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchProductDetails()
    checkShopStatus()
    const timer = setInterval(checkShopStatus, 60000)
    return () => clearInterval(timer)
  }, [productId])

  // Reset to first image whenever product changes
  useEffect(() => { setImage(0) }, [productId])

  const handleShareProductSystem = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: `Buy ${data.name || 'this item'} on Snapit!`, text: `Check out ${data.name} on Snapit.`, url: window.location.href })
      } else {
        await navigator.clipboard.writeText(window.location.href)
        toast.success('Product link copied! 📋')
      }
    } catch {}
  }

  const handleVariantClick = (variant) => {
    if (variant._id === data._id) return
    const slug = `${variant.name.toLowerCase().replace(/\s+/g, '-')}-${variant._id}`
    navigate(`/product/${slug}`)
  }

  const imageCount = data?.image?.length || 0

  const goToImage = (idx) => {
    if (imageCount === 0) return
    const clamped = ((idx % imageCount) + imageCount) % imageCount
    setImage(clamped)
  }

  // ── Swipe handlers (touch) ──
  const handleTouchStart = (e) => {
    if (imageCount <= 1) return
    isDragging.current = true
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    touchDeltaX.current = 0
    directionLocked.current = null
    setIsAnimating(false)
  }

  const handleTouchMove = (e) => {
    if (!isDragging.current || imageCount <= 1) return
    const currentX = e.touches[0].clientX
    const currentY = e.touches[0].clientY
    const deltaX = currentX - touchStartX.current
    const deltaY = currentY - touchStartY.current

    // Lock the gesture direction once movement is clearly one axis —
    // prevents a vertical scroll attempt from being hijacked as a
    // horizontal image drag (the Android "stuck scroll" bug).
    if (!directionLocked.current) {
      if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return // too small to decide yet
      directionLocked.current = Math.abs(deltaX) > Math.abs(deltaY) ? 'x' : 'y'
    }

    if (directionLocked.current === 'y') {
      // Let the page handle vertical scroll natively — don't treat as drag.
      isDragging.current = false
      return
    }

    touchDeltaX.current = deltaX
    setDragOffset(deltaX)
  }

  const handleTouchEnd = () => {
    if (!isDragging.current || imageCount <= 1) return
    isDragging.current = false
    const threshold = 50 // px needed to trigger a slide change
    setIsAnimating(true)

    if (touchDeltaX.current > threshold) {
      goToImage(image - 1) // swiped right -> previous image
    } else if (touchDeltaX.current < -threshold) {
      goToImage(image + 1) // swiped left -> next image
    }
    setDragOffset(0)
    touchDeltaX.current = 0
  }

  // ── Swipe handlers (mouse drag, for desktop testing) ──
  const handleMouseDown = (e) => {
    if (imageCount <= 1) return
    isDragging.current = true
    touchStartX.current = e.clientX
    touchDeltaX.current = 0
    setIsAnimating(false)
  }

  const handleMouseMove = (e) => {
    if (!isDragging.current || imageCount <= 1) return
    const currentX = e.clientX
    touchDeltaX.current = currentX - touchStartX.current
    setDragOffset(touchDeltaX.current)
  }

  const handleMouseUp = () => {
    if (!isDragging.current || imageCount <= 1) return
    isDragging.current = false
    const threshold = 50
    setIsAnimating(true)

    if (touchDeltaX.current > threshold) {
      goToImage(image - 1)
    } else if (touchDeltaX.current < -threshold) {
      goToImage(image + 1)
    }
    setDragOffset(0)
    touchDeltaX.current = 0
  }

  const handleMouseLeave = () => {
    if (isDragging.current) handleMouseUp()
  }

  return (
    <section key={productId} className='w-full bg-gradient-to-b from-white to-gray-50 pb-24 lg:pb-10 animate-fadeIn relative'>
      
      {showSubscribeModal && <SubscribeModal product={data} onClose={() => setShowSubscribeModal(false)} />}

      <div className='sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm'>
        <div className='container mx-auto px-4 py-3.5 flex items-center justify-between w-full'>
          <button onClick={() => navigate(-1)} className='p-2.5 hover:bg-gray-50 active:scale-95 transition-all rounded-full text-gray-800 flex items-center justify-center border border-gray-100 bg-white shadow-sm'>
            <FaChevronLeft size={16} />
          </button>
          <h4 className='text-xs font-black tracking-wider text-slate-400 uppercase truncate max-w-[50%] select-none'>{data.name || 'Product Details'}</h4>
          <button onClick={handleShareProductSystem} className='p-2.5 hover:bg-gray-50 active:scale-95 transition-all rounded-full text-gray-800 flex items-center justify-center border border-gray-100 bg-white shadow-sm'>
            <FaShareNodes size={16} />
          </button>
        </div>
      </div>

      <div className='container mx-auto p-4 lg:p-8 grid lg:grid-cols-2 gap-6 lg:gap-8 mt-2'>
        
        {/* Gallery */}
        <div className='space-y-3'>
          <div
            className='bg-white w-full aspect-[4/3] max-h-[240px] sm:max-h-[320px] lg:max-h-[420px] rounded-2xl overflow-hidden border border-gray-100/70 shadow-sm relative select-none'
            style={{ touchAction: 'pan-y' }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            {!loading && data?.image?.length > 0 ? (
              <div
                className={`flex h-full ${isAnimating ? 'transition-transform duration-300 ease-out' : ''}`}
                style={{
                  width: `${imageCount * 100}%`,
                  transform: `translateX(calc(${-image * (100 / imageCount)}% + ${dragOffset}px))`,
                }}
              >
                {data.image.map((img, idx) => (
                  <div
                    key={img + idx}
                    className='h-full flex items-center justify-center flex-shrink-0 cursor-zoom-in'
                    style={{ width: `${100 / imageCount}%` }}
                    onClick={() => { if (Math.abs(touchDeltaX.current) < 5) setImageZoom(!imageZoom) }}
                  >
                    <img
                      src={optimizeImageUrl(img, 700, 80)}
                      className={`w-full h-full object-contain p-3 sm:p-4 transition-transform duration-300 ${imageZoom && idx === image ? 'scale-150' : 'scale-100'}`}
                      alt={data.name}
                      loading={idx === 0 ? 'eager' : 'lazy'}
                      fetchPriority={idx === 0 ? 'high' : 'auto'}
                      decoding='async'
                      onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE }}
                      draggable={false}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className='w-full h-full bg-slate-50 animate-pulse flex items-center justify-center'>
                <p className='text-gray-400 font-bold text-xs uppercase tracking-widest'>Loading...</p>
              </div>
            )}
          </div>
          <div className='flex items-center justify-center gap-1.5'>
            {data?.image?.map((img, index) => (
              <button key={img+index} onClick={() => { setIsAnimating(true); setImage(index) }} className={`h-1.5 rounded-full transition-all ${index === image ? "bg-green-600 w-6" : "bg-gray-200 w-1.5"}`} />
            ))}
          </div>
          <div className='relative hidden sm:block'>
            <div ref={imageContainer} className='flex gap-2.5 overflow-x-auto scrollbar-none snap-x scroll-smooth px-1'>
              {data?.image?.map((img, index) => (
                <button key={img+index} onClick={() => { setIsAnimating(true); setImage(index) }}
                  className={`min-w-20 w-20 h-20 rounded-2xl border-2 transition-all overflow-hidden ${index === image ? 'border-green-500 shadow-md scale-105' : 'border-transparent opacity-60 bg-white p-1'}`}>
                  <img
                    src={optimizeImageUrl(img, 160, 75)}
                    alt='thumb'
                    className='w-full h-full object-contain p-1'
                    loading='lazy'
                    decoding='async'
                    onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Product Info */}
        <div className='space-y-4 lg:space-y-5 flex flex-col justify-center'>
          <div className='flex items-center gap-2'>
            <span className='bg-green-100 text-green-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm'>⚡ 10 MINS</span>
          </div>

          <div>
            <h1 className='text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-tight'>{data.name}</h1>
            <p className='text-gray-400 font-bold text-xs mt-1'>{data.unit}</p>
          </div>

          {variants.length > 1 && (
            <div>
              <p className='text-xs font-black text-slate-500 uppercase tracking-wider mb-2'>Select Size</p>
              <div className='flex flex-wrap gap-2'>
                {variants.map(variant => {
                  const isActive = variant._id === data._id
                  const vPrice = pricewithDiscount(Number(variant.price || 0), Number(variant.discount || 0))
                  return (
                    <button key={variant._id} onClick={() => handleVariantClick(variant)}
                      className={`flex flex-col items-center px-3 py-2 rounded-2xl border-2 transition-all active:scale-95 ${
                        isActive ? 'border-green-500 bg-green-50 text-green-700 shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:border-green-300'
                      }`}>
                      <span className='font-black text-xs'>{variant.unit}</span>
                      <span className={`text-[11px] font-bold mt-0.5 ${isActive ? 'text-green-600' : 'text-gray-400'}`}>{DisplayPriceInRupees(vPrice)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <Divider />

          <div className='bg-slate-950 text-white p-4 sm:p-5 rounded-3xl shadow-xl flex items-center justify-between'>
            <div>
              <p className='text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1'>Price Details</p>
              <div className='flex items-baseline gap-2 sm:gap-3'>
                <span className='text-2xl sm:text-3xl font-black tracking-tight'>
                  {DisplayPriceInRupees(pricewithDiscount(Number(data.price || 0), Number(data.discount || 0)))}
                </span>
                {data.discount > 0 && <span className='line-through text-gray-500 font-bold text-sm'>{DisplayPriceInRupees(Number(data.price || 0))}</span>}
              </div>
            </div>
            {data.discount > 0 && <span className='bg-green-600 font-black text-xs px-3 py-1.5 rounded-xl text-white shadow-md uppercase tracking-wider'>{data.discount}% OFF</span>}
          </div>

          {productId && /^[0-9a-fA-F]{24}$/.test(productId) && <WishlistButton productId={productId} />}

          {!isOpen ? (
            <div className='bg-indigo-50/60 border-2 border-indigo-100 border-dashed p-4 sm:p-6 rounded-3xl text-center'>
              <p className='font-black text-slate-800 text-sm sm:text-base'>🌙 Snapit is resting</p>
              <p className='text-xs text-indigo-600 font-bold mt-1 uppercase tracking-wider'>Deliveries resume at 9:00 AM IST</p>
              <div className='mt-3'>
                <AddToCartButton data={data} />
              </div>
            </div>
          ) : data.stock === 0 ? (
            <div className='bg-rose-50 border border-rose-100 p-4 rounded-2xl text-center'>
              <p className='text-rose-600 font-black text-sm uppercase tracking-widest italic'>Out of stock</p>
            </div>
          ) : (
            <div className='space-y-2.5'>
              <div className='h-12 sm:h-14 shadow-md shadow-green-100/30 rounded-2xl overflow-hidden'>
                <AddToCartButton data={data} />
              </div>
              <button onClick={() => setShowSubscribeModal(true)}
                className='w-full flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-200 text-emerald-700 font-black text-sm py-3.5 rounded-2xl transition-all active:scale-95'>
                <FaCalendarCheck size={15} />
                Subscribe & Save — Get it Delivered Regularly
              </button>
            </div>
          )}

          <div className='bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-gray-100 space-y-3 sm:space-y-4'>
            <h3 className='font-black text-slate-800 text-xs sm:text-sm uppercase tracking-wider px-1'>Why shop from Snapit?</h3>
            {[
              { img: image1, bg: 'bg-blue-50', title: 'Superfast Delivery', desc: 'Directly from local dark stores in 10 minutes.' },
              { img: image2, bg: 'bg-emerald-50', title: 'Best Prices & Offers', desc: 'Unbeatable local deals with verified first-order coupons.' },
              { img: image3, bg: 'bg-purple-50', title: 'Wide Assortment', desc: 'Everything from Maggi to gym supplements available.' },
            ].map(item => (
              <div key={item.title} className='flex items-center gap-3 sm:gap-4'>
                <div className={`w-10 h-10 sm:w-11 sm:h-11 ${item.bg} rounded-2xl flex items-center justify-center p-2 sm:p-2.5 flex-shrink-0`}>
                  <img src={item.img} alt={item.title} className='object-contain' />
                </div>
                <div>
                  <p className='font-extrabold text-slate-800 text-xs sm:text-sm'>{item.title}</p>
                  <p className='text-[11px] sm:text-xs text-gray-400 font-medium'>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {productId && /^[0-9a-fA-F]{24}$/.test(productId) && (
        <>
          <div className='container mx-auto px-4 mt-6 lg:mt-8 border-t border-gray-100/70 pt-4 lg:pt-6'>
            <ProductReviews productId={productId} />
          </div>
          <SmartSuggestions productId={productId} />
        </>
      )}
    </section>
  )
}

export default ProductDisplayPage;