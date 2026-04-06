import React, { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom' // Added useParams
import AxiosToastError from '../utils/AxiosToastError'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import CardLoading from './CardLoading'
import CardProduct from './CardProduct'
import { FaAngleLeft, FaAngleRight } from "react-icons/fa6";
import { useSelector } from 'react-redux'
import { valideURLConvert } from '../utils/valideURLConvert'

const CategoryWiseProductDisplay = ({ id, name }) => {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(false)
    const containerRef = useRef()
    const params = useParams() // Get params to detect product changes
    
    // Extract current product ID from URL to exclude it from suggestions
    const currentProductId = params?.product?.split("-")?.slice(-1)[0]

    const subCategoryData = useSelector(state => state.product.allSubCategory)
    const loadingCardNumber = new Array(6).fill(null)

    const fetchCategoryWiseProduct = async () => {
        try {
            setLoading(true)
            const response = await Axios({
                ...SummaryApi.getProductByCategory,
                data: {
                    id: id
                }
            })

            const { data: responseData } = response

            if (responseData.success) {
                // OPTIMIZATION: Filter out the current product so it doesn't suggest itself
                const filteredData = responseData.data.filter(p => p._id !== currentProductId)
                setData(filteredData)
            }
        } catch (error) {
            AxiosToastError(error)
        } finally {
            setLoading(false)
        }
    }

    // FIX: Added 'id' and 'params' so it re-fetches when navigating between products
    useEffect(() => {
        fetchCategoryWiseProduct()
    }, [id, params])

    const handleScrollRight = () => {
        containerRef.current.scrollLeft += 250 // Increased for better UX
    }

    const handleScrollLeft = () => {
        containerRef.current.scrollLeft -= 250
    }

  const handleRedirectProductListpage = ()=>{
      const subcategory = subCategoryData.find(sub =>{
        const filterData = sub.category.some(c => {
          return c._id == id
        })

        return filterData ? true : null
      })
      const url = `/${valideURLConvert(name)}-${id}/${valideURLConvert(subcategory?.name)}-${subcategory?._id}`

      return url
  }

  const redirectURL =  handleRedirectProductListpage()
    return (
        <div className='my-4 lg:my-8'> {/* Added vertical spacing */}
            <div className='container mx-auto p-4 flex items-center justify-between gap-4'>
                <h3 className='font-bold text-lg md:text-2xl text-slate-800 dark:text-white'>{name}</h3>
                <Link to={redirectURL} className='text-green-600 font-bold hover:text-green-500 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full text-sm transition-all'>See All</Link>
            </div>
            <div className='relative flex items-center group'> {/* added group for hover effects */}
                <div className='flex gap-4 md:gap-6 lg:gap-8 container mx-auto px-4 overflow-x-scroll scrollbar-none scroll-smooth' ref={containerRef}>
                    {loading &&
                        loadingCardNumber.map((_, index) => {
                            return (
                                <CardLoading key={"CategorywiseProductDisplay123" + index} />
                            )
                        })
                    }

                    {!loading &&
                        data.map((p, index) => {
                            return (
                                <CardProduct
                                    data={p}
                                    key={p._id + "CategorywiseProductDisplay" + index}
                                />
                            )
                        })
                    }

                </div>
                
                {/* Optimized Buttons: Slightly larger hit area and hover scales */}
                <div className='w-full left-0 right-0 container mx-auto px-2 absolute hidden lg:flex justify-between pointer-events-none'>
                    <button 
                        onClick={handleScrollLeft} 
                        className='pointer-events-auto z-10 bg-white dark:bg-zinc-800 hover:scale-110 shadow-xl text-xl p-3 rounded-full transition-transform'
                    >
                        <FaAngleLeft className='dark:text-white' />
                    </button>
                    <button 
                        onClick={handleScrollRight} 
                        className='pointer-events-auto z-10 bg-white dark:bg-zinc-800 hover:scale-110 shadow-xl p-3 text-xl rounded-full transition-transform'
                    >
                        <FaAngleRight className='dark:text-white' />
                    </button>
                </div>
            </div>
        </div>
    )
}

export default CategoryWiseProductDisplay