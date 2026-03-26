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

  // FEATURE: Calculate stock stats for the Seller
  const lowStockCount = productData.filter(p => p.stock > 0 && p.stock < 5).length;
  const outOfStockCount = productData.filter(p => p.stock <= 0).length;
  
  return (
    <section className=''>
        <div className='p-4 bg-white shadow-md flex flex-col md:flex-row items-center justify-between gap-4'>
                <div>
                  <h2 className='font-bold text-lg'>Inventory Management</h2>
                  <div className='flex gap-4 mt-1'>
                     {/* SELLER ALERTS */}
                     {outOfStockCount > 0 && (
                       <span className='text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded-full font-bold flex items-center gap-1'>
                         <FaBoxOpen/> {outOfStockCount} Out of Stock
                       </span>
                     )}
                     {lowStockCount > 0 && (
                       <span className='text-[10px] bg-orange-100 text-orange-600 px-2 py-1 rounded-full font-bold flex items-center gap-1'>
                         <FaExclamationTriangle/> {lowStockCount} Low Stock
                       </span>
                     )}
                  </div>
                </div>

                <div className='h-full min-w-24 max-w-56 w-full ml-auto bg-blue-50 px-4 flex items-center gap-3 py-2 rounded border focus-within:border-primary-200'>
                  <IoSearchOutline size={25}/>
                  <input
                    type='text'
                    placeholder='Search product here ...' 
                    className='h-full w-full outline-none bg-transparent'
                    value={search}
                    onChange={handleOnChange}
                  />
                </div>
        </div>

        {
          loading && (
            <Loading/>
          )
        }

        <div className='p-4 bg-blue-50'>
            <div className='min-h-[55vh]'>
              <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4'>
                {
                  productData.map((p,index)=>{
                    return(
                      <div key={p._id || index} className="relative">
                        {/* SELLER NOTIFICATION BADGE ON CARD */}
                        {p.stock <= 0 ? (
                          <div className="absolute top-2 left-2 z-10 bg-red-600 text-white text-[8px] font-black px-2 py-1 rounded shadow-md uppercase">
                            Out of Stock
                          </div>
                        ) : p.stock < 5 && (
                          <div className="absolute top-2 left-2 z-10 bg-orange-500 text-white text-[8px] font-black px-2 py-1 rounded shadow-md uppercase">
                            Low Stock: {p.stock}
                          </div>
                        )}
                        
                        <ProductCardAdmin 
                          data={p} 
                          fetchProductData={fetchProductData} 
                        />
                      </div>
                    )
                  })
                }
              </div>
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