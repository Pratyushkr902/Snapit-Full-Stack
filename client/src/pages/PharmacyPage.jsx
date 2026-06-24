import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import CardProduct from '../components/CardProduct'
import CardLoading from '../components/CardLoading'

const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://snapit-backend-bn8r.onrender.com'

// Hardcoded IDs — exact MongoDB _id values
const PHARMA_ID = '69b57215a8b9adccd30c61c5'
const BABY_ID   = '69b57091a8b9adccd30c61a4'

const normalizeImageField = (image) => {
  if (Array.isArray(image)) {
    return image.map(img =>
      typeof img === 'string' && img.startsWith('/') ? `${BACKEND_URL}${img}` : img
    )
  }
  if (typeof image === 'string' && image.startsWith('/')) return `${BACKEND_URL}${image}`
  return image
}

const SORT_OPTIONS = [
  { label: 'Relevance',          value: 'relevance' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
]

// Category cards based on actual products in DB
const CATEGORY_CARDS = [
  { label: 'Baby Food',      icon: '🍼', color: 'from-sky-50 to-blue-100',      border: 'border-blue-200',    text: 'text-blue-700',    catId: BABY_ID,   keywords: ['nestle', 'lactogen', 'nan', 'ceregrow', 'slurrp', 'formula', 'cereal'] },
  { label: 'Diapers',        icon: '👶', color: 'from-pink-50 to-rose-100',     border: 'border-pink-200',    text: 'text-pink-700',    catId: BABY_ID,   keywords: ['diaper', 'huggies', 'mamypoko', 'pampers', 'pant'] },
  { label: 'Baby Care',      icon: '🛁', color: 'from-purple-50 to-violet-100', border: 'border-violet-200',  text: 'text-violet-700',  catId: BABY_ID,   keywords: ['wash', 'shampoo', 'powder', 'lotion', 'oil', 'wipes', 'chicco', 'himalaya'] },
  { label: 'Cough & Cold',   icon: '🤧', color: 'from-blue-50 to-indigo-100',   border: 'border-indigo-200',  text: 'text-indigo-700',  catId: PHARMA_ID, keywords: ['vicks', 'inhaler', 'vaporub', 'babyrub', 'cold', 'cough', 'blocked'] },
  { label: 'Digestion',      icon: '🌿', color: 'from-green-50 to-emerald-100', border: 'border-emerald-200', text: 'text-emerald-700', catId: PHARMA_ID, keywords: ['eno', 'pudin', 'pancharishta', 'digestive', 'antacid', 'chyawan'] },
  { label: 'Pain Relief',    icon: '💊', color: 'from-red-50 to-rose-100',      border: 'border-rose-200',    text: 'text-rose-700',    catId: PHARMA_ID, keywords: ['moov', 'omnigel', 'zandu', 'balm', 'pain', 'relief', 'ortho', 'belt', 'spray'] },
  { label: 'Antiseptic',     icon: '🧴', color: 'from-teal-50 to-cyan-100',     border: 'border-cyan-200',    text: 'text-cyan-700',    catId: PHARMA_ID, keywords: ['dettol', 'savlon', 'boroline', 'antiseptic', 'suthol'] },
  { label: 'Vitamins',       icon: '💛', color: 'from-yellow-50 to-amber-100',  border: 'border-amber-200',   text: 'text-amber-700',   catId: PHARMA_ID, keywords: ['vitamin', 'evion', 'ashwagandha', 'liv', 'neem', 'supplement', 'wellness', 'glucoplus'] },
  { label: 'Devices',        icon: '🩺', color: 'from-slate-50 to-gray-100',    border: 'border-gray-200',    text: 'text-gray-700',    catId: PHARMA_ID, keywords: ['thermometer', 'oximeter', 'hicks', 'bpl', 'pulse', 'fingertip'] },
]

const PROMO_BANNERS = [
  { bg: 'from-blue-600 to-indigo-700',   emoji: '👶', title: 'Baby Care Essentials',      sub: 'Himalaya • Pampers • Huggies • Chicco',  badge: 'Trusted Brands' },
  { bg: 'from-emerald-500 to-teal-600',  emoji: '🌿', title: 'Ayurvedic & Wellness',      sub: 'Zandu • Dabur • Himalaya',               badge: 'Natural Goodness' },
  { bg: 'from-rose-500 to-pink-600',     emoji: '💊', title: 'Pharmacy at Your Door',     sub: 'Pain relief, antiseptics & more',        badge: 'Express Delivery' },
]

const PharmacyPage = () => {
  const navigate   = useNavigate()
  const allCategory = useSelector(state => state.product.allCategory)

  const [products, setProducts]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [page, setPage]                 = useState(1)
  const [hasMore, setHasMore]           = useState(true)
  const [search, setSearch]             = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [activeCatId, setActiveCatId]   = useState(null)   // PHARMA_ID | BABY_ID | null (both)
  const [activeCard, setActiveCard]     = useState(null)   // keyword group label
  const [sort, setSort]                 = useState('relevance')
  const [showSort, setShowSort]         = useState(false)
  const [bannerIndex, setBannerIndex]   = useState(0)
  const [browseMode, setBrowseMode]     = useState(true)

  const observerRef = useRef(null)
  const sentinelRef = useRef(null)
  const searchTimer = useRef(null)

  // Auto-rotate banner
  useEffect(() => {
    const t = setInterval(() => setBannerIndex(i => (i + 1) % PROMO_BANNERS.length), 3500)
    return () => clearInterval(t)
  }, [])

  // Debounce search
  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(searchTimer.current)
  }, [search])

  // Fetch on filter change
  useEffect(() => {
    setProducts([])
    setPage(1)
    setHasMore(true)
    fetchProducts(1, true)
  }, [activeCatId, debouncedSearch, allCategory?.length])

  const fetchProducts = useCallback(async (pageNum = 1, reset = false) => {
    if (!allCategory?.length) return
    try {
      setLoading(true)

      // Always fetch BOTH categories in parallel, then merge + dedupe
      const catIds = activeCatId ? [activeCatId] : [PHARMA_ID, BABY_ID]

      const results = await Promise.all(
        catIds.map(id =>
          Axios({ ...SummaryApi.getProductByCategory, data: { id, page: pageNum, limit: 100 } })
            .then(r => r.data?.success ? r.data.data : [])
            .catch(() => [])
        )
      )

      let incoming = results.flat()

      // Dedupe
      const seen = new Set()
      incoming = incoming.filter(p => {
        if (!p?._id || seen.has(p._id)) return false
        seen.add(p._id)
        return true
      })

      // Normalize images
      incoming = incoming.map(p => ({ ...p, image: normalizeImageField(p.image) }))

      // Search filter
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase()
        incoming = incoming.filter(p =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q)
        )
      }

      // Keyword filter (category card selected)
      if (activeCard) {
        const card = CATEGORY_CARDS.find(c => c.label === activeCard)
        if (card) {
          incoming = incoming.filter(p =>
            card.keywords.some(kw => (p.name || '').toLowerCase().includes(kw))
          )
        }
      }

      if (reset || pageNum === 1) {
        setProducts(incoming)
      } else {
        setProducts(prev => {
          const s = new Set(prev.map(p => p._id))
          return [...prev, ...incoming.filter(p => !s.has(p._id))]
        })
      }
      setHasMore(incoming.length >= 100)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [allCategory, activeCatId, debouncedSearch, activeCard])

  // Re-fetch when activeCard changes (keyword filter is client-side but triggers refetch to be safe)
  useEffect(() => {
    setProducts([])
    setPage(1)
    setHasMore(true)
    fetchProducts(1, true)
  }, [activeCard])

  // Infinite scroll
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        const next = page + 1
        setPage(next)
        fetchProducts(next, false)
      }
    }, { threshold: 0.1 })
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current)
    return () => observerRef.current?.disconnect()
  }, [hasMore, loading, page, fetchProducts])

  const sortedProducts = [...products].sort((a, b) => {
    if (sort === 'price_asc')  return (a.price || 0) - (b.price || 0)
    if (sort === 'price_desc') return (b.price || 0) - (a.price || 0)
    return 0
  })

  const handleCardClick = (card) => {
    setActiveCatId(card.catId)
    setActiveCard(card.label)
    setBrowseMode(false)
  }

  const clearFilters = () => {
    setActiveCatId(null)
    setActiveCard(null)
    setSearch('')
    setBrowseMode(true)
  }

  const banner = PROMO_BANNERS[bannerIndex]

  return (
    <section className="bg-gray-50 min-h-screen pb-24">

      {/* ── Sticky Header ── */}
      <div className="bg-white sticky top-0 z-20 shadow-sm">
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigate('/')}
              className="p-2 rounded-full bg-gray-100 active:scale-95 transition shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600"
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-gray-800">💊 Pharmacy & Baby Care</h1>
              <p className="text-xs text-gray-400">Medicines, wellness & baby essentials</p>
            </div>
            {/* Sort */}
            <div className="relative">
              <button onClick={() => setShowSort(v => !v)}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-xl text-xs font-semibold text-gray-600 active:scale-95 transition">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 8h10M11 12h4M15 16h2" />
                </svg>
                Sort
              </button>
              {showSort && (
                <div className="absolute right-0 top-9 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden w-48">
                  {SORT_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => { setSort(opt.value); setShowSort(false) }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition ${
                        sort === opt.value ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-700 hover:bg-gray-50'
                      }`}>
                      {sort === opt.value && <span className="mr-1.5">✓</span>}
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1116.65 16.65z" />
            </svg>
            <input type="text" value={search}
              onChange={e => { setSearch(e.target.value); setBrowseMode(false) }}
              placeholder="Search Vicks, Pampers, Himalaya..."
              className="w-full bg-gray-100 rounded-xl pl-9 pr-9 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-300" />
            {search && (
              <button onClick={clearFilters}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg leading-none">×</button>
            )}
          </div>
        </div>

        {/* ── Tab Pills: All / Pharma Wellness / Baby Care ── */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
          <button
            onClick={() => { setActiveCatId(null); setActiveCard(null); setBrowseMode(true) }}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              !activeCatId && !activeCard ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600'
            }`}>All</button>
          <button
            onClick={() => { setActiveCatId(PHARMA_ID); setActiveCard(null); setBrowseMode(false) }}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeCatId === PHARMA_ID && !activeCard ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600'
            }`}>💊 Pharma Wellness</button>
          <button
            onClick={() => { setActiveCatId(BABY_ID); setActiveCard(null); setBrowseMode(false) }}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeCatId === BABY_ID && !activeCard ? 'bg-pink-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600'
            }`}>👶 Baby Care</button>
        </div>
      </div>

      {/* ══════════════════════════════
          BROWSE MODE (home view)
      ══════════════════════════════ */}
      {browseMode && (
        <div className="px-4 pt-4 space-y-5">

          {/* Promo Banner */}
          <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-r ${banner.bg} p-5 min-h-[110px] flex items-center justify-between`}>
            <div>
              <span className="inline-block bg-white/20 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full mb-2">
                {banner.badge}
              </span>
              <h2 className="text-white font-bold text-base leading-tight">{banner.title}</h2>
              <p className="text-white/80 text-xs mt-0.5">{banner.sub}</p>
            </div>
            <span className="text-5xl mr-2 select-none">{banner.emoji}</span>
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
              {PROMO_BANNERS.map((_, i) => (
                <button key={i} onClick={() => setBannerIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${i === bannerIndex ? 'bg-white w-4' : 'bg-white/40 w-1.5'}`} />
              ))}
            </div>
          </div>

          {/* Shop by Category */}
          <div>
            <h2 className="text-sm font-bold text-gray-700 mb-3">🛒 Shop by Category</h2>
            <div className="grid grid-cols-3 gap-2.5">
              {CATEGORY_CARDS.map(card => (
                <button key={card.label} onClick={() => handleCardClick(card)}
                  className={`bg-gradient-to-br ${card.color} border ${card.border} rounded-2xl p-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform`}>
                  <span className="text-3xl">{card.icon}</span>
                  <span className={`text-[11px] font-bold ${card.text} text-center leading-tight`}>{card.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section: Pharma Wellness */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-700">💊 Pharma & Wellness</h2>
              <button onClick={() => { setActiveCatId(PHARMA_ID); setActiveCard(null); setBrowseMode(false) }}
                className="text-xs text-blue-500 font-semibold">See all →</button>
            </div>
            {loading && products.length === 0 ? (
              <div className="grid grid-cols-2 gap-3">{new Array(4).fill(null).map((_, i) => <CardLoading key={i} />)}</div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {sortedProducts
                  .filter(p => Array.isArray(p.category)
                    ? p.category.some(c => (c?._id || c)?.toString() === PHARMA_ID)
                    : false)
                  .slice(0, 6)
                  .map(p => p?._id && <CardProduct key={p._id} data={p} />)}
              </div>
            )}
          </div>

          {/* Section: Baby Care */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-700">👶 Baby Care</h2>
              <button onClick={() => { setActiveCatId(BABY_ID); setActiveCard(null); setBrowseMode(false) }}
                className="text-xs text-pink-500 font-semibold">See all →</button>
            </div>
            {loading && products.length === 0 ? (
              <div className="grid grid-cols-2 gap-3">{new Array(4).fill(null).map((_, i) => <CardLoading key={i} />)}</div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {sortedProducts
                  .filter(p => Array.isArray(p.category)
                    ? p.category.some(c => (c?._id || c)?.toString() === BABY_ID)
                    : false)
                  .slice(0, 6)
                  .map(p => p?._id && <CardProduct key={p._id} data={p} />)}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ══════════════════════════════
          FILTER / SEARCH MODE
      ══════════════════════════════ */}
      {!browseMode && (
        <div className="px-4 pt-4">
          {/* Active filter badge */}
          {(activeCard || activeCatId) && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-gray-500">Showing:</span>
              <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
                {activeCard || (activeCatId === BABY_ID ? '👶 Baby Care' : '💊 Pharma Wellness')}
              </span>
              <button onClick={clearFilters} className="text-xs text-gray-400 ml-auto">Clear ×</button>
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-400 font-medium">
              {loading && products.length === 0 ? 'Loading...' : `${sortedProducts.length} product${sortedProducts.length !== 1 ? 's' : ''}`}
            </p>
            {sort !== 'relevance' && (
              <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">
                {SORT_OPTIONS.find(o => o.value === sort)?.label}
              </span>
            )}
          </div>

          {loading && products.length === 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {new Array(8).fill(null).map((_, i) => <CardLoading key={i} />)}
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-20 gap-3 text-center">
              <span className="text-5xl">💊</span>
              <p className="text-gray-500 font-medium">No products found</p>
              <button onClick={clearFilters} className="text-blue-500 text-sm font-semibold">Clear filters</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {sortedProducts.map(p => p?._id && <CardProduct key={p._id} data={p} />)}
                {loading && new Array(4).fill(null).map((_, i) => <CardLoading key={`sk-${i}`} />)}
              </div>
              <div ref={sentinelRef} className="h-10 flex items-center justify-center mt-2">
                {!hasMore && products.length > 0 && (
                  <p className="text-xs text-gray-400 font-medium">✓ All {products.length} products loaded</p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {showSort && <div className="fixed inset-0 z-40" onClick={() => setShowSort(false)} />}
    </section>
  )
}

export default PharmacyPage