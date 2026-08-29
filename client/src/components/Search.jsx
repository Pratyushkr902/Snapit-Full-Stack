import React, { useEffect, useState, useRef } from 'react'
import { IoSearch, IoClose, IoMic } from "react-icons/io5"
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { TypeAnimation } from 'react-type-animation'
import { FaArrowLeft } from "react-icons/fa"
import useMobile from '../hooks/useMobile'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import VoiceSearchModal from './VoiceSearchModal'

const POPULAR = ['Milk', 'Bread', 'Rice', 'Dal', 'Sugar', 'Paneer', 'Eggs', 'Atta', 'Oil', 'Maggi', 'Chips', 'Curd']

const Search = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobile] = useMobile()
  const params = useLocation()

  // ✅ FIX: derive isSearchPage directly from location — no useState needed
  const isSearchPage = location.pathname === "/search"

  const searchText = new URLSearchParams(params.search).get('q') || ''

  const [inputValue, setInputValue] = useState(searchText || '')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [openVoiceModal, setOpenVoiceModal] = useState(false)
  const debounceRef = useRef(null)
  const wrapperRef = useRef(null)

  // ✅ Sync input with URL param when navigating
  useEffect(() => {
    const q = new URLSearchParams(params.search).get('q') || ''
    setInputValue(q)
  }, [params.search])

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

  // ✅ FIX: clear any pending debounced fetch when component unmounts
  useEffect(() => {
    return () => clearTimeout(debounceRef.current)
  }, [])

  const fetchSuggestions = async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([])
      setShowSuggestions(true)
      return
    }
    try {
      setLoading(true)
      const response = await Axios({
        url: SummaryApi.searchProduct.url,
        method: SummaryApi.searchProduct.method,
        data: { search: query, page: 1, limit: 6 }
      })
      if (response.data.success) {
        const names = (response.data.data || [])
          .slice(0, 6)
          .map(p => ({
            name: p.name,
            image: Array.isArray(p.image) ? p.image[0] : p.image,
            _id: p._id
          }))
          .filter(p => p.name)
        setSuggestions(names)
        setShowSuggestions(true)
      }
    } catch (error) {
      console.error('Suggestion error', error)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  const handleOnChange = (e) => {
    const value = e.target.value
    setInputValue(value)
    setShowSuggestions(true)

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value)
    }, 300)

    navigate(`/search?q=${encodeURIComponent(value)}`)
  }

  const handleSuggestionClick = (name) => {
    clearTimeout(debounceRef.current) // ✅ FIX: cancel any pending suggestion fetch
    setInputValue(name)
    setShowSuggestions(false)
    navigate(`/search?q=${encodeURIComponent(name)}`)
  }

  const handleClear = () => {
    clearTimeout(debounceRef.current) // ✅ FIX: cancel any pending suggestion fetch
    setInputValue('')
    setSuggestions([])
    setShowSuggestions(false)
    navigate('/search?q=')
  }

  // ✅ FIX: clicking the placeholder navigates to /search
  const handlePlaceholderClick = () => {
    navigate('/search')
  }

  return (
    <div ref={wrapperRef} className='relative w-full'>
      <div className='w-full h-11 lg:h-12 rounded-2xl border border-slate-200 overflow-hidden flex items-center text-neutral-500 bg-slate-50/80 group focus-within:border-emerald-500 focus-within:bg-white focus-within:shadow-md transition-all'>

        {/* Left icon */}
        <div className='flex-shrink-0'>
          {isMobile && isSearchPage ? (
            <Link to="/" className='flex justify-center items-center h-full p-2 m-1 text-slate-700 hover:text-emerald-600 bg-white rounded-xl shadow-sm'>
              <FaArrowLeft size={16} />
            </Link>
          ) : (
            <button
              className='flex justify-center items-center h-full p-3 group-focus-within:text-emerald-600'
              onClick={!isSearchPage ? handlePlaceholderClick : undefined}
            >
              <IoSearch size={20} />
            </button>
          )}
        </div>

        {/* Input / Placeholder */}
        <div className='flex-1 min-w-0 h-full flex items-center pr-2'>
          {!isSearchPage ? (
            // ✅ FIX: entire area is clickable to go to /search
            <div
              onClick={handlePlaceholderClick}
              className='w-full h-full flex items-center cursor-pointer select-none'
            >
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
                className='text-sm text-slate-400 truncate'
              />
            </div>
          ) : (
            // ✅ Real input shown on /search page
            <input
              type='search' inputMode='search' enterKeyHint='search'
              placeholder='Search for atta, dal and more...'
              autoFocus
              value={inputValue}
              className='bg-transparent w-full h-full outline-none text-sm text-slate-800'
              onChange={handleOnChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  clearTimeout(debounceRef.current) // ✅ FIX: cancel any pending suggestion fetch
                  e.target.blur()
                  setShowSuggestions(false)
                  navigate(`/search?q=${encodeURIComponent(inputValue)}`)
                }
              }}
              onFocus={() => {
                if (inputValue.length >= 2) {
                  fetchSuggestions(inputValue)
                } else {
                  setShowSuggestions(true)
                }
              }}
            />
          )}
        </div>

        {/* Clear button */}
        {isSearchPage && inputValue && (
          <button onClick={handleClear} className='p-2 text-slate-400 hover:text-slate-600 flex-shrink-0'>
            <IoClose size={18} />
          </button>
        )}

        {/* Glowing Voice Search Mic Button */}
        <button
          type='button'
          onClick={(e) => {
            e.stopPropagation()
            setOpenVoiceModal(true)
          }}
          className='flex-shrink-0 mr-2 flex items-center justify-center bg-gradient-to-tr from-emerald-600 to-green-500 hover:from-emerald-700 hover:to-green-600 text-white p-2 rounded-xl shadow-md shadow-green-600/30 ring-2 ring-emerald-400/40 hover:scale-105 active:scale-95 transition-all'
          title='Voice Search (Hindi / English)'
        >
          <IoMic size={17} className='animate-pulse' />
        </button>
      </div>

      {/* Voice Search Modal */}
      <VoiceSearchModal
        isOpen={openVoiceModal}
        onClose={() => setOpenVoiceModal(false)}
        onSearch={(query) => {
          setInputValue(query)
          setShowSuggestions(false)
          navigate(`/search?q=${encodeURIComponent(query)}`)
        }}
      />

      {/* Suggestions dropdown */}
      {isSearchPage && showSuggestions && (
        <div className='absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden'>

          {loading && (
            <div className='px-4 py-3 text-xs text-slate-400 font-medium flex items-center gap-2'>
              <div className='w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin'></div>
              Searching...
            </div>
          )}

          {!loading && suggestions.length > 0 && (
            <div>
              <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 pt-3 pb-1'>Products</p>
              {suggestions.map((item, i) => (
                <button
                  key={item._id || i}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSuggestionClick(item.name)}
                  className='w-full flex items-center gap-3 px-4 py-2.5 hover:bg-green-50 transition-all text-left'
                >
                  {item.image && (
                    <img
                      src={item.image}
                      className='w-8 h-8 object-contain rounded-lg bg-slate-50 flex-shrink-0'
                      alt=''
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  )}
                  <span className='text-sm font-medium text-slate-700 line-clamp-1'>{item.name}</span>
                  <IoSearch size={12} className='ml-auto text-slate-300 flex-shrink-0' />
                </button>
              ))}
            </div>
          )}

          {!loading && suggestions.length === 0 && (
            <div className='p-4'>
              <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3'>Popular Searches</p>
              <div className='flex flex-wrap gap-2'>
                {POPULAR.map(item => (
                  <button
                    key={item}
                    onMouseDown={(e) => e.preventDefault()}
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