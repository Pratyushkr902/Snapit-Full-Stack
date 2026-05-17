import React, { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AxiosToastError from '../utils/AxiosToastError'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import CardLoading from './CardLoading'
import CardProduct from './CardProduct'
import { FaAngleLeft, FaAngleRight } from "react-icons/fa6"
import { useSelector } from 'react-redux'
import { valideURLConvert } from '../utils/valideURLConvert'

// ─── FIXED: Premature skeleton flash ─────────────────────────────────────────
//     Before: showed placeholder skeletons for ALL sections simultaneously at
//     page load (before IntersectionObserver fired), causing a wall of grey.
//     After: renders nothing until the section enters viewport, then shows
//     the loading skeletons only for that specific section.
//
// ─── IMPROVED: Section header uses lighter font weight (Zepto style) ─────────

const CARD_MIN_WIDTH = 'min-w-[148px] md:min-w-[185px] lg:min-w-[215px]'

const CategoryWiseProductDisplay = ({ id, name }) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  const containerRef = useRef()
  const sectionRef = useRef()
  const params = useParams()

  const currentProductId = params?.product?.split("-")?.slice(-1)[0]
  const subCategoryData = useSelector(state => state.product.allSubCategory)
  const loadingCardNumber = new Array(6).fill(null)

  // Intersection Observer — lazy load trigger
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '250px' }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  const fetchCategoryWiseProduct = async () => {
    try {
      setLoading(true)
      const response = await Axios({
        ...SummaryApi.getProductByCategory,
        data: { id }
      })
      const { data: responseData } = response
      if (responseData.success) {
        const filteredData = responseData.data.filter(p => p._id !== currentProductId)
        setData(filteredData)
      }
    } catch (error) {
      AxiosToastError(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (visible) fetchCategoryWiseProduct()
  }, [visible, id])

  const scroll = (dir) => {
    if (containerRef.current) {
      containerRef.current.scrollLeft += dir === 'right' ? 280 : -280
    }
  }

  const getRedirectURL = () => {
    const subcategory = subCategoryData.find(sub =>
      sub.category.some(c => c._id == id)
    )
    return `/${valideURLConvert(name)}-${id}/${valideURLConvert(subcategory?.name)}-${subcategory?._id}`
  }

  // ─── FIXED: Don't render anything until the section is near viewport ──────
  // This prevents every section from showing skeleton placeholders simultaneously
  // at page load, which made the page feel broken and slow.
  const showSkeletons = visible && loading
  const showProducts = visible && !loading && data.length > 0
  const isEmpty = visible && !loading && data.length === 0

  // Before visible: reserve vertical space with a slim placeholder
  // (prevents layout shift when content loads)
  if (!visible) {
    return (
      <div ref={sectionRef} className='my-4 lg:my-6 h-64 lg:h-72' aria-hidden="true" />
    )
  }

  if (isEmpty) return null

  return (
    <div className='my-4 lg:my-6' ref={sectionRef}>
      {/* Section header */}
      <div className='container mx-auto px-4 flex items-center justify-between gap-4 mb-3'>
        {/* ─── IMPROVED: font-semibold instead of font-black (Zepto = refined) */}
        <h3 className='font-semibold text-base md:text-lg text-slate-800'>{name}</h3>
        <Link
          to={getRedirectURL()}
          className='text-green-600 font-semibold hover:text-green-700 text-sm transition-colors'
        >
          See all →
        </Link>
      </div>

      {/* Scroll row */}
      <div className='relative flex items-center'>
        <div
          className='flex gap-3 container mx-auto px-4 overflow-x-auto scrollbar-none scroll-smooth'
          ref={containerRef}
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {/* Loading skeletons — only shown after section enters viewport */}
          {showSkeletons && loadingCardNumber.map((_, i) => (
            <div key={"ld" + i} className={CARD_MIN_WIDTH} style={{ scrollSnapAlign: 'start' }}>
              <CardLoading />
            </div>
          ))}

          {/* Products */}
          {showProducts && data.map((p, i) => (
            <div
              key={p._id + "cat" + i}
              className={CARD_MIN_WIDTH}
              style={{ scrollSnapAlign: 'start' }}
            >
              <CardProduct data={p} />
            </div>
          ))}
        </div>

        {/* Desktop scroll arrows */}
        <div className='w-full left-0 right-0 container mx-auto px-2 absolute hidden lg:flex justify-between pointer-events-none'>
          <button
            onClick={() => scroll('left')}
            className='pointer-events-auto z-10 bg-white hover:bg-slate-50 shadow-xl border border-slate-100 text-slate-700 p-3 rounded-full transition-all hover:scale-110 active:scale-95'
            aria-label="Scroll left"
          >
            <FaAngleLeft size={15} />
          </button>
          <button
            onClick={() => scroll('right')}
            className='pointer-events-auto z-10 bg-white hover:bg-slate-50 shadow-xl border border-slate-100 text-slate-700 p-3 rounded-full transition-all hover:scale-110 active:scale-95'
            aria-label="Scroll right"
          >
            <FaAngleRight size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default CategoryWiseProductDisplay