import React, { useMemo } from 'react'
import HomeBanner from '../components/HomeBanner'
import { useSelector } from 'react-redux'
import { valideURLConvert } from '../utils/valideURLConvert'
import { useNavigate } from 'react-router-dom'
import CategoryWiseProductDisplay from '../components/categoryWiseProductDisplay'
import TodayDeals from '../components/TodayDeals'
import FoodCategoryCard from '../components/FoodCategoryCard'

// ✅ Inline SVG fallback — no network request, never fails
const FALLBACK_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23f3f4f6'/%3E%3Ctext x='75' y='80' text-anchor='middle' fill='%239ca3af' font-size='11' font-family='sans-serif'%3ENo Image%3C/text%3E%3C/svg%3E"

const BACKEND_URL = import.meta.env.VITE_API_URL || "https://snapit-full-stack-production.up.railway.app"

// Super-app category definitions
const SUPER_APP_CATEGORIES = [
  {
    id: 'grocery',
    label: 'Grocery',
    emoji: '🛒',
    bg: 'bg-green-50',
    border: 'border-green-200',
    path: '/grocery',
  },
  {
    id: 'food',
    label: 'Food',
    emoji: '🍔',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    path: '/food',
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy',
    emoji: '💊',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    path: '/pharmacy',
  },
  {
    id: 'electronics',
    label: 'Electronics',
    emoji: '📱',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    path: '/electronics',
    comingSoon: true,
  },
]

