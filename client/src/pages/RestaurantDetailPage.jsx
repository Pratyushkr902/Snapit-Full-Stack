/**
 * RestaurantDetailPage.jsx
 * Route: /food/restaurant/:restaurantId
 *
 * Shows restaurant info + full menu grouped by category.
 * Uses Snapit's existing Redux cart actions so orders go through the
 * same checkout flow.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import { handleAddItemCart, clearCart } from '../store/cartProduct'

// ── Helpers ───────────────────────────────────────────────────────────────────
const FALLBACK_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' fill='%23f3f4f6'/%3E%3Ctext x='60' y='64' text-anchor='middle' fill='%23d1d5db' font-size='11' font-family='sans-serif'%3EFood%3C/text%3E%3C/svg%3E"

const BANNER_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='300' viewBox='0 0 800 300'%3E%3Crect width='800' height='300' fill='%23fef3c7'/%3E%3Ctext x='400' y='155' text-anchor='middle' fill='%23d97706' font-size='20' font-family='sans-serif'%3ERestaurant%3C/text%3E%3C/svg%3E"

function StarRating({ rating }) {
  return (
    <span className="inline-flex items-center gap-1">
      <svg className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
      </svg>
      <span className="font-semibold">{rating?.toFixed(1)}</span>
    </span>
  )
}

// ── VEG / NON-VEG indicator ────────────────────────────────────────────────────
function VegBadge({ isVeg }) {
  return (
    <div className={`w-4 h-4 border-2 flex items-center justify-center rounded-sm flex-shrink-0
                     ${isVeg ? 'border-green-600' : 'border-red-600'}`}>
      <div className={`w-2 h-2 rounded-full ${isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
    </div>
  )
}

// ── Add / Remove qty control ───────────────────────────────────────────────────
function QtyControl({ item, cartQty, onAdd, onIncrease, onDecrease }) {
  if (cartQty === 0) {
    return (
      <button
        onClick={() => onAdd(item)}
        className="px-4 py-1.5 bg-white border-2 border-green-600 text-green-600 text-sm
                   font-bold rounded-xl active:scale-95 transition-transform shadow-sm"
      >
        ADD
      </button>
    )
  }
  return (
    <div className="flex items-center gap-1 bg-green-600 rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => onDecrease(item)}
        className="px-2.5 py-1.5 text-white font-bold text-base active:bg-green-700 transition-colors"
      >
        −
      </button>
      <span className="text-white font-bold text-sm min-w-[20px] text-center">{cartQty}</span>
      <button
        onClick={() => onIncrease(item)}
        className="px-2.5 py-1.5 text-white font-bold text-base active:bg-green-700 transition-colors"
      >
        +
      </button>
    </div>
  )
}

// ── Food item card ─────────────────────────────────────────────────────────────
function FoodItemCard({ item, cartQty, onAdd, onIncrease, onDecrease }) {
  const [imgSrc, setImgSrc] = useState(item.image || FALLBACK_IMG)
  const effectivePrice = item.discountedPrice > 0 ? item.discountedPrice : item.price

  return (
    <div className="flex gap-3 py-4 border-b border-gray-50 last:border-0">
      {/* Text side */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <VegBadge isVeg={item.isVeg} />
          {item.isBestseller && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
              ★ Bestseller
            </span>
          )}
        </div>
        <h4 className="font-semibold text-gray-900 text-[14px] leading-snug line-clamp-2">
          {item.name}
        </h4>
        {item.description && (
          <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="font-bold text-gray-900 text-[15px]">₹{effectivePrice}</span>
          {item.discountedPrice > 0 && (
            <span className="text-gray-400 text-[12px] line-through">₹{item.price}</span>
          )}
        </div>
      </div>

      {/* Image + Add button side */}
      <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
        <div className="w-24 h-20 sm:w-28 sm:h-24 rounded-xl overflow-hidden bg-gray-100">
          <img
            src={imgSrc}
            alt={item.name}
            onError={() => setImgSrc(FALLBACK_IMG)}
            className="w-full h-full object-cover"
          />
        </div>
        <QtyControl
          item={item}
          cartQty={cartQty}
          onAdd={onAdd}
          onIncrease={onIncrease}
          onDecrease={onDecrease}
        />
      </div>
    </div>
  )
}

