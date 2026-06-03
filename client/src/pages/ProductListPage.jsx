import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import SummaryApi from '../common/SummaryApi'
import Axios from '../utils/Axios'
import AxiosToastError from '../utils/AxiosToastError'
import { FaChevronLeft } from "react-icons/fa6"
import CardProduct from '../components/CardProduct'

const ProductListPage = () => {
  const params = useParams()
  const navigate = useNavigate()

  // Extract 24-char MongoDB ObjectId from the end of a URL slug
  // e.g. "snacks-munchies-69b57255a8b9adccd30c61cb" → "69b57255a8b9adccd30c61cb"
  const extractId = (param) => {
    if (!param) return ""
    const match = param.match(/[0-9a-fA-F]{24}$/)
    return match ? match[0] : ""
  }

  // Extract human-readable name from slug (everything before the last "-<id>")
  const extractName = (param) => {
    if (!param) return ""
    return param.replace(/-[0-9a-fA-F]{24}$/, '').replace(/-/g, ' ')
  }

  const categoryId    = extractId(params?.category    || "")
  const subCategoryId = extractId(params?.subCategory || "")
  const categoryName    = extractName(params?.category    || "")
  const subCategoryName = extractName(params?.subCategory || "")

  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(false)

  const pageTitle = subCategoryName || categoryName || "Products"

  const fetchProductsList = useCallback(async () => {
    if (!categoryId) {
      console.warn("[ProductListPage] No valid categoryId in URL:", params)
      return
    }

    try {
      setLoading(true)

      let response

      if (subCategoryId) {
        // ✅ FIX: both IDs present → use the combined endpoint
        response = await Axios({
          ...SummaryApi.getProductByCategoryAndSubCategory,
          data: {
            categoryId,
            subCategoryId,
            page: 1,
            limit: 60,
          }
        })
      } else {
        // ✅ FIX: no subCategory in URL → fall back to category-only endpoint
        // This is the path taken when "See All" has no matching subcategory
        response = await Axios({
          ...SummaryApi.getProductByCategory,
          data: {
            id: categoryId,
            page: 1,
            limit: 60,
          }
        })
      }

      const { data: responseData } = response
      if (responseData.success) {
        setProducts(Array.isArray(responseData.data) ? responseData.data : [])
      }
    } catch (error) {
      AxiosToastError(error)
    } finally {
      setLoading(false)
    }
  }, [categoryId, subCategoryId])

  useEffect(() => {
    fetchProductsList()
  }, [fetchProductsList])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [categoryId, subCategoryId])

  return (
    <section className='w-full bg-gradient-to-b from-white to-gray-50 min-h-[85vh] pb-24 lg:pb-10 animate-fadeIn relative'>
      <div className='sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm'>
        <div className='container mx-auto px-4 py-3.5 flex items-center gap-4 w-full'>
          <button
            onClick={() => navigate(-1)}
            className='p-2.5 hover:bg-gray-50 active:scale-95 transition-all rounded-full text-gray-800 flex items-center justify-center border border-gray-100 bg-white shadow-sm'
          >
            <FaChevronLeft size={16} />
          </button>
          <div>
            <h1 className='text-sm font-black tracking-tight text-slate-900 uppercase select-none capitalize'>
              {pageTitle}
            </h1>
            <p className='text-[11px] text-green-700 font-bold tracking-wide mt-0.5 uppercase'>
              {loading ? "Loading..." : `${products.length} Products Available`}
            </p>
          </div>
        </div>
      </div>

      <div className='container mx-auto p-4 lg:p-8 max-w-7xl mt-2'>
        {loading ? (
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4'>
            {[...Array(10)].map((_, index) => (
              <div key={index} className='bg-white h-64 w-full rounded-3xl border border-gray-100/70 shadow-sm animate-pulse p-4 space-y-4'>
                <div className='bg-slate-100 h-32 w-full rounded-2xl' />
                <div className='bg-slate-100 h-4 w-3/4 rounded-lg' />
                <div className='bg-slate-100 h-4 w-1/2 rounded-lg' />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className='flex flex-col items-center justify-center min-h-[45vh] bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm max-w-lg mx-auto mt-10'>
            <p className='text-3xl mb-2'>📦</p>
            <p className='text-slate-800 font-black text-sm tracking-wide uppercase text-center'>No Products Found</p>
            <p className='text-xs text-gray-400 font-medium text-center mt-1'>
              Check back shortly! New inventory stocks land in 10 minutes.
            </p>
            <button
              onClick={() => navigate('/')}
              className='mt-4 text-xs bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-full font-bold transition-colors'
            >
              Back to Home
            </button>
          </div>
        ) : (
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4'>
            {products.map((item) => (
              <CardProduct key={item._id || item.id} data={item} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default ProductListPage