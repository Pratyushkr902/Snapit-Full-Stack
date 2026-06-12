import React, { useEffect, useState } from 'react'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import CardProduct from '../components/CardProduct'
import CardLoading from '../components/CardLoading'
import AxiosToastError from '../utils/AxiosToastError'
import { useSelector } from 'react-redux'

const GroceryPage = () => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const allCategory = useSelector(state => state.product.allCategory)

  const fetchProducts = async (pageNum = 1) => {
    try {
      setLoading(true)
      const response = await Axios({
        ...SummaryApi.getProduct,
        data: { page: pageNum, limit: 20 }
      })
      const { data } = response
      if (data.success) {
        if (pageNum === 1) setProducts(data.data)
        else setProducts(prev => [...prev, ...data.data])
        setHasMore(data.data.length === 20)
      }
    } catch (error) {
      AxiosToastError(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProducts(1) }, [])

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    fetchProducts(next)
  }

  return (
    <section className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white px-4 py-4 shadow-sm sticky top-0 z-10">
        <h1 className="text-xl font-black text-slate-800">🛒 Grocery</h1>
        <p className="text-xs text-gray-400 mt-0.5">Fresh & daily essentials</p>
      </div>

      <div className="container mx-auto px-4 py-4">
        {loading && page === 1 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {new Array(8).fill(null).map((_, i) => <CardLoading key={i} />)}
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-3 font-medium">{products.length} products</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {products.map(p => p?._id && <CardProduct key={p._id} data={p} />)}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={loadMore}
                  disabled={loading}
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
