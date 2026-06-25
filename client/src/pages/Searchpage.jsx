import React, { useEffect, useState, useRef, useCallback } from 'react'
import CardLoading from '../components/CardLoading'
import SummaryApi from '../common/SummaryApi'
import Axios from '../utils/Axios'
import AxiosToastError from '../utils/AxiosToastError'
import CardProduct from '../components/CardProduct'
import InfiniteScroll from 'react-infinite-scroll-component'
import { useLocation } from 'react-router-dom'
import noDataImage from '../assets/empty_cart.webp'

const LOADING_CARDS = new Array(10).fill(null)

const SearchPage = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPage, setTotalPage] = useState(1)
  const params = useLocation()
  const searchText =
    new URLSearchParams(params.search).get('q') ||
    new URLSearchParams(params.search).get('search') ||
    ''

  const prevSearchText = useRef(searchText)

  useEffect(() => {
    if (prevSearchText.current !== searchText) {
      setPage(1)
      setData([])
      prevSearchText.current = searchText
    }
  }, [searchText])

  const fetchData = useCallback(async () => {
    const controller = new AbortController()
    try {
      setLoading(true)
      const response = await Axios({
        ...SummaryApi.searchProduct,
        signal: controller.signal,
        data: { search: searchText, page, limit: 10 },
      })
      const { data: responseData } = response
      if (responseData.success) {
        setData(prev => page === 1 ? responseData.data : [...prev, ...responseData.data])
        setTotalPage(responseData.totalPage)
      }
    } catch (error) {
      if (error.name !== 'CanceledError') AxiosToastError(error)
    } finally {
      setLoading(false)
    }
    return () => controller.abort()
  }, [page, searchText])

  useEffect(() => {
    const cleanup = fetchData()
    return cleanup
  }, [fetchData])

  const handleFetchMore = () => {
    if (totalPage > page) setPage(prev => prev + 1)
  }

  return (
    <section className='bg-white'>
      <div className='container mx-auto p-4'>
        <p className='font-semibold'>Search Results: {data.length}</p>
        <InfiniteScroll
          dataLength={data.length}
          hasMore={page < totalPage}
          next={handleFetchMore}
          loader={null}
        >
          <div className='grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 py-4 gap-2'>
            {data.map((p, index) => (
              <CardProduct data={p} key={p?._id + 'searchProduct' + index} />
            ))}
            {loading && LOADING_CARDS.map((_, index) => (
              <CardLoading key={'loadingsearchpage' + index} />
            ))}
          </div>
        </InfiniteScroll>
        {!data[0] && !loading && (
          <div className='flex flex-col justify-center items-center w-full mx-auto'>
            <img src={noDataImage} className='w-full h-full max-w-xs max-h-xs block' alt='No results found' />
            <p className='font-semibold my-2'>No Data found</p>
          </div>
        )}
      </div>
    </section>
  )
}

export default SearchPage