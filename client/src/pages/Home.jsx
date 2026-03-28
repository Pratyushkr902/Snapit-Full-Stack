import React from 'react'
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
      const subcategory = subCategoryData.find(sub =>{
        const filterData = sub.category.some(c => {
          return c._id == id
        })
        return filterData ? true : null
      })
      
      if(subcategory) {
        const url = `/${valideURLConvert(cat)}-${id}/${valideURLConvert(subcategory?.name)}-${subcategory?._id}`
        navigate(url)
      } else {
        navigate(`/category/${id}`)
      }
  }

  return (
   <section className='bg-white min-h-screen'>
      <div className='container mx-auto'>
          <HomeBanner />
      </div>
      
      {/* Category Icons Grid - Styled for Edge-to-Edge "Snapit" Look */}
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
                    {/* Image Container: No padding, object-cover for full bleed */}
                    <div className='w-full aspect-square rounded-xl overflow-hidden border border-slate-100 shadow-sm bg-white transition-all group-hover:shadow-md'>
                        <img 
                          src={cat.image}
                          alt={cat.name}
                          // object-cover makes the image touch all 4 edges perfectly
                          className='w-full h-full object-cover group-hover:scale-110 transition-transform duration-500'
                        />
                    </div>
                    {/* Category Label */}
                    <p className='text-center text-[10px] md:text-xs mt-1.5 font-bold text-slate-700 truncate px-1'>
                      {cat.name}
                    </p>
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