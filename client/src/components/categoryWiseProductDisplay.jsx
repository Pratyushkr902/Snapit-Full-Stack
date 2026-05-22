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

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true)
                    observer.disconnect()
                }
            },
            { rootMargin: '200px' }
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
                
                // Bulletproof loop parsing mapping layer
                const sanitizedProducts = filteredData.map(product => {
                    let updatedProduct = { ...product };
                    if (updatedProduct.image && typeof updatedProduct.image === 'string' && updatedProduct.image.startsWith('https://')) {
                        updatedProduct.image = updatedProduct.image.replace('https://', 'https://');
                    }
                    if (updatedProduct.imageUrl && typeof updatedProduct.imageUrl === 'string' && updatedProduct.imageUrl.startsWith('https://')) {
                        updatedProduct.imageUrl = updatedProduct.imageUrl.replace('https://', 'https://');
                    }
                    return updatedProduct;
                });

                setData(sanitizedProducts)
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

    const handleScrollRight = () => { containerRef.current.scrollLeft += 280 }
    const handleScrollLeft = () => { containerRef.current.scrollLeft -= 280 }

    const handleRedirectProductListpage = () => {
        const subcategory = subCategoryData.find(sub =>
            sub.category.some(c => c._id == id)
        )
        return `/${valideURLConvert(name)}-${id}/${valideURLConvert(subcategory?.name)}-${subcategory?._id}`
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
                    style={{ scrollSnapType: 'x mandatory' }}
                >
                    {loading && loadingCardNumber.map((_, index) => (
                        <div key={"ld" + index} className='min-w-[150px] md:min-w-[190px] lg:min-w-[220px]' style={{ scrollSnapAlign: 'start' }}>
                            <CardLoading />
                        </div>
                    ))}

                    {!visible && !loading && loadingCardNumber.map((_, index) => (
                        <div key={"ph" + index} className='min-w-[150px] md:min-w-[190px] lg:min-w-[220px] h-64 bg-slate-100 rounded-2xl animate-pulse' style={{ scrollSnapAlign: 'start' }}>
                        </div>
                    ))}

                    {!loading && data.map((p, index) => (
                        <div
                            key={p._id + "cat" + index}
                            className='min-w-[150px] md:min-w-[190px] lg:min-w-[220px]'
                            style={{ scrollSnapAlign: 'start' }}
                        >
                            <CardProduct data={p} />
                        </div>
                    ))}
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

export default CategoryWiseProductDisplay;