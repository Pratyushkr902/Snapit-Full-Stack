/**
 * RestaurantDetailPage.jsx
 * Route: /restaurant/:id
 *
 * Zomato-style menu page with working Add/+/− cart controls.
 * Supports grouped variant cards (Half/Full, Per Piece/Half Kg/Full Kg, etc.)
 * and inline variant cards (pizza sizes via item.variants array).
 * Shows distance + address below banner, requests location on mount.
 *
 * Cart is now persistent and cross-restaurant (see utils/foodCartStore.js):
 * items added here stay in the cart even if the customer browses to a
 * different restaurant, and checkout can charge multiple restaurants in
 * one payment.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Axios from '../utils/Axios'
import toast from 'react-hot-toast'
import { useRestaurantCart } from '../utils/foodCartStore'
import { optimizeImageUrl, FALLBACK_IMAGE } from '../utils/optimizeImageUrl'
import { getEffectiveAddressCoords } from '../utils/serviceArea'
import { useGlobalContext } from '../provider/GlobalProvider'

// ── Fallbacks ─────────────────────────────────────────────────────────────────
const FALLBACK_IMG = FALLBACK_IMAGE

const BANNER_FALLBACK = null

// ── Campus Price Adjustment Formula (>7km, e.g. Himalaya Medical College) ─────
export const getCampusAdjustedPrice = (price, isLongDistance) => {
  const p = Number(price) || 0
  if (!isLongDistance || p <= 0) return p
  const extra = p < 50 ? 20 : p <= 150 ? 35 : 50
  return p + extra
}

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

// ── groupItems handles item.variants array (e.g. pizza sizes) ────────────────
function groupItems(items) {
  const groups = new Map()
  items.forEach((item) => {
    if (item.variants?.length > 1) {
      groups.set(`__inline__${item._id}`, [{ type: 'inline', item }])
      return
    }
    const { baseName, variantLabel } = parseVariant(item.name)
    if (!variantLabel) {
      groups.set(`__solo__${item._id}`, [{ label: null, item }])
      return
    }
    if (!groups.has(baseName)) groups.set(baseName, [])
    groups.get(baseName).push({ label: variantLabel, item })
  })
  return Array.from(groups.entries()).map(([key, variants]) => {
    if (key.startsWith('__inline__')) return { type: 'inline', item: variants[0].item }
    if (key.startsWith('__solo__'))   return { type: 'solo',   item: variants[0].item }
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
function FoodItemCard({ item, qty, isLongDistance, onAdd, onIncrease, onDecrease }) {
  const [imgSrc, setImgSrc] = useState(item.image ? optimizeImageUrl(item.image, 250, 75) : FALLBACK_IMAGE)
  useEffect(() => {
    setImgSrc(item.image ? optimizeImageUrl(item.image, 250, 75) : FALLBACK_IMAGE)
  }, [item.image])

  const basePrice = Number(item.price) || 0
  const baseEffectivePrice = Number(item.discountedPrice > 0 ? item.discountedPrice : item.price) || 0
  const effectivePrice = getCampusAdjustedPrice(baseEffectivePrice, isLongDistance)
  const displayMrp = item.discountedPrice > 0 ? getCampusAdjustedPrice(basePrice, isLongDistance) : null

  const cartItem = {
    ...item,
    price: effectivePrice,
    discountedPrice: 0,
    basePrice: baseEffectivePrice,
  }

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
          {displayMrp && displayMrp > effectivePrice && (
            <>
              <span className="text-gray-400 text-[12px] line-through">₹{displayMrp}</span>
              <span className="text-green-600 text-[11px] font-semibold">
                {Math.round((1 - baseEffectivePrice / basePrice) * 100)}% off
              </span>
            </>
          )}
        </div>
        {item.calories > 0 && <p className="text-[11px] text-gray-400 mt-0.5">{item.calories} kcal</p>}
      </div>
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        <div className={`w-24 h-20 sm:w-28 sm:h-24 rounded-xl overflow-hidden bg-gray-100 ${item.isAvailable === false ? 'opacity-60 grayscale' : ''}`}>
          <img src={imgSrc} alt={item.name} onError={() => setImgSrc(FALLBACK_IMAGE)} className="w-full h-full object-cover" loading="lazy" decoding="async" />
        </div>
        {item.isAvailable === false ? (
          <span className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg whitespace-nowrap">
            Sold Out
          </span>
        ) : (
          <QtyControl
            qty={qty}
            onAdd={() => onAdd(cartItem)}
            onIncrease={() => onIncrease(cartItem)}
            onDecrease={() => onDecrease(cartItem)}
          />
        )}
      </div>
    </div>
  )
}

// ── Inline Variant Card (for pizza sizes via item.variants array) ────────────
function InlineVariantCard({ item, foodCart, isLongDistance, onAdd, onIncrease, onDecrease }) {
  const [imgSrc, setImgSrc] = useState(item.image ? optimizeImageUrl(item.image, 250, 75) : FALLBACK_IMAGE)
  useEffect(() => {
    setImgSrc(item.image ? optimizeImageUrl(item.image, 250, 75) : FALLBACK_IMAGE)
  }, [item.image])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const selectedVariant = item.variants[selectedIdx]
  const rawPrice = Number(selectedVariant.price ?? item.price) || 0
  const price = getCampusAdjustedPrice(rawPrice, isLongDistance)
  const rawMrp = Number(selectedVariant.mrp) || 0
  const mrp = rawMrp > 0 ? getCampusAdjustedPrice(rawMrp, isLongDistance) : null

  // Cart key = itemId + variantLabel so each size is an independent cart slot
  const cartKey = `${item._id}_${selectedVariant.label}`
  const qty = foodCart[cartKey]?.qty || 0

  const cartItem = {
    ...item,
    _id: cartKey,
    price,
    discountedPrice: 0,
    basePrice: rawPrice,
    name: `${item.name} (${selectedVariant.label})`
  }

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
        <h4 className="font-semibold text-gray-900 text-[14px] leading-snug">{item.name}</h4>
        {item.description && (
          <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{item.description}</p>
        )}
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {item.variants.map((v, idx) => (
            <button
              key={v.label}
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
          <span className="font-bold text-gray-900 text-[15px]">₹{price}</span>
          {mrp && mrp > price && (
            <>
              <span className="text-gray-400 text-[12px] line-through">₹{mrp}</span>
              <span className="text-green-600 text-[11px] font-semibold">
                {Math.round((1 - rawPrice / rawMrp) * 100)}% off
              </span>
            </>
          )}
        </div>
        {item.calories > 0 && <p className="text-[11px] text-gray-400 mt-0.5">{item.calories} kcal</p>}
      </div>
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        <div className={`w-24 h-20 sm:w-28 sm:h-24 rounded-xl overflow-hidden bg-gray-100 ${item.isAvailable === false ? 'opacity-60 grayscale' : ''}`}>
          <img src={imgSrc} alt={item.name} onError={() => setImgSrc(FALLBACK_IMAGE)}
            className="w-full h-full object-cover" loading="lazy" decoding="async" />
        </div>
        {item.isAvailable === false ? (
          <span className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg whitespace-nowrap">
            Sold Out
          </span>
        ) : (
          <QtyControl
            qty={qty}
            onAdd={() => onAdd(cartItem)}
            onIncrease={() => onIncrease(cartItem)}
            onDecrease={() => onDecrease(cartItem)}
          />
        )}
      </div>
    </div>
  )
}

// ── Grouped Variant Card (Half/Full suffix style) ─────────────────────────────
function VariantCard({ group, foodCart, isLongDistance, onAdd, onIncrease, onDecrease }) {
  const [imgSrc, setImgSrc] = useState(group.image ? group.image : FALLBACK_IMG)
  useEffect(() => {
    setImgSrc(group.image ? group.image : FALLBACK_IMG)
  }, [group.image])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const selectedVariant = group.variants[selectedIdx]
  const selectedItem = selectedVariant.item
  const basePrice = Number(selectedItem.price) || 0
  const baseEffectivePrice = Number(selectedItem.discountedPrice > 0 ? selectedItem.discountedPrice : selectedItem.price) || 0
  const effectivePrice = getCampusAdjustedPrice(baseEffectivePrice, isLongDistance)
  const displayMrp = selectedItem.discountedPrice > 0 ? getCampusAdjustedPrice(basePrice, isLongDistance) : null

  const qty = foodCart[selectedItem._id]?.qty || 0
  const isItemSoldOut = selectedItem.isAvailable === false || group.isAvailable === false

  const cartItem = {
    ...selectedItem,
    price: effectivePrice,
    discountedPrice: 0,
    basePrice: baseEffectivePrice,
  }

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
          {displayMrp && displayMrp > effectivePrice && (
            <>
              <span className="text-gray-400 text-[12px] line-through">₹{displayMrp}</span>
              <span className="text-green-600 text-[11px] font-semibold">
                {Math.round((1 - baseEffectivePrice / basePrice) * 100)}% off
              </span>
            </>
          )}
        </div>
        {group.calories > 0 && <p className="text-[11px] text-gray-400 mt-0.5">{group.calories} kcal</p>}
      </div>
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        <div className={`w-24 h-20 sm:w-28 sm:h-24 rounded-xl overflow-hidden bg-gray-100 ${isItemSoldOut ? 'opacity-60 grayscale' : ''}`}>
          <img src={imgSrc} alt={group.baseName} onError={() => setImgSrc(FALLBACK_IMG)} className="w-full h-full object-cover" loading="lazy" decoding="async" />
        </div>
        {isItemSoldOut ? (
          <span className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg whitespace-nowrap">
            Sold Out
          </span>
        ) : (
          <QtyControl
            qty={qty}
            onAdd={() => onAdd(cartItem)}
            onIncrease={() => onIncrease(cartItem)}
            onDecrease={() => onDecrease(cartItem)}
          />
        )}
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

// ── Distance + Address Bar ────────────────────────────────────────────────────
function LocationBar({ restaurant, distKm, isLongDistance }) {
  const address = restaurant?.address
  const addressStr = [address?.street, address?.area, address?.city]
    .filter(Boolean).join(', ')

  if (!addressStr && distKm === null) return null

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-t border-gray-100">
      <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <span className="text-xs text-gray-500 flex-1 leading-relaxed truncate">
        {addressStr}
      </span>
      {distKm !== null && (
        <span className="text-xs font-bold text-gray-700 flex-shrink-0 bg-white border border-gray-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-xs">
          <span>{distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`}</span>
          {isLongDistance && (
            <span className="text-green-700 font-bold bg-green-50 px-1.5 py-0.2 rounded text-[11px]">
              Flat ₹12 delivery
            </span>
          )}
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
  const [conflictModal, setConflictModal] = useState(null)

  // ── Address selection & global sync ──
  const { fetchAddress } = useGlobalContext() || {}
  useEffect(() => {
    if (fetchAddress) fetchAddress()
  }, [])

  const [selectedAddressId, setSelectedAddressId] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('selected_address_id') : null
  })
  const [showAddressPicker, setShowAddressPicker] = useState(false)
  const [overrideCampusLocation, setOverrideCampusLocation] = useState(false)

  // ── Read active/selected address to determine delivery coordinates ──
  const addressList = useSelector((state) => state.addresses?.addressList || [])
  const activeAddress = (selectedAddressId ? addressList.find((a) => a._id === selectedAddressId) : null)
    || addressList.find((a) => a.status)
    || addressList[0]
    || null

  const effectiveAddressCoords = overrideCampusLocation
    ? { lat: 25.2639198, lng: 84.8545598, name: 'Himalaya Medical College' }
    : (activeAddress ? getEffectiveAddressCoords(activeAddress) : null)

  const effectiveCoords = effectiveAddressCoords || userLocation

  const restoLat = restaurant?.location?.lat ?? restaurant?.location?.coordinates?.[1] ?? null
  const restoLng = restaurant?.location?.lng ?? restaurant?.location?.coordinates?.[0] ?? null

  const distKm = (effectiveCoords && restoLat != null && restoLng != null)
    ? getDistanceKm(effectiveCoords.lat, effectiveCoords.lng, restoLat, restoLng)
    : null

  const isLongDistance = Boolean(distKm !== null && distKm > 7)

  // ── Single-restaurant food cart (see utils/foodCartStore.js) ─────────
  const restaurantMeta = {
    restaurantId: id,
    restaurantName: restaurant?.name || '',
    restaurantLat: restoLat,
    restaurantLng: restoLng,
  }
  const { foodCart, cartCount, cartTotal, handleAdd, replaceAndAdd, handleIncrease, handleDecrease } =
    useRestaurantCart(restaurantMeta)

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
        const rawBanner = r.bannerImage || r.image
        setBannerSrc(rawBanner ? optimizeImageUrl(rawBanner, 800, 75) : null)
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

  const wrappedAdd = (item) => {
    const res = handleAdd(item)
    if (res?.conflict) {
      setConflictModal({ item, existingRestaurant: res.existingRestaurant })
    } else {
      toast.success(`${item.name} added!`, { duration: 1200, icon: '🛒' })
    }
  }

  const activeSection = menu.find(m => m.category === activeCategory)
  const groupedItems = activeSection ? groupItems(activeSection.items) : []

  return (
    <div className="bg-gray-50 min-h-screen">

      {/* ── Banner / Top Navigation ── */}
      {bannerSrc ? (
        <div className="relative">
          <div className="h-48 sm:h-64 bg-gray-200 overflow-hidden">
            <img
              src={bannerSrc}
              alt={restaurant?.name || 'Restaurant'}
              onError={() => setBannerSrc(null)}
              className="w-full h-full object-cover"
              fetchPriority="high"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>
          <button
            onClick={() => navigate(-1)}
            className="absolute top-safe-btn left-4 bg-white/90 backdrop-blur-sm p-2.5 rounded-xl shadow z-20 active:scale-95 transition-all"
            aria-label="Back"
          >
            <svg className="w-5 h-5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 pb-3 pt-safe-header flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full bg-gray-100 active:scale-95 transition-all"
            aria-label="Back"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="font-bold text-gray-900 text-base truncate">{restaurant?.name || 'Restaurant'}</span>
        </div>
      )}

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

            {/* ── Distance + Address bar (Zomato-style) with interactive Change button ── */}
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <svg className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Delivering to</p>
                  <p className="text-xs font-bold text-gray-800 truncate">
                    {overrideCampusLocation
                      ? 'Himalaya Medical College Campus'
                      : (activeAddress ? (activeAddress.floor_door ? `${activeAddress.floor_door}, ` : '') + (activeAddress.address_line || activeAddress.city) : 'Current Location')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {distKm !== null && (
                  <span className="text-xs font-bold text-gray-700 bg-white border border-gray-200 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                    <span>{distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`}</span>
                    {isLongDistance && (
                      <span className="text-emerald-700 font-extrabold bg-emerald-50 px-1.5 py-0.2 rounded text-[10px]">
                        Campus
                      </span>
                    )}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowAddressPicker(true)}
                  className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full hover:bg-green-100 active:scale-95 transition-all shadow-2xs"
                >
                  Change
                </button>
              </div>
            </div>

            {/* ── Campus Delivery Badge (if >7km) ── */}
            {isLongDistance && (
              <div className="mx-4 mt-2 px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span>🎓</span>
                  <span>Himalaya Campus Zone ({distKm?.toFixed(1)} km) • Flat ₹12 Delivery (FREE on ₹199+)</span>
                </div>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">Campus Menu</span>
              </div>
            )}
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
                    if (entry.type === 'inline') {
                      return (
                        <InlineVariantCard
                          key={entry.item._id}
                          item={entry.item}
                          foodCart={foodCart}
                          isLongDistance={isLongDistance}
                          onAdd={wrappedAdd}
                          onIncrease={handleIncrease}
                          onDecrease={handleDecrease}
                        />
                      )
                    }
                    if (entry.type === 'solo') {
                      const item = entry.item
                      return (
                        <FoodItemCard
                          key={item._id}
                          item={item}
                          qty={foodCart[item._id]?.qty || 0}
                          isLongDistance={isLongDistance}
                          onAdd={() => wrappedAdd(item)}
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
                        isLongDistance={isLongDistance}
                        onAdd={wrappedAdd}
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
        onViewCart={() => navigate('/food-checkout')}
      />

      {/* ── Zomato-style Replace Cart Modal ── */}
      {conflictModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-100">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl mb-4">
              ⚠️
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-1">Replace cart items?</h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-6">
              Your cart contains dishes from <strong className="text-gray-800">{conflictModal.existingRestaurant?.name || 'another restaurant'}</strong>. Do you want to discard them and add dishes from <strong className="text-green-700">{restaurant?.name}</strong>?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConflictModal(null)}
                className="py-3 px-4 rounded-xl border border-gray-200 font-bold text-gray-700 text-xs hover:bg-gray-50 transition active:scale-95"
              >
                No, Keep
              </button>
              <button
                type="button"
                onClick={() => {
                  replaceAndAdd(conflictModal.item)
                  setConflictModal(null)
                  toast.success(`${conflictModal.item.name} added!`, { icon: '🛒' })
                }}
                className="py-3 px-4 rounded-xl bg-red-600 font-bold text-white text-xs hover:bg-red-700 transition shadow-md shadow-red-200 active:scale-95"
              >
                Discard & Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Address Picker Modal ── */}
      {showAddressPicker && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 w-full max-w-md shadow-2xl border border-gray-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
              <div>
                <h3 className="text-base font-black text-gray-900">Select Delivery Location</h3>
                <p className="text-xs text-gray-500">Menu prices and delivery fee adjust to your address</p>
              </div>
              <button
                onClick={() => setShowAddressPicker(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {/* Quick Option: Himalaya Medical College Campus */}
              <button
                onClick={() => {
                  const hmchAddr = addressList.find(a => /himalaya|hmch/i.test(`${a.address_line} ${a.city} ${a.floor_door}`))
                  if (hmchAddr) {
                    localStorage.setItem('selected_address_id', hmchAddr._id)
                    setSelectedAddressId(hmchAddr._id)
                    setOverrideCampusLocation(false)
                  } else {
                    setOverrideCampusLocation(true)
                  }
                  setShowAddressPicker(false)
                  toast.success('🎓 Location set to Himalaya Medical College (>7 km)', { icon: '📍' })
                }}
                className="w-full text-left p-3.5 rounded-2xl border-2 border-emerald-500 bg-emerald-50/70 hover:bg-emerald-100/70 transition flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎓</span>
                  <div>
                    <p className="text-xs font-black text-emerald-900">Himalaya Medical College & Hospital</p>
                    <p className="text-[11px] text-emerald-700 font-medium">Campus Zone (~8.9 km) • Flat ₹12 Delivery</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                  Select
                </span>
              </button>

              {/* Saved Addresses List */}
              {addressList.map((addr) => {
                const coords = getEffectiveAddressCoords(addr)
                const km = (coords && restoLat && restoLng) ? getDistanceKm(coords.lat, coords.lng, restoLat, restoLng) : null
                const isSelected = activeAddress?._id === addr._id && !overrideCampusLocation
                return (
                  <button
                    key={addr._id}
                    onClick={() => {
                      localStorage.setItem('selected_address_id', addr._id)
                      setSelectedAddressId(addr._id)
                      setOverrideCampusLocation(false)
                      setShowAddressPicker(false)
                      toast.success(`📍 Delivery set to: ${addr.address_line || addr.city}`)
                    }}
                    className={`w-full text-left p-3 rounded-2xl border transition flex items-center justify-between ${
                      isSelected ? 'border-green-600 bg-green-50/50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900 truncate">
                          {addr.floor_door ? `${addr.floor_door}, ` : ''}{addr.address_line}
                        </span>
                        {addr.address_type && (
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.2 rounded">
                            {addr.address_type}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">{addr.city}</p>
                      {km !== null && (
                        <p className="text-[10px] font-semibold text-gray-600 mt-1">
                          {km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`} from restaurant
                          {km > 7 ? ' • 🎓 Campus Zone' : ' • Local'}
                        </p>
                      )}
                    </div>
                    {isSelected ? (
                      <span className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-xs">✓</span>
                    ) : (
                      <span className="text-xs text-gray-400 font-semibold">Use</span>
                    )}
                  </button>
                )
              })}

              {/* GPS location option */}
              {userLocation && (
                <button
                  onClick={() => {
                    localStorage.removeItem('selected_address_id')
                    setSelectedAddressId(null)
                    setOverrideCampusLocation(false)
                    setShowAddressPicker(false)
                    toast.success('📍 Switched to current GPS location')
                  }}
                  className="w-full text-left p-3 rounded-2xl border border-dashed border-gray-300 hover:bg-gray-50 transition flex items-center gap-3"
                >
                  <span className="text-xl">📍</span>
                  <div>
                    <p className="text-xs font-bold text-gray-800">Use Current GPS Location</p>
                    <p className="text-[11px] text-gray-400">Determined automatically by device GPS</p>
                  </div>
                </button>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
              <button
                onClick={() => {
                  setShowAddressPicker(false)
                  navigate('/address')
                }}
                className="text-xs font-bold text-green-700 hover:underline"
              >
                + Add New Address
              </button>
              <button
                onClick={() => setShowAddressPicker(false)}
                className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-bold text-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}