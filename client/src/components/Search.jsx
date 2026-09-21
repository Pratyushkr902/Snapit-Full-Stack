import React, { useEffect, useState, useRef } from 'react'
import { IoSearch, IoClose, IoMic } from "react-icons/io5"
import { useLocation, useNavigate } from 'react-router-dom'
import { TypeAnimation } from 'react-type-animation'
import useMobile from '../hooks/useMobile'
import VoiceSearchModal from './VoiceSearchModal'

export const saveRecentSearch = (term) => {
  if (!term || typeof term !== 'string') return
  const clean = term.trim()
  if (!clean || clean.length < 2) return
  try {
    const raw = localStorage.getItem('snapit_recent_searches')
    const existing = raw ? JSON.parse(raw) : []
    const updated = [clean, ...existing.filter(item => item.toLowerCase() !== clean.toLowerCase())].slice(0, 8)
    localStorage.setItem('snapit_recent_searches', JSON.stringify(updated))
  } catch (err) {
    // ignore quota error
  }
}

const Search = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobile] = useMobile()

  // Derive isSearchPage directly from location
  const isSearchPage = location.pathname === "/search"
  const searchText = new URLSearchParams(location.search).get('q') || ''

  const [inputValue, setInputValue] = useState(searchText || '')
  const [openVoiceModal, setOpenVoiceModal] = useState(false)
  const debounceRef = useRef(null)

  // Sync input with URL param when navigating
  useEffect(() => {
    const q = new URLSearchParams(location.search).get('q') || ''
    setInputValue(q)
  }, [location.search])

  useEffect(() => {
    return () => clearTimeout(debounceRef.current)
  }, [])

  const handleOnChange = (e) => {
    const value = e.target.value
    setInputValue(value)

    clearTimeout(debounceRef.current)
    if (!value.trim()) {
      navigate('/search?q=', { replace: true })
      return
    }

    // Debounce query URL update to prevent flooding history and network
    debounceRef.current = setTimeout(() => {
      saveRecentSearch(value)
      navigate(`/search?q=${encodeURIComponent(value)}`, { replace: true })
    }, 250)
  }

  const handleClear = () => {
    clearTimeout(debounceRef.current)
    setInputValue('')
    navigate('/search?q=', { replace: true })
  }

  const handlePlaceholderClick = () => {
    navigate('/search')
  }

  return (
    <div className='relative w-full'>
      <div className='w-full h-11 lg:h-12 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center text-neutral-500 dark:text-neutral-400 bg-slate-50/80 dark:bg-slate-900/90 group focus-within:border-emerald-500 dark:focus-within:border-emerald-500 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:shadow-md transition-all'>

        {/* Left icon */}
        <div className='flex-shrink-0'>
          <button
            type='button'
            className='flex justify-center items-center h-full p-3 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 text-slate-500 dark:text-slate-400 cursor-pointer'
            onClick={!isSearchPage ? handlePlaceholderClick : undefined}
            tabIndex={!isSearchPage ? 0 : -1}
            aria-label="Search"
          >
            <IoSearch size={20} />
          </button>
        </div>

        {/* Input / Placeholder */}
        <div className='flex-1 min-w-0 h-full flex items-center pr-2'>
          {!isSearchPage ? (
            // Fake placeholder input (shown on home/other pages)
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
                className='text-sm text-slate-400 dark:text-slate-400 truncate'
              />
            </div>
          ) : (
            // Real input on /search page
            <input
              type='text'
              inputMode='search'
              enterKeyHint='search'
              placeholder='Search for atta, dal and more...'
              autoFocus
              value={inputValue}
              className='bg-transparent w-full h-full outline-none text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden'
              onChange={handleOnChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  clearTimeout(debounceRef.current)
                  e.target.blur()
                  saveRecentSearch(inputValue)
                  navigate(`/search?q=${encodeURIComponent(inputValue)}`, { replace: true })
                }
              }}
            />
          )}
        </div>

        {/* Custom Clear button */}
        {isSearchPage && inputValue && (
          <button
            type='button'
            onClick={handleClear}
            className='p-1.5 mr-1 text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-full transition-all flex-shrink-0 cursor-pointer'
            title='Clear search'
          >
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
          className='flex-shrink-0 mr-2 flex items-center justify-center bg-gradient-to-tr from-emerald-600 to-green-500 hover:from-emerald-700 hover:to-green-600 text-white p-2 rounded-xl shadow-md shadow-green-600/30 ring-2 ring-emerald-400/40 hover:scale-105 active:scale-95 transition-all cursor-pointer'
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
          clearTimeout(debounceRef.current)
          saveRecentSearch(query)
          setInputValue(query)
          navigate(`/search?q=${encodeURIComponent(query)}`, { replace: true })
        }}
      />
    </div>
  )
}

export default Search