import React from 'react'
// STEP 1: Import the new sliding banner component instead of the static jpg
import HomeBanner from '../components/HomeBanner' 
import { useSelector } from 'react-redux'
import { valideURLConvert } from '../utils/valideURLConvert'
import {Link, useNavigate} from 'react-router-dom'
import CategoryWiseProductDisplay from '../components/categoryWiseProductDisplay'

const Home = () => {
  const loadingCategory = useSelector(state => state.product.loadingCategory)
  const categoryData = useSelector(state => state.product.allCategory)
  const subCategoryData = useSelector(state => state.product.allSubCategory)
  const navigate = useNavigate()

  const handleRedirectProductListpage = (id,cat)=>{
      console.log(id,cat)
      const subcategory = subCategoryData.find(sub =>{
        const filterData = sub.category.some(c => {
          return c._id == id
        })

        return filterData ? true : null
      })
      
      // Safety check to prevent crash if subcategory isn't found
      if(subcategory) {
        const url = `/${valideURLConvert(cat)}-${id}/${valideURLConvert(subcategory?.name)}-${subcategory?._id}`
        navigate(url)
      } else {
        // Fallback if no subcategory exists yet
        navigate(`/category/${id}`)
      }
  }

  return (
   <section className='bg-white min-h-screen'>
      {/* FIXED: Added px-4 so the banner aligns with the tiles on Desktop */}
      <div className='container mx-auto px-4 mt-2 lg:mt-4'>
          <HomeBanner />
      </div>
      
      {/* Category Icons Grid */}
      <div className='container mx-auto px-4 my-4 grid grid-cols-4 md:grid-cols-8 lg:grid-cols-10 gap-3'>
          {
            loadingCategory ? (
              new Array(12).fill(null).map((c,index)=>{
                return(
                  <div key={index+"loadingcategory"} className='bg-white rounded p-4 min-h-36 grid gap-2 shadow animate-pulse'>
                    <div className='bg-blue-100 min-h-24 rounded'></div>
                    <div className='bg-blue-100 h-8 rounded'></div>
                  </div>
                )
              })
            ) : (
              categoryData.map((cat,index)=>{
                return(
                  <div 
                    key={cat._id+"displayCategory"} 
                    className='w-full h-full cursor-pointer hover:scale-105 transition-transform' 
                    onClick={()=>handleRedirectProductListpage(cat._id,cat.name)}
                  >
                    {/* UI Tweak: Removing p-2 and bg-blue-50 makes it touch the grid edges better */}
                    <div className='bg-white rounded-xl border border-slate-100 overflow-hidden aspect-square shadow-sm'>
                        <img 
                          src={cat.image}
                          alt={cat.name}
                          // Changed to object-cover for that professional "Snapit" look
                          className='w-full h-full object-cover'
                        />
                    </div>
                    <p className='text-center text-[10px] md:text-xs mt-1.5 font-bold text-slate-700 truncate px-1'>{cat.name}</p>
                  </div>
                )
              })
            )
          }
      </div>

      {/*** Display category product sections ***/}
      <div className='grid gap-6 pb-20'>
        {
          categoryData?.map((c,index)=>{
            return(
              <CategoryWiseProductDisplay 
                key={c?._id+"CategorywiseProduct"} 
                id={c?._id} 
                name={c?.name}
              />
            )
          })
        }
      </div>
   </section>
  )
}

export default Home