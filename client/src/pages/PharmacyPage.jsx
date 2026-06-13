import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import CardProduct from '../components/CardProduct'
import CardLoading from '../components/CardLoading'

const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://snapit-backend-bn8r.onrender.com'

const normalizeImageField = (image) => {
  if (Array.isArray(image)) {
    return image.map(img =>
      typeof img === 'string' && img.startsWith('/') ? `${BACKEND_URL}${img}` : img
    )
  }
  if (typeof image === 'string' && image.startsWith('/')) return `${BACKEND_URL}${image}`
  return image
}

// Wellness category groups for the "shop by health need" strip
const WELLNESS_GROUPS = [
  { label: 'Medicines', icon: '💊', keywords: ['medicine', 'tablet', 'capsule', 'syrup', 'drug'] },
  { label: 'Vitamins', icon: '🍋', keywords: ['vitamin', 'supplement', 'multivitamin', 'omega'] },
  { label: 'Personal Care', icon: '🧴', keywords: ['personal', 'care', 'skin', 'hair', 'lotion', 'cream'] },
  { label: 'Fitness', icon: '💪', keywords: ['fitness', 'protein', 'whey', 'gym', 'sport', 'energy'] },
  { label: 'Baby Care', icon: '👶', keywords: ['baby', 'infant', 'child', 'kids', 'diaper'] },
  { label: 'Ayurvedic', icon: '🌿', keywords: ['ayur', 'herbal', 'natural', 'organic'] },
  { label: 'Devices', icon: '🩺', keywords: ['device', 'monitor', 'oximeter', 'bp', 'thermometer'] },
]