// ── Category tab bar ──────────────────────────────────────────────────────────
function CategoryTabs({ categories, active, onSelect }) {
  const scrollRef = useRef(null)

  useEffect(() => {
    const el = scrollRef.current?.querySelector(`[data-cat="${active}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [active])

  return (
    <div ref={scrollRef}
      className="flex gap-2 overflow-x-auto scrollbar-none py-2 px-4 bg-white border-b border-gray-100">
      {categories.map((cat) => (
        <button
          key={cat}
          data-cat={cat}
          onClick={() => onSelect(cat)}
          className={`
            flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all
            ${active === cat
              ? 'bg-green-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
          `}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-44 bg-gray-200 w-full" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-100 rounded w-1/3" />
        <div className="h-4 bg-gray-100 rounded w-2/3" />
      </div>
    </div>
  )
}

// ── Cart bottom bar ────────────────────────────────────────────────────────────
function CartBar({ totalItems, totalPrice, onViewCart }) {
  if (totalItems === 0) return null
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50">
      <button
        onClick={onViewCart}
        className="w-full bg-green-600 text-white rounded-2xl px-5 py-4 flex items-center
                   justify-between shadow-xl active:bg-green-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-lg">
            {totalItems} item{totalItems !== 1 ? 's' : ''}
          </span>
          <span className="font-semibold text-sm">View Cart</span>
        </div>
        <span className="font-bold">₹{totalPrice}</span>
      </button>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function RestaurantDetailPage() {
  const { restaurantId } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const cartItems = useSelector((state) => state.cartItem?.cart || [])

  const [restaurant, setRestaurant] = useState(null)
  const [menu, setMenu] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('')
  const [bannerSrc, setBannerSrc] = useState(BANNER_FALLBACK)

  // Build cart qty map: itemId → qty
  const cartQtyMap = {}
  cartItems.forEach((ci) => {
    cartQtyMap[ci.productId?._id || ci.productId] = ci.quantity
  })

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await Axios({
        ...SummaryApi.getRestaurantById,
        url: SummaryApi.getRestaurantById.url.replace(':id', restaurantId),
      })
      if (res.data?.success) {
        setRestaurant(res.data.data.restaurant)
        setBannerSrc(res.data.data.restaurant.image || BANNER_FALLBACK)
        setMenu(res.data.data.menu)
        if (res.data.data.menu.length > 0) {
          setActiveCategory(res.data.data.menu[0].category)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  useEffect(() => { fetch() }, [fetch])

  // Cart operations – reuse existing Snapit cart dispatch shape
  const handleAdd = (item) => {
    dispatch(handleAddItemCart({
      productId: item._id,
      quantity: 1,
      // Carry food-specific info so the cart can display it
      name: item.name,
      price: item.discountedPrice > 0 ? item.discountedPrice : item.price,
      image: item.image,
      restaurantId: restaurant._id,
      restaurantName: restaurant.name,
      itemType: 'food',
    }))
    toast.success(`${item.name} added to cart`, { duration: 1500 })
  }

  const handleIncrease = (item) => dispatch(handleAddItemCart({ _id: item._id }))
  const handleDecrease = (item) => {
    const qty = cartQtyMap[item._id] || 0
    if (qty <= 1) dispatch(handleAddItemCart({ _id: item._id }))
    else dispatch(handleAddItemCart({ _id: item._id }))
  }

  // Cart totals
  const cartTotal = cartItems.reduce((sum, ci) => {
    const price = ci.productId?.price || ci.price || 0
    return sum + price * (ci.quantity || 1)
  }, 0)
  const cartCount = cartItems.reduce((sum, ci) => sum + (ci.quantity || 1), 0)

  // Active menu section items
  const activeSection = menu.find((m) => m.category === activeCategory)

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* ── Banner ── */}
      <div className="relative">
        <div className="h-48 sm:h-64 bg-gray-200 overflow-hidden">
          <img
            src={bannerSrc}
            alt={restaurant?.name || 'Restaurant'}
            onError={() => setBannerSrc(BANNER_FALLBACK)}
            className="w-full h-full object-cover"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm p-2.5 rounded-xl shadow"
        >
          <svg className="w-5 h-5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
      </div>

      {loading ? (
        <Skeleton />
      ) : !restaurant ? (
        <div className="flex flex-col items-center py-20">
          <p className="text-gray-500">Restaurant not found.</p>
          <button onClick={() => navigate('/food')} className="mt-3 text-green-600 font-semibold">
            ← Back to Food
          </button>
        </div>
      ) : (
        <>
          {/* ── Restaurant Info Card ── */}
          <div className="bg-white px-4 pt-4 pb-3 shadow-sm">
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">{restaurant.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{restaurant.cuisineTypes?.join(' • ')}</p>

            <div className="flex flex-wrap items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <StarRating rating={restaurant.rating} />
                {restaurant.totalRatings > 0 && (
                  <span className="text-xs text-gray-400">({restaurant.totalRatings}+)</span>
                )}
              </div>

              <div className="flex items-center gap-1 text-sm text-gray-600">
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span className="font-semibold">{restaurant.deliveryTimeMin}–{restaurant.deliveryTimeMax} mins</span>
              </div>

              <div className="text-sm text-gray-600">
                {restaurant.deliveryFee === 0 ? (
                  <span className="text-green-600 font-semibold">Free Delivery</span>
                ) : (
                  <span>₹{restaurant.deliveryFee} delivery</span>
                )}
              </div>
            </div>

            {restaurant.description && (
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">{restaurant.description}</p>
            )}

            {!restaurant.isOpen && (
              <div className="mt-2 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold
                              px-3 py-2 rounded-xl">
                ⛔ Restaurant is currently closed
              </div>
            )}
          </div>

          {/* ── Category Tab Bar ── */}
          {menu.length > 0 && (
            <div className="sticky top-0 z-10">
              <CategoryTabs
                categories={menu.map((m) => m.category)}
                active={activeCategory}
                onSelect={setActiveCategory}
              />
            </div>
          )}

          {/* ── Menu Items ── */}
          <div className="bg-white mt-2 mx-0 sm:mx-4 sm:rounded-2xl overflow-hidden shadow-sm">
            {menu.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center px-4">
                <div className="text-4xl mb-3">🍽️</div>
                <p className="font-semibold text-gray-700">Menu coming soon</p>
                <p className="text-sm text-gray-400 mt-1">This restaurant hasn't added items yet.</p>
              </div>
            ) : (
              <>
                {/* Active category heading */}
                <div className="px-4 pt-4 pb-0">
                  <h2 className="font-extrabold text-gray-900 text-base">
                    {activeCategory}
                    <span className="text-gray-400 font-normal text-sm ml-2">
                      ({activeSection?.items?.length || 0})
                    </span>
                  </h2>
                </div>

                <div className="px-4 divide-y divide-gray-50">
                  {activeSection?.items?.map((item) => (
                    <FoodItemCard
                      key={item._id}
                      item={item}
                      cartQty={cartQtyMap[item._id] || 0}
                      onAdd={handleAdd}
                      onIncrease={handleIncrease}
                      onDecrease={handleDecrease}
                    />
                  ))}
                </div>

                {/* All other categories collapsed below */}
                {menu
                  .filter((m) => m.category !== activeCategory)
                  .map((section) => (
                    <div key={section.category}>
                      <button
                        onClick={() => setActiveCategory(section.category)}
                        className="w-full flex items-center justify-between px-4 py-3.5
                                   border-t border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-semibold text-gray-700 text-sm">{section.category}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">{section.items.length} items</span>
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                          </svg>
                        </div>
                      </button>
                    </div>
                  ))}
              </>
            )}
          </div>

          {/* Bottom padding for cart bar */}
          <div className="h-24" />
        </>
      )}

      {/* ── Floating Cart Bar ── */}
      <CartBar
        totalItems={cartCount}
        totalPrice={cartTotal}
        onViewCart={() => navigate('/cart')}
      />
    </div>
  )
}