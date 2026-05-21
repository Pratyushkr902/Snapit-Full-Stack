import React, { useMemo } from 'react'
import HomeBanner from '../components/HomeBanner'
import { useSelector } from 'react-redux'
import { valideURLConvert } from '../utils/valideURLConvert'
import { useNavigate } from 'react-router-dom'
import CategoryWiseProductDisplay from '../components/categoryWiseProductDisplay'

const Home = () => {
  const loadingCategory = useSelector(state => state.product.loadingCategory)
  const categoryData = useSelector(state => state.product.allCategory)
  const subCategoryData = useSelector(state => state.product.allSubCategory)
  const navigate = useNavigate()

  const BACKEND_URL = "https://snapit-full-stack-2.onrender.com"

  const prioritizedCategorySections = useMemo(() => {
    if (!categoryData || !Array.isArray(categoryData) || categoryData.length === 0) return []
    let data = [...categoryData]
    const priorityKeywords = ["atta", "masala", "oil", "dal"]
    data.sort((a, b) => {
      const aName = (a.name || "").toLowerCase()
      const bName = (b.name || "").toLowerCase()
      const aIsPriority = priorityKeywords.some(key => aName.includes(key))
      const bIsPriority = priorityKeywords.some(key => bName.includes(key))
      if (aIsPriority && !bIsPriority) return -1
      if (!aIsPriority && bIsPriority) return 1
      return 0
    })
    return data
  }, [categoryData])

  const handleRedirectProductListpage = (id, cat) => {
    const subcategory = subCategoryData.find(sub => sub.category.some(c => c._id == id))
    if (subcategory) {
      navigate(`/${valideURLConvert(cat)}-${id}/${valideURLConvert(subcategory?.name)}-${subcategory?._id}`)
    } else {
      navigate(`/category/${id}`)
    }
  }

  return (
    <section className='bg-white min-h-screen overflow-x-hidden'>
      {/* 1. BANNER */}
      <div className='container mx-auto px-0 lg:px-4 mb-3 lg:mb-5'>
        <HomeBanner />
      </div>

      {/* 2. CATEGORY GRID */}
      <div className='container mx-auto px-4 mt-1 mb-6'>
        <div className='grid grid-cols-4 md:grid-cols-8 lg:grid-cols-10 gap-2 lg:gap-4'>
          {loadingCategory
            ? new Array(12).fill(null).map((_, i) => (
                <div key={i + "load"} className='flex flex-col items-center gap-2'>
                  <div className='bg-slate-100 w-full aspect-square rounded-xl animate-pulse' />
                  <div className='bg-slate-100 h-2.5 w-3/4 rounded animate-pulse' />
                </div>
              ))
            : categoryData?.map((cat) => (
                <div
                  key={cat._id + "homeGrid"}
                  className='group cursor-pointer flex flex-col items-center gap-1.5'
                  onClick={() => handleRedirectProductListpage(cat._id, cat.name)}
                >
                  <div className='bg-white border border-slate-100 rounded-xl p-2 w-full aspect-square flex items-center justify-center transition-all duration-200 active:scale-90 group-hover:border-green-200 group-hover:bg-green-50'>
                    <img
                      src={
                        cat?.image && typeof cat.image === 'string' && cat.image.startsWith('http') 
                          ? cat.image.replace('http://', 'https://') 
                          : `${BACKEND_URL}${cat?.image || ''}`
                      }
                      alt={cat.name}
                      className='w-full h-full object-scale-down group-hover:scale-105 transition-transform duration-200'
                      loading="lazy"
                      onError={(e) => {
                        e.target.src = "https://placehold.co/150?text=Snapit";
                      }}
                    />
                  </div>
                  <p className='text-center text-[10px] lg:text-xs font-medium text-slate-600 line-clamp-1 w-full'>{cat.name}</p>
                </div>
              ))
          }
        </div>
      </div>

      {/* 3. PRODUCT SECTIONS */}
      <div className='flex flex-col gap-1 lg:gap-8 pb-24'>
        {!loadingCategory &&
          prioritizedCategorySections.map((c) => (
            <div key={c?._id + "homeDisplay"} className='w-full border-b border-slate-100 last:border-0'>
              <CategoryWiseProductDisplay id={c?._id} name={c?.name} />
            </div>
          ))
        }
      </div>
    </section>
  )
}

export default Home;