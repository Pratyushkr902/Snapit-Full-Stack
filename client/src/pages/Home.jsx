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

  // --- REFINED PRIORITIZATION: Essentials first for both Desktop & Android ---
  const prioritizedCategorySections = useMemo(() => {
    if (!categoryData || !Array.isArray(categoryData) || categoryData.length === 0) return [];
    
    let data = [...categoryData];
    const priorityKeywords = ["atta", "masala", "oil", "dal"];

    data.sort((a, b) => {
      const aName = (a.name || "").toLowerCase();
      const bName = (b.name || "").toLowerCase();

      const aIsPriority = priorityKeywords.some(key => aName.includes(key));
      const bIsPriority = priorityKeywords.some(key => bName.includes(key));

      if (aIsPriority && !bIsPriority) return -1; 
      if (!aIsPriority && bIsPriority) return 1;  
      return 0; 
    });
    
    return data;
  }, [categoryData]);

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
      {/* 1. MAIN BANNER - Removed extra mobile padding to prevent gaps */}
      <div className='container mx-auto px-0 lg:px-4 mb-2 lg:mb-4'>
          <HomeBanner />
      </div>

      {/* 2. CATEGORY ICON GRID - Optimized for Touch & High Density */}
      <div className='container mx-auto px-4 mt-2 mb-6'>
        <div className='grid grid-cols-4 md:grid-cols-8 lg:grid-cols-10 gap-3 lg:gap-5'>
            {
              loadingCategory ? (
                new Array(12).fill(null).map((_, i) => (
                  <div key={i+"load"} className='bg-slate-50 rounded-xl aspect-square animate-pulse'></div>
                ))
              ) : (
                categoryData?.map((cat) => (
                  <div 
                    key={cat._id + "homeGrid"} 
                    className='group cursor-pointer flex flex-col items-center' 
                    onClick={() => handleRedirectProductListpage(cat._id, cat.name)}
                  >
                    <div className='bg-blue-50 rounded-2xl p-2.5 w-full aspect-square flex items-center justify-center transition-all duration-300 active:scale-90 group-hover:bg-blue-100'>
                        <img 
                          src={cat.image} 
                          alt={cat.name} 
                          className='w-full h-full object-scale-down group-hover:scale-110 transition-transform duration-300' 
                        />
                    </div>
                    <p className='text-center text-[10px] lg:text-xs mt-1.5 font-bold text-slate-700 line-clamp-1'>{cat.name}</p>
                  </div>
                ))
              )
            }
        </div>
      </div>

      {/* 3. DYNAMIC PRODUCT SECTIONS - Removed Android Overflow Gaps */}
      <div className='flex flex-col gap-4 lg:gap-10 pb-24'>
        {
          !loadingCategory && prioritizedCategorySections.map((c) => (
            <div key={c?._id + "homeDisplay"} className='w-full border-b border-slate-50 last:border-0'>
                <CategoryWiseProductDisplay 
                  id={c?._id} 
                  name={c?.name}
                />
            </div>
          ))
        }
      </div>
    </section>
  )
}

export default Home