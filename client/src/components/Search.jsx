import React, { useEffect, useState, useRef } from 'react'
import { IoSearch, IoClose } from "react-icons/io5"
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { TypeAnimation } from 'react-type-animation'
import { FaArrowLeft } from "react-icons/fa"
import useMobile from '../hooks/useMobile'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'

const POPULAR = ['Milk', 'Bread', 'Rice', 'Dal', 'Sugar', 'Paneer', 'Eggs', 'Atta', 'Oil', 'Maggi', 'Chips', 'Curd']

const Search = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isSearchPage, setIsSearchPage] = useState(false)
  const [isMobile] = useMobile()
  const params = useLocation()
  const searchText = params.search.slice(3)
  const [inputValue, setInputValue] = useState(searchText || '')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)
  const wrapperRef = useRef(null)

  useEffect(() => {
    setIsSearchPage(location.pathname === "/search")
  }, [location])

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const fetchSuggestions = async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([])
      return
    }
    try {
      setLoading(true)
      const response = await Axios({
        ...SummaryApi.searchProduct,
        data: { search: query, page: 1 }
      })
      if (response.data.success) {
        // Get unique product names as suggestions
        const names = response.data.data
          .slice(0, 6)
          .map(p => ({ name: p.name, image: p.image?.[0], _id: p._id }))
        setSuggestions(names)
      }
    } catch (error) {
      console.error('Suggestion error', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOnChange = (e) => {
    const value = e.target.value
    setInputValue(value)
    setShowSuggestions(true)

    // Debounce API call
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value)
    }, 300)

    const url = `/search?q=${value}`
    navigate(url)
  }

  const handleSuggestionClick = (name) => {
    setInputValue(name)
    setShowSuggestions(false)
    navigate(`/search?q=${name}`)
  }

  const handleClear = () => {
    setInputValue('')
    setSuggestions([])
    navigate('/search?q=')
  }

  return (
    <div ref={wrapperRef} className='relative w-full'>
      <div className='w-full min-w-[300px] lg:min-w-[420px] h-11 lg:h-12 rounded-xl border overflow-hidden flex items-center text-neutral-500 bg-slate-50 group focus-within:border-green-400 focus-within:bg-white transition-all'>
        <div>
          {isMobile && isSearchPage ? (
            <Link to="/" className='flex justify-center items-center h-full p-2 m-1 group-focus-within:text-green-500 bg-white rounded-full shadow-md'>
              <FaArrowLeft size={18} />
            </Link>
          ) : (
            <button className='flex justify-center items-center h-full p-3 group-focus-within:text-green-500'>
              <IoSearch size={20} />
            </button>
          )}
        </div>

        <div className='w-full h-full flex items-center'>
          {!isSearchPage ? (
            <div onClick={() => navigate("/search")} className='w-full h-full flex items-center cursor-pointer'>
              <TypeAnimation
                sequence={[
                  'Search "milk"', 1000,
                  'Search "bread"', 1000,
                  'Search "sugar"', 1000,
                  'Search "paneer"', 1000,
                  'Search "chocolate"', 1000,
                  'Search "curd"', 1000,
                  'Search "rice"', 1000,
                  'Search "eggs"', 1000,
                  'Search "chips"', 1000,
                ]}
                wrapper="span"
                speed={50}
                repeat={Infinity}
                className='text-sm text-slate-400'
              />
            </div>
          ) : (
            <input
              type='text'
              placeholder='Search for atta, dal and more...'
              autoFocus
              value={inputValue}
              className='bg-transparent w-full h-full outline-none text-sm text-slate-800'
              onChange={handleOnChange}
              onFocus={() => inputValue.length >= 2 && setShowSuggestions(true)}
            />
          )}
        </div>

        {/* Clear button */}
        {isSearchPage && inputValue && (
          <button onClick={handleClear} className='p-2 mr-1 text-slate-400 hover:text-slate-600'>
            <IoClose size={18} />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isSearchPage && showSuggestions && (
        <div className='absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden'>

          {/* Product suggestions */}
          {suggestions.length > 0 && (
            <div>
              <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 pt-3 pb-1'>Products</p>
              {suggestions.map((item, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(item.name)}
                  className='w-full flex items-center gap-3 px-4 py-2.5 hover:bg-green-50 transition-all text-left'
                >
                  {item.image && (
                    <img src={item.image} className='w-8 h-8 object-contain rounded-lg bg-slate-50' alt='' />
                  )}
                  <span className='text-sm font-medium text-slate-700 line-clamp-1'>{item.name}</span>
                  <IoSearch size={12} className='ml-auto text-slate-300 flex-shrink-0' />
                </button>
              ))}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className='px-4 py-3 text-xs text-slate-400 font-medium'>Searching...</div>
          )}

          {/* Popular searches */}
          {!loading && suggestions.length === 0 && (
            <div className='p-4'>
              <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3'>Popular Searches</p>
              <div className='flex flex-wrap gap-2'>
                {POPULAR.map(item => (
                  <button
                    key={item}
                    onClick={() => handleSuggestionClick(item)}
                    className='text-xs font-bold bg-slate-100 hover:bg-green-100 hover:text-green-700 text-slate-600 px-3 py-1.5 rounded-full transition-all'
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Search