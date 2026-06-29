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

const BACKEND_URL = import.meta.env.VITE_API_URL || "https://snapit-full-stack-production.up.railway.app"

const normalizeImageField = (image) => {
    if (Array.isArray(image)) {
        return image.map(img =>
            typeof img === 'string' && img.startsWith('/')
                ? `${BACKEND_URL}${img}`
                : img
        )
    }
    if (typeof image === 'string' && image.startsWith('/')) {
        return `${BACKEND_URL}${image}`
    }
    return image
}

const CategoryWiseProductDisplay = ({ id, name }) => {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(false)
    const [visible, setVisible] = useState(false)
    const containerRef = useRef()
    const sectionRef = useRef()
    const params = useParams()

    const currentProductId = params?.product?.split("-")?.slice(-1)[0]
    const subCategoryData = useSelector(state => state.product.allSubCategory) || []
    const loadingCardNumber = new Array(6).fill(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true)
                    observer.disconnect()
                }
            },
            { rootMargin: '600px', threshold: 0 }
        )

        if (sectionRef.current) observer.observe(sectionRef.current)

        const timer = setTimeout(() => setVisible(true), 2000)

        return () => {
            observer.disconnect()
            clearTimeout(timer)
        }
    }, [])

    const fetchCategoryWiseProduct = async () => {
        if (!id) return
        try {
            setLoading(true)
            const response = await Axios({
                ...SummaryApi.getProductByCategory,
                data: { id }
            })
            const { data: responseData } = response

            if (responseData.success && Array.isArray(responseData.data)) {
                const filtered = responseData.data.filter(p => p?._id !== currentProductId)
                const sanitized = filtered.map(product => ({
                    ...product,
                    image: normalizeImageField(product.image),
                }))
                setData(sanitized)
            }
        } catch (error) {
            AxiosToastError(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (visible && id) fetchCategoryWiseProduct()
    }, [visible, id])

    const handleScrollRight = () => { if (containerRef.current) containerRef.current.scrollLeft += 280 }
    const handleScrollLeft  = () => { if (containerRef.current) containerRef.current.scrollLeft -= 280 }

    const handleRedirectProductListpage = () => {
        const safeSubData = Array.isArray(subCategoryData) ? subCategoryData : []

        const categorySlug = `${valideURLConvert(name || "category")}-${id}`

        // ✅ FIX: look for a subcategory that belongs to this category
        const subcategory = safeSubData.find(sub =>
            sub && Array.isArray(sub.category) && sub.category.some(c => c && c._id == id)
        )

        if (subcategory) {
            // Two-segment URL: /:category/:subCategory  ← matches the router route
            const subSlug = `${valideURLConvert(subcategory.name || "all")}-${subcategory._id}`
            return `/${categorySlug}/${subSlug}`
        }

        // ✅ FIX: no subcategory found → use the index route /:category
        // The router now has { index: true, element: <ProductListPage/> } for this case
        return `/${categorySlug}`
    }

    const redirectURL = handleRedirectProductListpage()

    return (
        <div className='my-4 lg:my-8' ref={sectionRef}>
            <div className='container mx-auto px-4 flex items-center justify-between gap-4 mb-3'>
                <h3 className='font-black text-lg md:text-xl text-slate-800'>{name}</h3>
                <Link
                    to={redirectURL}
                    className='text-green-600 font-bold hover:text-green-700 bg-green-50 hover:bg-green-100 px-4 py-1.5 rounded-full text-sm transition-all'
                >
                    See All →
                </Link>
            </div>

            <div className='relative flex items-center'>
                <div
                    className='flex gap-3 container mx-auto px-4 overflow-x-auto scrollbar-none scroll-smooth'
                    ref={containerRef}
                    style={{ scrollSnapType: 'none' }}
                >
                    {loading && loadingCardNumber.map((_, index) => (
                        <div
                            key={"ld" + index}
                            className='min-w-[150px] md:min-w-[190px] lg:min-w-[220px]'
                            style={{  }}
                        >
                            <CardLoading />
                        </div>
                    ))}

                    {!visible && !loading && loadingCardNumber.map((_, index) => (
                        <div
                            key={"ph" + index}
                            className='min-w-[150px] md:min-w-[190px] lg:min-w-[220px] h-64 bg-slate-100 dark:bg-zinc-800 rounded-2xl animate-pulse flex-shrink-0'
                            style={{  }}
                        />
                    ))}

                    {!loading && data.map((p, index) => {
                        if (p && p._id) {
                            return (
                                <div
                                    key={p._id + "cat" + index}
                                    className='min-w-[150px] md:min-w-[190px] lg:min-w-[220px]'
                                    style={{  }}
                                >
                                    <CardProduct data={p} />
                                </div>
                            )
                        }
                        return null
                    })}

                    {!loading && visible && data.length === 0 && (
                        <div className='w-full py-8 text-center text-slate-400 text-sm font-medium'>
                            No products available
                        </div>
                    )}
                </div>

                <div className='w-full left-0 right-0 container mx-auto px-2 absolute hidden lg:flex justify-between pointer-events-none'>
                    <button onClick={handleScrollLeft} className='pointer-events-auto z-10 bg-white shadow-xl text-slate-700 p-3 rounded-full'>
                        <FaAngleLeft size={16} />
                    </button>
                    <button onClick={handleScrollRight} className='pointer-events-auto z-10 bg-white shadow-xl text-slate-700 p-3 rounded-full'>
                        <FaAngleRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    )
}

export default CategoryWiseProductDisplay