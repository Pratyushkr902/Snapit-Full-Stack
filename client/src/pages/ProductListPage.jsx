import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import SummaryApi from '../common/SummaryApi'
import Axios from '../utils/Axios'
import AxiosToastError from '../utils/AxiosToastError'
import { FaChevronLeft } from "react-icons/fa6";
import CardProduct from '../components/CardProduct' // ✅ Ensure your product grid card is imported

const ProductListPage = () => {
  const params = useParams()
  const navigate = useNavigate()
  
  // Parse whichever route parameters are passed down through your app router structure
  const routeParam = params?.product || params?.id || params?.productId || params?.category || "";
  const categoryId = routeParam.includes("-") ? routeParam.split("-").slice(-1)[0] : routeParam;
  const subCategoryId = params?.subCategory || "";

  // ✅ FIX: Initialize state as an Array to securely map multiple inventory products
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchProductsList = useCallback(async () => {
    if (!categoryId || categoryId === "undefined" || categoryId.length < 12) {
      console.warn("[Snapit Guard] Aborted collection fetch: Category reference identifier is missing.");
      return;
    }

    try {
      setLoading(true)
      const response = await Axios({
        // Uses the standard cross-referencing category array controller endpoint
        ...SummaryApi.getProductsByCategoryOrSubCategory, 
        data: { 
          categoryId: categoryId,
          subCategoryId: subCategoryId 
        }
      })
      
      const { data: responseData } = response
      if (responseData.success) {
        // Guarantee payload maps to an array structure fallback safely
        setProducts(Array.isArray(responseData.data) ? responseData.data : [responseData.data])
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

  return (
    <section className='w-full bg-gradient-to-b from-white to-gray-50 min-h-[85vh] pb-24 lg:pb-10 animate-fadeIn relative'>
      
      {/* FILTER TOP HEADER BAR */}
      <div className='sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm'>
        <div className='container mx-auto px-4 py-3.5 flex items-center gap-4 w-full'>
          <button 
            onClick={() => navigate(-1)} 
            className='p-2.5 hover:bg-gray-50 active:scale-95 transition-all rounded-full text-gray-800 flex items-center justify-center border border-gray-100 bg-white shadow-sm'
          >
            <FaChevronLeft size={16} />
          </button>

          <div>
            <h1 className='text-sm font-black tracking-tight text-slate-900 uppercase select-none'>
              Store Catalog Shelf
            </h1>
            <p className='text-[11px] text-green-700 font-bold tracking-wide mt-0.5 uppercase'>
              {loading ? "Scanning items..." : `${products.length} Products Available`}
            </p>
          </div>
        </div>
      </div>

      <div className='container mx-auto p-4 lg:p-8 max-w-7xl mt-2'>
        {loading ? (
          /* SKELETON PLACEHOLDER LOADER GRID */
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
          /* EMPTY GRID FALLBACK BLOCK */
          <div className='flex flex-col items-center justify-center min-h-[45vh] bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm max-w-lg mx-auto mt-10'>
            <p className='text-3xl mb-2'>📦</p>
            <p className='text-slate-800 font-black text-sm tracking-wide uppercase text-center'>Shelf Segment Empty</p>
            <p className='text-xs text-gray-400 font-medium text-center mt-1'>Check back shortly! New inventory stocks land in 10 minutes.</p>
          </div>
        ) : (
          /* CORE LIVE PRODUCTS DISPLAY GRID */
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

export default ProductListPage;