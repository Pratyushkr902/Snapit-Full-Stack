import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import InfiniteScroll from 'react-infinite-scroll-component'
import {
  IoTimeOutline,
  IoClose,
  IoFlameSharp,
  IoSparkles,
  IoFlash,
  IoChevronDown,
  IoBagHandleOutline,
  IoTrendingUp
} from 'react-icons/io5'
import CardLoading from '../components/CardLoading'
import CardProduct from '../components/CardProduct'
import SummaryApi from '../common/SummaryApi'
import Axios from '../utils/Axios'
import AxiosToastError from '../utils/AxiosToastError'
import noDataImage from '../assets/empty_cart.webp'
import { saveRecentSearch } from '../components/Search'
import { preloadImages } from '../utils/optimizeImageUrl'

const LOADING_CARDS = new Array(8).fill(null)

const TRENDING_SEARCHES = [
  { label: 'Amul Milk', query: 'milk' },
  { label: 'Kurkure & Chips', query: 'chips' },
  { label: 'Coca Cola', query: 'coca cola' },
  { label: 'Aashirvaad Atta', query: 'atta' },
  { label: 'Fortune Mustard Oil', query: 'oil' },
  { label: 'Cadbury Chocolate', query: 'chocolate' },
  { label: 'Maggi Noodles', query: 'maggi' },
  { label: 'Farm Fresh Eggs', query: 'eggs' },
  { label: 'Fresh Paneer', query: 'paneer' },
  { label: 'Tata Salt', query: 'salt' },
  { label: 'Basmati Rice', query: 'rice' },
  { label: 'Dahi / Curd', query: 'curd' },
]

const QUICK_CATEGORIES = [
  { name: 'Dairy & Eggs', query: 'milk', subtitle: 'Milk, bread & butter', color: 'from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20' },
  { name: 'Cold Drinks', query: 'drink', subtitle: 'Juices & sodas', color: 'from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/20' },
  { name: 'Snacks & Munchies', query: 'chips', subtitle: 'Chips & namkeen', color: 'from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/20' },
  { name: 'Atta, Rice & Dal', query: 'atta', subtitle: 'Staples & pulses', color: 'from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/20' },
  { name: 'Tea & Coffee', query: 'tea', subtitle: 'Tea & beverage mix', color: 'from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/20' },
  { name: 'Chocolates & Sweets', query: 'chocolate', subtitle: 'Bars & candies', color: 'from-purple-50 to-fuchsia-50 dark:from-purple-950/30 dark:to-fuchsia-950/20' },
  { name: 'Household & Cleaning', query: 'soap', subtitle: 'Detergents & care', color: 'from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/20' },
  { name: 'Personal Care', query: 'cream', subtitle: 'Skin & body care', color: 'from-sky-50 to-indigo-50 dark:from-sky-950/30 dark:to-indigo-950/20' },
]

