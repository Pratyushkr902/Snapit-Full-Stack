import React from 'react'
import HomeBanner from '../components/HomeBanner' 
import FlashSaleBanner from '../components/FlashSaleBanner' // IMPORTED
import { useSelector } from 'react-redux'
import { valideURLConvert } from '../utils/valideURLConvert'
import { useNavigate } from 'react-router-dom'
import CategoryWiseProductDisplay from '../components/categoryWiseProductDisplay'

const Home = () => {
  const loadingCategory = useSelector(state => state.product.loadingCategory)
  const categoryData = useSelector(state => state.product.allCategory)
  const subCategoryData = useSelector(state => state.product.allSubCategory)
  const navigate = useNavigate()

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
      {/* MAIN PROMOTIONAL SLIDER */}
      <div className='container mx-auto'>
          <HomeBanner />
      </div>

      {/* FLASH SALE SYSTEM: Urgency Banner for Midnight/Student Deals */}
      <div className='container mx-auto px-4'>
          <FlashSaleBanner />
      </div>
      
      {/* CATEGORY ICON GRID: Optimized for high-density mobile view */}
      <div className='container mx-auto px-4 my-6 grid grid-cols-4 md:grid-cols-8 lg:grid-cols-10 gap-4'>
          {
            loadingCategory ? (
              new Array(12).fill(null).map((_, index) => (
                <div key={index + "loadingcategory"} className='bg-slate-50 rounded-xl p-4 min-h-36 grid gap-2 shadow-sm animate-pulse'>
                  <div className='bg-slate-200 min-h-24 rounded-lg'></div>
                  <div className='bg-slate-200 h-6 rounded w-3/4 mx-auto'></div>
                </div>
              ))
            ) : (
              categoryData.map((cat) => (
                <div 
                  key={cat._id + "displayCategory"} 
                  className='group w-full h-full cursor-pointer' 
                  onClick={() => handleRedirectProductListpage(cat._id, cat.name)}
                >
                  <div className='bg-blue-50 rounded-2xl p-3 group-hover:bg-blue-100 group-hover:shadow-md transition-all duration-300'>
                      <img 
                        src={cat.image}
                        alt={cat.name}
                        className='w-full h-full object-scale-down aspect-square group-hover:scale-110 transition-transform duration-300'
                      />
                  </div>
                  <p className='text-center text-[11px] lg:text-xs mt-2 font-bold text-slate-700 line-clamp-1'>{cat.name}</p>
                </div>
              ))
            )
          }
      </div>

      {/* DYNAMIC PRODUCT SECTIONS: Organized by Category */}
      <div className='grid gap-8 pb-24'>
        {
          categoryData?.map((c) => (
            <CategoryWiseProductDisplay 
              key={c?._id + "CategorywiseProduct"} 
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