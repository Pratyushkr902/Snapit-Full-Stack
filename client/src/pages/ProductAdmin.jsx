import React, { useEffect, useState } from 'react'
import SummaryApi from '../common/SummaryApi'
import AxiosToastError from '../utils/AxiosToastError'
import Axios from '../utils/Axios'
import Loading from '../components/Loading'
import ProductCardAdmin from '../components/ProductCardAdmin'
import { IoSearchOutline } from "react-icons/io5";
import { FaBoxOpen, FaExclamationTriangle } from "react-icons/fa"; // Added icons for stock alerts

const ProductAdmin = () => {
  const [productData,setProductData] = useState([])
  const [page,setPage] = useState(1)
  const [loading,setLoading] = useState(false)
  const [totalPageCount,setTotalPageCount] = useState(1)
  const [search,setSearch] = useState("")
  
  const fetchProductData = async()=>{
    try {
        setLoading(true)
        const response = await Axios({
           ...SummaryApi.getProduct,
           data : {
              page : page,
              limit : 12,
              search : search 
           }
        })

        const { data : responseData } = response 

        if(responseData.success){
          setTotalPageCount(responseData.totalNoPage || 1)
          setProductData(responseData.data)
        }

    } catch (error) {
      AxiosToastError(error)
    }finally{
      setLoading(false)
    }
  }
  
  useEffect(()=>{
    fetchProductData()
  },[page])

  const handleNext = ()=>{
    if(page !== totalPageCount){
      setPage(preve => preve + 1)
    }
  }
  const handlePrevious = ()=>{
    if(page > 1){
      setPage(preve => preve - 1)
    }
  }
  
  const handleOnChange = (e)=>{
    const { value } = e.target
    setSearch(value)
    setPage(1)
  }

  useEffect(()=>{
    // Debounce logic to prevent flickering search results
    const interval = setTimeout(() => {
      fetchProductData()
    }, 500);

    return ()=>{
      clearTimeout(interval)
    }
  },[search])

  const [stockFilter, setStockFilter] = useState('all') // 'all' | 'in_stock' | 'out_of_stock' | 'low_stock'

  // FEATURE: Calculate stock stats for the Seller
  const inStockCount = productData.filter(p => (Number(p.stock) || 0) > 0).length;
  const lowStockCount = productData.filter(p => {
    const s = Number(p.stock) || 0
    return s > 0 && s < 5
  }).length;
  const outOfStockCount = productData.filter(p => (Number(p.stock) || 0) <= 0).length;

  const displayedProducts = productData.filter(p => {
    const s = Number(p.stock) || 0
    if (stockFilter === 'out_of_stock') return s <= 0
    if (stockFilter === 'low_stock') return s > 0 && s < 5
    if (stockFilter === 'in_stock') return s > 0
    return true
  })
  
  return (
    <section className=''>
        <div className='p-4 bg-white shadow-md flex flex-col md:flex-row items-center justify-between gap-4'>
                <div>
                  <h2 className='font-black text-xl text-slate-800 tracking-tight'>Inventory & Products</h2>
                  <p className='text-xs text-slate-500'>Out-of-stock items are automatically hidden from regular customers</p>
                </div>

                <div className='flex items-center gap-3 w-full md:w-auto ml-auto'>
                  <div className='h-10 min-w-40 max-w-64 w-full bg-slate-50 px-3 flex items-center gap-2 rounded-xl border border-slate-200 focus-within:border-emerald-500 focus-within:bg-white transition-all'>
                    <IoSearchOutline size={18} className='text-slate-400'/>
                    <input
                      type='text'
                      placeholder='Search products...' 
                      className='h-full w-full outline-none bg-transparent text-xs font-semibold text-slate-700'
                      value={search}
                      onChange={handleOnChange}
                    />
                  </div>

                  <a
                    href='#/dashboard/upload-product'
                    className='bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 whitespace-nowrap'
                  >
                    <span>+</span> Add Product
                  </a>
                </div>
        </div>

        {/* Quick Filter Tabs */}
        <div className='px-4 pt-3 pb-1 bg-white border-b border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar'>
          <button
            type='button'
            onClick={() => setStockFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              stockFilter === 'all'
                ? 'bg-slate-900 text-white shadow'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            All Products ({productData.length})
          </button>

          <button
            type='button'
            onClick={() => setStockFilter('in_stock')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              stockFilter === 'in_stock'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
            }`}
          >
            <span>✅</span> In Stock ({inStockCount})
          </button>

          <button
            type='button'
            onClick={() => setStockFilter('out_of_stock')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              stockFilter === 'out_of_stock'
                ? 'bg-red-600 text-white shadow animate-pulse'
                : 'bg-red-50 hover:bg-red-100 text-red-700'
            }`}
          >
            <FaBoxOpen/> Out of Stock ({outOfStockCount})
          </button>

          <button
            type='button'
            onClick={() => setStockFilter('low_stock')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              stockFilter === 'low_stock'
                ? 'bg-amber-600 text-white shadow'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800'
            }`}
          >
            <FaExclamationTriangle/> Low Stock ({lowStockCount})
          </button>
        </div>

        {
          loading && (
            <Loading/>
          )
        }

        <div className='p-4 bg-blue-50'>
            <div className='min-h-[55vh]'>
              {displayedProducts.length === 0 ? (
                <div className='bg-white rounded-2xl p-10 text-center border border-dashed border-slate-200'>
                  <p className='text-3xl mb-2'>📦</p>
                  <p className='font-bold text-slate-700'>No products found in this filter</p>
                  <p className='text-xs text-slate-400 mt-1'>Try selecting another tab or clearing your search.</p>
                </div>
              ) : (
                <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4'>
                  {
                    displayedProducts.map((p,index)=>{
                      return(
                        <div key={p._id || index} className="relative">
                          <ProductCardAdmin 
                            data={p} 
                            fetchProductData={fetchProductData} 
                          />
                        </div>
                      )
                    })
                  }
                </div>
              )}
            </div>
            
            <div className='flex justify-between my-4'>
              <button 
                onClick={handlePrevious} 
                className="border border-primary-200 px-4 py-1 hover:bg-primary-200 disabled:opacity-50"
                disabled={page === 1}
              >
                Previous
              </button>
              <button className='w-full bg-slate-100 font-bold'>Page {page} of {totalPageCount}</button>
              <button 
                onClick={handleNext} 
                className="border border-primary-200 px-4 py-1 hover:bg-primary-200 disabled:opacity-50"
                disabled={page === totalPageCount}
              >
                Next
              </button>
            </div>
        </div>
    </section>
  )
}

export default ProductAdmin