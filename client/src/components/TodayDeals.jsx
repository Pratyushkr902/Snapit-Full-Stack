import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import Axios from "../utils/Axios"
import SummaryApi from "../common/SummaryApi"
import AddToCartButton from "./AddToCartButton"

const COMBO_KEYWORDS = ["combo", "pack of 2", "pack of 3", "pack of 4", "pack of 5", "bundle", "duo", "trio", "multipack", "multi pack", "value pack", "2 pieces", "3 pieces", "4 pieces", "set of 2", "set of 3"]
const BOGO_KEYWORDS  = ["buy 1 get 1", "buy one get one", "bogo", "b1g1", "1+1", "get 1 free", "get one free", "buy 1 get 1 free"]

// Check ALL fields of a product for combo/bogo keywords
const getAllText = (p) =>
  [p.unit, p.name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

const isComboProduct = (p) => COMBO_KEYWORDS.some(k => getAllText(p).includes(k))
const isBogoProduct  = (p) => BOGO_KEYWORDS.some(k => getAllText(p).includes(k))

// discount works with price/sellingPrice OR price/discount fields
const getDiscount = (product) => {
  const mrp     = Number(product.price)
  const selling = Number(product.sellingPrice ?? product.discount ?? product.discountPrice ?? product.offerPrice)
  if (mrp > 0 && selling > 0 && mrp > selling) {
    return Math.round(((mrp - selling) / mrp) * 100)
  }
  if (product.discountPercentage > 0) return Math.round(product.discountPercentage)
  return 0
}

const getSellingPrice = (product) => {
  return product.sellingPrice ?? product.discount ?? product.discountPrice ?? product.offerPrice ?? product.price
}

function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-36 rounded-xl border border-slate-100 overflow-hidden animate-pulse">
      <div className="w-full h-28 bg-slate-200" />
      <div className="p-2 space-y-2">
        <div className="h-3 bg-slate-200 rounded w-4/5" />
        <div className="h-3 bg-slate-200 rounded w-3/5" />
        <div className="h-7 bg-slate-200 rounded w-full mt-2" />
      </div>
    </div>
  )
}

function DealCard({ product, isCombo }) {
  const navigate = useNavigate()
  const discount     = getDiscount(product)
  const sellingPrice = getSellingPrice(product)

  return (
    <div
      className="flex-shrink-0 w-36 bg-white rounded-xl border border-slate-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow relative"
      onClick={() => navigate(`/product/${product._id}`)}
    >
      {/* Image */}
      <div className="w-full h-28 bg-slate-100 flex items-center justify-center p-2">
        <img
          src={product.image?.[0]}
          alt={product.name}
          width={100}
          height={100}
          className="w-full h-full object-contain"
          loading="eager"
          fetchpriority="high"
          decoding="async"
          onError={e => { e.target.onerror = null; e.target.src = "/placeholder.png" }}
        />
      </div>

      {/* COMBO / B1G1 top-left badge */}
      <span className={`absolute top-2 left-2 text-white text-[9px] font-bold px-1.5 py-0.5 rounded ${isCombo ? "bg-purple-500" : "bg-blue-500"}`}>
        {isCombo ? "COMBO" : "B1G1"}
      </span>

      {/* Discount % — top-right */}
      {discount > 0 && (
        <span className="absolute top-2 right-2 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
          {discount}% OFF
        </span>
      )}

      {/* Low stock */}
      {product.stock > 0 && product.stock <= 10 && (
        <div className="absolute top-[88px] left-0 right-0 bg-red-50 text-red-600 text-[9px] font-bold text-center py-0.5 tracking-wide">
          ONLY {product.stock} LEFT
        </div>
      )}

      {/* 10 MIN + FREE ITEM tags */}
      <div className="flex items-center gap-1 px-2 pt-2">
        <span className="bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">10 MIN</span>
        {!isCombo && (
          <span className="bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">FREE ITEM</span>
        )}
      </div>

      {/* Name */}
      <p className="text-xs font-semibold text-slate-800 line-clamp-2 px-2 pt-1 leading-tight">{product.name}</p>

      {/* Unit */}
      <p className="text-[10px] text-slate-400 px-2 pb-1">{product.unit}</p>

      {/* Price row */}
      <div className="flex items-center justify-between px-2 pb-2 gap-1" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-slate-800">₹{sellingPrice}</span>
          {discount > 0 && (
            <span className="text-[10px] text-slate-400 line-through">₹{product.price}</span>
          )}
        </div>
        <div className="w-16">
          <AddToCartButton data={product} />
        </div>
      </div>
    </div>
  )
}