const SORT_OPTIONS = [
  { label: 'Relevance', value: 'relevance' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
]

const PharmacyPage = () => {
  const navigate = useNavigate()
  const allCategory = useSelector(state => state.product.allCategory)

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [activeGroup, setActiveGroup] = useState('all')
  const [activeCategoryId, setActiveCategoryId] = useState(null)
  const [sort, setSort] = useState('relevance')
  const [showSort, setShowSort] = useState(false)

  const observerRef = useRef(null)
  const sentinelRef = useRef(null)
  const searchTimer = useRef(null)

  // Filter to pharma/wellness categories
  const pharmacyCategories = (allCategory || []).filter(c => {
    const name = (c?.name || '').toLowerCase()
    return (
      name.includes('pharma') ||
      name.includes('pharmacy') ||
      name.includes('wellness') ||
      name.includes('medicine') ||
      name.includes('health') ||
      name.includes('vitamin') ||
      name.includes('personal care') ||
      name.includes('baby') ||
      name.includes('ayur') ||
      name.includes('fitness') ||
      name.includes('supplement')
    )
  })

  // Debounce search
  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(searchTimer.current)
  }, [search])

  // Reset on filter change
  useEffect(() => {
    setProducts([])
    setPage(1)
    setHasMore(true)
    fetchProducts(1, true)
  }, [activeCategoryId, debouncedSearch, activeGroup, allCategory?.length])

  const fetchProducts = useCallback(async (pageNum = 1, reset = false) => {
    if (!allCategory?.length) return
    try {
      setLoading(true)

      // Determine which category IDs to fetch
      let categoryIds = pharmacyCategories.map(c => c._id)

      if (activeCategoryId) {
        categoryIds = [activeCategoryId]
      } else if (activeGroup !== 'all') {
        const group = WELLNESS_GROUPS.find(g => g.label === activeGroup)
        if (group) {
          categoryIds = pharmacyCategories
            .filter(c => group.keywords.some(kw => c.name.toLowerCase().includes(kw)))
            .map(c => c._id)
          if (categoryIds.length === 0) categoryIds = pharmacyCategories.map(c => c._id)
        }
      }

      if (categoryIds.length === 0) {
        setLoading(false)
        return
      }

      // Fetch all category pages in parallel for page 1; paginate single cat after
      let incoming = []
      if (pageNum === 1) {
        const results = await Promise.all(
          categoryIds.map(id =>
            Axios({ ...SummaryApi.getProductByCategory, data: { id, page: 1, limit: 50 } })
              .then(r => r.data?.success ? r.data.data : [])
              .catch(() => [])
          )
        )
        incoming = results.flat()
        // Dedupe
        const seen = new Set()
        incoming = incoming.filter(p => {
          if (!p?._id || seen.has(p._id)) return false
          seen.add(p._id)
          return true
        })
      } else {
        // paginate single if we have one selected
        const id = activeCategoryId || categoryIds[0]
        const res = await Axios({
          ...SummaryApi.getProductByCategory,
          data: { id, page: pageNum, limit: 20 },
        })
        incoming = res.data?.success ? res.data.data : []
      }

      // Normalize images
      incoming = incoming.map(p => ({ ...p, image: normalizeImageField(p.image) }))

      // Search filter
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase()
        incoming = incoming.filter(p =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q) ||
          (p.brand || '').toLowerCase().includes(q)
        )
      }

      if (reset || pageNum === 1) {
        setProducts(incoming)
      } else {
        setProducts(prev => {
          const seen = new Set(prev.map(p => p._id))
          return [...prev, ...incoming.filter(p => !seen.has(p._id))]
        })
      }
      setHasMore(incoming.length === 20)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [allCategory, activeCategoryId, activeGroup, debouncedSearch])

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

  // Sort products
  const sortedProducts = [...products].sort((a, b) => {
    if (sort === 'price_asc') return (a.price || 0) - (b.price || 0)
    if (sort === 'price_desc') return (b.price || 0) - (a.price || 0)
    return 0
  })

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
              <h1 className="text-lg font-bold text-gray-800">💊 Pharmacy & Wellness</h1>
              <p className="text-xs text-gray-400">Medicines, vitamins & more</p>
            </div>
            {/* Sort */}
            <div className="relative">
              <button onClick={() => setShowSort(v => !v)}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-xl text-xs font-semibold text-gray-600 active:scale-95 transition">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 4h18M7 8h10M11 12h4M15 16h2" />
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1116.65 16.65z" />
            </svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search medicines, vitamins, brands..."
              className="w-full bg-gray-100 rounded-xl pl-9 pr-9 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-300" />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg leading-none">×</button>
            )}
          </div>
        </div>

        {/* ── Wellness Group Pills ── */}
        <div className="flex gap-2 px-4 pb-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => { setActiveGroup('all'); setActiveCategoryId(null) }}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeGroup === 'all' && !activeCategoryId
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            All
          </button>
          {WELLNESS_GROUPS.map(g => (
            <button key={g.label}
              onClick={() => { setActiveGroup(g.label); setActiveCategoryId(null) }}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeGroup === g.label
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600'
              }`}>
              <span>{g.icon}</span>{g.label}
            </button>
          ))}
        </div>

        {/* ── Exact Category Pills (from DB) ── */}
        {pharmacyCategories.length > 0 && (
          <div className="flex gap-2 px-4 pb-2 overflow-x-auto scrollbar-none">
            {pharmacyCategories.map(cat => (
              <button key={cat._id}
                onClick={() => { setActiveCategoryId(cat._id); setActiveGroup('all') }}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                  activeCategoryId === cat._id
                    ? 'border-blue-400 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-500 bg-white'
                }`}>
                {cat.image && <img src={cat.image} alt="" className="w-4 h-4 object-cover rounded-full" />}
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Product Grid ── */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-400 font-medium">
            {loading && products.length === 0 ? 'Loading...' : `${products.length} product${products.length !== 1 ? 's' : ''}`}
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
            {(search || activeGroup !== 'all' || activeCategoryId) && (
              <button onClick={() => { setSearch(''); setActiveGroup('all'); setActiveCategoryId(null) }}
                className="text-blue-500 text-sm font-semibold">Clear filters</button>
            )}
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

      {showSort && <div className="fixed inset-0 z-40" onClick={() => setShowSort(false)} />}
    </section>
  )
}

export default PharmacyPage