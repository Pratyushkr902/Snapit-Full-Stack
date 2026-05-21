import React, { useEffect, useState } from 'react'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import { Link, useParams, useNavigate } from 'react-router-dom'
import AxiosToastError from '../utils/AxiosToastError'
import Loading from '../components/Loading'
import CardProduct from '../components/CardProduct'
import { useSelector } from 'react-redux'
import { valideURLConvert } from '../utils/valideURLConvert'
// ✅ FIXED: Swapped lucide-react out for your working pre-configured react-icons library
import { FiSearch } from "react-icons/fi";
import { FaGridHorizontal, FaList, FaFilter, FaXmark } from "react-icons/fa6";

const ProductListPage = () => {
  const [data, setData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [totalPage, setTotalPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('default')
  const [showFilters, setShowFilters] = useState(false)
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 })
  
  const params = useParams()
  const navigate = useNavigate()
  const AllSubCategory = useSelector(state => state.product.allSubCategory)
  const [DisplaySubCatory, setDisplaySubCategory] = useState([])

  const BACKEND_URL = "https://snapit-full-stack-2.onrender.com"

  const categoryId = params.category ? params.category.split("-").pop() : null
  const subCategoryParam = params.subCategory ? params.subCategory.split("-").pop() : null
  
  const subCategory = params?.subCategory?.split("-")
  const subCategoryName = params?.subCategory === "all" ? "All Products" : subCategory?.slice(0, subCategory?.length - 1)?.join(" ")

  const fetchProductdata = async () => {
    if (!categoryId || categoryId.length !== 24) return;

    try {
      setLoading(true)
      
      const requestPayload = {
        categoryId: categoryId,
        page: page,
        limit: 12,
      }

      if (subCategoryParam !== "all" && subCategoryParam?.length === 24) {
        requestPayload.subCategoryId = subCategoryParam
      }

      const response = await Axios({
        ...SummaryApi.getProductByCategoryAndSubCategory,
        data: requestPayload
      })

      const { data: responseData } = response

      if (responseData.success) {
        if (responseData.page === 1) {
          setData(responseData.data)
          setFilteredData(responseData.data)
        } else {
          const newData = [...data, ...responseData.data]
          setData(newData)
          setFilteredData(newData)
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

  // Advanced Search & Filter System Loop Interceptor
  useEffect(() => {
    let result = [...data]

    // Search query normalizer matching criteria
    if (searchQuery) {
      result = result.filter(product => 
        product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Explicit price bounds parameters evaluation
    result = result.filter(product => {
      const price = product.price || 0
      return price >= priceRange.min && price <= priceRange.max
    })

    // Functional mathematical sort mapping rules matrix
    switch(sortBy) {
      case 'price-low':
        result.sort((a, b) => (a.price || 0) - (b.price || 0))
        break
      case 'price-high':
        result.sort((a, b) => (b.price || 0) - (a.price || 0))
        break
      case 'name-az':
        result.sort((a, b) => a.name?.localeCompare(b.name))
        break
      case 'name-za':
        result.sort((a, b) => b.name?.localeCompare(a.name))
        break
      default:
        break
    }

    setFilteredData(result)
  }, [searchQuery, data, sortBy, priceRange])

  useEffect(() => {
    setData([])
    setFilteredData([])
    setPage(1)
    setSearchQuery('')
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

  const handleLoadMore = () => {
    if (page < totalPage) {
      setPage(page + 1)
    }
  }

  return (
    <section className='sticky top-24 lg:top-20 animate-fadeIn'>
      <div className='container mx-auto grid grid-cols-[90px,1fr] md:grid-cols-[200px,1fr] lg:grid-cols-[280px,1fr]'>
        
        {/** Sidebar Navigation */}
        <div className='min-h-[88vh] max-h-[88vh] overflow-y-scroll grid gap-1 shadow-md scrollbarCustom bg-white py-2'>
          
          {/* All Products Option Option Wrapper */}
          {
            DisplaySubCatory.length > 0 && (
              <Link 
                to={`/${valideURLConvert(params.category.split("-")[0])}-${categoryId}/all`}
                className={`w-full p-2 lg:flex items-center lg:w-full lg:h-16 box-border lg:gap-4 border-b 
                hover:bg-green-50 cursor-pointer transition-all duration-200
                ${subCategoryParam === 'all' ? "bg-green-100 border-r-4 border-green-600 font-bold" : ""}
              `}
              >
                <div className='hidden lg:flex w-fit max-w-28 mx-auto lg:mx-0 bg-gradient-to-br from-green-50 to-green-100 rounded-lg box-border items-center justify-center h-14 w-12 border border-green-200'>
                  <p className='text-xs font-bold text-green-700'>ALL</p>
                </div>
                <p className='text-xs text-center lg:text-left lg:text-base font-medium'>All Products</p>
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
                  hover:bg-green-50 cursor-pointer transition-all duration-200 group
                  ${subCategoryParam === s._id ? "bg-green-100 border-r-4 border-green-600 font-bold" : ""}
                `}
                >
                  <div className='w-fit max-w-28 mx-auto lg:mx-0 bg-white rounded-lg box-border p-1 group-hover:scale-105 transition-transform' >
                    <img
                      src={
                        s?.image && typeof s.image === 'string' && s.image.startsWith('http') 
                          ? s.image.replace('http://', 'https://') 
                          : `${BACKEND_URL}${s?.image || ''}`
                      }
                      alt={s.name}
                      className='w-14 lg:h-14 lg:w-12 h-full object-scale-down'
                      onError={(e) => {
                        e.target.src = "https://placehold.co/150?text=Snapit";
                      }}
                    />
                  </div>
                  <p className='text-xs text-center lg:text-left lg:text-base font-medium'>{s.name}</p>
                </Link>
              )
            })
          }
        </div>

        {/** Product Matrix Container Area */}
        <div className='min-h-[88vh] bg-gray-50/50'>
          
          {/* Advanced Filtering Control Bar Ribbon */}
          <div className='bg-white shadow-sm sticky top-0 z-10 border-b border-gray-100'>
            <div className='p-4'>
              <div className='flex items-center justify-between mb-3'>
                <h3 className='font-black text-xl text-slate-800 tracking-tight'>{subCategoryName}</h3>
                <div className='flex items-center gap-2'>
                  
                  {/* View Layout Modifier Controller Switches */}
                  <div className='hidden md:flex border border-gray-200 rounded-xl overflow-hidden p-0.5 bg-gray-50'>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      <FaGridHorizontal className='w-4 h-4' />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      <FaList className='w-4 h-4' />
                    </button>
                  </div>
                  
                  {/* Filter Overlay Opener Button */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-2 border rounded-xl transition-all font-semibold text-sm ${showFilters ? 'bg-green-50 border-green-200 text-green-700 shadow-sm' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                  >
                    <FaFilter className='w-4 h-4' />
                    <span>Filters</span>
                  </button>
                </div>
              </div>

              {/* Enhanced Interactive Search Bar Overlay Component Layout */}
              <div className='relative mb-3'>
                <FiSearch className='absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                <input
                  type='text'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search inside ${subCategoryName}...`}
                  className='w-full pl-11 pr-10 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all text-sm font-medium text-slate-700'
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600'
                  >
                    <FaXmark className='w-4 h-4' />
                  </button>
                )}
              </div>

              {/* Dynamic Collapsible Filter Parameters Console Panel */}
              {showFilters && (
                <div className='bg-gray-50/70 p-4 rounded-xl border border-gray-100 mb-3 animate-fadeIn'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    {/* Sorting Rules Definition */}
                    <div>
                      <label className='block text-xs font-black text-gray-500 uppercase tracking-wider mb-2'>Sort Array By</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className='w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-medium text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500'
                      >
                        <option value='default'>Default Matching</option>
                        <option value='price-low'>Price: Low to High</option>
                        <option value='price-high'>Price: High to Low</option>
                        <option value='name-az'>Name: A to Z</option>
                        <option value='name-za'>Name: Z to A</option>
                      </select>
                    </div>

                    {/* Numeric Bounds Pricing Fields Mapping */}
                    <div>
                      <label className='block text-xs font-black text-gray-500 uppercase tracking-wider mb-2'>
                        Price Range Matrix (₹{priceRange.min} - ₹{priceRange.max})
                      </label>
                      <div className='flex gap-2'>
                        <input
                          type='number'
                          value={priceRange.min}
                          onChange={(e) => setPriceRange({...priceRange, min: Number(e.target.value)})}
                          placeholder='Min Price'
                          className='w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-medium text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500'
                        />
                        <input
                          type='number'
                          value={priceRange.max}
                          onChange={(e) => setPriceRange({...priceRange, max: Number(e.target.value)})}
                          placeholder='Max Price'
                          className='w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-medium text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500'
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Search Diagnostics Statistics Mappings Strip */}
              <div className='flex items-center justify-between text-xs font-semibold text-gray-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100'>
                <span>Found {filteredData.length} items catalogued</span>
                {searchQuery && (
                  <span className='text-green-600 font-bold'>Filtering query: \"{searchQuery}\"</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Main Grid View Loop Display Layer Mapping Segment */}
          <div className='min-h-[80vh] overflow-y-auto'>
            {
                filteredData.length === 0 && !loading ? (
                    <div className='flex flex-col justify-center items-center h-[55vh] gap-3 bg-white m-4 rounded-3xl border border-gray-100 shadow-sm'>
                        <div className='text-5xl animate-pulse'>🔍</div>
                        <p className='text-base font-bold text-neutral-400 tracking-tight'>No matching items match your search criteria</p>
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className='px-6 py-2 bg-green-600 text-white font-bold text-xs uppercase tracking-wide rounded-xl shadow-lg shadow-green-600/20 active:scale-95 transition-all'
                          >
                            Clear Search Input
                          </button>
                        )}
                    </div>
                ) : (
                    <>
                      {/* Enforced grid styles layout execution loop parameters structure on ultra-small mobile screen sizes viewports */}
                      <div className={`p-4 ${
                        viewMode === 'grid' 
                          ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' 
                          : 'grid grid-cols-1 md:flex md:flex-col gap-4 md:gap-3'
                      }`}>
                        {
                            filteredData.map((p, index) => (
                                <CardProduct
                                    data={p}
                                    key={p._id + "product-list-" + index}
                                    viewMode={viewMode}
                                />
                            ))
                        }
                      </div>

                      {/* Infinite Load Pagination Actions Control Trigger Strip */}
                      {page < totalPage && !loading && (
                        <div className='flex justify-center py-8'>
                          <button
                            onClick={handleLoadMore}
                            className='px-10 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-95'
                          >
                            Load More Items
                          </button>
                        </div>
                      )}
                    </>
                )
            }

            {loading && (
              <div className='py-12'>
                <Loading />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default ProductListPage;