function CountdownTimer() {
  // Real timer: counts down to the next exact hour
  const getSecsUntilNextHour = () => {
    const now = new Date()
    return 3600 - (now.getMinutes() * 60 + now.getSeconds())
  }
  const [secs, setSecs] = useState(getSecsUntilNextHour)
  useEffect(() => {
    const id = setInterval(() => setSecs(getSecsUntilNextHour), 1000)
    return () => clearInterval(id)
  }, [])
  const h = String(Math.floor(secs / 3600)).padStart(2, "0")
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0")
  const s = String(secs % 60).padStart(2, "0")
  return (
    <div className="flex items-center gap-2 mx-4 mb-4 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
      <span className="text-orange-500 text-sm">⏱</span>
      <span className="text-[11px] font-bold text-orange-800 tracking-wide">ENDS IN</span>
      <div className="flex items-center gap-1 ml-auto">
        {[h, m, s].map((unit, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className="bg-orange-500 text-white text-xs font-bold rounded px-1.5 py-0.5 min-w-[26px] text-center">{unit}</span>
            {i < 2 && <span className="text-orange-500 font-bold text-sm">:</span>}
          </span>
        ))}
      </div>
    </div>
  )
}

export function useDealsData() {
  const [comboProducts, setComboProducts] = useState([])
  const [bogoProducts,  setBogoProducts]  = useState([])
  const [loading, setLoading] = useState(true)

  const fetchDeals = useCallback(async () => {
    try {
      setLoading(true)
      let page = 1, allProducts = [], hasMore = true
      while (hasMore && allProducts.length < 200) {
        const res = await Axios({ ...SummaryApi.getProduct, data: { page, limit: 100 } })
        const data = res.data?.data ?? []
        allProducts = [...allProducts, ...data]
        hasMore = data.length === 100
        page++
      }

      // First try: match by keywords in any field
      let combos = allProducts.filter(p => isComboProduct(p))
      let bogos  = allProducts.filter(p => isBogoProduct(p))

      // Fallback: if no keyword matches found, use discount-based grouping
      // Combo = 10–29% off, B1G1 = 30%+ off
      if (combos.length === 0 && bogos.length === 0) {
        const discounted = allProducts.filter(p => getDiscount(p) > 0)
        combos = discounted.filter(p => {
          const d = getDiscount(p)
          return d >= 10 && d < 30
        })
        bogos = discounted.filter(p => getDiscount(p) >= 30)

        // Last resort: just split discounted products evenly if still empty
        if (combos.length === 0 && bogos.length === 0 && discounted.length > 0) {
          const mid = Math.ceil(discounted.length / 2)
          combos = discounted.slice(0, mid)
          bogos  = discounted.slice(mid)
        }
      }

      setComboProducts(combos)
      setBogoProducts(bogos)
    } catch (err) {
      console.error("TodayDeals fetch error:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDeals() }, [fetchDeals])
  return { comboProducts, bogoProducts, loading }
}

export default function TodayDeals() {
  const { comboProducts, bogoProducts, loading } = useDealsData()
  const navigate = useNavigate()

  if (!loading && comboProducts.length === 0 && bogoProducts.length === 0) return null

  return (
    <div className="container mx-auto px-4 my-4">
      <div className="bg-green-50 border border-green-100 rounded-2xl py-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Today's Deals 🔥</h2>
          <button
            onClick={() => navigate("/deals")}
            className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-full px-4 py-1.5 transition-colors"
          >
            See All →
          </button>
        </div>

        {/* Countdown */}
        <CountdownTimer />

        {/* Combo */}
        {(loading || comboProducts.length > 0) && (
          <>
            <div className="flex items-center gap-2 px-4 mb-2">
              <span className="text-sm font-bold text-slate-700">Combo Offers</span>
              <span className="text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-100 rounded px-2 py-0.5">SAVE MORE</span>
            </div>
            <div className="flex gap-3 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }}>
              {loading
                ? [1,2,3].map(i => <SkeletonCard key={i} />)
                : comboProducts.map(p => <DealCard key={p._id} product={p} isCombo={true} />)
              }
            </div>
          </>
        )}

        {(comboProducts.length > 0 || loading) && (bogoProducts.length > 0 || loading) && (
          <div className="mx-4 my-4 border-t border-green-100" />
        )}

        {/* B1G1 */}
        {(loading || bogoProducts.length > 0) && (
          <>
            <div className="flex items-center gap-2 px-4 mb-2">
              <span className="text-sm font-bold text-slate-700">Buy 1 Get 1 Free</span>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded px-2 py-0.5">FREE ITEM</span>
            </div>
            <div className="flex gap-3 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }}>
              {loading
                ? [1,2,3].map(i => <SkeletonCard key={i} />)
                : bogoProducts.map(p => <DealCard key={p._id} product={p} isCombo={false} />)
              }
            </div>
          </>
        )}

      </div>
    </div>
  )
}