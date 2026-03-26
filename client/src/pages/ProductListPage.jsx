import React, { useEffect, useState } from 'react'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import { Link, useParams } from 'react-router-dom'
import AxiosToastError from '../utils/AxiosToastError'
import Loading from '../components/Loading'
import CardProduct from '../components/CardProduct'
import { useSelector } from 'react-redux'
import { valideURLConvert } from '../utils/valideURLConvert'

const ProductListPage = () => {
  const [data, setData] = useState([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [totalPage, setTotalPage] = useState(1)
  const params = useParams()
  const AllSubCategory = useSelector(state => state.product.allSubCategory)
  const [DisplaySubCatory, setDisplaySubCategory] = useState([])

  // FIXED: Improved extraction to ensure we only send valid IDs to the backend
  const categoryId = params.category ? params.category.split("-").pop() : null
  const subCategoryParam = params.subCategory ? params.subCategory.split("-").pop() : null
  
  const subCategory = params?.subCategory?.split("-")
  const subCategoryName = params?.subCategory === "all" ? "All Products" : subCategory?.slice(0, subCategory?.length - 1)?.join(" ")

  const fetchProductdata = async () => {
    // GUARD: Absolute check for 24-character hex string to avoid 400 errors
    if (!categoryId || categoryId.length !== 24) return;

    try {
      setLoading(true)
      
      // FIXED: Build the payload dynamically. 
      // If subCategory is "all", we DO NOT send subCategoryId at all.
      const requestPayload = {
        categoryId: categoryId,
        page: page,
        limit: 12,
      }

      if (subCategoryParam !== "all" && subCategoryParam?.length === 24) {
        requestPayload.subCategoryId = subCategoryParam
      }

      console.log("Snapit Request Payload:", requestPayload);

      const response = await Axios({
        ...SummaryApi.getProductByCategoryAndSubCategory,
        data: requestPayload
      })

      const { data: responseData } = response

      if (responseData.success) {
        if (responseData.page === 1) {
          setData(responseData.data)
        } else {
          setData([...data, ...responseData.data])
        }
        setTotalPage(responseData.totalCount)
      }
    } catch (error) {
      if(error.code !== "ERR_CANCELED") {
        AxiosToastError(error)
      }
    } finally {
      setLoading(false)
    }
  }

  // Reset page and data when switching categories/subcategories to avoid mixed lists
  useEffect(() => {
    setData([])
    setPage(1)
  }, [params.category, params.subCategory])

  useEffect(() => {
    fetchProductdata()
  }, [params.category, params.subCategory, page])


  useEffect(() => {
    if(!categoryId) return; 

    const sub = AllSubCategory.filter(s => {
      const filterData = s.category.some(el => {
        return el._id === categoryId
      })
      return filterData ? filterData : null
    })
    setDisplaySubCategory(sub)
  }, [params, AllSubCategory, categoryId])

  return (
    <section className='sticky top-24 lg:top-20'>
      <div className='container mx-auto grid grid-cols-[90px,1fr] md:grid-cols-[200px,1fr] lg:grid-cols-[280px,1fr]'>
        
        {/** sidebar **/}
        <div className='min-h-[88vh] max-h-[88vh] overflow-y-scroll grid gap-1 shadow-md scrollbarCustom bg-white py-2'>
          
          {/* All Products Option */}
          {
            DisplaySubCatory.length > 0 && (
              <Link 
                to={`/${valideURLConvert(params.category.split("-")[0])}-${categoryId}/all`}
                className={`w-full p-2 lg:flex items-center lg:w-full lg:h-16 box-border lg:gap-4 border-b 
                hover:bg-green-100 cursor-pointer transition-all
                ${subCategoryParam === 'all' ? "bg-green-100 border-r-4 border-green-600 font-bold" : ""}
              `}
              >
                <div className='hidden lg:flex w-fit max-w-28 mx-auto lg:mx-0 bg-white rounded box-border items-center justify-center h-14 w-12 border border-dashed border-neutral-300'>
                  <p className='text-[10px] font-bold text-neutral-500'>ALL</p>
                </div>
                <p className='text-xs text-center lg:text-left lg:text-base'>All Products</p>
              </Link>
            )
          }

          {
            DisplaySubCatory.map((s, index) => {
               const link = `/${valideURLConvert(s?.category[0]?.name)}-${s?.category[0]?._id}/${valideURLConvert(s.name)}-${s._id}`
              return (
                <Link 
                  key={s._id + "sidebar" + index}
                  to={link} 
                  className={`w-full p-2 lg:flex items-center lg:w-full lg:h-16 box-border lg:gap-4 border-b 
                  hover:bg-green-100 cursor-pointer transition-all
                  ${subCategoryParam === s._id ? "bg-green-100 border-r-4 border-green-600 font-bold" : ""}
                `}
                >
                  <div className='w-fit max-w-28 mx-auto lg:mx-0 bg-white rounded box-border' >
                    <img
                      src={s.image}
                      alt={s.name}
                      className='w-14 lg:h-14 lg:w-12 h-full object-scale-down'
                    />
                  </div>
                  <p className='text-xs text-center lg:text-left lg:text-base'>{s.name}</p>
                </Link>
              )
            })
          }
        </div>


        {/** Product Grid **/}
        <div className='min-h-[88vh] bg-white'>
          <div className='bg-white shadow-sm p-4 sticky top-0 z-10 border-b'>
            <h3 className='font-semibold text-lg text-neutral-800'>{subCategoryName}</h3>
          </div>
          
          <div className='min-h-[80vh] overflow-y-auto'>
            {
                data.length === 0 && !loading ? (
                    <div className='flex flex-col justify-center items-center h-[60vh] gap-2'>
                        <p className='text-lg text-neutral-400'>No products found in this category.</p>
                    </div>
                ) : (
                    <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 p-4 gap-4'>
                        {
                            data.map((p, index) => (
                                <CardProduct
                                    data={p}
                                    key={p._id + "product-list-" + index}
                                />
                            ))
                        }
                    </div>
                )
            }

            {loading && <Loading />}
          </div>
        </div>
      </div>
    </section>
  )
}

export default ProductListPage