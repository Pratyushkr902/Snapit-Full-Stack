import React, { useMemo } from 'react'
import HomeBanner from '../components/HomeBanner' 
// Removed FlashSaleBanner import
import { useSelector } from 'react-redux'
import { valideURLConvert } from '../utils/valideURLConvert'
import { useNavigate } from 'react-router-dom'
import CategoryWiseProductDisplay from '../components/categoryWiseProductDisplay'

const Home = () => {
  const loadingCategory = useSelector(state => state.product.loadingCategory)
  const categoryData = useSelector(state => state.product.allCategory)
  const subCategoryData = useSelector(state => state.product.allSubCategory)
  const navigate = useNavigate()

  // --- REFINED PRIORITIZATION: Staple Foods first ---
  const prioritizedCategorySections = useMemo(() => {
    if (!categoryData || !Array.isArray(categoryData) || categoryData.length === 0) return [];
    
    let data = [...categoryData];

    // Priority list: Essentials first, then everything else
    const priorityKeywords = ["atta", "masala", "oil", "dal"];

    data.sort((a, b) => {
      const aName = (a.name || "").toLowerCase();
      const bName = (b.name || "").toLowerCase();

      // Check if A or B is a priority item
      const aIsPriority = priorityKeywords.some(key => aName.includes(key));
      const bIsPriority = priorityKeywords.some(key => bName.includes(key));

      if (aIsPriority && !bIsPriority) return -1; // Move A up
      if (!aIsPriority && bIsPriority) return 1;  // Move B up
      return 0; // Keep relative order for others
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
    <section className='bg-white min-h-screen'>
      {/* 1. MAIN BANNER */}
      <div className='container mx-auto mb-2'>
          <HomeBanner />
      </div>

      {/* FLASH SALE REMOVED - Raising content higher */}
      
      {/* 2. CATEGORY GRID */}
      <div className='container mx-auto px-4 mt-4 mb-6 grid grid-cols-4 md:grid-cols-8 lg:grid-cols-10 gap-3 lg:gap-5'>
          {
            loadingCategory ? (
              new Array(12).fill(null).map((_, i) => (
                <div key={i+"load"} className='bg-slate-50 rounded-xl p-4 min-h-32 animate-pulse border border-slate-50'>
                   <div className='bg-slate-200 aspect-square rounded-lg mb-2'></div>
                   <div className='bg-slate-200 h-3 rounded w-3/4 mx-auto'></div>
                </div>
              ))
            ) : (
              categoryData?.map((cat) => (
                <div 
                  key={cat._id + "homeGrid"} 
                  className='group cursor-pointer' 
                  onClick={() => handleRedirectProductListpage(cat._id, cat.name)}
                >
                  <div className='bg-blue-50 rounded-2xl p-2.5 group-hover:bg-blue-100 transition-all duration-300'>
                      <img 
                        src={cat.image} 
                        alt={cat.name} 
                        className='w-full aspect-square object-scale-down group-hover:scale-110 transition-transform duration-300' 
                      />
                  </div>
                  <p className='text-center text-[10px] lg:text-xs mt-1.5 font-bold text-slate-700 line-clamp-1'>{cat.name}</p>
                </div>
              ))
            )
          }
      </div>

      {/* 3. DYNAMIC PRODUCT SECTIONS (Essentials at the top) */}
      <div className='grid gap-6 lg:gap-10 pb-24'>
        {
          !loadingCategory && prioritizedCategorySections.map((c) => (
            <CategoryWiseProductDisplay 
              key={c?._id + "homeDisplay"} 
              id={c?._id} 
              name={c?.name}
            />
          ))
        }
      </div>
    </section>
  )
}

export default Home