const SearchPage = () => {
  const navigate = useNavigate()
  const params = useLocation()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPage, setTotalPage] = useState(1)
  const [activeCategory, setActiveCategory] = useState('all')
  const [sortBy, setSortBy] = useState('relevance')
  const [recentSearches, setRecentSearches] = useState([])
  const [fallbackProducts, setFallbackProducts] = useState([])
  const [loadingFallback, setLoadingFallback] = useState(false)

  const searchText =
    new URLSearchParams(params.search).get('q') ||
    new URLSearchParams(params.search).get('search') ||
    ''

  const prevSearchText = useRef(searchText)

  // Load and refresh recent searches from localStorage
  const refreshRecentSearches = useCallback(() => {
    try {
      const raw = localStorage.getItem('snapit_recent_searches')
      if (raw) {
        setRecentSearches(JSON.parse(raw))
      } else {
        setRecentSearches([])
      }
    } catch {
      setRecentSearches([])
    }
  }, [])

  useEffect(() => {
    refreshRecentSearches()
  }, [refreshRecentSearches])

  // Save active query to recent searches when user enters a query
  useEffect(() => {
    if (searchText && searchText.trim().length >= 2) {
      saveRecentSearch(searchText.trim())
      refreshRecentSearches()
    }
  }, [searchText, refreshRecentSearches])

  // Reset pagination & category on query change
  useEffect(() => {
    if (prevSearchText.current !== searchText) {
      setPage(1)
      setData([])
      setActiveCategory('all')
      setSortBy('relevance')
      prevSearchText.current = searchText
    }
  }, [searchText])

  // Fetch search products
  const fetchData = useCallback(async (signal) => {
    if (!searchText.trim()) {
      setData([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const response = await Axios({
        ...SummaryApi.searchProduct,
        signal,
        data: { search: searchText, page, limit: 16 },
      })
      const { data: responseData } = response
      if (responseData.success) {
        const inStock = (responseData.data || []).filter(
          (p) => (Number(p?.stock) || 0) > 0 && p?.publish !== false
        )
        setData((prev) => (page === 1 ? inStock : [...prev, ...inStock]))
        setTotalPage(responseData.totalPage || 1)
        preloadImages(inStock, 220)
      }
    } catch (error) {
      if (error.name !== 'CanceledError') AxiosToastError(error)
    } finally {
      setLoading(false)
    }
  }, [page, searchText])

  useEffect(() => {
    const controller = new AbortController()
    fetchData(controller.signal)
    return () => controller.abort()
  }, [fetchData])

  // Fetch popular fallback essentials when no search results or on landing screen
  useEffect(() => {
    let isMounted = true
    const fetchFallback = async () => {
      try {
        setLoadingFallback(true)
        const response = await Axios({
          ...SummaryApi.getFrequentlyBought,
          params: { impulse: 'true', limit: 10 },
        })
        if (isMounted && response.data?.success) {
          const prods = response.data.data || []
          setFallbackProducts(prods)
          preloadImages(prods, 220)
        }
      } catch (err) {
        console.error('Failed to load fallback essentials', err)
      } finally {
        if (isMounted) setLoadingFallback(false)
      }
    }
    fetchFallback()
    return () => {
      isMounted = false
    }
  }, [])

  const handleFetchMore = () => {
    if (totalPage > page && !loading) {
      setPage((prev) => prev + 1)
    }
  }

  // Handle clicking a search pill / chip
  const handleQueryClick = (query) => {
    saveRecentSearch(query)
    refreshRecentSearches()
    navigate(`/search?q=${encodeURIComponent(query)}`)
  }

  // Delete a single recent search
  const handleRemoveRecent = (e, itemToRemove) => {
    e.stopPropagation()
    try {
      const updated = recentSearches.filter((item) => item !== itemToRemove)
      localStorage.setItem('snapit_recent_searches', JSON.stringify(updated))
      setRecentSearches(updated)
    } catch (err) {
      console.error(err)
    }
  }

  // Clear all recent searches
  const handleClearAllRecent = () => {
    localStorage.removeItem('snapit_recent_searches')
    setRecentSearches([])
  }

  // Dynamically extract categories from current search results
  const availableCategories = useMemo(() => {
    const map = new Map()
    data.forEach((p) => {
      const cats = Array.isArray(p.category) ? p.category : [p.category].filter(Boolean)
      cats.forEach((cat) => {
        const id = typeof cat === 'object' ? cat?._id : cat
        const name = typeof cat === 'object' ? cat?.name : cat
        if (id && name) {
          map.set(id, { id, name, count: (map.get(id)?.count || 0) + 1 })
        }
      })
    })
    return Array.from(map.values())
  }, [data])

  // Filter & sort products client-side for instantaneous feedback
  const displayedProducts = useMemo(() => {
    let list = data
    if (activeCategory !== 'all') {
      list = list.filter((p) => {
        const cats = Array.isArray(p.category) ? p.category : [p.category].filter(Boolean)
        return cats.some((cat) => (typeof cat === 'object' ? cat?._id : cat) === activeCategory)
      })
    }

    if (sortBy === 'price_asc') {
      return [...list].sort((a, b) => {
        const pa = Number(a.discount ? a.price * (1 - a.discount / 100) : a.price) || 0
        const pb = Number(b.discount ? b.price * (1 - b.discount / 100) : b.price) || 0
        return pa - pb
      })
    }
    if (sortBy === 'price_desc') {
      return [...list].sort((a, b) => {
        const pa = Number(a.discount ? a.price * (1 - a.discount / 100) : a.price) || 0
        const pb = Number(b.discount ? b.price * (1 - b.discount / 100) : b.price) || 0
        return pb - pa
      })
    }
    if (sortBy === 'discount') {
      return [...list].sort((a, b) => (Number(b.discount) || 0) - (Number(a.discount) || 0))
    }
    return list
  }, [data, activeCategory, sortBy])

  // ==========================================
  // CASE 1: ZERO-QUERY LANDING SCREEN (Blinkit / Zepto style)
  // ==========================================
  if (!searchText.trim()) {
    return (
      <section className='bg-slate-50 dark:bg-[#0b1329] min-h-screen py-3 pb-24 transition-colors'>
        <div className='container mx-auto px-3 sm:px-4 max-w-5xl space-y-6'>

          {/* 1. RECENT SEARCHES (if available) */}
          {recentSearches.length > 0 && (
            <div className='bg-white dark:bg-slate-900/90 rounded-2xl p-4 shadow-xs border border-slate-100 dark:border-slate-800/80'>
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold text-sm'>
                  <IoTimeOutline size={18} className='text-emerald-600 dark:text-emerald-400' />
                  <span>Recent Searches</span>
                </div>
                <button
                  type='button'
                  onClick={handleClearAllRecent}
                  className='text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors'
                >
                  Clear All
                </button>
              </div>
              <div className='flex flex-wrap gap-2'>
                {recentSearches.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleQueryClick(item)}
                    className='group inline-flex items-center gap-1.5 bg-slate-100/90 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 text-xs font-medium px-3 py-1.5 rounded-full cursor-pointer transition-all border border-slate-200/50 dark:border-slate-700/60'
                  >
                    <span>{item}</span>
                    <button
                      type='button'
                      onClick={(e) => handleRemoveRecent(e, item)}
                      className='text-slate-400 hover:text-red-500 rounded-full p-0.5 transition-colors'
                      title='Remove'
                    >
                      <IoClose size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. TRENDING IN PALIGANJ */}
          <div className='bg-white dark:bg-slate-900/90 rounded-2xl p-4 shadow-xs border border-slate-100 dark:border-slate-800/80'>
            <div className='flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold text-sm mb-3'>
              <span className='flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400'>
                <IoFlameSharp size={15} />
              </span>
              <span>Trending in Paliganj</span>
              <span className='ml-auto text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center gap-1'>
                <IoFlash size={11} /> 10 Mins
              </span>
            </div>
            <div className='flex flex-wrap gap-2'>
              {TRENDING_SEARCHES.map((item, idx) => (
                <button
                  key={idx}
                  type='button'
                  onClick={() => handleQueryClick(item.query)}
                  className='inline-flex items-center bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl transition-all border border-slate-200/70 dark:border-slate-700/60 hover:shadow-xs active:scale-95'
                >
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. EXPLORE BY POPULAR CATEGORIES */}
          <div>
            <div className='flex items-center justify-between mb-3 px-1'>
              <h3 className='text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5'>
                <IoBagHandleOutline size={16} className='text-emerald-600 dark:text-emerald-400' />
                Explore Categories
              </h3>
              <span className='text-xs text-slate-400'>10 Mins Delivery</span>
            </div>
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-2.5'>
              {QUICK_CATEGORIES.map((cat, idx) => (
                <div
                  key={idx}
                  onClick={() => handleQueryClick(cat.query)}
                  className={`cursor-pointer rounded-2xl p-3 border border-slate-200/60 dark:border-slate-800 bg-gradient-to-br ${cat.color} hover:shadow-md hover:scale-[1.02] transition-all flex flex-col justify-center`}
                >
                  <p className='text-xs font-bold text-slate-800 dark:text-slate-100 truncate'>
                    {cat.name}
                  </p>
                  <p className='text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate'>
                    {cat.subtitle}
                  </p>
                  <span className='text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1'>
                    Explore →
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 4. POPULAR DAILY STAPLES CAROUSEL */}
          {fallbackProducts.length > 0 && (
            <div className='bg-white dark:bg-slate-900/90 rounded-2xl p-4 shadow-xs border border-slate-100 dark:border-slate-800/80'>
              <div className='flex items-center justify-between mb-3'>
                <div>
                  <h3 className='text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5'>
                    <IoTrendingUp size={16} className='text-emerald-600 dark:text-emerald-400' />
                    Popular Daily Staples
                  </h3>
                  <p className='text-[11px] text-slate-400'>Delivered to your door in 10 minutes</p>
                </div>
              </div>
              <div className='grid grid-cols-2 min-[480px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5'>
                {fallbackProducts.slice(0, 10).map((prod, index) => (
                  <CardProduct data={prod} key={prod?._id + 'staple' + index} />
                ))}
              </div>
            </div>
          )}

        </div>
      </section>
    )
  }

  // ==========================================
  // CASE 2: ACTIVE SEARCH RESULTS SCREEN
  // ==========================================
  return (
    <section className='bg-slate-50 dark:bg-[#0b1329] min-h-screen py-3 pb-24 transition-colors'>
      <div className='container mx-auto px-3 sm:px-4 max-w-6xl'>

        {/* TOP STATUS BAR: QUERY TITLE, COUNT, SPEED BADGE, SORT DROPDOWN */}
        <div className='bg-white dark:bg-slate-900/90 rounded-2xl p-3 sm:p-4 mb-3 shadow-xs border border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5'>
          <div>
            <div className='flex items-center gap-2 flex-wrap'>
              <h1 className='text-sm sm:text-base font-bold text-slate-900 dark:text-white'>
                Results for <span className='text-emerald-600 dark:text-emerald-400'>"{searchText}"</span>
              </h1>
              <span className='inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'>
                <IoFlash size={12} /> 10 Mins Paliganj
              </span>
            </div>
            <p className='text-xs text-slate-400 mt-0.5'>
              {loading && data.length === 0
                ? 'Searching fresh inventory...'
                : `${displayedProducts.length} ${displayedProducts.length === 1 ? 'item' : 'items'} available`}
            </p>
          </div>

          {/* SORT CONTROLS */}
          {data.length > 0 && (
            <div className='flex items-center gap-1.5 ml-auto'>
              <label htmlFor='search-sort' className='text-xs font-medium text-slate-400 hidden sm:inline'>
                Sort:
              </label>
              <div className='relative'>
                <select
                  id='search-sort'
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className='appearance-none text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 pl-3 pr-7 py-1.5 rounded-xl border border-slate-200/70 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer'
                >
                  <option value='relevance'>Relevance</option>
                  <option value='price_asc'>Price: Low to High</option>
                  <option value='price_desc'>Price: High to Low</option>
                  <option value='discount'>Discount %</option>
                </select>
                <IoChevronDown
                  size={12}
                  className='absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400'
                />
              </div>
            </div>
          )}
        </div>

        {/* DYNAMIC CATEGORY FILTER PILLS RAIL */}
        {availableCategories.length > 1 && (
          <div className='flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-2 scrollbar-none'>
            <button
              type='button'
              onClick={() => setActiveCategory('all')}
              className={`flex-shrink-0 text-xs font-bold px-3.5 py-1.5 rounded-full transition-all border ${
                activeCategory === 'all'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-500'
              }`}
            >
              All ({data.length})
            </button>
            {availableCategories.map((cat) => (
              <button
                key={cat.id}
                type='button'
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all border ${
                  activeCategory === cat.id
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-500'
                }`}
              >
                {cat.name} ({cat.count})
              </button>
            ))}
          </div>
        )}

        {/* PRODUCT GRID WITH INFINITE SCROLL */}
        <InfiniteScroll
          dataLength={displayedProducts.length}
          hasMore={page < totalPage}
          next={handleFetchMore}
          loader={null}
        >
          <div className='grid grid-cols-2 min-[480px]:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3 py-2'>
            {displayedProducts.map((p, index) => (
              <CardProduct data={p} key={p?._id + 'searchProduct' + index} priority={index < 4} />
            ))}
            {loading &&
              LOADING_CARDS.map((_, index) => (
                <CardLoading key={'loadingsearchpage' + index} />
              ))}
          </div>
        </InfiniteScroll>

        {/* SMART ZERO-RESULTS FALLBACK (Quick-commerce best practice) */}
        {!loading && displayedProducts.length === 0 && (
          <div className='mt-4 space-y-6'>
            {/* Apology & helpful search suggestions */}
            <div className='bg-white dark:bg-slate-900/90 rounded-3xl p-6 sm:p-8 text-center max-w-lg mx-auto border border-slate-100 dark:border-slate-800 shadow-xs'>
              <img
                src={noDataImage}
                className='w-36 h-36 mx-auto object-contain mb-3 opacity-90'
                alt='No items found'
              />
              <h3 className='text-base sm:text-lg font-extrabold text-slate-900 dark:text-white'>
                No exact match for "{searchText}"
              </h3>
              <p className='text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto'>
                Try checking for typos, searching for generic names (e.g. "milk", "oil", "chips"), or try the trending searches below:
              </p>
              <div className='flex flex-wrap justify-center gap-1.5 mt-4'>
                {TRENDING_SEARCHES.slice(0, 6).map((item, idx) => (
                  <button
                    key={idx}
                    type='button'
                    onClick={() => handleQueryClick(item.query)}
                    className='text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 px-3 py-1.5 rounded-full border border-slate-200/70 dark:border-slate-700 transition-all'
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recommended Products Carousel / Grid */}
            {fallbackProducts.length > 0 && (
              <div className='bg-white dark:bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800/80 shadow-xs'>
                <div className='flex items-center gap-2 mb-3'>
                  <span className='flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'>
                    <IoSparkles size={14} />
                  </span>
                  <div>
                    <h3 className='text-sm font-bold text-slate-900 dark:text-white'>
                      Popular Essentials in Paliganj
                    </h3>
                    <p className='text-[11px] text-slate-400'>Delivered to your door in 10 minutes</p>
                  </div>
                </div>
                <div className='grid grid-cols-2 min-[480px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5'>
                  {fallbackProducts.map((prod, index) => (
                    <CardProduct data={prod} key={prod?._id + 'fallback' + index} priority={index < 4} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </section>
  )
}

export default SearchPage