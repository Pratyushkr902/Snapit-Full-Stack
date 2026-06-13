import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import CardProduct from '../components/CardProduct'
import CardLoading from '../components/CardLoading'
import AxiosToastError from '../utils/AxiosToastError'

const SORT_OPTIONS = [
  { label: 'Relevance', value: 'relevance' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Newest', value: 'newest' },
]

const GroceryPage = () => {
  const navigate = useNavigate()
  const allCategory = useSelector(state => state.product.allCategory)
  const allSubCategory = useSelector(state => state.product.allSubCategory)

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeSubCategory, setActiveSubCategory] = useState('all')
  const [sort, setSort] = useState('relevance')
  const [showSort, setShowSort] = useState(false)

  const observerRef = useRef(null)
  const sentinelRef = useRef(null)
  const searchTimer = useRef(null)

  // Debounce search
  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(searchTimer.current)
  }, [search])

  // Reset & refetch on filter changes
  useEffect(() => {
    setProducts([])
    setPage(1)
    setHasMore(true)
    fetchProducts(1, true)
  }, [activeCategory, activeSubCategory, debouncedSearch, sort])

  const fetchProducts = useCallback(async (pageNum = 1, reset = false) => {
    try {
      setLoading(true)

      const payload = { page: pageNum, limit: 20 }
      if (activeCategory !== 'all') payload.categoryId = activeCategory
      if (activeSubCategory !== 'all') payload.subCategoryId = activeSubCategory
      if (debouncedSearch) payload.search = debouncedSearch

      // Try category-specific endpoint first, fall back to general
      let response
      if (activeCategory !== 'all') {
        response = await Axios({
          ...SummaryApi.getProductByCategory,
          data: { id: activeCategory, page: pageNum, limit: 20 },
        })
      } else {
        response = await Axios({
          ...SummaryApi.getProduct,
          data: payload,
        })
      }

      const { data } = response
      if (data.success) {
        const incoming = data.data || []
        if (reset || pageNum === 1) {
          setProducts(incoming)
        } else {
          setProducts(prev => {
            const seen = new Set(prev.map(p => p._id))
            return [...prev, ...incoming.filter(p => !seen.has(p._id))]
          })
        }
        setTotalCount(data.totalCount || data.total || 0)
        setHasMore(incoming.length === 20)
      }
    } catch (error) {
      AxiosToastError(error)
    } finally {
      setLoading(false)
    }
  }, [activeCategory, activeSubCategory, debouncedSearch, sort])

  // Infinite scroll sentinel
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

  // Sub-categories for active category
  const subCategories = activeCategory === 'all'
    ? []
    : (allSubCategory || []).filter(sc => sc?.category?._id === activeCategory || sc?.category === activeCategory)

  // Sort products client-side
  const sortedProducts = [...products].sort((a, b) => {
    if (sort === 'price_asc') return (a.price || 0) - (b.price || 0)
    if (sort === 'price_desc') return (b.price || 0) - (a.price || 0)
    if (sort === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    return 0
  })

  const handleCategoryClick = (id) => {
    setActiveCategory(id)
    setActiveSubCategory('all')
  }

  return (
    <section className="min-h-screen bg-gray-50 pb-24">

      {/* ── Sticky Header ── */}
      <div className="bg-white sticky top-0 z-20 shadow-sm">
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-full bg-gray-100 active:scale-95 transition shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-black text-slate-800">🛒 Grocery</h1>
              <p className="text-xs text-gray-400">Fresh & daily essentials</p>
            </div>
            {/* Sort button */}
            <div className="relative">
              <button
                onClick={() => setShowSort(v => !v)}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-xl text-xs font-semibold text-gray-600 active:scale-95 transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 4h18M7 8h10M11 12h4M15 16h2" />
                </svg>
                Sort
              </button>
              {showSort && (
                <div className="absolute right-0 top-9 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden w-48">
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setSort(opt.value); setShowSort(false) }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition ${
                        sort === opt.value
                          ? 'bg-green-50 text-green-600 font-bold'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
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
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none"
              viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1116.65 16.65z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search groceries, brands..."
              className="w-full bg-gray-100 rounded-xl pl-9 pr-9 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-green-300"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg leading-none">
                ×
              </button>
            )}
          </div>
        </div>

        {/* ── Category Pills ── */}
        {allCategory?.length > 0 && (
          <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => handleCategoryClick('all')}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeCategory === 'all'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              All
            </button>
            {allCategory.map(cat => (
              <button
                key={cat._id}
                onClick={() => handleCategoryClick(cat._id)}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeCategory === cat._id
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {cat.image && (
                  <img src={cat.image} alt="" className="w-4 h-4 object-cover rounded-full" />
                )}
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* ── Sub-category Pills ── */}
        {subCategories.length > 0 && (
          <div className="flex gap-2 px-4 pb-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveSubCategory('all')}
              className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                activeSubCategory === 'all'
                  ? 'border-green-400 bg-green-50 text-green-700'
                  : 'border-gray-200 text-gray-500'
              }`}
            >
              All
            </button>
            {subCategories.map(sc => (
              <button
                key={sc._id}
                onClick={() => setActiveSubCategory(sc._id)}
                className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                  activeSubCategory === sc._id
                    ? 'border-green-400 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-500'
                }`}
              >
                {sc.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Product Grid ── */}
      <div className="px-4 pt-4">
        {/* Count + sort label */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-400 font-medium">
            {loading && products.length === 0
              ? 'Loading...'
              : `${products.length}${totalCount > products.length ? `+ of ${totalCount}` : ''} products`}
          </p>
          {sort !== 'relevance' && (
            <span className="text-[10px] text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">
              {SORT_OPTIONS.find(o => o.value === sort)?.label}
            </span>
          )}
        </div>

        {/* Initial skeleton */}
        {loading && products.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {new Array(8).fill(null).map((_, i) => <CardLoading key={i} />)}
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 gap-3 text-center">
            <span className="text-5xl">🛒</span>
            <p className="text-gray-500 font-medium">No products found</p>
            {(search || activeCategory !== 'all') && (
              <button
                onClick={() => { setSearch(''); setActiveCategory('all'); setActiveSubCategory('all') }}
                className="text-green-500 text-sm font-semibold"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {sortedProducts.map(p => p?._id && <CardProduct key={p._id} data={p} />)}

              {/* Loading skeletons while fetching next page */}
              {loading && new Array(4).fill(null).map((_, i) => <CardLoading key={`sk-${i}`} />)}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-10 flex items-center justify-center mt-2">
              {!hasMore && products.length > 0 && (
                <p className="text-xs text-gray-400 font-medium">✓ All {products.length} products loaded</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Tap-away for sort dropdown */}
      {showSort && (
        <div className="fixed inset-0 z-40" onClick={() => setShowSort(false)} />
      )}
    </section>
  )
}

export default GroceryPage