import React, { useEffect, useState, useRef } from 'react'
import CardLoading from '../components/CardLoading'
import SummaryApi from '../common/SummaryApi'
import Axios from '../utils/Axios'
import AxiosToastError from '../utils/AxiosToastError'
import CardProduct from '../components/CardProduct'
import InfiniteScroll from 'react-infinite-scroll-component'
import { useLocation } from 'react-router-dom'
import noDataImage from '../assets/empty_cart.webp'

const SearchPage = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const loadingArrayCard = new Array(10).fill(null)
  const [page, setPage] = useState(1)
  const [totalPage, setTotalPage] = useState(1)
  const params = useLocation()
  const searchText = new URLSearchParams(params.search).get('q') || new URLSearchParams(params.search).get('search') || ''

  // ✅ FIX 1: Reset page and data when search query changes
  const isFirstRender = useRef(true)
  const prevSearchText = useRef(searchText)

  useEffect(() => {
    if (prevSearchText.current !== searchText) {
      setPage(1)
      setData([])
      prevSearchText.current = searchText
    }
  }, [searchText])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await Axios({
        ...SummaryApi.searchProduct,
        data: {
          search: searchText,
          page: page,
          limit: 10, // ✅ FIX 3: Added limit
        }
      })

      const { data: responseData } = response

      if (responseData.success) {
        if (page === 1) {
          // ✅ FIX 1 continued: Use page state (not responseData.page) to reset
          setData(responseData.data)
        } else {
          setData((prev) => [...prev, ...responseData.data])
        }
        setTotalPage(responseData.totalPage)
      }
    } catch (error) {
      AxiosToastError(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [page, searchText])

  const handleFetchMore = () => {
    if (totalPage > page) {
      setPage(prev => prev + 1)
    }
  }

  return (
    <section className='bg-white'>
      <div className='container mx-auto p-4'>
        <p className='font-semibold'>Search Results: {data.length}</p>

        <InfiniteScroll
          dataLength={data.length}
          hasMore={page < totalPage} // ✅ FIX 2: was always `true`
          next={handleFetchMore}
          loader={null}
        >
          <div className='grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 py-4 gap-2'>
            {data.map((p, index) => (
              <CardProduct data={p} key={p?._id + "searchProduct" + index} />
            ))}

            {/* Loading skeletons */}
            {loading && loadingArrayCard.map((_, index) => (
              <CardLoading key={"loadingsearchpage" + index} />
            ))}
          </div>
        </InfiniteScroll>

        {/* No data state */}
        {!data[0] && !loading && (
          <div className='flex flex-col justify-center items-center w-full mx-auto'>
            <img
              src={noDataImage}
              className='w-full h-full max-w-xs max-h-xs block'
              alt='No results found'
            />
            <p className='font-semibold my-2'>No Data found</p>
          </div>
        )}
      </div>
    </section>
  )
}

export default SearchPage