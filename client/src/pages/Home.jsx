import React, { useMemo } from 'react'
import HomeBanner from '../components/HomeBanner' 
import FlashSaleBanner from '../components/FlashSaleBanner' 
import { useSelector } from 'react-redux'
import { valideURLConvert } from '../utils/valideURLConvert'
import { useNavigate } from 'react-router-dom'
import CategoryWiseProductDisplay from '../components/categoryWiseProductDisplay'

const Home = () => {
  const loadingCategory = useSelector(state => state.product.loadingCategory)
  const categoryData = useSelector(state => state.product.allCategory)
  const subCategoryData = useSelector(state => state.product.allSubCategory)
  const navigate = useNavigate()

  // --- FIXED: Flexible Prioritization Logic ---
  // This version is "fuzzier" so it won't break if there's a typo in the DB name
  const prioritizedCategorySections = useMemo(() => {
    if (!categoryData || !Array.isArray(categoryData) || categoryData.length === 0) return [];
    
    const data = [...categoryData];
    // Find index of category containing "Atta" (case insensitive)
    const attaIndex = data.findIndex(c => c?.name?.toLowerCase().includes("atta"));
    
    if (attaIndex > -1) {
      const [attaItem] = data.splice(attaIndex, 1);
      data.unshift(attaItem); // Force move to index 0
    }
    
    return data;
  }, [categoryData]);

  const handleRedirectProductListpage = (id, cat) => {
    const subcategory = subCategoryData.find(sub => {
      return sub.category.some(c => c._id == id)
    })
    
    if (subcategory) {
      const url = `/${valideURLConvert(cat)}-${id}/${valideURLConvert(subcategory?.name)}-${subcategory?._id}`
      navigate(url)
    } else {
      navigate(`/category/${id}`)
    }
  }

  return (
    <section className='bg-white min-h-screen'>
      {/* 1. TOP PROMO BANNER */}
      <div className='container mx-auto mb-2 lg:mb-4'>
          <HomeBanner />
      </div>

      {/* 2. FLASH SALE BANNER */}
      <div className='container mx-auto px-4 -mt-2'>
          <FlashSaleBanner />
      </div>
      
      {/* 3. CATEGORY GRID (Top Icons) */}
      <div className='container mx-auto px-4 my-4 grid grid-cols-4 md:grid-cols-8 lg:grid-cols-10 gap-3 lg:gap-5'>
          {
            loadingCategory ? (
              new Array(12).fill(null).map((_, index) => (
                <div key={index + "loadingcategory"} className='bg-slate-50 rounded-xl p-4 min-h-32 grid gap-2 animate-pulse'>
                  <div className='bg-slate-200 min-h-20 rounded-lg'></div>
                  <div className='bg-slate-200 h-4 rounded w-3/4 mx-auto'></div>
                </div>
              ))
            ) : (
              categoryData?.map((cat) => (
                <div 
                  key={cat._id + "displayCategory"} 
                  className='group w-full h-full cursor-pointer' 
                  onClick={() => handleRedirectProductListpage(cat._id, cat.name)}
                >
                  <div className='bg-blue-50 rounded-2xl p-2.5 group-hover:bg-blue-100 group-hover:shadow-md transition-all duration-300'>
                      <img 
                        src={cat.image}
                        alt={cat.name}
                        className='w-full h-full object-scale-down aspect-square group-hover:scale-105 transition-transform duration-300'
                      />
                  </div>
                  <p className='text-center text-[10px] lg:text-xs mt-1.5 font-bold text-slate-700 line-clamp-1'>{cat.name}</p>
                </div>
              ))
            )
          }
      </div>

      {/* 4. DYNAMIC PRODUCT SECTIONS (The actual products) */}
      <div className='grid gap-6 lg:gap-10 pb-24'>
        {
          !loadingCategory && prioritizedCategorySections.length > 0 ? (
            prioritizedCategorySections.map((c) => (
              <CategoryWiseProductDisplay 
                key={c?._id + "CategorywiseProduct"} 
                id={c?._id} 
                name={c?.name}
              />
            ))
          ) : (
             // Show a small loader if categories are still fetching
             !loadingCategory && <p className="text-center text-slate-400 text-sm">Initializing product aisles...</p>
          )
        }
      </div>
    </section>
  )
}

export default Home