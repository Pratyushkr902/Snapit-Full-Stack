/**
 * RestaurantDetailPage.jsx
 * Route: /restaurant/:id
 *
 * Zomato-style menu page with working Add/+/− cart controls.
 * Supports grouped variant cards (Half/Full, Per Piece/Half Kg/Full Kg, etc.)
 * Shows distance + address below banner, requests location on mount.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Axios from '../utils/Axios'
import toast from 'react-hot-toast'

// ── Fallbacks ─────────────────────────────────────────────────────────────────
const FALLBACK_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' fill='%23f3f4f6'/%3E%3Ctext x='60' y='64' text-anchor='middle' fill='%23d1d5db' font-size='11' font-family='sans-serif'%3EFood%3C/text%3E%3C/svg%3E"

const BANNER_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='300' viewBox='0 0 800 300'%3E%3Crect width='800' height='300' fill='%23fef3c7'/%3E%3Ctext x='400' y='155' text-anchor='middle' fill='%23d97706' font-size='20' font-family='sans-serif'%3ERestaurant%3C/text%3E%3C/svg%3E"

// ── Haversine distance ────────────────────────────────────────────────────────
function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

// ── Variant suffix extraction ─────────────────────────────────────────────────
function parseVariant(name) {
  const match = name.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
  if (!match) return { baseName: name, variantLabel: null }
  return { baseName: match[1].trim(), variantLabel: match[2].trim() }
}

const VARIANT_ORDER = ['per piece', 'half', 'half kg', 'full', 'full kg']
function variantSortKey(label) {
  const idx = VARIANT_ORDER.indexOf(label.toLowerCase())
  return idx === -1 ? 99 : idx
}

function groupItems(items) {
  const groups = new Map()
  items.forEach((item) => {
    const { baseName, variantLabel } = parseVariant(item.name)
    if (!variantLabel) {
      groups.set(`__solo__${item._id}`, [{ label: null, item }])
      return
    }
    if (!groups.has(baseName)) groups.set(baseName, [])
    groups.get(baseName).push({ label: variantLabel, item })
  })
  return Array.from(groups.entries()).map(([key, variants]) => {
    if (key.startsWith('__solo__')) return { type: 'solo', item: variants[0].item }
    variants.sort((a, b) => variantSortKey(a.label) - variantSortKey(b.label))
    const rep = variants[0].item
    return {
      type: 'group',
      baseName: key,
      image: rep.image,
      description: rep.description,
      isVeg: rep.isVeg,
      isBestseller: rep.isBestseller,
      isSpicy: rep.isSpicy,
      calories: rep.calories,
      variants,
    }
  })
}

// ── Star Rating ───────────────────────────────────────────────────────────────
function StarRating({ rating }) {
  return (
    <span className="inline-flex items-center gap-1">
      <svg className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      <span className="font-semibold">{rating?.toFixed(1)}</span>
    </span>
  )
}

// ── Veg/Non-veg dot ───────────────────────────────────────────────────────────
function VegBadge({ isVeg }) {
  return (
    <div className={`w-4 h-4 border-2 flex items-center justify-center rounded-sm flex-shrink-0
                     ${isVeg ? 'border-green-600' : 'border-red-600'}`}>
      <div className={`w-2 h-2 rounded-full ${isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
    </div>
  )
}

// ── Add / +/− control ─────────────────────────────────────────────────────────
function QtyControl({ qty, onAdd, onIncrease, onDecrease }) {
  if (qty === 0) {
    return (
      <button
        onClick={onAdd}
        className="px-4 py-1.5 bg-white border-2 border-green-600 text-green-600 text-sm
                   font-bold rounded-xl active:scale-95 transition-transform shadow-sm"
      >
        ADD
      </button>
    )
  }
  return (
    <div className="flex items-center gap-1 bg-green-600 rounded-xl overflow-hidden shadow-sm">
      <button onClick={onDecrease} className="px-2.5 py-1.5 text-white font-bold text-base active:bg-green-700">−</button>
      <span className="text-white font-bold text-sm min-w-[20px] text-center">{qty}</span>
      <button onClick={onIncrease} className="px-2.5 py-1.5 text-white font-bold text-base active:bg-green-700">+</button>
    </div>
  )
}

// ── Solo Food Item Card ───────────────────────────────────────────────────────
function FoodItemCard({ item, qty, onAdd, onIncrease, onDecrease }) {
  const [imgSrc, setImgSrc] = useState(item.image || FALLBACK_IMG)
  const effectivePrice = item.discountedPrice > 0 ? item.discountedPrice : item.price
  return (
    <div className="flex gap-3 py-4 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <VegBadge isVeg={item.isVeg} />
          {item.isBestseller && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">★ Bestseller</span>
          )}
          {item.isSpicy && <span className="text-[10px]">🌶️</span>}
        </div>
        <h4 className="font-semibold text-gray-900 text-[14px] leading-snug line-clamp-2">{item.name}</h4>
        {item.description && (
          <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{item.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="font-bold text-gray-900 text-[15px]">₹{effectivePrice}</span>
          {item.discountedPrice > 0 && (
            <>
              <span className="text-gray-400 text-[12px] line-through">₹{item.price}</span>
              <span className="text-green-600 text-[11px] font-semibold">
                {Math.round((1 - item.discountedPrice / item.price) * 100)}% off
              </span>
            </>
          )}
        </div>
        {item.calories > 0 && <p className="text-[11px] text-gray-400 mt-0.5">{item.calories} kcal</p>}
      </div>
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        <div className="w-24 h-20 sm:w-28 sm:h-24 rounded-xl overflow-hidden bg-gray-100">
          <img src={imgSrc} alt={item.name} onError={() => setImgSrc(FALLBACK_IMG)} className="w-full h-full object-cover" />
        </div>
        <QtyControl qty={qty} onAdd={onAdd} onIncrease={onIncrease} onDecrease={onDecrease} />
      </div>
    </div>
  )
}

// ── Grouped Variant Card ──────────────────────────────────────────────────────
function VariantCard({ group, foodCart, onAdd, onIncrease, onDecrease }) {
  const [imgSrc, setImgSrc] = useState(group.image || FALLBACK_IMG)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const selectedVariant = group.variants[selectedIdx]
  const selectedItem = selectedVariant.item
  const effectivePrice = selectedItem.discountedPrice > 0 ? selectedItem.discountedPrice : selectedItem.price
  const qty = foodCart[selectedItem._id]?.qty || 0
  return (
    <div className="flex gap-3 py-4 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <VegBadge isVeg={group.isVeg} />
          {group.isBestseller && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">★ Bestseller</span>
          )}
          {group.isSpicy && <span className="text-[10px]">🌶️</span>}
        </div>
        <h4 className="font-semibold text-gray-900 text-[14px] leading-snug">{group.baseName}</h4>
        {group.description && (
          <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{group.description}</p>
        )}
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {group.variants.map((v, idx) => (
            <button
              key={v.item._id}
              onClick={() => setSelectedIdx(idx)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all
                ${selectedIdx === idx
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'}`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="font-bold text-gray-900 text-[15px]">₹{effectivePrice}</span>
          {selectedItem.discountedPrice > 0 && (
            <>
              <span className="text-gray-400 text-[12px] line-through">₹{selectedItem.price}</span>
              <span className="text-green-600 text-[11px] font-semibold">
                {Math.round((1 - selectedItem.discountedPrice / selectedItem.price) * 100)}% off
              </span>
            </>
          )}
        </div>
        {group.calories > 0 && <p className="text-[11px] text-gray-400 mt-0.5">{group.calories} kcal</p>}
      </div>
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        <div className="w-24 h-20 sm:w-28 sm:h-24 rounded-xl overflow-hidden bg-gray-100">
          <img src={imgSrc} alt={group.baseName} onError={() => setImgSrc(FALLBACK_IMG)} className="w-full h-full object-cover" />
        </div>
        <QtyControl
          qty={qty}
          onAdd={() => onAdd(selectedItem)}
          onIncrease={() => onIncrease(selectedItem)}
          onDecrease={() => onDecrease(selectedItem)}
        />
      </div>
    </div>
  )
}

// ── Category Tab Bar ──────────────────────────────────────────────────────────
function CategoryTabs({ categories, active, onSelect }) {
  const scrollRef = useRef(null)
  useEffect(() => {
    const el = scrollRef.current?.querySelector(`[data-cat="${active}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [active])
  return (
    <div ref={scrollRef} className="flex gap-2 overflow-x-auto scrollbar-none py-2 px-4 bg-white border-b border-gray-100">
      {categories.map((cat) => (
        <button
          key={cat}
          data-cat={cat}
          onClick={() => onSelect(cat)}
          className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all
            ${active === cat ? 'bg-green-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-48 bg-gray-200 w-full" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-100 rounded w-1/3" />
        <div className="h-4 bg-gray-100 rounded w-2/3" />
      </div>
    </div>
  )
}

// ── Cart Bottom Bar ───────────────────────────────────────────────────────────
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

// ── Offer Strip ───────────────────────────────────────────────────────────────
function OfferStrip({ offers }) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    if (!offers?.length) return
    const t = setInterval(() => setIdx(i => (i + 1) % offers.length), 3000)
    return () => clearInterval(t)
  }, [offers])
  if (!offers?.length) return null
  return (
    <div className="bg-orange-50 border-t border-orange-100 px-4 py-2 flex items-center gap-2">
      <span className="text-orange-500 text-sm">🏷️</span>
      <span className="text-orange-700 text-xs font-semibold truncate">{offers[idx]}</span>
    </div>
  )
}

// ── Distance + Address Bar (Zomato-style, below banner info) ─────────────────
function LocationBar({ restaurant, userLocation }) {
  const address = restaurant?.address
  const addressStr = [address?.street, address?.area, address?.city]
    .filter(Boolean).join(', ')

  const distKm =
    userLocation && restaurant?.location?.lat && restaurant?.location?.lng
      ? getDistanceKm(
          userLocation.lat, userLocation.lng,
          restaurant.location.lat, restaurant.location.lng
        )
      : null

  if (!addressStr && distKm === null) return null

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-t border-gray-100">
      <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <span className="text-xs text-gray-500 flex-1 leading-relaxed">
        {addressStr}
      </span>
      {distKm !== null && (
        <span className="text-xs font-bold text-gray-700 flex-shrink-0 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
          {distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`}
        </span>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RestaurantDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [restaurant, setRestaurant] = useState(null)
  const [menu, setMenu] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('')
  const [bannerSrc, setBannerSrc] = useState(BANNER_FALLBACK)
  const [userLocation, setUserLocation] = useState(null)
  const [foodCart, setFoodCart] = useState({})

  // Request location on mount
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {} // silent fail — distance just won't show
    )
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await Axios({ method: 'GET', url: `/api/restaurant/${id}` })
      if (res.data?.success) {
        const { restaurant: r, menu: m } = res.data.data
        setRestaurant(r)
        setBannerSrc(r.image || BANNER_FALLBACK)
        setMenu(m)
        if (m.length > 0) setActiveCategory(m[0].category)
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load restaurant')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Cart handlers ──────────────────────────────────────────────────────────
  const handleAdd = (item) => {
    setFoodCart(prev => ({ ...prev, [item._id]: { item, qty: 1 } }))
    toast.success(`${item.name} added!`, { duration: 1200, icon: '🛒' })
  }
  const handleIncrease = (item) => {
    setFoodCart(prev => ({ ...prev, [item._id]: { item, qty: (prev[item._id]?.qty || 0) + 1 } }))
  }
  const handleDecrease = (item) => {
    setFoodCart(prev => {
      const current = prev[item._id]?.qty || 0
      if (current <= 1) { const next = { ...prev }; delete next[item._id]; return next }
      return { ...prev, [item._id]: { item, qty: current - 1 } }
    })
  }

  const cartEntries = Object.values(foodCart)
  const cartCount = cartEntries.reduce((s, e) => s + e.qty, 0)
  const cartTotal = cartEntries.reduce((s, e) => {
    const price = e.item.discountedPrice > 0 ? e.item.discountedPrice : e.item.price
    return s + price * e.qty
  }, 0)

  const allItems = menu.flatMap(s => s.items)
  const cartForCheckout = Object.fromEntries(Object.entries(foodCart).map(([k, v]) => [k, v.qty]))
  const activeSection = menu.find(m => m.category === activeCategory)
  const groupedItems = activeSection ? groupItems(activeSection.items) : []

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
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm p-2.5 rounded-xl shadow"
        >
          <svg className="w-5 h-5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {loading ? <Skeleton /> : !restaurant ? (
        <div className="flex flex-col items-center py-20">
          <p className="text-gray-500">Restaurant not found.</p>
          <button onClick={() => navigate('/food')} className="mt-3 text-green-600 font-semibold">← Back to Food</button>
        </div>
      ) : (
        <>
          {/* ── Restaurant Info ── */}
          <div className="bg-white shadow-sm">
            <div className="px-4 pt-4 pb-3">
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold">{restaurant.deliveryTimeMin}–{restaurant.deliveryTimeMax} mins</span>
                </div>
                <div className="text-sm">
                  {restaurant.deliveryFee === 0
                    ? <span className="text-green-600 font-semibold">Free Delivery</span>
                    : <span className="text-gray-600">₹{restaurant.deliveryFee} delivery</span>}
                </div>
                {restaurant.minOrderValue > 0 && (
                  <span className="text-xs text-gray-400">Min ₹{restaurant.minOrderValue}</span>
                )}
              </div>

              {restaurant.description && (
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">{restaurant.description}</p>
              )}

              {!restaurant.isOpen && (
                <div className="mt-2 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold px-3 py-2 rounded-xl">
                  ⛔ Currently closed · Opens at {restaurant.opensAt}
                </div>
              )}
            </div>

            {/* ── Distance + Address bar (Zomato-style) ── */}
            <LocationBar restaurant={restaurant} userLocation={userLocation} />

            <OfferStrip offers={restaurant.offers} />
          </div>

          {/* ── Category Tabs ── */}
          {menu.length > 0 && (
            <div className="sticky top-0 z-10">
              <CategoryTabs
                categories={menu.map(m => m.category)}
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
                <div className="px-4 pt-4 pb-0">
                  <h2 className="font-extrabold text-gray-900 text-base">
                    {activeCategory}
                    <span className="text-gray-400 font-normal text-sm ml-2">({groupedItems.length})</span>
                  </h2>
                </div>

                <div className="px-4">
                  {groupedItems.map((entry) => {
                    if (entry.type === 'solo') {
                      const item = entry.item
                      return (
                        <FoodItemCard
                          key={item._id}
                          item={item}
                          qty={foodCart[item._id]?.qty || 0}
                          onAdd={() => handleAdd(item)}
                          onIncrease={() => handleIncrease(item)}
                          onDecrease={() => handleDecrease(item)}
                        />
                      )
                    }
                    return (
                      <VariantCard
                        key={entry.baseName}
                        group={entry}
                        foodCart={foodCart}
                        onAdd={handleAdd}
                        onIncrease={handleIncrease}
                        onDecrease={handleDecrease}
                      />
                    )
                  })}
                </div>

                {menu.filter(m => m.category !== activeCategory).map((section) => {
                  const sectionGrouped = groupItems(section.items)
                  return (
                    <button
                      key={section.category}
                      onClick={() => setActiveCategory(section.category)}
                      className="w-full flex items-center justify-between px-4 py-3.5
                                 border-t border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-semibold text-gray-700 text-sm">{section.category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{sectionGrouped.length} items</span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  )
                })}
              </>
            )}
          </div>

          <div className="h-28" />
        </>
      )}

      <CartBar
        totalItems={cartCount}
        totalPrice={cartTotal}
        onViewCart={() => navigate('/food-checkout', {
          state: {
            cart: cartForCheckout,
            allItems,
            restaurantId: id,
            restaurantName: restaurant?.name,
            restaurantDeliveryFee: restaurant?.deliveryFee || 0,
          }
        })}
      />
    </div>
  )
}