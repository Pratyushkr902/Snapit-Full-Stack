
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import CardProduct from '../components/CardProduct'
import CardLoading from '../components/CardLoading'

const BACKEND_URL = import.meta.env.VITE_API_URL || "https://snapit-backend-bn8r.onrender.com"

const normalizeImageField = (image) => {
  if (Array.isArray(image)) {
    return image.map(img =>
      typeof img === 'string' && img.startsWith('/') ? `${BACKEND_URL}${img}` : img
    )
  }
  if (typeof image === 'string' && image.startsWith('/')) return `${BACKEND_URL}${image}`
  return image
}

const GroceryPage = () => {
  const navigate = useNavigate()
  const allCategory = useSelector(state => state.product.allCategory)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPage, setTotalPage] = useState(1)

  const groceryCategory = allCategory?.find(c => (c?.name || '').toLowerCase().includes('grocery'))

  useEffect(() => {
    if (groceryCategory?._id) fetchProducts(groceryCategory._id, 1)
    else if (allCategory?.length > 0) setLoading(false)
  }, [allCategory?.length])

  const fetchProducts = async (categoryId, pageNum) => {
    try {
      setLoading(true)
      const response = await Axios({ ...SummaryApi.getProductByCategory, data: { id: categoryId, page: pageNum, limit: 20 } })
      const { data: res } = response
      if (res.success && Array.isArray(res.data)) {
        const sanitized = res.data.map(p => ({ ...p, image: normalizeImageField(p.image) }))
        setProducts(prev => pageNum === 1 ? sanitized : [...prev, ...sanitized])
        setTotalPage(res.totalPage || 1)
        setPage(pageNum)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const filtered = products.filter(p => !search || (p?.name || '').toLowerCase().includes(search.toLowerCase()))

  return (
    <section className="bg-gray-50 min-h-screen pb-24">
      <div className="bg-white sticky top-0 z-20 px-4 pt-4 pb-3 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate('/')} className="p-2 rounded-full bg-gray-100 active:scale-95 transition shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-800">🛒 Grocery</h1>
            <p className="text-xs text-gray-400">Fresh & daily essentials</p>
          </div>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search grocery items..."
            className="w-full bg-gray-100 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-green-300" />
        </div>
      </div>

      <div className="px-4 pt-4">
        {loading && products.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {new Array(8).fill(null).map((_, i) => <CardLoading key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 gap-3 text-center">
            <span className="text-5xl">🛒</span>
            <p className="text-gray-500 font-medium">No products found</p>
            {search && <button onClick={() => setSearch('')} className="text-green-500 text-sm font-semibold">Clear search</button>}
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-3 font-medium">{filtered.length} product{filtered.length !== 1 ? 's' : ''}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map(p => p?._id && <CardProduct key={p._id} data={p} />)}
            </div>
            {page < totalPage && (
              <div className="flex justify-center mt-6">
                <button onClick={() => fetchProducts(groceryCategory._id, page + 1)} disabled={loading}
                  className="bg-green-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm active:scale-95 transition disabled:opacity-50">
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}

export default GroceryPage
ENDOFFILE