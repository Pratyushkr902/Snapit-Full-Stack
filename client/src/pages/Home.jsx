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
   <section className='bg-white min-h-screen pt-14 lg:pt-2'> 
      {/* FIXED: Added 'pt-14' to prevent the header/banner from hiding behind the iPhone notch.
          Added 'px-4' for Desktop alignment as requested.
      */}
      <div className='container mx-auto px-4 mt-2 lg:mt-4'>
          <HomeBanner />
      </div>
      
      {/* Category Icons Grid */}
      <div className='container mx-auto px-4 my-4 grid grid-cols-4 md:grid-cols-8 lg:grid-cols-10 gap-3'>
          {
            loadingCategory ? (
              new Array(12).fill(null).map((c,index)=>{
                return(
                  <div key={index+"loadingcategory"} className='bg-white rounded-xl p-0 min-h-36 grid gap-2 shadow animate-pulse overflow-hidden'>
                    <div className='bg-blue-50 aspect-square rounded-xl'></div>
                    <div className='bg-blue-50 h-4 mx-2 rounded'></div>
                  </div>
                )
              })
            ) : (
              categoryData.map((cat,index)=>{
                return(
                  <div 
                    key={cat._id+"displayCategory"} 
                    className='w-full h-full cursor-pointer group' 
                    onClick={()=>handleRedirectProductListpage(cat._id,cat.name)}
                  >
                    {/* UI Tweak: No padding and object-cover makes it touch the grid edges like Blinkit */}
                    <div className='bg-white rounded-xl border border-slate-100 overflow-hidden aspect-square shadow-sm transition-all group-hover:shadow-md'>
                        <img 
                          src={cat.image}
                          alt={cat.name}
                          className='w-full h-full object-cover group-hover:scale-110 transition-transform duration-500'
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