const Home = () => {
  const loadingCategory = useSelector(state => state.product.loadingCategory)
  const categoryData = useSelector(state => state.product.allCategory)
  const subCategoryData = useSelector(state => state.product.allSubCategory)
  const navigate = useNavigate()

  const prioritizedCategorySections = useMemo(() => {
    if (!Array.isArray(categoryData) || categoryData.length === 0) return []
    const priorityKeywords = ["atta", "masala", "oil", "dal"]
    return [...categoryData].sort((a, b) => {
      const aP = priorityKeywords.some(k => (a?.name || "").toLowerCase().includes(k))
      const bP = priorityKeywords.some(k => (b?.name || "").toLowerCase().includes(k))
      if (aP && !bP) return -1
      if (!aP && bP) return 1
      return 0
    })
  }, [categoryData])

  const handleRedirectProductListpage = (id, cat) => {
    const safeSubData = Array.isArray(subCategoryData) ? subCategoryData : []
    const subcategory = safeSubData.find(
      sub => Array.isArray(sub?.category) && sub.category.some(c => c?._id == id)
    )
    if (subcategory) {
      navigate(`/${valideURLConvert(cat || "")}-${id}/${valideURLConvert(subcategory?.name || "")}-${subcategory?._id}`)
    } else {
      navigate(`/${valideURLConvert(cat || "")}-${id}`)
    }
  }

  return (
    <section className='bg-white min-h-screen overflow-x-hidden'>

      {/* 1. BANNER */}
      <div className='container mx-auto px-0 lg:px-4 mb-3 lg:mb-5'>
        <HomeBanner />
      </div>

      {/* 2. SUPER-APP CATEGORY CARDS */}
      <div className='container mx-auto px-4 mb-5'>
        <div className='grid grid-cols-4 gap-3'>
          {SUPER_APP_CATEGORIES.map((cat) => (
            <FoodCategoryCard key={cat.id} category={cat} />
          ))}
        </div>
      </div>

      {/* 3. GROCERY CATEGORY GRID */}
      <div className='container mx-auto px-4 mt-1 mb-6'>
        <p className='text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3'>
          Shop by Category
        </p>
        <div className='grid grid-cols-4 md:grid-cols-8 lg:grid-cols-10 gap-2 lg:gap-4'>
          {loadingCategory
            ? new Array(12).fill(null).map((_, i) => (
                <div key={i + "load"} className='flex flex-col items-center gap-2'>
                  <div className='bg-slate-100 w-full aspect-square rounded-xl animate-pulse' />
                  <div className='bg-slate-100 h-2.5 w-3/4 rounded animate-pulse' />
                </div>
              ))
            : Array.isArray(categoryData) && categoryData.filter(cat => !['grocery', 'pharmacy'].includes((cat?.name || '').toLowerCase())).map((cat) => {
                if (!cat) return null;

                const rawImg = cat?.icon || cat?.image || cat?.imageUrl || '';
                let finalSrc = FALLBACK_IMG;

                if (typeof rawImg === 'string' && rawImg.trim().length > 0) {
                  const cleanPath = rawImg.trim();
                  if (cleanPath.startsWith('//')) {
                    finalSrc = `https:${cleanPath}`;
                  } else if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
                    finalSrc = cleanPath;
                  } else if (cleanPath.startsWith('/')) {
                    finalSrc = `${BACKEND_URL}${cleanPath}`;
                  } else {
                    finalSrc = cleanPath;
                  }
                } else if (Array.isArray(rawImg) && rawImg.length > 0) {
                  const arrayPath = typeof rawImg[0] === 'string' ? rawImg[0].trim() : '';
                  if (arrayPath.startsWith('//')) {
                    finalSrc = `https:${arrayPath}`;
                  } else if (arrayPath.startsWith('http://') || arrayPath.startsWith('https://')) {
                    finalSrc = arrayPath;
                  } else if (arrayPath.startsWith('/')) {
                    finalSrc = `${BACKEND_URL}${arrayPath}`;
                  } else {
                    finalSrc = arrayPath || FALLBACK_IMG;
                  }
                }

                return (
                  <div
                    key={cat._id + "homeGrid"}
                    className='group cursor-pointer flex flex-col items-center gap-1.5'
                    onClick={() => handleRedirectProductListpage(cat._id, cat.name)}
                  >
                    <div className='bg-white border border-slate-100 rounded-xl p-2 w-full aspect-square flex items-center justify-center transition-all duration-200 active:scale-90 group-hover:border-green-200 group-hover:bg-green-50'>
                      <img
                        src={finalSrc}
                        alt={cat?.name || "Category"}
                        className='w-full h-full object-scale-down group-hover:scale-105 transition-transform duration-200'
                        loading="eager"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = FALLBACK_IMG;
                        }}
                      />
                    </div>
                    <p className='text-center text-[10px] lg:text-xs font-medium text-slate-600 line-clamp-1 w-full'>
                      {cat?.name || ""}
                    </p>
                  </div>
                );
              })
          }
        </div>
      </div>

      {/* 4. TODAY'S DEALS */}
      <TodayDeals />

      {/* 5. PRODUCT SECTIONS */}
      <div className='flex flex-col gap-1 lg:gap-8 pb-24'>
        {loadingCategory
          ? new Array(3).fill(null).map((_, i) => (
              <div key={"secLoad" + i} className='w-full px-4 py-4'>
                <div className='flex items-center justify-between mb-3'>
                  <div className='bg-slate-100 h-5 w-32 rounded animate-pulse' />
                  <div className='bg-slate-100 h-5 w-16 rounded animate-pulse' />
                </div>
                <div className='flex gap-3 overflow-hidden'>
                  {new Array(4).fill(null).map((_, j) => (
                    <div key={j} className='min-w-[150px] h-56 bg-slate-100 rounded-2xl animate-pulse flex-shrink-0' />
                  ))}
                </div>
              </div>
            ))
          : prioritizedCategorySections.map((c) => {
              if (c && c._id) {
                return (
                  <div key={c._id + "homeDisplay"} className='w-full border-b border-slate-100 last:border-0'>
                    <CategoryWiseProductDisplay id={c._id} name={c.name} />
                  </div>
                );
              }
              return null;
            })
        }
      </div>

    </section>
  )
}

export default Home;